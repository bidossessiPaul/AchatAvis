// Controller : endpoints artisan (soumettre, lister, relancer un avis).

import { Request, Response } from 'express';
import * as avisService from '../../services/signalement/avisService';
import * as attributionService from '../../services/signalement/attributionService';
import { isValidRaison } from '../../constants/signalementRaisons';
import { query } from '../../config/database';

export const summary = async (req: Request, res: Response): Promise<void> => {
    try {
        const artisanId = req.user?.userId;
        if (!artisanId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }

        const remaining = await attributionService.getRemainingAvisForArtisan(artisanId);

        const counts: any = await query(
            `SELECT
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS in_progress,
                SUM(CASE WHEN status = 'terminated_success' THEN 1 ELSE 0 END) AS terminated_success,
                SUM(CASE WHEN status = 'terminated_inconclusive' THEN 1 ELSE 0 END) AS terminated_inconclusive
             FROM signalement_avis
             WHERE artisan_id = ? AND deleted_at IS NULL`,
            [artisanId]
        );
        const c = counts[0] || {};

        // Attribution la plus récente active pour récupérer nb_signalements_par_avis (info UI)
        const lastAttrib: any = await query(
            `SELECT nb_signalements_par_avis FROM signalement_attributions
             WHERE artisan_id = ? AND deleted_at IS NULL
               AND nb_avis_consumed < nb_avis_total
             ORDER BY attributed_at DESC LIMIT 1`,
            [artisanId]
        );

        res.json({
            avis_remaining: remaining,
            avis_in_progress: Number(c.in_progress ?? 0),
            avis_terminated_success: Number(c.terminated_success ?? 0),
            avis_terminated_inconclusive: Number(c.terminated_inconclusive ?? 0),
            has_active_attribution: remaining > 0,
            nb_signalements_par_avis_default: lastAttrib[0]?.nb_signalements_par_avis ?? null,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const listMyAvis = async (req: Request, res: Response): Promise<void> => {
    try {
        const artisanId = req.user?.userId;
        if (!artisanId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        const avis = await avisService.listAvisForArtisan(artisanId);
        res.json({ avis });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const submitAvis = async (req: Request, res: Response): Promise<void> => {
    try {
        const artisanId = req.user?.userId;
        if (!artisanId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        const { google_review_url, raison, raison_details } = req.body;

        if (!google_review_url || typeof google_review_url !== 'string') {
            res.status(400).json({ error: 'google_review_url requise' });
            return;
        }
        if (!raison || !isValidRaison(raison)) {
            res.status(400).json({ error: 'Raison invalide' });
            return;
        }

        const avis = await avisService.createAvisForArtisan(artisanId, {
            google_review_url: google_review_url.trim(),
            raison,
            raison_details: raison_details?.trim(),
        });
        res.status(201).json({ avis });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
};

export const relaunch = async (req: Request, res: Response): Promise<void> => {
    try {
        const artisanId = req.user?.userId;
        if (!artisanId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        const sourceAvisId = req.params.id;
        const newAvis = await avisService.relaunchAvis(artisanId, sourceAvisId);
        res.status(201).json({ avis: newAvis });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
};
