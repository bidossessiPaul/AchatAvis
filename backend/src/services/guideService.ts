import { query } from '../config/database';
import crypto from 'crypto';
import { antiDetectionService } from './antiDetectionService';
import { notificationService } from './notificationService';

export const guideService = {
    /**
     * Get fiches available for a specific guide
     * A fiche is available if:
     * 1. The order status is not 'draft' or 'cancelled'
     * 2. The order is not yet fully completed (reviews_received < quantity)
     * 3. The guide hasn't already submitted a review for this order
     */
    async getAvailablefiches(guideId: string) {
        // ✅ NOUVEAU : Vérifier si suspendu ou banni
        const user: any = await query('SELECT status, is_banned, role FROM users WHERE id = ?', [guideId]);
        if (user && user.length > 0) {
            if (user[0].is_banned) throw new Error('Votre compte est banni définitivement.');

            if (user[0].status === 'suspended') {
                const { suspensionService } = await import('./suspensionService');
                const isSystemActive = await suspensionService.isSystemEnabled();
                if (isSystemActive && user[0].role !== 'admin') {
                    throw new Error('Votre compte est temporairement suspendu.');
                }
            }
        }

        return query(`
            SELECT o.*, 
                   (o.quantity - o.reviews_received) as remaining_slots,
                   o.locked_by,
                   o.locked_until,
                   sd.sector_name as sector,
                   sd.difficulty,
                   sd.icon_emoji as sector_icon,
                   sd.required_gmail_level,
                   (
                       SELECT COUNT(*) 
                       FROM reviews_submissions s 
                       WHERE s.order_id = o.id 
                       AND DATE(s.submitted_at) = CURDATE()
                   ) as daily_submissions_count
            FROM reviews_orders o
            LEFT JOIN sector_difficulty sd ON o.sector_id = sd.id
            WHERE o.status IN ('in_progress')
            AND o.reviews_received < o.quantity
            ORDER BY o.created_at DESC
        `, [guideId]);
    },

    async getficheDetails(order_id: string, guide_id: string) {
        // 🎯 TRUST SCORE: Vérifier l'éligibilité du guide
        const guideAccountResult: any = await query(`
            SELECT gga.*, u.email
            FROM users u
            JOIN guide_gmail_accounts gga ON gga.user_id = u.id OR gga.email = u.email
            WHERE u.id = ?
            LIMIT 1
        `, [guide_id]);

        if (guideAccountResult && guideAccountResult.length > 0) {
            const guideAccount = guideAccountResult[0];

            // Vérifier si le compte est bloqué
            if (guideAccount.is_blocked === true || guideAccount.trust_level === 'BLOCKED') {
                throw new Error('TRUST_SCORE_BLOCKED: Votre compte est bloqué. Score Trust insuffisant. Contactez le support.');
            }
        }

        // Fetch order basic info
        const orderResult: any = await query(`
            SELECT o.*, a.company_name as artisan_company, a.city,
                   sd.difficulty, sd.icon_emoji as sector_icon, sd.sector_name,
                   sd.required_gmail_level
            FROM reviews_orders o
            JOIN artisans_profiles a ON o.artisan_id = a.user_id
            LEFT JOIN sector_difficulty sd ON o.sector_id = sd.id
            WHERE o.id = ?
        `, [order_id]);

        if (!orderResult || orderResult.length === 0) {
            throw new Error('fiche non trouvée');
        }

        const order = orderResult[0];

        // 🎯 TRUST SCORE: Vérifier l'éligibilité basée sur le niveau
        if (guideAccountResult && guideAccountResult.length > 0) {
            const guideAccount = guideAccountResult[0];
            const trustLevel = guideAccount.trust_level;

            // fiches premium réservées aux GOLD et PLATINUM
            if (order.required_gmail_level && order.required_gmail_level >= 4) {
                if (!['GOLD', 'PLATINUM'].includes(trustLevel)) {
                    throw new Error(`TRUST_LEVEL_INSUFFICIENT: Cette fiche premium requiert un niveau GOLD ou PLATINUM. Votre niveau: ${trustLevel}`);
                }
            }
        }

        // 1. Quota Check (Total)
        if (order.reviews_received >= order.quantity) {
            throw new Error('fiche_FULL');
        }

        // 2. Daily Quota Check
        const dailyStats: any = await query(`
            SELECT COUNT(*) as count 
            FROM reviews_submissions 
            WHERE order_id = ? AND DATE(submitted_at) = CURDATE()
        `, [order_id]);

        const dailyCount = dailyStats[0].count;
        if (dailyCount >= order.reviews_per_day) {
            throw new Error('DAILY_QUOTA_FULL');
        }

        // 3. fiche Lock Check
        if (order.locked_by && order.locked_by !== guide_id) {
            const lockedUntil = new Date(order.locked_until);
            if (lockedUntil > new Date()) {
                throw new Error('fiche_LOCKED');
            }
        }

        // 3. Acquire/Refresh Lock (30 minutes)
        await query(`
            UPDATE reviews_orders 
            SET locked_by = ?, 
                locked_until = DATE_ADD(NOW(), INTERVAL 30 MINUTE)
            WHERE id = ?
        `, [guide_id, order_id]);

        // DEBUG: Ensuring global fetch
        console.log(`[GUIDE] Fetching global details for ${order_id}`);
        // Fetch ALL proposals for this order

        const proposals = await query(`
            SELECT * FROM review_proposals
            WHERE order_id = ?
            ORDER BY created_at ASC
        `, [order_id]);

        // Fetch ALL submissions for this order (from ALL guides)
        const submissions = await query(`
            SELECT s.*, u.full_name as guide_name, u.avatar_url as guide_avatar
            FROM reviews_submissions s
            LEFT JOIN users u ON s.guide_id = u.id
            WHERE s.order_id = ?
            ORDER BY s.submitted_at DESC
        `, [order_id]);

        return {
            ...order,
            proposals,
            submissions
        };
    },

    async releaseficheLock(order_id: string, guide_id: string) {
        await query(`
            UPDATE reviews_orders 
            SET locked_by = NULL, 
                locked_until = NULL
            WHERE id = ? AND locked_by = ?
        `, [order_id, guide_id]);
        return { success: true };
    },

    async getMySubmissions(guideId: string) {
        return query(`
            SELECT 
                s.*, 
                COALESCE(o.company_name, 'Établissement inconnu') as artisan_company,
                sd.id as sector_id,
                COALESCE(sd.sector_name, 'Général') as sector_name,
                COALESCE(sd.icon_emoji, '🌐') as sector_icon
            FROM reviews_submissions s
            JOIN reviews_orders o ON s.order_id = o.id
            LEFT JOIN sector_difficulty sd ON o.sector_id = sd.id
            WHERE s.guide_id = ?
            ORDER BY s.submitted_at DESC
        `, [guideId]);
    },

    async submitReviewProof(guideId: string, data: {
        orderId: string,
        proposalId: string,
        reviewUrl: string,
        googleEmail: string,
        artisanId: string,
        gmailAccountId?: number
    }) {
        // 0. 🎯 TRUST SCORE: Vérifier quota mensuel
        const guideAccountResult: any = await query(`
            SELECT gga.*, u.email
            FROM users u
            LEFT JOIN guide_gmail_accounts gga ON gga.user_id = u.id OR gga.email = u.email
            WHERE u.id = ?
            LIMIT 1
        `, [guideId]);

        if (guideAccountResult && guideAccountResult.length > 0) {
            const guideAccount = guideAccountResult[0];

            // Vérifier si bloqué
            if (guideAccount.is_blocked === true) {
                throw new Error('Votre compte est bloqué. Contactez le support.');
            }

            // Vérifier quota mensuel
            const monthlySubmissions: any = await query(`
                SELECT COUNT(*) as count
                FROM reviews_submissions
                WHERE guide_id = ?
                AND MONTH(submitted_at) = MONTH(CURRENT_DATE())
                AND YEAR(submitted_at) = YEAR(CURRENT_DATE())
            `, [guideId]);

            const maxReviewsPerMonth = guideAccount.max_reviews_per_month || 0;
            const currentMonthSubmissions = monthlySubmissions[0]?.count || 0;

            if (maxReviewsPerMonth > 0 && currentMonthSubmissions >= maxReviewsPerMonth) {
                throw new Error(`Quota mensuel atteint (${maxReviewsPerMonth} avis/mois). Niveau: ${guideAccount.trust_level}. Améliorez votre Trust Score pour augmenter votre quota.`);
            }
        }

        // 1. VÉRIFICATION ANTI-DÉTECTION (si gmailAccountId est fourni)
        let currentSectorSlug = '';
        let payoutAmount = 2.00; // Default value
        if (data.gmailAccountId) {
            // ✅ NOUVEAU : Vérifier si le compte Gmail spécifique est actif
            const gmailAccount: any = await query('SELECT is_active FROM guide_gmail_accounts WHERE id = ?', [data.gmailAccountId]);
            if (gmailAccount && gmailAccount.length > 0 && gmailAccount[0].is_active === 0) {
                throw new Error('ce compte mail est bloqué par l\'administration et ne peut plus soumettre d\'avis.');
            }

            const compatibility = await antiDetectionService.canTakefiche(guideId, data.orderId, data.gmailAccountId);
            if (!compatibility.can_take) {
                throw new Error(`Anti-Détection: ${compatibility.message}`);
            }

            // Récupérer le slug du secteur pour plus tard et le payout_per_review
            const orderInfo: any = await query(`
                SELECT o.payout_per_review, sd.sector_slug 
                FROM reviews_orders o
                LEFT JOIN sector_difficulty sd ON o.sector_id = sd.id
                WHERE o.id = ?
            `, [data.orderId]);

            if (orderInfo && orderInfo.length > 0) {
                currentSectorSlug = orderInfo[0].sector_slug || '';
                payoutAmount = Number(orderInfo[0].payout_per_review || 1.50);
            }
        } else {
            // Fallback fetch if no gmail account used (should not happen in prod for most cases but good for safety)
            const orderInfo: any = await query('SELECT payout_per_review FROM reviews_orders WHERE id = ?', [data.orderId]);
            payoutAmount = Number(orderInfo[0]?.payout_per_review || 1.50);
        }

        // 1. Check if this guide already submitted for THIS proposal
        const existingProp: any = await query(`
            SELECT id FROM reviews_submissions 
            WHERE guide_id = ? AND proposal_id = ?
        `, [guideId, data.proposalId]);

        if (existingProp && existingProp.length > 0) {
            throw new Error('Vous avez déjà soumis une preuve pour cet avis.');
        }

        // 2. Check if this Google email was already used for this Artisan (business)
        const existingEmail: any = await query(`
            SELECT id FROM reviews_submissions
            WHERE artisan_id = ? AND google_email = ?
        `, [data.artisanId, data.googleEmail]);

        if (existingEmail && existingEmail.length > 0) {
            throw new Error('ce compte mail a déjà été utiliser pour ce projet.');
        }

        const submissionId = crypto.randomUUID();

        // 3. Create submission record
        await query(`
            INSERT INTO reviews_submissions 
            (id, guide_id, artisan_id, order_id, proposal_id, review_url, google_email, gmail_account_id, status, earnings, submitted_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())
        `, [submissionId, guideId, data.artisanId, data.orderId, data.proposalId, data.reviewUrl, data.googleEmail, data.gmailAccountId || null, payoutAmount]);

        // 4. Increment reviews_received in order and update status
        await query(`
            UPDATE reviews_orders 
            SET reviews_received = reviews_received + 1,
                status = IF(reviews_received + 1 >= quantity, 'completed', 'in_progress'),
                locked_by = NULL,
                locked_until = NULL
            WHERE id = ?
        `, [data.orderId]);

        // 5. Mettre à jour les logs d'activité anti-détection
        if (data.gmailAccountId && currentSectorSlug) {
            await antiDetectionService.updateGmailActivity(data.gmailAccountId, currentSectorSlug);
        }

        // 6. NOUVEAU : Déclencheurs automatiques de suspension
        const { suspensionTriggers } = await import('./suspensionTriggers');
        await suspensionTriggers.checkSpamSubmissions(guideId, submissionId);
        await suspensionTriggers.checkIdenticalReviews(guideId, data.reviewUrl, submissionId);
        if (data.gmailAccountId && currentSectorSlug) {
            await suspensionTriggers.checkSectorCooldown(guideId, data.gmailAccountId, currentSectorSlug, submissionId);
        }

        // 7. Notify Artisan
        notificationService.sendToUser(data.artisanId, {
            type: 'order_update',
            title: 'Nouvel avis reçu ! ✨',
            message: 'Un guide vient de soumettre une preuve pour votre fiche.',
            link: '/artisan/dashboard'
        });

        return { id: submissionId, success: true };
    },

    async getEarningsStats(guideId: string) {
        const stats: any = await query(`
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'validated' THEN earnings ELSE 0 END), 0) as total_earned
            FROM reviews_submissions
            WHERE guide_id = ?
        `, [guideId]);

        const payouts: any = await query(`
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_paid,
                COALESCE(SUM(CASE WHEN status IN ('pending', 'in_revision') THEN amount ELSE 0 END), 0) as total_pending
            FROM payout_requests
            WHERE guide_id = ?
        `, [guideId]);

        const totalEarned = Number(stats[0].total_earned);
        const totalPaid = Number(payouts[0].total_paid);
        const totalPending = Number(payouts[0].total_pending);
        const balance = totalEarned - totalPaid - totalPending;

        return {
            totalEarned,
            totalPaid,
            totalPending,
            balance: Math.max(0, balance)
        };
    },

    async getPayoutHistory(guideId: string) {
        return query(`
            SELECT * FROM payout_requests
            WHERE guide_id = ?
            ORDER BY requested_at DESC
        `, [guideId]);
    },

    async requestPayout(guideId: string) {
        const stats = await this.getEarningsStats(guideId);

        if (stats.balance < 20) {
            throw new Error('Le montant minimum pour un retrait est de 20€.');
        }

        const payoutId = crypto.randomUUID();
        await query(`
            INSERT INTO payout_requests (id, guide_id, amount, status, requested_at)
            VALUES (?, ?, ?, 'pending', NOW())
        `, [payoutId, guideId, stats.balance]);

        return {
            id: payoutId,
            amount: stats.balance
        };
    },

    /**
     * Get statistics for guide dashboard
     */
    async getGuideStats(guideId: string) {
        // 1. Daily Earnings (last 7 days)
        const dailyEarnings: any = await query(`
            SELECT 
                DATE(submitted_at) as date,
                SUM(earnings) as amount,
                COUNT(*) as count
            FROM reviews_submissions
            WHERE guide_id = ? 
            AND status = 'validated'
            AND submitted_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            GROUP BY DATE(submitted_at)
            ORDER BY DATE(submitted_at) ASC
        `, [guideId]);

        // 2. Success rate (validated vs rejected vs pending)
        const successRate: any = await query(`
            SELECT 
                status, 
                COUNT(*) as count
            FROM reviews_submissions
            WHERE guide_id = ?
            GROUP BY status
        `, [guideId]);

        // 3. Global Stats
        const globalStats = await this.getEarningsStats(guideId);

        // Map daily earnings to ensure we have all 7 days
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const found = (dailyEarnings as any[]).find(d => d.date.toISOString().split('T')[0] === dateStr);
            last7Days.push({
                day: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
                amount: found ? Number(found.amount) : 0,
                count: found ? found.count : 0
            });
        }

        return {
            dailyEarnings: last7Days,
            statusDistribution: successRate,
            ...globalStats
        };
    },

    async getGmailQuotasForFiche(userId: string, ficheId: string) {
        const { getGmailQuotasForFiche } = await import('./gmailQuotaService');
        return getGmailQuotasForFiche(userId, ficheId);
    }
};
