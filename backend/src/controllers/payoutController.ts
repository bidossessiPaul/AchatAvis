import { Request, Response } from 'express';
import { guideService } from '../services/guideService';
import * as adminService from '../services/adminService';

/**
 * Get guide earnings and stats
 */
export const getEarnings = async (req: Request, res: Response) => {
    try {
        const guideId = (req as any).user.userId;
        const stats = await guideService.getEarningsStats(guideId);
        res.json(stats);
    } catch (error) {
        console.error('Get earnings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get guide payout history
 */
export const getPayoutHistory = async (req: Request, res: Response) => {
    try {
        const guideId = (req as any).user.userId;
        const history = await guideService.getPayoutHistory(guideId);
        res.json(history);
    } catch (error) {
        console.error('Get payout history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Request a payout (withdrawal)
 */
export const requestPayout = async (req: Request, res: Response) => {
    try {
        const guideId = (req as any).user.userId;
        const result = await guideService.requestPayout(guideId);
        res.json({ message: 'Demande de retrait envoyée avec succès', ...result });
    } catch (error: any) {
        console.error('Request payout error:', error);
        res.status(400).json({ error: error.message || 'Erreur lors de la demande de retrait' });
    }
};

/**
 * Admin: Get all payout requests
 */
export const getAllPayoutRequests = async (_req: Request, res: Response) => {
    try {
        const payouts = await adminService.getAllPayoutRequests();
        res.json(payouts);
    } catch (error) {
        console.error('Get all payouts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Admin: Update payout status
 */
export const updatePayoutStatus = async (req: Request, res: Response) => {
    const { payoutId } = req.params;
    const { status, adminNote } = req.body;

    try {
        await adminService.updatePayoutStatus(payoutId, status, adminNote);
        res.json({ message: `Le statut du paiement a été mis à jour : ${status}` });
    } catch (error) {
        console.error('Update payout status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get guide payment method
 */
export const getPaymentMethod = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const result = await guideService.getPaymentMethod(userId);
        res.json(result);
    } catch (error) {
        console.error('Get payment method error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Update guide payment method
 */
export const updatePaymentMethod = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { method, details } = req.body;

        if (!method) {
            res.status(400).json({ error: 'Le moyen de paiement est requis' });
            return;
        }

        await guideService.updatePaymentMethod(userId, method, details);
        res.json({ message: 'Moyen de paiement mis à jour avec succès' });
    } catch (error) {
        console.error('Update payment method error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
