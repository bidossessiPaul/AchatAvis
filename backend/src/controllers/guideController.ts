import { Request, Response } from 'express';
import { guideService } from '../services/guideService';
import { query } from '../config/database';
import { invalidateAuthCache } from '../middleware/auth';
import { SUSPENSION_REASON } from '../utils/geolocation';

/**
 * Anti-scraping: per-user sliding window for fiche views.
 * Tracks timestamps of recent views to enforce max 10 views/hour.
 */
const ficheViewTimestamps = new Map<string, number[]>();
const FICHE_RATE_LIMIT = 10;
const FICHE_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Auto-suspension threshold:
 * If a guide has viewed 5+ fiches AND has 0 submissions ever → auto-suspend.
 * Only applies to guides who never submitted (scraper pattern).
 */
const SCRAPER_VIEW_THRESHOLD = 5;

export const guideController = {
    async getAvailablefiches(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const fiches = await guideService.getAvailablefiches(user.userId);
            return res.json(fiches);
        } catch (error: any) {
            return res.status(500).json({
                error: 'Failed to fetch fiches',
                message: error.message
            });
        }
    },

    async getficheDetails(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const userId = user.userId;

            // --- Anti-scraping: rate limit (10 fiches/heure) ---
            const now = Date.now();
            const timestamps = ficheViewTimestamps.get(userId) || [];
            const recent = timestamps.filter(t => now - t < FICHE_RATE_WINDOW_MS);
            if (recent.length >= FICHE_RATE_LIMIT) {
                return res.status(429).json({
                    error: 'Vous consultez trop de fiches. Postez un avis avant de continuer.',
                    message: 'RATE_LIMITED'
                });
            }
            recent.push(now);
            ficheViewTimestamps.set(userId, recent);

            // --- Anti-scraping: increment fiches_viewed + auto-suspend ---
            // Fire-and-forget: increment counter and check if scraper pattern
            (async () => {
                try {
                    await query(
                        'UPDATE users SET fiches_viewed = COALESCE(fiches_viewed, 0) + 1 WHERE id = ?',
                        [userId]
                    );

                    // Check scraper pattern: 5+ views, 0 submissions, still active
                    const rows: any = await query(`
                        SELECT u.fiches_viewed, u.status,
                               (SELECT COUNT(*) FROM reviews_submissions WHERE guide_id = u.id) as total_submissions
                        FROM users u WHERE u.id = ?
                    `, [userId]);

                    const userData = rows?.[0];
                    if (
                        userData &&
                        userData.status === 'active' &&
                        userData.fiches_viewed >= SCRAPER_VIEW_THRESHOLD &&
                        userData.total_submissions === 0
                    ) {
                        // Auto-suspend: scraper pattern detected
                        await query(
                            `UPDATE users SET status = 'suspended', suspension_reason = ? WHERE id = ?`,
                            [SUSPENSION_REASON.IDENTITY_VERIFICATION, userId]
                        );
                        invalidateAuthCache(userId);
                        console.log(`🚨 [Anti-scraping] Auto-suspended guide ${userId} — ${userData.fiches_viewed} fiches viewed, 0 submissions`);
                    }
                } catch (err: any) {
                    console.error('Anti-scraping check failed:', err?.message);
                }
            })();

            const { id } = req.params;
            const fiche = await guideService.getficheDetails(id, user.userId);
            return res.json(fiche);
        } catch (error: any) {
            console.error('❌ Error fetching fiche details:', error.message, error.stack);
            const knownErrors = ['fiche non trouvée', 'fiche_FULL', 'DAILY_QUOTA_FULL', 'fiche_LOCKED', 'TRUST_SCORE_BLOCKED', 'TRUST_LEVEL_INSUFFICIENT'];
            const isKnown = knownErrors.some(e => error.message?.includes(e));
            return res.status(isKnown ? 403 : 500).json({
                error: 'Failed to fetch fiche details',
                message: error.message
            });
        }
    },

    async submitReviewProof(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const { orderId } = req.body;

            if (!orderId) {
                return res.status(400).json({ error: 'orderId est requis' });
            }

            const origin = req.get('origin') || req.get('referer');
            const baseUrl = origin ? new URL(origin).origin : undefined;

            const result = await guideService.submitReviewProof(user.userId, {
                ...req.body,
                baseUrl
            });

            return res.json(result);
        } catch (error: any) {
            console.error('Error submitting review proof:', error);
            return res.status(500).json({
                error: 'Failed to submit review proof',
                message: error.message
            });
        }
    },

    async getMySubmissions(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const submissions = await guideService.getMySubmissions(user.userId);
            return res.json(submissions);
        } catch (error: any) {
            console.error('Error fetching submissions:', error);
            return res.status(500).json({
                error: 'Failed to fetch submissions',
                message: error.message
            });
        }
    },

    async releaseLock(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const { id } = req.params;
            const result = await guideService.releaseficheLock(id, user.userId);
            return res.json(result);
        } catch (error: any) {
            console.error('Error releasing lock:', error);
            return res.status(500).json({
                error: 'Failed to release lock',
                message: error.message
            });
        }
    },

    async getCorrectableSubmissions(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const submissions = await guideService.getCorrectableSubmissions(user.userId);
            return res.json(submissions);
        } catch (error: any) {
            console.error('Error fetching correctable submissions:', error);
            return res.status(500).json({ error: 'Failed to fetch correctable submissions', message: error.message });
        }
    },

    async getStats(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const stats = await guideService.getGuideStats(user.userId);
            return res.json(stats);
        } catch (error: any) {
            console.error('Error fetching guide stats:', error);
            return res.status(500).json({
                error: 'Failed to fetch guide stats',
                message: error.message
            });
        }
    },

    async getGmailQuotasForFiche(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const { ficheId } = req.params;
            const quotas = await guideService.getGmailQuotasForFiche(user.userId, ficheId);
            return res.json(quotas);
        } catch (error: any) {
            console.error('Error fetching gmail quotas:', error);
            return res.status(500).json({
                error: 'Failed to fetch gmail quotas',
                message: error.message
            });
        }
    },

    async updateSubmission(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const { id } = req.params;
            const { reviewUrl, googleEmail } = req.body;

            const result = await guideService.updateSubmission(user.userId, id, { reviewUrl, googleEmail });
            return res.json(result);
        } catch (error: any) {
            console.error('Error updating submission:', error);
            return res.status(500).json({
                error: 'Failed to update submission',
                message: error.message
            });
        }
    },

    async getLeaderboard(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const leaderboard = await guideService.getLeaderboard(user.userId);
            return res.json(leaderboard);
        } catch (error: any) {
            console.error('Error fetching leaderboard:', error);
            return res.status(500).json({
                error: 'Failed to fetch leaderboard',
                message: error.message
            });
        }
    }
};
