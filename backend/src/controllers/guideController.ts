import { Request, Response } from 'express';
import { guideService } from '../services/guideService';

export const guideController = {
    async getAvailableMissions(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const missions = await guideService.getAvailableMissions(user.userId);
            return res.json(missions);
        } catch (error: any) {
            return res.status(500).json({
                error: 'Failed to fetch missions',
                message: error.message
            });
        }
    },

    async getMissionDetails(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const { id } = req.params;
            const mission = await guideService.getMissionDetails(id, user.userId);
            return res.json(mission);
        } catch (error: any) {
            console.error('Error fetching mission details:', error);
            return res.status(error.message === 'Mission non trouvée' ? 404 : 500).json({
                error: 'Failed to fetch mission details',
                message: error.message
            });
        }
    },

    async submitReviewProof(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const { orderId, proposalId, reviewUrl, googleEmail, artisanId, gmailAccountId } = req.body;

            if (!orderId || !proposalId || !reviewUrl || !googleEmail || !artisanId) {
                return res.status(400).json({ error: 'Tous les champs sont requis, y compris l\'email Google' });
            }

            const result = await guideService.submitReviewProof(user.userId, {
                orderId,
                proposalId,
                reviewUrl,
                googleEmail,
                artisanId,
                gmailAccountId
            });

            return res.json(result);
        } catch (error: any) {
            console.error('Error submitting review proof:', error);
            return res.status(500).json({
                error: 'Failed to submit review proof',
                message: error.message
            });
        }
    },

    async getMySubmissions(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const submissions = await guideService.getMySubmissions(user.userId);
            return res.json(submissions);
        } catch (error: any) {
            console.error('Error fetching submissions:', error);
            return res.status(500).json({
                error: 'Failed to fetch submissions',
                message: error.message
            });
        }
    },

    async releaseLock(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const { id } = req.params;
            const result = await guideService.releaseMissionLock(id, user.userId);
            return res.json(result);
        } catch (error: any) {
            console.error('Error releasing lock:', error);
            return res.status(500).json({
                error: 'Failed to release lock',
                message: error.message
            });
        }
    },

    async getStats(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const stats = await guideService.getGuideStats(user.userId);
            return res.json(stats);
        } catch (error: any) {
            console.error('Error fetching guide stats:', error);
            return res.status(500).json({
                error: 'Failed to fetch guide stats',
                message: error.message
            });
        }
    }
};
