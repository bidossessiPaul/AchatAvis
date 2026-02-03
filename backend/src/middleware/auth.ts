import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/token';
import { suspensionService } from '../services/suspensionService';


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
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let token = '';
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.query.token) {
            token = req.query.token as string;
        }

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const payload = verifyAccessToken(token);

        console.log(`🔍 [Auth Middleware] Checking status for user: ${payload.email} (${payload.userId})`);

        // REAL-TIME CHECK: Fetch current user status from DB
        const { query } = await import('../config/database');
        const rows: any = await query('SELECT status, full_name, last_detected_country, last_ip FROM users WHERE id = ?', [payload.userId]);

        if (!rows || rows.length === 0) {
            console.error(`❌ [Auth Middleware] User ${payload.userId} not found in DB`);
            return res.status(401).json({ error: 'User no longer exists' });
        }

        const userStatus = rows[0].status;
        const userRole = payload.role;
        console.log(`ℹ️ [Auth Middleware] User ${payload.email} status: ${userStatus}, role: ${userRole}`);

        // CHECK IF SYSTEM IS ENABLED
        const isSystemActive = await suspensionService.isSystemEnabled();

        if (isSystemActive && userRole !== 'admin') {
            // WHITELIST CHECK: Exempted users bypass all suspension and geoblocking checks
            if (await suspensionService.isUserExempted(payload.userId)) {
                console.log(`🛡️ [Auth Middleware] User ${payload.email} is EXEMPTED. Mandatory access granted.`);
                req.user = payload;
                return next();
            }

            // 1. HARD SUSPENSION CHECK
            if (userStatus === 'suspended' || userStatus === 'rejected') {
                console.warn(`🛡️ [Auth Middleware] BLOCKED REQUEST: User ${payload.email} is ${userStatus}.`);
                return res.status(403).json({
                    error: 'Account restricted',
                    code: 'ACCOUNT_SUSPENDED',
                    status: userStatus,
                    user_name: rows[0].full_name,
                    country: rows[0].last_detected_country
                });
            }

            // 2. GEOBLOCKING CHECK
            try {
                const currentIp = req.ip || '';
                const lastIp = rows[0].last_ip;

                // Only check if IP changed to avoid excessive API calls
                if (currentIp !== lastIp) {
                    const country = await suspensionService.detectCountryFromIP(currentIp);
                    if (country && await suspensionService.isCountryBlocked(country)) {
                        console.warn(`🚫 [Auth Middleware] Geoblocking violation for ${payload.email} (IP: ${currentIp}, Country: ${country})`);
                        await suspensionService.suspendForGeoblocking(payload.userId, country);

                        // Update last_ip and country in DB for next check
                        await query('UPDATE users SET last_ip = ?, last_detected_country = ? WHERE id = ?', [currentIp, country, payload.userId]);

                        return res.status(403).json({
                            error: 'Account restricted',
                            code: 'ACCOUNT_SUSPENDED',
                            status: 'suspended',
                            user_name: rows[0].full_name,
                            country: country
                        });
                    }
                }
            } catch (geoError) {
                console.error('⚠️ [Auth Middleware] Geoblocking check failed (non-blocking):', geoError);
            }
        } else if (!isSystemActive) {
            console.log(`🔓 [Auth Middleware] Suspension system is DISABLED. Allowing access for ${payload.email} (${userStatus})`);
        }

        req.user = payload;

        // NON-BLOCKING: Update last_seen timestamp
        // We don't await this to keep the middleware fast
        query('UPDATE users SET last_seen = UTC_TIMESTAMP() WHERE id = ?', [payload.userId]).catch(err => {
            console.error('⚠️ [Auth Middleware] Failed to update last_seen:', err);
        });

        return next();
    } catch (error: any) {
        console.error(`❌ [Auth Middleware] Error:`, error.message);
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
export const checkPermission = (requiredPermission: string | string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // 1. Super Admin (no permissions object or empty) has access to everything
        const userPermissions = req.user.permissions;
        if (!userPermissions || Object.keys(userPermissions).length === 0) {
            return next();
        }

        // 2. Check permission(s)
        let hasAccess = false;
        if (Array.isArray(requiredPermission)) {
            // OR logic: true if user has ANY of the required permissions
            hasAccess = requiredPermission.some(perm => userPermissions[perm] === true);
        } else {
            hasAccess = userPermissions[requiredPermission] === true;
        }

        if (hasAccess) {
            return next();
        }

        return res.status(403).json({
            error: 'Insufficient permissions',
            requiredPermission
        });
    };
};
