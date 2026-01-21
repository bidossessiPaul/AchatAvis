import { Request, Response } from 'express';
import { guideService } from '../services/guideService';

export const guideController = {
    async getAvailablefiches(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const fiches = await guideService.getAvailablefiches(user.userId);
            return res.json(fiches);
        } catch (error: any) {
            return res.status(500).json({
                error: 'Failed to fetch fiches',
                message: error.message
            });
        }
    },

    async getficheDetails(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const { id } = req.params;
            const fiche = await guideService.getficheDetails(id, user.userId);
            return res.json(fiche);
        } catch (error: any) {
            console.error('Error fetching fiche details:', error);
            return res.status(error.message === 'fiche non trouvée' ? 404 : 500).json({
                error: 'Failed to fetch fiche details',
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
            const result = await guideService.releaseficheLock(id, user.userId);
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
    },

    async getGmailQuotasForFiche(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const { ficheId } = req.params;
            const quotas = await guideService.getGmailQuotasForFiche(user.userId, ficheId);
            return res.json(quotas);
        } catch (error: any) {
            console.error('Error fetching gmail quotas:', error);
            return res.status(500).json({
                error: 'Failed to fetch gmail quotas',
                message: error.message
            });
        }
    }
};
