import { v4 as uuidv4 } from 'uuid';
import { pool, query } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, generateEmailVerificationToken, generateMFAToken } from '../utils/token';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import { ArtisanRegistrationInput, GuideRegistrationInput } from '../middleware/validator';
import { User, UserResponse } from '../models/types';
import crypto from 'crypto';
import { sendResetPasswordEmail, sendWelcomeEmail } from './emailService';
import { suspensionService } from './suspensionService';


/**
 * Register a new artisan
 */
export const registerArtisan = async (data: ArtisanRegistrationInput) => {
    const hashedPassword = await hashPassword(data.password);
    const userId = uuidv4();
    const profileId = uuidv4();

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Create user
        await connection.execute(
            `INSERT INTO users (id, email, full_name, password_hash, role, status)
             VALUES (?, ?, ?, ?, 'artisan', 'pending')`,
            [userId, data.email, data.fullName, hashedPassword]
        );

        // Create artisan profile
        await connection.execute(
            `INSERT INTO artisans_profiles 
             (id, user_id, company_name, siret, trade, phone, address, city, postal_code, google_business_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                profileId,
                userId,
                data.companyName,
                data.siret,
                data.trade,
                data.phone,
                data.address,
                data.city,
                data.postalCode,
                data.googleBusinessUrl || null,
            ]
        );

        await connection.commit();

        // Fetch the created user info (since MySQL doesn't have RETURNING)
        const [rows]: any = await connection.execute(
            `SELECT id, email, full_name, role, status, email_verified, created_at 
             FROM users WHERE id = ?`,
            [userId]
        );
        const user = rows[0];

        // Generate email verification token
        const verificationToken = generateEmailVerificationToken(user.id, user.email);

        // Send welcome email
        await sendWelcomeEmail(user.email, user.full_name, 'artisan');

        return {
            user,
            verificationToken,
        };
    } catch (error: any) {
        await connection.rollback();

        // Handle unique constraint violations (MySQL error code 1062)
        if (error.errno === 1062) {
            if (error.message.includes('email')) {
                throw new Error('Email already registered');
            }
            if (error.message.includes('siret')) {
                throw new Error('SIRET already registered');
            }
        }

        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Register a new local guide
 */
export const registerGuide = async (data: GuideRegistrationInput) => {
    const hashedPassword = await hashPassword(data.password);
    const userId = uuidv4();
    const profileId = uuidv4();

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Create user
        await connection.execute(
            `INSERT INTO users (id, email, full_name, password_hash, role, status)
             VALUES (?, ?, ?, ?, 'guide', 'active')`,
            [userId, data.email, data.fullName, hashedPassword]
        );

        // Create guide profile
        await connection.execute(
            `INSERT INTO guides_profiles 
             (id, user_id, google_email, local_guide_level, total_reviews_count, phone, city)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [profileId, userId, data.googleEmail, 1, 0, data.phone, data.city]
        );

        await connection.commit();

        // Fetch created user
        const [rows]: any = await connection.execute(
            `SELECT id, email, full_name, role, status, email_verified, created_at 
             FROM users WHERE id = ?`,
            [userId]
        );
        const user = rows[0];

        const verificationToken = generateEmailVerificationToken(user.id, user.email);

        // Send welcome email
        await sendWelcomeEmail(user.email, user.full_name, 'guide');

        return {
            user,
            verificationToken,
        };
    } catch (error: any) {
        await connection.rollback();

        if (error.errno === 1062 && error.message.includes('email')) {
            throw new Error('Email already registered');
        }

        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Login user
 */
export const login = async (email: string, password: string) => {
    // Get user with password hash
    const rows: any = await query(
        `SELECT u.id, u.email, u.full_name, u.avatar_url, u.password_hash, u.role, u.status, u.email_verified, 
                u.two_factor_enabled, u.two_factor_secret, u.failed_login_attempts, u.account_locked_until, u.permissions,
                ap.subscription_status, ap.subscription_end_date, ap.subscription_tier, ap.monthly_reviews_quota, ap.current_month_reviews, ap.subscription_start_date, ap.missions_allowed,
                (SELECT COUNT(*) FROM reviews_orders WHERE artisan_id = u.id AND status != 'cancelled') as missions_used
         FROM users u
         LEFT JOIN artisans_profiles ap ON u.id = ap.user_id AND u.role = 'artisan'
         WHERE u.email = ?`,
        [email]
    );

    const user = rows[0] as (User & { subscription_status?: string }) | undefined;

    if (!user) {
        throw new Error('Invalid email or password');
    }

    // Check if account is suspended
    if (user.status === 'suspended' || user.status === 'rejected') {
        const isSystemActive = await suspensionService.isSystemEnabled();

        if (isSystemActive && user.role !== 'admin') {
            // Get active suspension details
            const suspensionQuery: any = await query(
                `SELECT us.*, sl.level_name, sl.level_number, sl.badge_color, sl.icon_emoji
                 FROM user_suspensions us
                 JOIN suspension_levels sl ON us.suspension_level_id = sl.id
                 WHERE us.user_id = ? AND us.is_active = true
                 ORDER BY us.started_at DESC LIMIT 1`,
                [user.id]
            );

            const suspension = suspensionQuery && suspensionQuery.length > 0 ? suspensionQuery[0] : null;

            const error: any = new Error('Votre compte est suspendu. Veuillez contacter l\'administrateur.');
            error.code = 'ACCOUNT_SUSPENDED';
            error.suspension = suspension;
            error.userName = user.full_name;
            throw error;
        } else if (!isSystemActive) {
            console.log(`🔓 [Auth Service] Suspension system is DISABLED. Allowing login for suspended user: ${email}`);
        }
    }


    // Check if account is locked
    if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
        const minutesLeft = Math.ceil(
            (new Date(user.account_locked_until).getTime() - Date.now()) / 60000
        );
        throw new Error(`Account locked. Try again in ${minutesLeft} minutes`);
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);

    if (!isValidPassword) {
        // Increment failed login attempts
        const newFailedAttempts = user.failed_login_attempts + 1;
        let lockUntil = null;

        // Lock account after 5 failed attempts for 15 minutes
        if (newFailedAttempts >= 5) {
            lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        }

        await query(
            `UPDATE users 
             SET failed_login_attempts = ?, account_locked_until = ?
             WHERE id = ?`,
            [newFailedAttempts, lockUntil, user.id]
        );

        throw new Error('Invalid email or password');
    }

    // Reset failed login attempts and update last login (only if 2FA is NOT required, or handled after 2FA)
    // For now, let's keep the last_login update here or after verify2FA

    const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        permissions: user.permissions ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) : undefined,
    };

    // Check if 2FA is enabled
    if (user.two_factor_enabled) {
        const mfaToken = generateMFAToken(tokenPayload);
        return {
            twoFactorRequired: true,
            mfaToken,
        };
    }

    // Update last login
    await query(
        `UPDATE users 
         SET failed_login_attempts = 0, account_locked_until = NULL, last_login = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [user.id]
    );

    // Generate tokens
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Return user without password hash
    const { password_hash, failed_login_attempts, account_locked_until, two_factor_secret, ...userResponse } = user;

    // Ensure permissions is an object
    if (userResponse.permissions && typeof userResponse.permissions === 'string') {
        try {
            userResponse.permissions = JSON.parse(userResponse.permissions);
        } catch (e) {
            console.error('Failed to parse permissions:', e);
            userResponse.permissions = {};
        }
    }

    return {
        user: userResponse as UserResponse & { subscription_status?: string, subscription_end_date?: string },
        accessToken,
        refreshToken,
    };
};

/**
 * Generate 2FA Secret
 */
export const generate2FASecret = async (userId: string) => {
    const rows: any = await query('SELECT email FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) throw new Error('User not found');

    const email = rows[0].email;
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(email, 'AchatAvis', secret);
    const qrCode = await qrcode.toDataURL(otpauth);

    return { secret, qrCode };
};

/**
 * Enable 2FA
 */
export const enable2FA = async (userId: string, secret: string, token: string) => {
    const isValid = authenticator.verify({ token, secret });
    if (!isValid) throw new Error('Code de vérification invalide');

    await query(
        'UPDATE users SET two_factor_secret = ?, two_factor_enabled = TRUE WHERE id = ?',
        [secret, userId]
    );
};

/**
 * Disable 2FA
 */
export const disable2FA = async (userId: string) => {
    await query(
        'UPDATE users SET two_factor_secret = NULL, two_factor_enabled = FALSE WHERE id = ?',
        [userId]
    );
};

/**
 * Verify 2FA during Login
 */
export const verify2FA = async (userId: string, token: string) => {
    const rows: any = await query(
        `SELECT u.id, u.email, u.full_name, u.avatar_url, u.role, u.status, u.email_verified, 
                u.created_at, u.updated_at, u.last_login,
                u.two_factor_enabled, u.two_factor_secret,
                ap.subscription_status, ap.subscription_end_date, ap.subscription_tier, ap.monthly_reviews_quota, ap.current_month_reviews, ap.subscription_start_date, ap.missions_allowed,
                (SELECT COUNT(*) FROM reviews_orders WHERE artisan_id = u.id AND status != 'cancelled') as missions_used
         FROM users u
         LEFT JOIN artisans_profiles ap ON u.id = ap.user_id AND u.role = 'artisan'
         WHERE u.id = ?`,
        [userId]
    );

    if (rows.length === 0) throw new Error('Utilisateur non trouvé');
    const user = rows[0];

    if (!user.two_factor_enabled) throw new Error('2FA non activé pour cet utilisateur');

    const isValid = authenticator.verify({ token, secret: user.two_factor_secret });
    if (!isValid) throw new Error('Code 2FA invalide');

    // Update last login
    await query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [userId]
    );

    const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        permissions: user.permissions ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) : undefined,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Omit sensitive data before returning
    const { two_factor_secret, ...userResponse } = user;

    return {
        user: userResponse as UserResponse & { subscription_status?: string, subscription_end_date?: string },
        accessToken,
        refreshToken
    };
};

/**
 * Get user by ID (without password)
 */
export const getUserById = async (userId: string): Promise<UserResponse | null> => {
    const rows: any = await query(
        `SELECT u.id, u.email, u.full_name, u.avatar_url, u.role, u.status, u.email_verified, u.created_at, u.updated_at, u.last_login, u.permissions,
                ap.subscription_status, ap.subscription_end_date, ap.subscription_tier, ap.monthly_reviews_quota, ap.current_month_reviews, ap.subscription_start_date, ap.missions_allowed,
                (SELECT COUNT(*) FROM reviews_orders WHERE artisan_id = u.id AND status != 'cancelled') as missions_used
         FROM users u
         LEFT JOIN artisans_profiles ap ON u.id = ap.user_id AND u.role = 'artisan'
         WHERE u.id = ?`,
        [userId]
    );

    const user = rows[0];
    if (user && user.permissions && typeof user.permissions === 'string') {
        try {
            user.permissions = JSON.parse(user.permissions);
        } catch (e) {
            console.error('Failed to parse permissions:', e);
            user.permissions = {};
        }
    }

    return user || null;
};

/**
 * Change password
 */
export const changePassword = async (
    userId: string,
    currentPassword: string,
    newPassword: string
) => {
    // Verify current password
    const rows: any = await query(
        `SELECT password_hash FROM users WHERE id = ?`,
        [userId]
    );

    const user = rows[0];
    if (!user) {
        throw new Error('User not found');
    }

    const isValid = await comparePassword(currentPassword, user.password_hash);
    if (!isValid) {
        throw new Error('Current password is incorrect');
    }

    // Update password
    const hashedNewPassword = await hashPassword(newPassword);
    await query(
        `UPDATE users SET password_hash = ? WHERE id = ?`,
        [hashedNewPassword, userId]
    );
};

/**
 * Delete user account
 */
export const deleteAccount = async (userId: string) => {
    await query(`DELETE FROM users WHERE id = ?`, [userId]);
};

/**
 * Update user profile
 */
export const updateProfile = async (userId: string, data: { fullName?: string, avatarUrl?: string }) => {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.fullName !== undefined) {
        updates.push('full_name = ?');
        params.push(data.fullName);
    }

    if (data.avatarUrl !== undefined) {
        updates.push('avatar_url = ?');
        params.push(data.avatarUrl);
    }

    if (updates.length === 0) return;

    params.push(userId);
    await query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        params
    );
};

/**
 * Refresh tokens
 */
export const refreshToken = async (token: string) => {
    try {
        const { verifyRefreshToken } = await import('../utils/token');
        const payload = verifyRefreshToken(token);

        // Get user to ensure they still exist and are active
        const user = await getUserById(payload.userId);
        const isSystemActive = await suspensionService.isSystemEnabled();

        if (!user) {
            throw new Error('User not found');
        }

        if (isSystemActive && user.role !== 'admin' && user.status !== 'active') {
            throw new Error(`User account is ${user.status}`);
        }

        const tokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
            permissions: user.permissions ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) : undefined,
        };

        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        return {
            user,
            accessToken,
            refreshToken,
        };
    } catch (error) {
        throw new Error('Invalid refresh token');
    }
};

/**
 * Forgot password - Generate token and send email
 */
export const forgotPassword = async (email: string) => {
    // Check if user exists
    const rows: any = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
        // Don't reveal if user exists or not for security, but we need to stop here
        return;
    }

    const userId = rows[0].id;
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour from now

    // Save token to DB
    await query(
        'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?',
        [token, expires, userId]
    );

    // Send email
    await sendResetPasswordEmail(email, token);
};

/**
 * Reset password - Verify token and update password
 */
export const resetPassword = async (token: string, newPassword: string) => {
    // Find user with valid token
    const rows: any = await query(
        'SELECT id FROM users WHERE reset_password_token = ? AND reset_password_expires > CURRENT_TIMESTAMP',
        [token]
    );

    if (rows.length === 0) {
        throw new Error('Le lien de réinitialisation est invalide ou a expiré');
    }

    const userId = rows[0].id;
    const hashedPassword = await hashPassword(newPassword);

    // Update password and clear token
    await query(
        'UPDATE users SET password_hash = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?',
        [hashedPassword, userId]
    );
};
