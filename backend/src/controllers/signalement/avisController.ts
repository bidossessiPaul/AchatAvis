// Controller : vue globale admin des avis à signaler + édition payout +
// transitions de statut (cible supprimée, annulation).

import { Request, Response } from 'express';
import * as avisService from '../../services/signalement/avisService';
import { query } from '../../config/database';

export const list = async (req: Request, res: Response): Promise<void> => {
    try {
        const status = req.query.status as string | undefined;
        const artisanId = req.query.artisan_id as string | undefined;
        const raison = req.query.raison as string | undefined;
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(200, parseInt(req.query.limit as string) || 50);
        const offset = (page - 1) * limit;

        const { rows, total } = await avisService.listAvisForAdmin({
            status: status as any,
            artisanId,
            raison,
            limit,
            offset,
        });

        res.json({
            avis: rows,
            pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const getOne = async (req: Request, res: Response): Promise<void> => {
    try {
        const avis = await avisService.getAvisById(req.params.id);
        if (!avis) {
            res.status(404).json({ error: 'Avis introuvable' });
            return;
        }

        // Joint slots + proofs pour la vue détail
        const slots: any = await query(
            `SELECT * FROM signalement_slots WHERE avis_id = ? ORDER BY slot_index ASC`,
            [req.params.id]
        );
        const proofs: any = await query(
            `SELECT * FROM signalement_proofs WHERE avis_id = ? AND deleted_at IS NULL
             ORDER BY submitted_at DESC`,
            [req.params.id]
        );

        res.json({ avis, slots, proofs });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const updatePayout = async (req: Request, res: Response): Promise<void> => {
    try {
        const { payout_per_signalement_cents } = req.body;
        if (!Number.isInteger(payout_per_signalement_cents) || payout_per_signalement_cents < 0) {
            res.status(400).json({ error: 'payout_per_signalement_cents doit être un entier >= 0' });
            return;
        }
        await avisService.updateAvisPayout(req.params.id, payout_per_signalement_cents);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
};

export const markGoogleDeleted = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = req.user?.userId;
        if (!adminId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        await avisService.markGoogleDeleted(req.params.id, adminId);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
};

export const cancel = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = req.user?.userId;
        if (!adminId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        const refundSlot = !!req.body.refund_slot;
        await avisService.cancelAvisByAdmin(req.params.id, adminId, refundSlot);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
};
