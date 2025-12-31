import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
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

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 1. CORS - Reflect origin for maximum compatibility with Vercel and multiple environments
app.use(cors({
    origin: true,
    credentials: true,
    optionsSuccessStatus: 200
}));

// 2. Security & Parsers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
}));

app.use(express.json({
    limit: '10mb',
    verify: (req: any, _res, buf) => {
        if (req.originalUrl && req.originalUrl.includes('webhook')) {
            req.rawBody = buf;
        }
    }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve static files
app.use('/public', express.static(path.join(__dirname, '../public')));

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
