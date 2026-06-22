import { Request, Response } from 'express';
import * as geoService from '../services/geoService';
import { query } from '../config/database';
import { uploadToCloudinary } from '../services/cloudinaryService';

// ─── Routes guide ─────────────────────────────────────────────────────────────

/**
 * GET /api/geo/missions
 * Retourne les missions actives avec les infos artisan et le compteur du guide.
 */
export const getMissions = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const missions = await geoService.getMissions(user.userId);
        return res.json(missions);
    } catch (error: any) {
        return res.status(500).json({ error: 'Erreur lors de la récupération des missions', message: error.message });
    }
};

/**
 * GET /api/geo/missions/:missionId/platforms
 * Retourne les plateformes actives avec l'état de soumission du guide.
 */
export const getMissionPlatforms = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { missionId } = req.params;

        if (!missionId) {
            return res.status(400).json({ error: 'missionId requis' });
        }

        const platforms = await geoService.getMissionPlatforms(missionId, user.userId);
        return res.json(platforms);
    } catch (error: any) {
        return res.status(500).json({ error: 'Erreur lors de la récupération des plateformes', message: error.message });
    }
};

/**
 * POST /api/geo/submissions
 * Soumet une citation (URL de preuve) pour une plateforme sur une mission.
 * Vérifie que la mission existe et est active.
 * Gère le doublon UNIQUE(guide_id, platform_id, mission_id) → 409.
 */
export const submitCitation = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { missionId, platformId, submissionUrl } = req.body;

        // Validation des champs obligatoires
        if (!missionId || !platformId || !submissionUrl) {
            return res.status(400).json({ error: 'missionId, platformId et submissionUrl sont requis' });
        }

        // Vérifie que la mission existe et est active
        const missions: any[] = await query(
            `SELECT id, status FROM geo_missions WHERE id = :id AND deleted_at IS NULL`,
            { id: missionId }
        );

        if (!missions || missions.length === 0) {
            return res.status(404).json({ error: 'Mission introuvable' });
        }

        if (missions[0].status !== 'active') {
            return res.status(400).json({ error: 'Cette mission n\'est plus active' });
        }

        // Upload screenshot Cloudinary si fourni
        let screenshotUrl: string | undefined;
        if (req.file) {
            const uploaded = await uploadToCloudinary(req.file.buffer, 'geo-citations', { skipTransform: true });
            screenshotUrl = uploaded.secure_url;
        }

        const submission = await geoService.submitCitation({
            missionId,
            platformId: Number(platformId),
            guideId: user.userId,
            submissionUrl,
            screenshotUrl,
        });

        return res.status(201).json(submission);
    } catch (error: any) {
        // Contrainte UNIQUE violée : le guide a déjà soumis pour cette plateforme/mission
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Vous avez déjà soumis une citation pour cette plateforme sur cette mission' });
        }
        return res.status(500).json({ error: 'Erreur lors de la soumission', message: error.message });
    }
};

/**
 * GET /api/geo/my-submissions
 * Retourne l'historique GEO du guide avec infos mission et plateforme.
 */
export const getMyGeoSubmissions = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const submissions = await geoService.getMyGeoSubmissions(user.userId);
        return res.json(submissions);
    } catch (error: any) {
        return res.status(500).json({ error: 'Erreur lors de la récupération des soumissions', message: error.message });
    }
};

// ─── Routes admin ─────────────────────────────────────────────────────────────

/**
 * GET /api/geo/admin/platforms
 * Liste toutes les plateformes. Filtres query : category, active.
 */
export const adminGetPlatforms = async (req: Request, res: Response) => {
    try {
        const { category, active } = req.query;
        const filters: { category?: string; active?: number } = {};

        if (category) filters.category = String(category);
        if (active !== undefined) filters.active = Number(active);

        const platforms = await geoService.adminGetPlatforms(filters);
        return res.json(platforms);
    } catch (error: any) {
        return res.status(500).json({ error: 'Erreur lors de la récupération des plateformes', message: error.message });
    }
};

/**
 * POST /api/geo/admin/platforms
 * Crée une nouvelle plateforme.
 */
export const adminCreatePlatform = async (req: Request, res: Response) => {
    try {
        const { name, url, category } = req.body;

        if (!name || !url || !category) {
            return res.status(400).json({ error: 'name, url et category sont requis' });
        }

        const platform = await geoService.adminCreatePlatform(req.body);
        return res.status(201).json(platform);
    } catch (error: any) {
        return res.status(500).json({ error: 'Erreur lors de la création de la plateforme', message: error.message });
    }
};

/**
 * PUT /api/geo/admin/platforms/:id
 * Met à jour une plateforme existante.
 */
export const adminUpdatePlatform = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);

        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'id de plateforme invalide' });
        }

        const platform = await geoService.adminUpdatePlatform(id, req.body);

        if (!platform) {
            return res.status(404).json({ error: 'Plateforme introuvable' });
        }

        return res.json(platform);
    } catch (error: any) {
        return res.status(500).json({ error: 'Erreur lors de la mise à jour de la plateforme', message: error.message });
    }
};

/**
 * GET /api/geo/admin/missions
 * Liste toutes les missions avec artisan + compteurs soumissions. Filtre query : status.
 */
export const adminGetMissions = async (req: Request, res: Response) => {
    try {
        const { status } = req.query;
        const filters: { status?: string } = {};

        if (status) filters.status = String(status);

        const missions = await geoService.adminGetMissions(filters);
        return res.json(missions);
    } catch (error: any) {
        return res.status(500).json({ error: 'Erreur lors de la récupération des missions', message: error.message });
    }
};

/**
 * POST /api/geo/admin/missions
 * Crée une nouvelle mission GEO.
 */
export const adminCreateMission = async (req: Request, res: Response) => {
    try {
        const { artisan_id, external_name, name } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'name est requis' });
        }
        if (!artisan_id && !external_name) {
            return res.status(400).json({ error: 'artisan_id ou external_name est requis' });
        }

        const mission = await geoService.adminCreateMission({
            ...req.body,
            activity_type: req.body.activity_type || '',
            city: req.body.city || '',
        });
        return res.status(201).json(mission);
    } catch (error: any) {
        return res.status(500).json({ error: 'Erreur lors de la création de la mission', message: error.message });
    }
};

/**
 * PUT /api/geo/admin/missions/:id
 * Met à jour une mission existante.
 */
export const adminUpdateMission = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'id de mission requis' });
        }

        const mission = await geoService.adminUpdateMission(id, req.body);

        if (!mission) {
            return res.status(404).json({ error: 'Mission introuvable' });
        }

        return res.json(mission);
    } catch (error: any) {
        return res.status(500).json({ error: 'Erreur lors de la mise à jour de la mission', message: error.message });
    }
};

/**
 * DELETE /api/geo/admin/missions/:id
 * Soft-delete une mission et toutes ses soumissions associées.
 */
export const adminDeleteMission = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'id de mission requis' });
        await geoService.adminDeleteMission(id);
        return res.json({ success: true });
    } catch (error: any) {
        return res.status(500).json({ error: 'Erreur lors de la suppression de la mission', message: error.message });
    }
};

/**
 * GET /api/geo/admin/submissions
 * Liste les soumissions avec toutes les infos liées. Filtres query : status, missionId.
 */
export const adminGetSubmissions = async (req: Request, res: Response) => {
    try {
        const { status, missionId } = req.query;
        const filters: { status?: string; missionId?: string } = {};

        if (status) filters.status = String(status);
        if (missionId) filters.missionId = String(missionId);

        const submissions = await geoService.adminGetSubmissions(filters);
        return res.json(submissions);
    } catch (error: any) {
        return res.status(500).json({ error: 'Erreur lors de la récupération des soumissions', message: error.message });
    }
};

/**
 * PUT /api/geo/admin/submissions/:id
 * Valide ou rejette une soumission.
 * Body : { status: 'validated'|'rejected', rejectionReason?: string }
 */
export const adminValidateSubmission = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { id } = req.params;
        const { status, rejectionReason } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'id de soumission requis' });
        }

        if (!status || !['validated', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'status doit être "validated" ou "rejected"' });
        }

        if (status === 'rejected' && !rejectionReason) {
            return res.status(400).json({ error: 'rejectionReason est requis pour un rejet' });
        }

        const submission = await geoService.adminValidateSubmission(id, status, rejectionReason, user.userId);

        if (!submission) {
            return res.status(404).json({ error: 'Soumission introuvable' });
        }

        return res.json(submission);
    } catch (error: any) {
        return res.status(500).json({ error: 'Erreur lors de la validation de la soumission', message: error.message });
    }
};
