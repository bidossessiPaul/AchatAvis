// Controller : attribution d'un pack à un artisan (admin).

import { Request, Response } from 'express';
import * as attributionService from '../../services/signalement/attributionService';

export const create = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = req.user?.userId;
        if (!adminId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        const { artisan_id, pack_id, note } = req.body;
        if (!artisan_id || !pack_id) {
            res.status(400).json({ error: 'artisan_id et pack_id requis' });
            return;
        }

        const attribution = await attributionService.createAttribution(
            { artisan_id, pack_id, note },
            adminId
        );
        res.status(201).json({ attribution });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
};

export const listForArtisan = async (req: Request, res: Response): Promise<void> => {
    try {
        const artisanId = req.params.artisan_id;
        const attributions = await attributionService.listAttributionsForArtisan(artisanId);
        const remaining = await attributionService.getRemainingAvisForArtisan(artisanId);
        res.json({ attributions, avis_remaining: remaining });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
    try {
        await attributionService.softDeleteAttribution(req.params.id);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const updateNote = async (req: Request, res: Response): Promise<void> => {
    try {
        const { note } = req.body;
        const updated = await attributionService.updateAttributionNote(
            req.params.id,
            typeof note === 'string' ? note.trim() || null : null
        );
        if (!updated) {
            res.status(404).json({ error: 'Attribution introuvable' });
            return;
        }
        res.json({ attribution: updated });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const togglePause = async (req: Request, res: Response): Promise<void> => {
    try {
        const updated = await attributionService.toggleAttributionPause(req.params.id);
        if (!updated) {
            res.status(404).json({ error: 'Attribution introuvable' });
            return;
        }
        res.json({ attribution: updated });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};
