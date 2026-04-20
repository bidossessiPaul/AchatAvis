import { Request, Response } from 'express';
import * as authService from '../services/authService';
import { getClientIp, geolocateIp, saveGeoToUser } from '../utils/geolocation';
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

/** Fire-and-forget geolocation: resolve IP → save to DB. Never throws. */
const fireAndForgetGeo = (userId: string | undefined, req: Request) => {
    if (!userId) return;
    const ip = getClientIp(req);
    if (!ip) return;
    geolocateIp(ip)
        .then(geo => geo && saveGeoToUser(userId, geo))
        .catch(() => { /* silent */ });
};



/**
 * Register artisan
 * POST /api/auth/register/artisan
 */
export const registerArtisan = async (req: Request, res: Response) => {
    try {
        const validatedData = artisanRegistrationSchema.parse(req.body);

        // Extract base URL from request
        const origin = req.get('origin') || req.get('referer');
        const baseUrl = origin ? new URL(origin).origin : undefined;

        const result = await authService.registerArtisan(validatedData, baseUrl);

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

        return res.status(500).json({ error: 'Une erreur est survenue, veuillez réessayer' });
    }
};

/**
 * Register guide
 * POST /api/auth/register/guide
 */
export const registerGuide = async (req: Request, res: Response) => {
    try {
        const validatedData = guideRegistrationSchema.parse(req.body);

        // Extract base URL from request
        const origin = req.get('origin') || req.get('referer');
        const baseUrl = origin ? new URL(origin).origin : undefined;

        const result = await authService.registerGuide(validatedData, baseUrl);

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

        return res.status(500).json({ error: 'Une erreur est survenue, veuillez réessayer' });
    }
};

/**
 * Login
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response) => {
    try {
        const validatedData = loginSchema.parse(req.body);

        // Récupère le cookie "appareil de confiance" (12h) s'il existe — permet de
        // sauter l'OTP admin lors d'une reconnexion récente depuis ce navigateur.
        const trustedDeviceToken = req.cookies?.adminTrustedDevice;

        const result: any = await authService.login(
            validatedData.email,
            validatedData.password,
            trustedDeviceToken
        );



        // Admin email OTP — mandatory for all admin logins
        if (result.requiresEmailOtp) {
            return res.json({
                requiresEmailOtp: true,
                tempToken: result.tempToken,
                maskedEmail: result.maskedEmail,
            });
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
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // Geolocate user (fire-and-forget, never blocks login)
        fireAndForgetGeo(result.user?.id, req);

        return res.json({
            message: 'Connexion réussie',
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



        if (error.message && (
            error.message.includes('mot de passe') ||
            error.message.includes('verrouillé') ||
            error.message.includes('Invalid email or password') ||
            error.message.includes('Account locked')
        )) {
            return res.status(401).json({ error: error.message });
        }

        // Account suspended / blocked by admin — surface the exact business
        // message to the user (403 Forbidden is more accurate than 500).
        if (error.message && (error.message.includes('compte a été suspendu') || error.message.includes('suspendu'))) {
            return res.status(403).json({ error: error.message, code: 'ACCOUNT_SUSPENDED' });
        }

        console.error('Login error:', error);
        return res.status(500).json({
            error: 'Une erreur est survenue, veuillez réessayer',
            message: error.message
        });
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
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // Geolocate user (fire-and-forget)
        fireAndForgetGeo(result.user?.id, req);

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
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    return res.json({ message: 'Déconnexion réussie' });
};

/**
 * Get current user
 * GET /api/auth/me
 */
export const getMe = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Vous n\'êtes pas connecté' });
        }

        // Use the cached variant — /auth/me is one of the hottest endpoints in
        // the app and the underlying query has correlated COUNT subqueries.
        const user = await authService.getUserByIdCached(req.user.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json({ user });
    } catch (error) {
        console.error('Get me error:', error);
        return res.status(500).json({ error: 'Une erreur est survenue, veuillez réessayer' });
    }
};

/**
 * Change password
 * PUT /api/auth/change-password
 */
export const changePassword = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Vous n\'êtes pas connecté' });
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
        return res.status(500).json({ error: 'Une erreur est survenue, veuillez réessayer' });
    }
};

/**
 * Delete account
 * DELETE /api/auth/delete-account
 */
export const deleteAccount = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Vous n\'êtes pas connecté' });
        }

        await authService.deleteAccount(req.user.userId);

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        });
        return res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        return res.status(500).json({ error: 'Une erreur est survenue, veuillez réessayer' });
    }
};

/**
 * Update profile
 * PUT /api/auth/profile
 */
export const updateProfile = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Vous n\'êtes pas connecté' });
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
        return res.status(500).json({ error: 'Une erreur est survenue, veuillez réessayer' });
    }
};

/**
 * Upload avatar
 * POST /api/auth/profile/avatar
 */
export const uploadAvatar = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            console.warn('⚠️ Avatar upload attempt without req.user');
            return res.status(401).json({ error: 'Vous n\'êtes pas connecté' });
        }

        if (!req.file) {
            console.warn('⚠️ Avatar upload attempt without file');
            return res.status(400).json({ error: 'Aucun fichier téléchargé' });
        }

        console.log(`📸 Processing avatar for user ${req.user.userId}: ${req.file.originalname}`);

        // Import Cloudinary service
        const { uploadToCloudinary } = await import('../services/cloudinaryService');

        // Upload to Cloudinary
        const result = await uploadToCloudinary(req.file.buffer, 'avatars');
        const avatarUrl = result.secure_url;

        // Update user record in database
        await authService.updateProfile(req.user.userId, { avatarUrl });

        console.log(`✅ Avatar uploaded to Cloudinary for user ${req.user.userId}`);

        return res.json({
            message: 'Avatar mis à jour avec succès',
            avatarUrl,
        });
    } catch (error: any) {
        console.error('❌ Upload avatar error:', error);
        return res.status(500).json({
            error: 'Une erreur est survenue, veuillez réessayer',
            message: error.message
        });
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
            return res.status(401).json({ error: 'Session expirée, veuillez vous reconnecter' });
        }

        const result = await authService.refreshToken(token);

        // Map user object for cookie maxAge if needed (keeping same as login)
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
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

        // Extract base URL from request
        const origin = req.get('origin') || req.get('referer');
        const baseUrl = origin ? new URL(origin).origin : undefined;

        await authService.forgotPassword(validatedData.email, baseUrl);

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
            error: 'Une erreur est survenue, veuillez réessayer',
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

/**
 * Verify Email
 * GET /api/auth/verify-email
 */
export const verifyEmail = async (req: Request, res: Response) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(400).json({ error: 'Token requis' });
        }

        // Extract base URL from request
        const origin = req.get('origin') || req.get('referer');
        const baseUrl = origin ? new URL(origin).origin : undefined;

        const result = await authService.verifyEmail(token as string, baseUrl);
        return res.json(result);
    } catch (error: any) {
        console.error('Verify email error:', error);
        return res.status(400).json({ error: error.message });
    }
};

export const verifyAdminEmailOtp = async (req: Request, res: Response) => {
    try {
        const { tempToken, otp } = req.body;
        if (!tempToken || !otp) {
            return res.status(400).json({ error: 'Informations manquantes, veuillez recommencer la connexion' });
        }
        const result = await authService.verifyAdminEmailOtp(tempToken, otp);

        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        // Cookie "appareil de confiance" (12h) — évite l'OTP à chaque reconnexion
        // sur le même navigateur pendant 12h.
        if (result.trustedDeviceToken) {
            res.cookie('adminTrustedDevice', result.trustedDeviceToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: 12 * 60 * 60 * 1000, // 12 heures
            });
        }

        return res.json({
            message: 'Connexion admin réussie',
            user: result.user,
            accessToken: result.accessToken,
        });
    } catch (error: any) {
        return res.status(401).json({ error: error.message });
    }
};
