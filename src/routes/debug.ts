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
router.get('/env', (req: Request, res: Response) => {
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

export default router;
