import { Request, Response } from 'express';
import * as gmailVerifService from '../services/gmailVerificationService';

// ─── Routes guide ────────────────────────────────────────────────────────────

/**
 * POST /anti-detection/gmail-accounts/:accountId/verify
 * Le guide soumet un screenshot + lien Maps pour un compte Gmail.
 */
export const submit = async (req: Request, res: Response): Promise<void> => {
    try {
        const gmailAccountId = parseInt(req.params.accountId, 10);
        const guideId = req.user!.userId;
        const { maps_profile_url } = req.body;

        if (!req.file) {
            res.status(400).json({ error: 'Screenshot requis' });
            return;
        }
        if (!maps_profile_url) {
            res.status(400).json({ error: 'Le lien Google Maps est requis' });
            return;
        }
        if (isNaN(gmailAccountId)) {
            res.status(400).json({ error: 'ID de compte Gmail invalide' });
            return;
        }

        const verif = await gmailVerifService.submitVerification(
            gmailAccountId,
            guideId,
            req.file.buffer,
            req.file.mimetype,
            maps_profile_url
        );

        res.status(201).json({ success: true, verification: verif });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur lors de la soumission' });
    }
};

/**
 * GET /anti-detection/gmail-accounts/:accountId/verification-status
 * Retourne la dernière vérification pour ce compte Gmail.
 */
export const getStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const gmailAccountId = parseInt(req.params.accountId, 10);
        if (isNaN(gmailAccountId)) {
            res.status(400).json({ error: 'ID de compte Gmail invalide' });
            return;
        }

        const verif = await gmailVerifService.getLatestForGmail(gmailAccountId);
        res.json({ verification: verif });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

// ─── Routes admin ─────────────────────────────────────────────────────────────

/**
 * GET /admin/gmail-verifications?status=pending
 * Liste toutes les vérifications Gmail (filtre optionnel par status).
 */
export const list = async (req: Request, res: Response): Promise<void> => {
    try {
        const status = req.query.status as string | undefined;
        const verifications = await gmailVerifService.listPending(status);
        res.json({ verifications });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

/**
 * PATCH /admin/gmail-verifications/:id/approve
 * Approuve une vérification et débloque le compte Gmail.
 */
export const approve = async (req: Request, res: Response): Promise<void> => {
    try {
        const verificationId = req.params.id;
        const adminId = req.user!.userId;

        await gmailVerifService.approveVerification(verificationId, adminId);
        res.json({ success: true });
    } catch (err: any) {
        const status = err.message.includes('introuvable') ? 404
            : err.message.includes('déjà traitée') ? 409 : 500;
        res.status(status).json({ error: err.message });
    }
};

/**
 * PATCH /admin/gmail-verifications/:id/reject
 * Rejette une vérification. Le compte Gmail reste bloqué.
 */
export const reject = async (req: Request, res: Response): Promise<void> => {
    try {
        const verificationId = req.params.id;
        const adminId = req.user!.userId;
        const { reason } = req.body;

        await gmailVerifService.rejectVerification(verificationId, adminId, reason || '');
        res.json({ success: true });
    } catch (err: any) {
        const status = err.message.includes('introuvable') ? 404
            : err.message.includes('déjà traitée') ? 409 : 500;
        res.status(status).json({ error: err.message });
    }
};
