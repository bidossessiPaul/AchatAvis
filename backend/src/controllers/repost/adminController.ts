// Controller admin : CRUD paliers (abonnés + vues), CRUD vidéothèque,
// validation des comptes, des soumissions de repost et des déclarations de vues.

import { Request, Response } from 'express';
import * as tierService from '../../services/repost/tierService';
import * as viewTierService from '../../services/repost/viewTierService';
import * as videoService from '../../services/repost/videoService';
import * as accountService from '../../services/repost/accountService';
import * as submissionService from '../../services/repost/submissionService';
import * as viewUpdateService from '../../services/repost/viewUpdateService';
import * as payoutService from '../../services/repost/payoutService';

// ========== Paliers d'abonnés ==========

export const listTiers = async (req: Request, res: Response): Promise<void> => {
    try {
        const includeInactive = req.query.includeInactive === '1';
        const tiers = await tierService.listTiers(includeInactive);
        res.json({ tiers });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const createTier = async (req: Request, res: Response): Promise<void> => {
    try {
        const { label, min_followers, max_followers, amount_cents, sort_order } = req.body;
        if (!label || typeof label !== 'string' || label.trim().length === 0) {
            res.status(400).json({ error: 'Libellé requis' });
            return;
        }
        if (!Number.isInteger(min_followers) || min_followers < 0) {
            res.status(400).json({ error: 'min_followers doit être un entier >= 0' });
            return;
        }
        if (max_followers !== undefined && max_followers !== null && (!Number.isInteger(max_followers) || max_followers < min_followers)) {
            res.status(400).json({ error: 'max_followers doit être un entier >= min_followers' });
            return;
        }
        if (!Number.isInteger(amount_cents) || amount_cents < 0) {
            res.status(400).json({ error: 'amount_cents doit être un entier >= 0' });
            return;
        }

        const tier = await tierService.createTier({
            label: label.trim(),
            min_followers,
            max_followers: max_followers ?? null,
            amount_cents,
            sort_order,
        });
        res.status(201).json({ tier });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const updateTier = async (req: Request, res: Response): Promise<void> => {
    try {
        const updated = await tierService.updateTier(req.params.id, req.body);
        if (!updated) {
            res.status(404).json({ error: 'Palier introuvable' });
            return;
        }
        res.json({ tier: updated });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const removeTier = async (req: Request, res: Response): Promise<void> => {
    try {
        await tierService.softDeleteTier(req.params.id);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

// ========== Paliers de vues ==========

export const listViewTiers = async (req: Request, res: Response): Promise<void> => {
    try {
        const subscriberTierId = req.query.subscriber_tier_id as string | undefined;
        const includeInactive = req.query.includeInactive === '1';
        const tiers = await viewTierService.listViewTiers(subscriberTierId, includeInactive);
        res.json({ viewTiers: tiers });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const createViewTier = async (req: Request, res: Response): Promise<void> => {
    try {
        const { subscriber_tier_id, label, min_views, max_views, amount_cents, sort_order } = req.body;
        if (!subscriber_tier_id || typeof subscriber_tier_id !== 'string') {
            res.status(400).json({ error: 'subscriber_tier_id requis' });
            return;
        }
        if (!label || typeof label !== 'string' || label.trim().length === 0) {
            res.status(400).json({ error: 'Libellé requis' });
            return;
        }
        if (!Number.isInteger(min_views) || min_views < 0) {
            res.status(400).json({ error: 'min_views doit être un entier >= 0' });
            return;
        }
        if (max_views !== undefined && max_views !== null && (!Number.isInteger(max_views) || max_views < min_views)) {
            res.status(400).json({ error: 'max_views doit être un entier >= min_views' });
            return;
        }
        if (!Number.isInteger(amount_cents) || amount_cents < 0) {
            res.status(400).json({ error: 'amount_cents doit être un entier >= 0' });
            return;
        }

        const tier = await viewTierService.createViewTier({
            subscriber_tier_id,
            label: label.trim(),
            min_views,
            max_views: max_views ?? null,
            amount_cents,
            sort_order,
        });
        res.status(201).json({ viewTier: tier });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const updateViewTier = async (req: Request, res: Response): Promise<void> => {
    try {
        const updated = await viewTierService.updateViewTier(req.params.id, req.body);
        if (!updated) {
            res.status(404).json({ error: 'Palier de vues introuvable' });
            return;
        }
        res.json({ viewTier: updated });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const removeViewTier = async (req: Request, res: Response): Promise<void> => {
    try {
        await viewTierService.softDeleteViewTier(req.params.id);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

// ========== Vidéothèque ==========

export const listVideos = async (req: Request, res: Response): Promise<void> => {
    try {
        const includeInactive = req.query.includeInactive !== '0';
        const videos = await videoService.listVideosForAdmin(includeInactive);
        res.json({ videos });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const createVideo = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = req.user?.userId;
        if (!adminId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        const { title, description, video_url, thumbnail_url, platforms, min_tier_id } = req.body;
        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            res.status(400).json({ error: 'Titre requis' });
            return;
        }
        if (!video_url || typeof video_url !== 'string' || video_url.trim().length === 0) {
            res.status(400).json({ error: 'Lien Drive de la vidéo requis' });
            return;
        }

        const video = await videoService.createVideo(adminId, {
            title: title.trim(),
            description,
            video_url: video_url.trim(),
            thumbnail_url,
            platforms,
            min_tier_id: min_tier_id ?? null,
        });
        res.status(201).json({ video });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const updateVideo = async (req: Request, res: Response): Promise<void> => {
    try {
        const updated = await videoService.updateVideo(req.params.id, req.body);
        if (!updated) {
            res.status(404).json({ error: 'Vidéo introuvable' });
            return;
        }
        res.json({ video: updated });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const removeVideo = async (req: Request, res: Response): Promise<void> => {
    try {
        await videoService.softDeleteVideo(req.params.id);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

// ========== Comptes réseaux sociaux (candidatures) ==========

export const listAccounts = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
        const offset = (page - 1) * limit;
        const statusRaw = (req.query.status as string) || 'pending';
        const status: 'pending' | 'approved' | 'rejected' | 'all' =
            ['pending', 'approved', 'rejected', 'all'].includes(statusRaw) ? (statusRaw as any) : 'pending';

        const accounts = await accountService.listAccountsForAdmin(status, limit, offset);
        res.json({ accounts, page, limit, status });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const reviewAccount = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = req.user?.userId;
        if (!adminId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        const { status, tier_id, admin_notes } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            res.status(400).json({ error: 'status doit être approved ou rejected' });
            return;
        }
        await accountService.reviewAccount(req.params.id, adminId, status, tier_id ?? null, admin_notes);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
};

export const updateAccountTier = async (req: Request, res: Response): Promise<void> => {
    try {
        const { tier_id } = req.body;
        if (!tier_id || typeof tier_id !== 'string') {
            res.status(400).json({ error: 'tier_id requis' });
            return;
        }
        await accountService.updateAccountTier(req.params.id, tier_id);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
};

export const setAccountBlock = async (req: Request, res: Response): Promise<void> => {
    try {
        const { blocked } = req.body;
        if (typeof blocked !== 'boolean') {
            res.status(400).json({ error: 'blocked (boolean) requis' });
            return;
        }
        await accountService.setAccountBlocked(req.params.id, blocked);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
};

export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
    try {
        await accountService.softDeleteAccount(req.params.id);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

// ========== Soumissions de repost ==========

export const listSubmissions = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
        const offset = (page - 1) * limit;
        const statusRaw = (req.query.status as string) || 'pending';
        const status: 'pending' | 'approved' | 'rejected' | 'all' =
            ['pending', 'approved', 'rejected', 'all'].includes(statusRaw) ? (statusRaw as any) : 'pending';

        const submissions = await submissionService.listSubmissionsForAdmin(status, limit, offset);
        res.json({ submissions, page, limit, status });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const approveSubmission = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = req.user?.userId;
        if (!adminId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        await submissionService.approveSubmission(req.params.id, adminId);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
};

export const rejectSubmission = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = req.user?.userId;
        if (!adminId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        const { rejection_reason } = req.body;
        if (!rejection_reason || typeof rejection_reason !== 'string') {
            res.status(400).json({ error: 'rejection_reason requise' });
            return;
        }
        await submissionService.rejectSubmission(req.params.id, adminId, rejection_reason);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
};

// ========== Déclarations de vues ==========

export const listViewUpdates = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
        const offset = (page - 1) * limit;
        const statusRaw = (req.query.status as string) || 'pending';
        const status: 'pending' | 'approved' | 'rejected' | 'all' =
            ['pending', 'approved', 'rejected', 'all'].includes(statusRaw) ? (statusRaw as any) : 'pending';

        const updates = await viewUpdateService.listViewUpdatesForAdmin(status, limit, offset);
        res.json({ updates, page, limit, status });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const approveViewUpdate = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = req.user?.userId;
        if (!adminId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        await viewUpdateService.approveViewUpdate(req.params.id, adminId);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
};

export const rejectViewUpdate = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = req.user?.userId;
        if (!adminId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        const { rejection_reason } = req.body;
        if (!rejection_reason || typeof rejection_reason !== 'string') {
            res.status(400).json({ error: 'rejection_reason requise' });
            return;
        }
        await viewUpdateService.rejectViewUpdate(req.params.id, adminId, rejection_reason);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
};

export const stats = async (_req: Request, res: Response): Promise<void> => {
    try {
        const s = await payoutService.getGlobalRepostStats();
        res.json(s);
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};
