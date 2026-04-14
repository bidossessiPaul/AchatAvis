import { Request, Response } from 'express';
import * as service from '../services/identityVerificationService';

/**
 * User endpoint — submit identity document
 * POST /api/auth/identity-verification
 */
export const submit = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
        if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });

        const result = await service.submitVerification(req.user.userId, req.file.buffer, req.file.mimetype);
        return res.json({
            message: 'Document envoyé avec succès. Votre compte sera vérifié sous 24h.',
            verification: result,
        });
    } catch (err: any) {
        console.error('submit identity verif error:', err);
        return res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

/**
 * User endpoint — get current verification status
 * GET /api/auth/identity-verification/status
 */
export const getStatus = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
        const latest = await service.getLatestForUser(req.user.userId);
        return res.json({ verification: latest });
    } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

/**
 * Admin endpoint — list all verifications (optionally filtered by ?status=pending|approved|rejected)
 * GET /api/admin/identity-verifications
 */
export const adminList = async (req: Request, res: Response) => {
    try {
        const status = req.query.status as string | undefined;
        const list = await service.listVerifications(status);
        return res.json(list);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

/**
 * Admin endpoint — approve a verification
 * POST /api/admin/identity-verifications/:id/approve
 */
export const adminApprove = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
        const result = await service.approveVerification(req.params.id, req.user.userId);
        return res.json({ message: 'Compte réactivé', ...result });
    } catch (err: any) {
        return res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
};

/**
 * Admin endpoint — reject a verification (permanent block)
 * POST /api/admin/identity-verifications/:id/reject
 */
export const adminReject = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
        const reason = (req.body?.reason as string) || '';
        const result = await service.rejectVerification(req.params.id, req.user.userId, reason);
        return res.json({ message: 'Compte bloqué définitivement', ...result });
    } catch (err: any) {
        return res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
};
