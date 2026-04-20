import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/token';
import { getClientIp, geolocateIp, saveGeoToUser } from '../utils/geolocation';



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
    suspension_reason: string | null;
    expiresAt: number;
}

/**
 * Endpoints that suspended users awaiting identity verification may still access.
 * Matches the path relative to /api (req.baseUrl + req.path).
 */
const IDENTITY_VERIF_ALLOWED_PATHS = [
    '/api/auth/me',
    '/api/auth/logout',
    '/api/auth/refresh-token',
    '/api/auth/identity-verification',
    '/api/auth/identity-verification/status',
];

const statusCache = new Map<string, StatusCacheEntry>();
const lastSeenCache = new Map<string, number>();

/**
 * Tracks users whose detected_ip is already populated, so we don't hit the
 * geolocation API on every single request. Once a user is in this set, we
 * skip the check entirely.
 */
const geoFilledUsers = new Set<string>();
/**
 * Tracks users currently being geolocated (in-flight) to prevent stampedes
 * when a dashboard fires multiple parallel requests at the same time.
 */
const geoInFlight = new Set<string>();

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
    geoFilledUsers.delete(userId);
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
            return res.status(401).json({ error: 'Session expirée, veuillez vous reconnecter' });
        }

        const payload = verifyAccessToken(token);

        // Attach user immediately so handlers can use it
        req.user = payload;

        const now = Date.now();
        const cached = statusCache.get(payload.userId);

        let userStatus: string;
        let suspensionReason: string | null;

        if (cached && cached.expiresAt > now) {
            // Cache hit: skip the SELECT entirely
            userStatus = cached.status;
            suspensionReason = cached.suspension_reason;
        } else {
            // Cache miss or expired: fetch from DB
            const { query } = await import('../config/database');
            const rows: any = await query(
                'SELECT status, suspension_reason, detected_ip FROM users WHERE id = ?',
                [payload.userId]
            );

            if (!rows || rows.length === 0) {
                statusCache.delete(payload.userId);
                return res.status(401).json({ error: 'Votre compte n\'existe plus' });
            }

            userStatus = rows[0].status;
            suspensionReason = rows[0].suspension_reason || null;
            // Cache geo-filled status from the same query (no extra SELECT later)
            if (rows[0].detected_ip) {
                geoFilledUsers.add(payload.userId);
            }
            statusCache.set(payload.userId, {
                status: userStatus,
                suspension_reason: suspensionReason,
                expiresAt: now + STATUS_TTL_MS,
            });
            pruneIfNeeded(statusCache);
        }

        // Enforce suspension in real-time (still respected thanks to short TTL).
        // Match authService login rules: admins pass through; non-admins must be
        // in 'active' or 'pending' state. Anything else (suspended, rejected, banned...) → 403.
        //
        // Exception: users suspended for identity verification may still hit a small
        // whitelist of endpoints (to view their status and upload their ID).
        if (payload.role !== 'admin' && !['active', 'pending'].includes(userStatus)) {
            const isIdentityPending =
                userStatus === 'suspended' &&
                suspensionReason === 'identity_verification_required';
            const currentPath = (req.baseUrl || '') + (req.path || '');
            const isWhitelisted = isIdentityPending && IDENTITY_VERIF_ALLOWED_PATHS.some(
                p => currentPath === p || currentPath.startsWith(p + '/')
            );

            if (!isWhitelisted) {
                return res.status(403).json({
                    error: isIdentityPending
                        ? 'Vérification d\'identité requise'
                        : 'Compte inactif',
                    code: isIdentityPending ? 'IDENTITY_VERIFICATION_REQUIRED' : 'ACCOUNT_SUSPENDED',
                    status: userStatus,
                    suspension_reason: suspensionReason,
                });
            }
            // Whitelisted — proceed
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

        // Backfill geolocation for users whose detected_ip is still NULL.
        // The status SELECT above already caches geo-filled users (no extra query).
        // Here we only trigger the async geolocate + save for users not yet filled.
        if (!geoFilledUsers.has(payload.userId) && !geoInFlight.has(payload.userId)) {
            geoInFlight.add(payload.userId);
            const ip = getClientIp(req);

            if (ip) {
                geolocateIp(ip)
                    .then(geo => {
                        if (!geo) return;
                        return saveGeoToUser(payload.userId, geo);
                    })
                    .then(() => geoFilledUsers.add(payload.userId))
                    .catch(err => console.error('⚠️ [Auth] Geo backfill failed:', err?.message))
                    .finally(() => geoInFlight.delete(payload.userId));
            } else {
                geoInFlight.delete(payload.userId);
            }
        }

        return next();
    } catch (error: any) {
        console.error(`❌ [Auth Middleware] Error:`, error.message);
        return res.status(401).json({
            error: 'Session expirée, veuillez vous reconnecter',
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
            return res.status(401).json({ error: 'Veuillez vous connecter pour continuer' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Vous n\'avez pas les droits nécessaires',
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
            return res.status(401).json({ error: 'Veuillez vous connecter pour continuer' });
        }

        // 1. Owner always has full access — cannot be restricted
        if (req.user.email === 'dossoumaxime888@gmail.com') {
            return next();
        }

        // 2. Super Admin (no permissions object or empty) has access to everything
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
            error: 'Vous n\'avez pas les droits nécessaires',
            requiredPermission
        });
    };
};
