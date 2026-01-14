import { Request, Response } from 'express';
import { notificationService } from '../services/notificationService';

export const notificationController = {
    /**
     * Establish SSE connection
     */
    stream: (req: Request, res: Response) => {
        const userId = (req as any).user?.userId; // TokenPayload uses userId

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const origin = req.headers.origin || '*';

        // Set headers for SSE with explicit CORS to prevent overwrite
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true'
        });

        // Add client to service
        notificationService.addClient(userId, res);

        // Send initial connection event
        res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE Connection Established' })}\n\n`);
    }
};
