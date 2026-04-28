// Controller : file de validation des preuves (admin).

import { Request, Response } from 'express';
import * as proofService from '../../services/signalement/proofService';
import { getGlobalSignalementStats } from '../../services/signalement/payoutService';

export const listPending = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
        const offset = (page - 1) * limit;
        const proofs = await proofService.listPendingProofs(limit, offset);
        res.json({ proofs, page, limit });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const stats = async (_req: Request, res: Response): Promise<void> => {
    try {
        const s = await getGlobalSignalementStats();
        res.json(s);
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const approve = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = req.user?.userId;
        if (!adminId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        await proofService.validateProof(req.params.proof_id, adminId);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
};

export const reject = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = req.user?.userId;
        if (!adminId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        const { rejection_reason } = req.body;
        if (!rejection_reason || typeof rejection_reason !== 'string') {
            res.status(400).json({ error: 'rejection_reason requise' });
            return;
        }
        await proofService.rejectProof(req.params.proof_id, adminId, rejection_reason.trim());
        res.json({ ok: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
};
