// Controller guide : gérer mes comptes RS, consulter la vidéothèque (par
// compte), soumettre une preuve de repost, déclarer les vues au fil du temps.

import { Request, Response } from 'express';
import * as accountService from '../../services/repost/accountService';
import * as videoService from '../../services/repost/videoService';
import * as submissionService from '../../services/repost/submissionService';
import * as viewUpdateService from '../../services/repost/viewUpdateService';
import * as payoutService from '../../services/repost/payoutService';

// ========== Mes comptes ==========

export const submitAccount = async (req: Request, res: Response): Promise<void> => {
    try {
        const guideId = req.user?.userId;
        if (!guideId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }

        const file = (req as any).file;
        if (!file) {
            res.status(400).json({ error: 'Capture (screenshot) requise' });
            return;
        }

        const { platform, profile_link, claimed_followers_count } = req.body;
        if (!platform || typeof platform !== 'string') {
            res.status(400).json({ error: 'Plateforme requise' });
            return;
        }
        if (!profile_link || typeof profile_link !== 'string') {
            res.status(400).json({ error: 'Lien de profil requis' });
            return;
        }
        const followers = parseInt(claimed_followers_count, 10);
        if (!Number.isInteger(followers) || followers < 0) {
            res.status(400).json({ error: "Nombre d'abonnés invalide" });
            return;
        }

        const account = await accountService.submitAccount({
            guideId,
            platform: platform.trim(),
            profileLink: profile_link.trim(),
            claimedFollowersCount: followers,
            screenshotBuffer: file.buffer,
        });
        res.status(201).json({ account });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
};

export const myAccounts = async (req: Request, res: Response): Promise<void> => {
    try {
        const guideId = req.user?.userId;
        if (!guideId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        const accounts = await accountService.listAccountsForGuide(guideId);
        res.json({ accounts });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

// ========== Vidéothèque (par compte) ==========

export const listAvailableVideos = async (req: Request, res: Response): Promise<void> => {
    try {
        const guideId = req.user?.userId;
        if (!guideId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        const accountId = req.query.account_id as string | undefined;
        if (!accountId) {
            res.status(400).json({ error: 'account_id requis' });
            return;
        }
        const account = await accountService.getAccountById(accountId);
        if (!account || account.guide_id !== guideId) {
            res.status(403).json({ error: 'Ce compte ne vous appartient pas' });
            return;
        }
        const videos = await videoService.listVideosForAccount(accountId);
        res.json({ videos });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

// ========== Soumission de preuve de repost ==========

export const submitProof = async (req: Request, res: Response): Promise<void> => {
    try {
        const guideId = req.user?.userId;
        if (!guideId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }

        const file = (req as any).file;
        if (!file) {
            res.status(400).json({ error: 'Capture (screenshot) requise' });
            return;
        }

        const { account_id, video_id, post_link } = req.body;
        if (!account_id || typeof account_id !== 'string') {
            res.status(400).json({ error: 'account_id requis' });
            return;
        }
        const account = await accountService.getAccountById(account_id);
        if (!account || account.guide_id !== guideId) {
            res.status(403).json({ error: 'Ce compte ne vous appartient pas' });
            return;
        }
        if (account.blocked_at) {
            res.status(403).json({ error: 'Ce compte est bloqué, vous ne pouvez plus soumettre de repost' });
            return;
        }
        if (!video_id || typeof video_id !== 'string') {
            res.status(400).json({ error: 'video_id requis' });
            return;
        }
        if (!post_link || typeof post_link !== 'string') {
            res.status(400).json({ error: 'Lien du repost requis' });
            return;
        }

        const submission = await submissionService.submitProof({
            accountId: account_id,
            videoId: video_id,
            postLink: post_link.trim(),
            screenshotBuffer: file.buffer,
        });
        res.status(201).json({ submission });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
};

export const mySubmissions = async (req: Request, res: Response): Promise<void> => {
    try {
        const guideId = req.user?.userId;
        if (!guideId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
        const offset = (page - 1) * limit;
        const submissions = await submissionService.listSubmissionsForGuide(guideId, limit, offset);
        res.json({ submissions, page, limit });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

// ========== Déclarations de vues ==========

export const submitViewUpdate = async (req: Request, res: Response): Promise<void> => {
    try {
        const guideId = req.user?.userId;
        if (!guideId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }

        const file = (req as any).file;
        if (!file) {
            res.status(400).json({ error: 'Capture (screenshot) requise' });
            return;
        }

        const { submission_id, declared_views } = req.body;
        if (!submission_id || typeof submission_id !== 'string') {
            res.status(400).json({ error: 'submission_id requis' });
            return;
        }
        const submission = await submissionService.getSubmissionById(submission_id);
        if (!submission) {
            res.status(404).json({ error: 'Repost introuvable' });
            return;
        }
        const account = await accountService.getAccountById(submission.account_id);
        if (!account || account.guide_id !== guideId) {
            res.status(403).json({ error: 'Ce repost ne vous appartient pas' });
            return;
        }
        const views = parseInt(declared_views, 10);
        if (!Number.isInteger(views) || views < 0) {
            res.status(400).json({ error: 'Nombre de vues invalide' });
            return;
        }

        const update = await viewUpdateService.submitViewUpdate({
            submissionId: submission_id,
            declaredViews: views,
            screenshotBuffer: file.buffer,
        });
        res.status(201).json({ update });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
};

export const listViewUpdatesForSubmission = async (req: Request, res: Response): Promise<void> => {
    try {
        const guideId = req.user?.userId;
        if (!guideId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        const submission = await submissionService.getSubmissionById(req.params.submissionId);
        if (!submission) {
            res.status(404).json({ error: 'Repost introuvable' });
            return;
        }
        const account = await accountService.getAccountById(submission.account_id);
        if (!account || account.guide_id !== guideId) {
            res.status(403).json({ error: 'Ce repost ne vous appartient pas' });
            return;
        }
        const updates = await viewUpdateService.listViewUpdatesForSubmission(req.params.submissionId);
        res.json({ updates });
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
        const stats = await payoutService.getGuideRepostStats(guideId);
        res.json(stats);
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};
