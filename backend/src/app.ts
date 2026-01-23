import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth';
import paymentRoutes from './routes/payment';
import artisanRoutes from './routes/artisan';
import guideRoutes from './routes/guide';
import adminRoutes from './routes/admin';
import payoutRoutes from './routes/payouts';
import teamRoutes from './routes/team';
import debugRoutes from './routes/debug';
import antiDetectionRoutes from './routes/antiDetectionRoutes';
import suspensionRoutes from './routes/suspensionRoutes';
import establishmentRoutes from './routes/establishment';
import notificationRoutes from './routes/notifications';
import trustScoreRoutes from './routes/trustScore';
// Refreshing routes...

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 1. CORS Middleware - PERMISSIVE FOR DEBUG
app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    // Permissive for development: allow any origin or fallback to *
    // BUT we must not use * with credentials, so we use the request origin if present
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cookie');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    return next();
});

// 2. Security & Parsers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false // Disable CSP for local dev to avoid SSE issues
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve static files - fallback to backend/public if running from root
app.use('/public', express.static(path.join(process.cwd(), 'backend', 'public')));
app.use('/public', express.static(path.join(process.cwd(), 'public')));
app.use('/api/public', express.static(path.join(process.cwd(), 'backend', 'public')));
app.use('/api/public', express.static(path.join(process.cwd(), 'public')));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        cors: 'enabled'
    });
});

app.get('/api/test-route', (_req, res) => {
    res.json({ message: 'Backend is updated', time: new Date().toISOString() });
});

app.get('/', (_req, res) => {
    res.send('AchatAvis API is running');
});

// Debug routes (BEFORE other routes)
app.use('/api/debug', debugRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/artisan', artisanRoutes);
app.use('/api/guide', guideRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/anti-detection', antiDetectionRoutes);
app.use('/api/suspensions', suspensionRoutes);
app.use('/api/establishments', establishmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/trust-score', trustScoreRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    console.error('SERVER ERROR:', err);

    // Ensure CORS headers are present even on errors
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    return res.status(err.status || 500).json({
        error: 'Internal server error',
        message: err.message,
    });
});

// Start server only if not on Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(Number(PORT), '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📡 Network access on http://192.168.1.207:${PORT}`);
    });
}

export default app;
