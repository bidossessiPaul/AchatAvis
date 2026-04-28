// Controller : endpoints guide (éligibilité, file dispo, réserver, soumettre preuve).

import { Request, Response } from 'express';
import * as eligibilityService from '../../services/signalement/eligibilityService';
import * as slotService from '../../services/signalement/slotService';
import * as proofService from '../../services/signalement/proofService';
import * as payoutService from '../../services/signalement/payoutService';

export const eligibility = async (req: Request, res: Response): Promise<void> => {
    try {
        const guideId = req.user?.userId;
        if (!guideId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        const result = await eligibilityService.checkGuideEligibility(guideId);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const listAvailable = async (req: Request, res: Response): Promise<void> => {
    try {
        const guideId = req.user?.userId;
        if (!guideId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        // Vérif éligibilité (sinon renvoie liste vide + raison)
        const elig = await eligibilityService.checkGuideEligibility(guideId);
        if (!elig.eligible) {
            res.json({ avis: [], eligibility: elig });
            return;
        }
        const avis = await slotService.listAvailableAvisForGuide(guideId);
        res.json({ avis, eligibility: elig });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const myActiveSlots = async (req: Request, res: Response): Promise<void> => {
    try {
        const guideId = req.user?.userId;
        if (!guideId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        const slots = await slotService.listActiveSlotsForGuide(guideId);
        res.json({ slots });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const reserveSlot = async (req: Request, res: Response): Promise<void> => {
    try {
        const guideId = req.user?.userId;
        if (!guideId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        // Vérif éligibilité avant
        const elig = await eligibilityService.checkGuideEligibility(guideId);
        if (!elig.eligible) {
            res.status(403).json({ error: 'Non éligible', reasons: elig.reasons });
            return;
        }

        // Choisit un slot available sur l'avis cible
        // L'API attend slot_id direct, ou avis_id + on prend un slot dispo
        const slotId = req.params.slot_id;
        const slot = await slotService.reserveSlotForGuide(slotId, guideId);
        res.status(201).json({ slot });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
};

/**
 * Variante : réserve N'IMPORTE QUEL slot dispo de l'avis donné (l'UI envoie
 * juste avis_id, on choisit le premier slot available).
 */
export const reserveAnySlot = async (req: Request, res: Response): Promise<void> => {
    try {
        const guideId = req.user?.userId;
        if (!guideId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        const elig = await eligibilityService.checkGuideEligibility(guideId);
        if (!elig.eligible) {
            res.status(403).json({ error: 'Non éligible', reasons: elig.reasons });
            return;
        }

        const avisId = req.params.avis_id;
        const { query } = await import('../../config/database');
        const rows: any = await query(
            `SELECT id FROM signalement_slots
             WHERE avis_id = ? AND status = 'available'
             ORDER BY slot_index ASC LIMIT 1`,
            [avisId]
        );
        if (!rows[0]) {
            res.status(409).json({ error: 'Aucun slot disponible' });
            return;
        }
        const slot = await slotService.reserveSlotForGuide(rows[0].id, guideId);
        res.status(201).json({ slot });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
};

export const submitProof = async (req: Request, res: Response): Promise<void> => {
    try {
        const guideId = req.user?.userId;
        if (!guideId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }

        // multer memory storage attendu : req.file.buffer
        const file = (req as any).file;
        if (!file) {
            res.status(400).json({ error: 'Capture (screenshot) requise' });
            return;
        }
        if (!file.mimetype?.startsWith('image/')) {
            res.status(400).json({ error: 'Seules les images sont acceptées' });
            return;
        }

        const slotId = req.params.slot_id;
        const proof = await proofService.submitProof({
            slotId,
            guideId,
            screenshotBuffer: file.buffer,
            screenshotMimetype: file.mimetype,
            reportLink: req.body.report_link?.trim() || undefined,
            noteGuide: req.body.note_guide?.trim() || undefined,
        });

        res.status(201).json({ proof });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
};

export const myProofs = async (req: Request, res: Response): Promise<void> => {
    try {
        const guideId = req.user?.userId;
        if (!guideId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
        const offset = (page - 1) * limit;
        const proofs = await proofService.listProofsForGuide(guideId, limit, offset);
        res.json({ proofs, page, limit });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const myStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const guideId = req.user?.userId;
        if (!guideId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        const stats = await payoutService.getGuideSignalementStats(guideId);
        const balance = await payoutService.getGuideSignalementBalanceCents(guideId);
        res.json({ ...stats, balance_cents: balance });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};
