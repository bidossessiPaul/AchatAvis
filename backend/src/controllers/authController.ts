import { Request, Response } from 'express';
import * as authService from '../services/authService';
import {
    artisanRegistrationSchema,
    guideRegistrationSchema,
    loginSchema,
    changePasswordSchema,
    profileUpdateSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} from '../middleware/validator';
import { ZodError } from 'zod';
import { suspensionService } from '../services/suspensionService';

/**
 * Detect region (Public)
 * GET /api/auth/detect-region
 */
export const detectRegion = async (req: Request, res: Response) => {
    try {
        const detectedIp = req.ip || '';
        const country = await suspensionService.detectCountryFromIP(detectedIp);
        return res.json({
            country,
            ip: detectedIp
        });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to detect region' });
    }
};

/**
 * Register artisan
 * POST /api/auth/register/artisan
 */
export const registerArtisan = async (req: Request, res: Response) => {
    try {
        const validatedData = artisanRegistrationSchema.parse(req.body);

        // Country Blocking Check
        const isSystemActive = await suspensionService.isSystemEnabled();
        const detectedIp = req.ip || '';
        const country = await suspensionService.detectCountryFromIP(detectedIp);
        const isBlocked = isSystemActive && country ? await suspensionService.isCountryBlocked(country) : false;

        console.log(`🛡️ REGISTRATION ATTEMPT (Artisan): SystemActive=${isSystemActive}, IP=${detectedIp}, Country=${country}, Blocked=${isBlocked}`);

        if (isBlocked) {
            console.warn(`🚫 Tentative d'inscription bloquée depuis ${country} (IP: ${detectedIp})`);
            return res.status(403).json({
                error: "Votre compte a été suspendu en raison de votre zone géographique.",
                code: 'ACCOUNT_SUSPENDED',
                country
            });
        }

        const result = await authService.registerArtisan(validatedData);

        return res.status(201).json({
            message: 'Artisan account created successfully. Awaiting admin approval.',
            user: result.user,
            // Only return token in dev mode
            verificationToken: process.env.NODE_ENV !== 'production' ? result.verificationToken : undefined,
        });
    } catch (error: any) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors,
            });
        }

        if (error.message === 'Email already registered' || error.message === 'SIRET already registered') {
            return res.status(409).json({ error: error.message });
        }

        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Register guide
 * POST /api/auth/register/guide
 */
export const registerGuide = async (req: Request, res: Response) => {
    try {
        const validatedData = guideRegistrationSchema.parse(req.body);

        // Country Blocking Check
        const isSystemActive = await suspensionService.isSystemEnabled();
        const detectedIp = req.ip || '';
        const country = await suspensionService.detectCountryFromIP(detectedIp);
        const isBlocked = isSystemActive && country ? await suspensionService.isCountryBlocked(country) : false;

        console.log(`🛡️ REGISTRATION ATTEMPT (Guide): SystemActive=${isSystemActive}, IP=${detectedIp}, Country=${country}, Blocked=${isBlocked}`);

        if (isBlocked) {
            console.warn(`🚫 Tentative d'inscription bloquée depuis ${country} (IP: ${detectedIp})`);
            return res.status(403).json({
                error: "Votre compte a été suspendu en raison de votre zone géographique.",
                code: 'ACCOUNT_SUSPENDED',
                country
            });
        }

        const result = await authService.registerGuide(validatedData);

        return res.status(201).json({
            message: 'Guide account created successfully',
            user: result.user,
            // Only return token in dev mode
            verificationToken: process.env.NODE_ENV !== 'production' ? result.verificationToken : undefined,
        });
    } catch (error: any) {
        if (error instanceof ZodError) {
            console.error('Validation error details:', JSON.stringify(error.errors, null, 2));
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors,
            });
        }

        if (error.message === 'Email already registered') {
            return res.status(409).json({ error: error.message });
        }

        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Login
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response) => {
    try {
        const validatedData = loginSchema.parse(req.body);

        // Country Blocking Check
        const isSystemActive = await suspensionService.isSystemEnabled();
        const detectedIp = req.ip || '';
        const country = await suspensionService.detectCountryFromIP(detectedIp);
        const isBlocked = isSystemActive && country ? await suspensionService.isCountryBlocked(country) : false;

        console.log(`🛡️ LOGIN DECISION:
            - User: ${validatedData.email}
            - IP: ${detectedIp}
            - Country: ${country}
            - System Active: ${isSystemActive}
            - Is Country Blocked: ${isBlocked}
        `);

        if (isBlocked) {
            console.warn(`🚫 Tentative de connexion bloquée depuis ${country} (IP: ${detectedIp})`);

            // Tentative de suspendre l'utilisateur s'il existe
            let userName = '';
            try {
                const { query } = await import('../config/database');
                const users: any = await query('SELECT id, full_name FROM users WHERE email = ?', [validatedData.email]);
                if (users && users.length > 0) {
                    userName = users[0].full_name;
                    if (country) {
                        await suspensionService.suspendForGeoblocking(users[0].id, country);
                    }
                }
            } catch (err) {
                console.error('Failed to auto-suspend user during login:', err);
            }

            return res.status(403).json({
                error: "Votre compte a été suspendu en raison de votre zone géographique.",
                code: 'ACCOUNT_SUSPENDED',
                country,
                user_name: userName // Send user name to frontend
            });
        }

        const result: any = await authService.login(
            validatedData.email,
            validatedData.password
        );

        // Update User Tracking Info
        try {
            const { query } = await import('../config/database');
            const userAgent = req.headers['user-agent'] || null;
            await query('UPDATE users SET last_detected_country = ?, last_ip = ?, last_user_agent = ? WHERE email = ?', [
                country, detectedIp, userAgent, validatedData.email
            ]);
        } catch (err) {
            console.error('Failed to update user tracking info:', err);
        }

        if (result.twoFactorRequired) {
            return res.json({
                message: '2FA verification required',
                twoFactorRequired: true,
                mfaToken: result.mfaToken,
            });
        }

        // Set refresh token as httpOnly cookie
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return res.json({
            message: 'Login successful',
            user: result.user,
            accessToken: result.accessToken,
        });
    } catch (error: any) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors,
            });
        }

        const validatedDataEmail = req.body.email || 'unknown';

        // Handle account suspension
        if (error.code === 'ACCOUNT_SUSPENDED') {
            const isSystemActive = await suspensionService.isSystemEnabled();
            if (isSystemActive) {
                return res.status(403).json({
                    error: error.message,
                    code: 'ACCOUNT_SUSPENDED',
                    suspension: error.suspension,
                    user_name: error.userName
                });
            }
            console.log(`🔓 [Login] Suspension system is DISABLED. Bypassing suspension error for ${validatedDataEmail}`);
            // If the service threw but system is now disabled (race condition?), 
            // we'd theoretically need to re-run login, but authService.login already checks this.
            // If we are here, it means authService.login THOUGHT it was active.
        }

        if (error.message && (error.message.includes('Invalid email or password') || error.message.includes('Account locked'))) {
            return res.status(401).json({ error: error.message });
        }

        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Generate 2FA
 * POST /api/auth/2fa/generate
 */
export const generate2FA = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Non authentifié' });

        const result = await authService.generate2FASecret(req.user.userId);
        return res.json(result);
    } catch (error) {
        return res.status(500).json({ error: 'Erreur lors de la génération du 2FA' });
    }
};

/**
 * Enable 2FA
 * POST /api/auth/2fa/enable
 */
export const enable2FA = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Non authentifié' });

        const { secret, token } = req.body;
        if (!secret || !token) return res.status(400).json({ error: 'Secret et code requis' });

        await authService.enable2FA(req.user.userId, secret, token);
        return res.json({ message: '2FA activé avec succès' });
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
};

/**
 * Disable 2FA
 * POST /api/auth/2fa/disable
 */
export const disable2FA = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Non authentifié' });

        await authService.disable2FA(req.user.userId);
        return res.json({ message: '2FA désactivé avec succès' });
    } catch (error: any) {
        return res.status(500).json({ error: 'Erreur lors de la désactivation du 2FA' });
    }
};

/**
 * Verify 2FA (Login)
 * POST /api/auth/2fa/verify
 */
export const verify2FA = async (req: Request, res: Response) => {
    try {
        const { token, mfaToken } = req.body;
        if (!token || !mfaToken) return res.status(400).json({ error: 'Code et token requis' });

        // Verify MFA Token first to get user ID
        const { verifySpecialToken } = await import('../utils/token');
        const payload = verifySpecialToken(mfaToken);

        if (payload.type !== 'mfa') {
            return res.status(401).json({ error: 'Token MFA invalide' });
        }

        const result = await authService.verify2FA(payload.userId, token);

        // Set refresh token as httpOnly cookie
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return res.json({
            message: 'Vérification 2FA réussie',
            user: result.user,
            accessToken: result.accessToken,
        });
    } catch (error: any) {
        return res.status(401).json({ error: error.message || 'Échec de la vérification 2FA' });
    }
};

/**
 * Logout
 * POST /api/auth/logout
 */
export const logout = (_req: Request, res: Response) => {
    res.clearCookie('refreshToken');
    return res.json({ message: 'Déconnexion réussie' });
};

/**
 * Get current user
 * GET /api/auth/me
 */
export const getMe = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const user = await authService.getUserById(req.user.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json({ user });
    } catch (error) {
        console.error('Get me error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Change password
 * PUT /api/auth/change-password
 */
export const changePassword = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const validatedData = changePasswordSchema.parse(req.body);

        await authService.changePassword(
            req.user.userId,
            validatedData.currentPassword,
            validatedData.newPassword
        );

        return res.json({ message: 'Password changed successfully' });
    } catch (error: any) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors,
            });
        }

        if (error.message === 'Current password is incorrect') {
            return res.status(401).json({ error: error.message });
        }

        console.error('Change password error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Delete account
 * DELETE /api/auth/delete-account
 */
export const deleteAccount = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        await authService.deleteAccount(req.user.userId);

        res.clearCookie('refreshToken');
        return res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Update profile
 * PUT /api/auth/profile
 */
export const updateProfile = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const validatedData = profileUpdateSchema.parse(req.body);

        await authService.updateProfile(req.user.userId, validatedData);

        const updatedUser = await authService.getUserById(req.user.userId);

        return res.json({
            message: 'Profile updated successfully',
            user: updatedUser,
        });
    } catch (error: any) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors,
            });
        }

        console.error('Update profile error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Upload avatar
 * POST /api/auth/profile/avatar
 */
export const uploadAvatar = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier téléchargé' });
        }

        // Generate the public URL for the avatar
        // This assumes the backend serves /public statically
        const avatarUrl = `${req.protocol}://${req.get('host')}/public/uploads/avatars/${req.file.filename}`;

        // Update user record in database
        await authService.updateProfile(req.user.userId, { avatarUrl });

        return res.json({
            message: 'Avatar mis à jour avec succès',
            avatarUrl,
        });
    } catch (error) {
        console.error('Upload avatar error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Refresh token
 * POST /api/auth/refresh-token
 */
export const refreshToken = async (req: Request, res: Response) => {
    try {
        const token = req.cookies.refreshToken;
        if (!token) {
            return res.status(401).json({ error: 'No refresh token found' });
        }

        const result = await authService.refreshToken(token);

        // Map user object for cookie maxAge if needed (keeping same as login)
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return res.json({
            message: 'Tokens refreshed successfully',
            user: result.user,
            accessToken: result.accessToken,
        });
    } catch (error: any) {
        console.error('Refresh token error:', error);
        return res.status(401).json({ error: error.message });
    }
};

/**
 * Forgot password
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const validatedData = forgotPasswordSchema.parse(req.body);
        await authService.forgotPassword(validatedData.email);

        return res.json({
            message: 'Si cet email correspond à un compte, un lien de réinitialisation a été envoyé.'
        });
    } catch (error: any) {
        if (error instanceof ZodError) {
            return res.status(400).json({ error: 'Email invalide', details: error.errors });
        }

        console.error('Forgot password flow error:', {
            message: error.message,
            stack: error.stack,
            email: req.body.email
        });

        // Return a more descriptive error in development, or keep it generic for security in prod
        const isDev = process.env.NODE_ENV !== 'production';
        return res.status(500).json({
            error: 'Internal server error',
            message: isDev ? error.message : undefined
        });
    }
};

/**
 * Reset password
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const validatedData = resetPasswordSchema.parse(req.body);
        await authService.resetPassword(validatedData.token, validatedData.newPassword);

        return res.json({ message: 'Votre mot de passe a été réinitialisé avec succès.' });
    } catch (error: any) {
        if (error instanceof ZodError) {
            return res.status(400).json({ error: 'Données invalides', details: error.errors });
        }
        return res.status(400).json({ error: error.message || 'Erreur lors de la réinitialisation' });
    }
};
