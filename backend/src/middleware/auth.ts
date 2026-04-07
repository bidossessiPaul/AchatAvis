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
 * In-memory caches to protect the DB pool from duplicate work.
 *
 * - statusCache: caches the user status so we don't SELECT on every single API call.
 *   TTL is short enough (30s) that a suspension is still enforced quickly, but long
 *   enough to absorb bursts when a dashboard fires 5-10 parallel requests.
 * - lastSeenCache: throttles the UPDATE last_seen so we write at most once per user
 *   per LAST_SEEN_THROTTLE_MS. This alone divides DB writes from the auth middleware
 *   by 1-2 orders of magnitude under real usage.
 *
 * Both caches self-evict when they grow past a safety threshold to bound memory.
 */
const STATUS_TTL_MS = 30 * 1000; // 30s
const LAST_SEEN_THROTTLE_MS = 60 * 1000; // 60s
const CACHE_MAX_ENTRIES = 5000;

interface StatusCacheEntry {
    status: string;
    expiresAt: number;
}

const statusCache = new Map<string, StatusCacheEntry>();
const lastSeenCache = new Map<string, number>();

const pruneIfNeeded = (map: Map<string, any>) => {
    if (map.size > CACHE_MAX_ENTRIES) {
        // Drop oldest ~10% of entries (Map preserves insertion order)
        const toDrop = Math.ceil(CACHE_MAX_ENTRIES * 0.1);
        let i = 0;
        for (const key of map.keys()) {
            map.delete(key);
            if (++i >= toDrop) break;
        }
    }
};

/**
 * Exported helper so controllers that mutate user.status (ban, unban, suspend...)
 * can immediately invalidate the cache for that user.
 *
 * Also invalidates the heavy `getUserByIdCached` cache in authService via a
 * lazy import — done lazily to avoid a static circular dependency
 * (authService.ts already imports from this file).
 */
export const invalidateAuthCache = (userId: string) => {
    statusCache.delete(userId);
    lastSeenCache.delete(userId);
    import('../services/authService')
        .then(({ invalidateUserCache }) => invalidateUserCache(userId))
        .catch(() => { /* startup race only — safe to ignore */ });
};

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

        // Attach user immediately so handlers can use it
        req.user = payload;

        const now = Date.now();
        const cached = statusCache.get(payload.userId);

        let userStatus: string;

        if (cached && cached.expiresAt > now) {
            // Cache hit: skip the SELECT entirely
            userStatus = cached.status;
        } else {
            // Cache miss or expired: fetch from DB
            const { query } = await import('../config/database');
            const rows: any = await query(
                'SELECT status FROM users WHERE id = ?',
                [payload.userId]
            );

            if (!rows || rows.length === 0) {
                statusCache.delete(payload.userId);
                return res.status(401).json({ error: 'User no longer exists' });
            }

            userStatus = rows[0].status;
            statusCache.set(payload.userId, {
                status: userStatus,
                expiresAt: now + STATUS_TTL_MS,
            });
            pruneIfNeeded(statusCache);
        }

        // Enforce suspension in real-time (still respected thanks to short TTL).
        // Match authService login rules: admins pass through; non-admins must be
        // in 'active' or 'pending' state. Anything else (suspended, rejected, banned...) → 403.
        if (payload.role !== 'admin' && !['active', 'pending'].includes(userStatus)) {
            return res.status(403).json({
                error: 'Account is not active',
                code: 'ACCOUNT_SUSPENDED',
                status: userStatus,
            });
        }

        // Throttled last_seen update: at most once per LAST_SEEN_THROTTLE_MS per user.
        // Non-blocking on purpose — we never want this to slow down the request.
        const lastWrite = lastSeenCache.get(payload.userId) || 0;
        if (now - lastWrite > LAST_SEEN_THROTTLE_MS) {
            lastSeenCache.set(payload.userId, now);
            pruneIfNeeded(lastSeenCache);
            // Fire-and-forget; import inline so we don't pay the cost when throttled.
            import('../config/database').then(({ query }) => {
                query('UPDATE users SET last_seen = UTC_TIMESTAMP() WHERE id = ?', [payload.userId])
                    .catch(err => {
                        console.error('⚠️ [Auth Middleware] Failed to update last_seen:', err.message);
                    });
            });
        }

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
