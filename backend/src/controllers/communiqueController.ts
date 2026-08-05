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
 * Guide — communiqué non lu le plus récent (alimente le modal du dashboard)
 * GET /api/communiques/unread
 */
export const unread = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) { res.status(401).json({ error: 'Non authentifié' }); return; }
        const data = await service.getUnreadForUser(req.user.userId);
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

/**
 * Guide — marque tous les communiqués publiés comme lus
 * POST /api/communiques/seen
 */
export const markSeen = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) { res.status(401).json({ error: 'Non authentifié' }); return; }
        await service.markAllSeen(req.user.userId);
        res.json({ message: 'Communiqués marqués comme lus' });
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
 * Admin — réaffiche le communiqué à tous les guides : on efface les traces de
 * lecture, le modal réapparaîtra à leur prochaine connexion.
 * POST /api/admin/communiques/:id/notify
 */
export const adminResendNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const comm = await service.getById(req.params.id);
        if (!comm) { res.status(404).json({ error: 'Communiqué introuvable' }); return; }
        await service.resetReads(req.params.id);
        res.json({ message: 'Le communiqué sera de nouveau affiché à tous les guides' });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};
