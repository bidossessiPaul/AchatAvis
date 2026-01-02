import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/token';

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);

        const payload = verifyAccessToken(token);

        // We allow both active and pending users to access protected routes.
        // This prevents access issues during the transition from payment to dashboard.
        if (payload.status === 'suspended' || payload.status === 'rejected') {
            return res.status(403).json({
                error: 'Account restricted',
                status: payload.status,
            });
        }

        req.user = payload;
        return next();
    } catch (error: any) {
        return res.status(401).json({
            error: 'Invalid or expired token',
            details: error.message
        });
    }
};

/**
 * Middleware to check if user has required role
 */
export const authorize = (...allowedRoles: ('artisan' | 'guide' | 'admin')[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                requiredRole: allowedRoles,
                userRole: req.user.role,
            });
        }

        return next();
    };
};

/**
 * Optional authentication - attaches user if token is valid, but doesn't require it
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = verifyAccessToken(token);
            req.user = payload;
        }

        return next();
    } catch (error) {
        // Invalid token, but don't block the request
        return next();
    }
};
/**
 * Middleware to check specific permission for team members
 */
export const checkPermission = (permissionKey: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // 1. Super Admin (no permissions object or empty) has access to everything
        const userPermissions = req.user.permissions;
        if (!userPermissions || Object.keys(userPermissions).length === 0) {
            return next();
        }

        // 2. Check specific permission
        if (userPermissions[permissionKey] === true) {
            return next();
        }

        return res.status(403).json({
            error: 'Insufficient permissions',
            requiredPermission: permissionKey
        });
    };
};
