import { Router, Request, Response } from 'express';

const router = Router();

/**
 * DEBUG 1: Vérifier les headers CORS appliqués
 * URL: /api/debug/cors
 */
router.get('/cors', (req: Request, res: Response) => {
    const debugInfo = {
        timestamp: new Date().toISOString(),
        message: 'CORS Debug Information',
        request: {
            origin: req.headers.origin || 'NO ORIGIN HEADER',
            referer: req.headers.referer || 'NO REFERER',
            host: req.headers.host,
            method: req.method,
            path: req.path,
            url: req.url,
            protocol: req.protocol,
            secure: req.secure,
            ip: req.ip,
            ips: req.ips,
        },
        responseHeaders: {
            // Les headers que nous VOULONS envoyer
            'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin') || 'NOT SET',
            'Access-Control-Allow-Methods': res.getHeader('Access-Control-Allow-Methods') || 'NOT SET',
            'Access-Control-Allow-Headers': res.getHeader('Access-Control-Allow-Headers') || 'NOT SET',
            'Access-Control-Allow-Credentials': res.getHeader('Access-Control-Allow-Credentials') || 'NOT SET',
        },
        allResponseHeaders: res.getHeaders(),
    };

    res.json(debugInfo);
});

/**
 * DEBUG 2: Voir TOUS les headers de la requête
 * URL: /api/debug/headers
 */
router.get('/headers', (req: Request, res: Response) => {
    res.json({
        timestamp: new Date().toISOString(),
        message: 'All Request Headers',
        headers: req.headers,
        rawHeaders: req.rawHeaders,
    });
});

/**
 * DEBUG 3: Tester une requête POST (comme le login)
 * URL: /api/debug/test-post
 */
router.post('/test-post', (req: Request, res: Response) => {
    res.json({
        timestamp: new Date().toISOString(),
        message: 'POST request received successfully',
        origin: req.headers.origin,
        corsHeaders: {
            'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': res.getHeader('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': res.getHeader('Access-Control-Allow-Headers'),
            'Access-Control-Allow-Credentials': res.getHeader('Access-Control-Allow-Credentials'),
        },
        body: req.body,
        success: true,
    });
});

/**
 * DEBUG 4: Tester OPTIONS (preflight)
 * URL: /api/debug/test-preflight
 */
router.options('/test-preflight', (req: Request, res: Response) => {
    res.json({
        timestamp: new Date().toISOString(),
        message: 'OPTIONS preflight received',
        origin: req.headers.origin,
        method: req.method,
        headers: req.headers,
        corsHeaders: res.getHeaders(),
    });
});

/**
 * DEBUG 5: Variables d'environnement (sans secrets)
 * URL: /api/debug/env
 */
router.get('/env', (_req: Request, res: Response) => {
    res.json({
        timestamp: new Date().toISOString(),
        message: 'Environment Variables (sanitized)',
        env: {
            NODE_ENV: process.env.NODE_ENV,
            FRONTEND_URL: process.env.FRONTEND_URL || 'NOT SET',
            VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || 'NOT SET',
            // N'affiche PAS les secrets
            hasJWTSecret: !!process.env.JWT_SECRET,
            hasMySQLPassword: !!process.env.MYSQL_PASSWORD,
            hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
        },
    });
});

/**
 * DEBUG 6: Test complet CORS depuis le frontend
 * URL: /api/debug/full-test
 */
router.all('/full-test', (req: Request, res: Response) => {
    const corsOrigin = res.getHeader('Access-Control-Allow-Origin');

    res.json({
        timestamp: new Date().toISOString(),
        message: 'Full CORS Test',
        test: {
            corsIsWorking: corsOrigin ? true : false,
            corsOriginSet: corsOrigin || 'NOT SET',
            requestOrigin: req.headers.origin || 'NO ORIGIN',
            match: corsOrigin === req.headers.origin,
        },
        request: {
            method: req.method,
            origin: req.headers.origin,
            referer: req.headers.referer,
            headers: req.headers,
        },
        response: {
            allHeaders: res.getHeaders(),
            corsHeaders: {
                'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': res.getHeader('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': res.getHeader('Access-Control-Allow-Headers'),
                'Access-Control-Allow-Credentials': res.getHeader('Access-Control-Allow-Credentials'),
            },
        },
    });
});

// FIX: Import query
import { query } from '../config/database';

/**
 * DEBUG 7: Seed Suspension Levels
 * URL: /api/debug/seed-levels
 */
router.get('/seed-levels', async (_req: any, res) => {
    try {
        console.log('🚀 Seeding suspension levels via Debug API...');
        const levels = [
            { level: 1, name: 'Avertissement', duration: 1, emoji: '⚠️', color: 'yellow', consequences: '["Avertissement formel", "Pas de blocage"]', requirements: '["Accuser réception"]', auto_lift: true },
            { level: 2, name: 'Suspension temporaire (3j)', duration: 3, emoji: '⛔', color: 'orange', consequences: '["Accès bloqué 3 jours"]', requirements: '["Attendre fin suspension"]', auto_lift: true },
            { level: 3, name: 'Suspension temporaire (7j)', duration: 7, emoji: '🛑', color: 'red', consequences: '["Accès bloqué 7 jours"]', requirements: '["Contact support"]', auto_lift: false },
            { level: 4, name: 'Suspension longue (30j)', duration: 30, emoji: '🚫', color: 'darkred', consequences: '["Accès bloqué 30 jours"]', requirements: '["Entretien requis"]', auto_lift: false },
            { level: 5, name: 'Bannissement', duration: 3650, emoji: '☠️', color: 'black', consequences: '["Compte banni définitivement"]', requirements: '["Aucun recours"]', auto_lift: false },
        ];

        const log = [];
        for (const l of levels) {
            const exists: any = await query('SELECT id FROM suspension_levels WHERE level_number = ?', [l.level]);
            if (!exists || exists.length === 0) {
                await query(`INSERT INTO suspension_levels 
                 (level_number, level_name, duration_days, icon_emoji, badge_color, consequences, requirements_to_lift, auto_lift_after_duration)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [l.level, l.name, l.duration, l.emoji, l.color, l.consequences, l.requirements, l.auto_lift]);
                log.push(`✅ Created Level ${l.level}: ${l.name}`);
            } else {
                log.push(`ℹ️ Level ${l.level} already exists.`);
            }
        }
        return res.json({ success: true, log });
    } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DEBUG 8: Apply Payment & User Status Fix
 * URL: /api/debug/apply-status-fix
 */
router.get('/apply-status-fix', async (_req: any, res) => {
    try {
        console.log('🚀 Applying payment/user status fix via Debug API...');
        const log: string[] = [];

        // Get DB Version
        const version: any = await query('SELECT VERSION() as v');
        log.push(`📦 Database Version: ${version[0]?.v || 'Unknown'}`);

        // 1. Fix Payments Table
        try {
            await query(`ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payment_status`);
            log.push('✅ Dropped chk_payment_status (if existed)');
        } catch (e: any) {
            try {
                await query(`ALTER TABLE payments DROP CHECK chk_payment_status`);
                log.push('✅ Dropped chk_payment_status using DROP CHECK');
            } catch (e2: any) {
                log.push(`⚠️ Note: Could not drop payment constraint: ${e2.message}`);
            }
        }

        await query(`ALTER TABLE payments ADD CONSTRAINT chk_payment_status 
                     CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled', 'deactivated', 'blocked', 'deleted'))`);
        log.push('✅ Added new chk_payment_status constraint');

        // 2. Fix Users Table
        try {
            await query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_status`);
            log.push('✅ Dropped chk_status (if existed)');
        } catch (e: any) {
            try {
                await query(`ALTER TABLE users DROP CHECK chk_status`);
                log.push('✅ Dropped chk_status using DROP CHECK');
            } catch (e2: any) {
                log.push(`⚠️ Note: Could not drop user constraint: ${e2.message}`);
            }
        }

        await query(`ALTER TABLE users ADD CONSTRAINT chk_status 
                     CHECK (status IN ('pending', 'active', 'suspended', 'rejected', 'deactivated'))`);
        log.push('✅ Added new chk_status constraint');

        return res.json({ success: true, message: 'Constraints updated successfully', log });
    } catch (error: any) {
        console.error('❌ Error applying status fix:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DEBUG 9: File System Diagnostics
 * URL: /api/debug/dir-diag
 */
router.get('/dir-diag', async (_req: any, res) => {
    const fs = require('fs');
    const path = require('path');

    const diag = {
        cwd: process.cwd(),
        dirname: __dirname,
        publicPath: path.join(__dirname, '..', 'public'),
        backendPublicPath: path.join(process.cwd(), 'backend', 'public'),
        directPublicPath: path.join(process.cwd(), 'public'),
        exists: {
            public: fs.existsSync(path.join(__dirname, '..', 'public')),
            backendPublic: fs.existsSync(path.join(process.cwd(), 'backend', 'public')),
            directPublic: fs.existsSync(path.join(process.cwd(), 'public')),
            avatars: fs.existsSync(path.join(process.cwd(), 'public', 'uploads', 'avatars')) || fs.existsSync(path.join(process.cwd(), 'backend', 'public', 'uploads', 'avatars'))
        },
        filesInAvatars: [] as string[]
    };

    try {
        const avatarDir = diag.exists.directPublic
            ? path.join(process.cwd(), 'public', 'uploads', 'avatars')
            : (diag.exists.backendPublic ? path.join(process.cwd(), 'backend', 'public', 'uploads', 'avatars') : null);

        if (avatarDir && fs.existsSync(avatarDir)) {
            diag.filesInAvatars = fs.readdirSync(avatarDir).slice(0, 10);
        }
    } catch (e) { }

    return res.json(diag);
});

export default router;
