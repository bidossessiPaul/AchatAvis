import { Request, Response } from 'express';
import * as service from '../services/communiqueService';

/**
 * Public (authenticated) — list all published communiques for guides
 * GET /api/communiques
 */
export const listPublished = async (_req: Request, res: Response) => {
    try {
        const data = await service.listPublished();
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

/**
 * Admin — list all communiques (published or not)
 * GET /api/admin/communiques
 */
export const adminList = async (_req: Request, res: Response) => {
    try {
        const data = await service.listAll();
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

/**
 * Admin — create
 * POST /api/admin/communiques
 */
export const adminCreate = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) { res.status(401).json({ error: 'Non authentifié' }); return; }
        if (!req.body?.title || !req.body?.content) {
            res.status(400).json({ error: 'Titre et contenu sont requis' });
            return;
        }
        const created = await service.create(req.body, req.user.userId);
        res.status(201).json(created);
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

/**
 * Admin — update
 * PUT /api/admin/communiques/:id
 */
export const adminUpdate = async (req: Request, res: Response) => {
    try {
        const updated = await service.update(req.params.id, req.body);
        res.json(updated);
    } catch (err: any) {
        const status = err.message?.includes('introuvable') ? 404 : 500;
        res.status(status).json({ error: err.message || 'Erreur serveur' });
    }
};

/**
 * Admin — delete
 * DELETE /api/admin/communiques/:id
 */
export const adminDelete = async (req: Request, res: Response) => {
    try {
        await service.remove(req.params.id);
        res.json({ message: 'Communiqué supprimé' });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

/**
 * Admin — resend the notification email to all guides
 * POST /api/admin/communiques/:id/notify
 */
export const adminResendNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const comm = await service.getById(req.params.id);
        if (!comm) { res.status(404).json({ error: 'Communiqué introuvable' }); return; }
        // Fire-and-forget
        service.notifyAllGuides(comm).catch(err => console.error(err));
        res.json({ message: 'Envoi en cours à tous les guides' });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};
