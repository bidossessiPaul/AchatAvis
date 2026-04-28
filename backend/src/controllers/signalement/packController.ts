// Controller : CRUD packs signalement (admin).

import { Request, Response } from 'express';
import * as packService from '../../services/signalement/packService';

export const list = async (req: Request, res: Response): Promise<void> => {
    try {
        const includeInactive = req.query.includeInactive === '1';
        const packs = await packService.listPacks(includeInactive);
        res.json({ packs });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const getOne = async (req: Request, res: Response): Promise<void> => {
    try {
        const pack = await packService.getPackById(req.params.id);
        if (!pack) {
            res.status(404).json({ error: 'Pack introuvable' });
            return;
        }
        res.json({ pack });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const create = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, nb_avis, nb_signalements_par_avis, price_cents } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            res.status(400).json({ error: 'Nom requis' });
            return;
        }
        if (!Number.isInteger(nb_avis) || nb_avis <= 0) {
            res.status(400).json({ error: "nb_avis doit être un entier > 0" });
            return;
        }
        if (!Number.isInteger(nb_signalements_par_avis) || nb_signalements_par_avis <= 0) {
            res.status(400).json({ error: 'nb_signalements_par_avis doit être un entier > 0' });
            return;
        }
        if (!Number.isInteger(price_cents) || price_cents < 0) {
            res.status(400).json({ error: 'price_cents doit être un entier >= 0' });
            return;
        }

        const pack = await packService.createPack({
            name: name.trim(),
            nb_avis,
            nb_signalements_par_avis,
            price_cents,
        });
        res.status(201).json({ pack });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const update = async (req: Request, res: Response): Promise<void> => {
    try {
        const updated = await packService.updatePack(req.params.id, req.body);
        if (!updated) {
            res.status(404).json({ error: 'Pack introuvable' });
            return;
        }
        res.json({ pack: updated });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
    try {
        await packService.softDeletePack(req.params.id);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};
