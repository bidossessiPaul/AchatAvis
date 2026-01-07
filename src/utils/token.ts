import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';

export interface TokenPayload {
    userId: string;
    email: string;
    role: 'artisan' | 'guide' | 'admin';
    status: 'pending' | 'active' | 'suspended' | 'rejected';
    permissions?: any;
}

/**
 * Generate access token (15 minutes)
 */
export const generateAccessToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, jwtConfig.accessTokenSecret as string, {
        expiresIn: jwtConfig.accessTokenExpiry as any,
    });
};

/**
 * Generate refresh token (7 days)
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, jwtConfig.refreshTokenSecret as string, {
        expiresIn: jwtConfig.refreshTokenExpiry as any,
    });
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): TokenPayload => {
    return jwt.verify(token, jwtConfig.accessTokenSecret as string) as TokenPayload;
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): TokenPayload => {
    return jwt.verify(token, jwtConfig.refreshTokenSecret as string) as TokenPayload;
};

/**
 * Generate password reset token (1 hour expiry)
 */
export const generatePasswordResetToken = (userId: string, email: string): string => {
    return jwt.sign({ userId, email, type: 'password-reset' }, jwtConfig.accessTokenSecret as string, {
        expiresIn: '1h',
    });
};

/**
 * Generate email verification token (24 hours expiry)
 */
export const generateEmailVerificationToken = (userId: string, email: string): string => {
    return jwt.sign({ userId, email, type: 'email-verification' }, jwtConfig.accessTokenSecret as string, {
        expiresIn: '24h',
    });
};

/**
 * Generate MFA token (temporary token for 2FA verification, 10 minutes)
 */
export const generateMFAToken = (payload: TokenPayload): string => {
    return jwt.sign({ ...payload, type: 'mfa' }, jwtConfig.accessTokenSecret as string, {
        expiresIn: '10m',
    });
};

/**
 * Verify special tokens (password reset, email verification, mfa)
 */
export const verifySpecialToken = (
    token: string
): { userId: string; email: string; type: string; role?: any; status?: any } => {
    return jwt.verify(token, jwtConfig.accessTokenSecret as string) as any;
};
