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

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 1. CORS Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    const allowedOrigins = [
        'https://achatavis.netlify.app',
        'https://achat-avis-site.vercel.app',
        'http://localhost:5173',
        process.env.FRONTEND_URL
    ].filter(Boolean);

    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle Preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    return next();
});

// 2. Security & Parsers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve static files - fallback to backend/public if running from root
app.use('/public', express.static(path.join(process.cwd(), 'backend', 'public')));
app.use('/public', express.static(path.join(process.cwd(), 'public')));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
    });
});

app.get('/', (_req, res) => {
    res.send('AchatAvis API is running');
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/artisan', artisanRoutes);
app.use('/api/guide', guideRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/payouts', payoutRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    console.error('SERVER ERROR:', err);

    // Ensure CORS headers are present even on errors
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    return res.status(err.status || 500).json({
        error: 'Internal server error',
        message: err.message,
    });
});

// Start server only if not on Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}

export default app;
