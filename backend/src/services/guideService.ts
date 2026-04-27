import { query } from '../config/database';
import crypto from 'crypto';
import { antiDetectionService } from './antiDetectionService';
import { notificationService } from './notificationService';
import { sendAdminEventNotification } from './emailService';

export const guideService = {
    /**
     * Libère les slots des rejets allow_resubmit dont le délai de 24h est dépassé.
     * Appelé en lazy : à chaque getAvailablefiches.
     * - Décrémente reviews_received de l'order correspondant
     * - Désactive allow_resubmit (le guide ne peut plus corriger)
     * - Marque slot_released_at = NOW()
     */
    async releaseExpiredResubmitSlots() {
        const expired: any = await query(`
            SELECT id, order_id FROM reviews_submissions
            WHERE status = 'rejected'
              AND allow_resubmit = 1
              AND slot_released_at IS NULL
              AND rejected_at IS NOT NULL
              AND rejected_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `);

        if (!expired || expired.length === 0) return;

        for (const row of expired) {
            if (row.order_id) {
                await query(`
                    UPDATE reviews_orders
                    SET reviews_received = GREATEST(0, COALESCE(reviews_received, 1) - 1),
                        status = CASE WHEN status = 'completed' THEN 'in_progress' ELSE status END
                    WHERE id = ?
                `, [row.order_id]);
            }

            await query(`
                UPDATE reviews_submissions
                SET slot_released_at = NOW(),
                    allow_resubmit = 0
                WHERE id = ?
            `, [row.id]);
        }
    },

    /**
     * Get fiches available for a specific guide
     * A fiche is available if:
     * 1. The order status is not 'draft' or 'cancelled'
     * 2. The order is not yet fully completed (reviews_received < quantity)
     * 3. The guide hasn't already submitted a review for this order
     */
    async getAvailablefiches(guideId: string) {
        // Libérer en amont les slots expirés (rejets allow_resubmit > 24h)
        await this.releaseExpiredResubmitSlots();

        return query(`
            SELECT o.*,
                   (SELECT COUNT(*) FROM reviews_submissions s2
                    WHERE s2.order_id = o.id AND s2.status != 'rejected') as active_submissions,
                   (SELECT COUNT(*) FROM reviews_submissions s4
                    WHERE s4.order_id = o.id AND s4.status = 'validated') as validated_count,
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
                       AND s.status != 'rejected'
                   ) as daily_submissions_count
            FROM reviews_orders o
            LEFT JOIN sector_difficulty sd ON o.sector_id = sd.id
            WHERE o.status IN ('in_progress') AND o.deleted_at IS NULL
            AND (SELECT COUNT(*) FROM reviews_submissions s3
                 WHERE s3.order_id = o.id AND s3.status != 'rejected') < o.quantity
            ORDER BY o.created_at DESC
        `, [guideId]);
    },

    async getficheDetails(order_id: string, guide_id: string) {
        // 🎯 TRUST SCORE: Vérifier l'éligibilité du guide (défensif)
        let guideAccountResult: any = [];
        try {
            guideAccountResult = await query(`
                SELECT gga.*, u.email
                FROM users u
                JOIN guide_gmail_accounts gga ON gga.user_id = u.id OR gga.email = u.email
                WHERE u.id = ?
                LIMIT 1
            `, [guide_id]);

            if (guideAccountResult && guideAccountResult.length > 0) {
                const guideAccount = guideAccountResult[0];

                // Vérifier si le compte est bloqué
                if (guideAccount.is_blocked === true || guideAccount.is_blocked === 1 || guideAccount.trust_level === 'BLOCKED') {
                    throw new Error('TRUST_SCORE_BLOCKED: Votre compte est bloqué. Score Trust insuffisant. Contactez le support.');
                }
            }
        } catch (trustErr: any) {
            // Re-throw trust block errors, but swallow DB errors
            if (trustErr.message?.includes('TRUST_SCORE_BLOCKED')) throw trustErr;
            console.warn(`⚠️ Trust check failed for guide ${guide_id}:`, trustErr.message);
            guideAccountResult = [];
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

        // 1. Quota Check (Total) — count only active (non-rejected) submissions
        const activeSubStats: any = await query(`
            SELECT COUNT(*) as count
            FROM reviews_submissions
            WHERE order_id = ? AND status != 'rejected'
        `, [order_id]);
        const activeSubmissionsCount = activeSubStats[0].count;
        if (activeSubmissionsCount >= order.quantity) {
            throw new Error('fiche_FULL');
        }

        // 2. Daily Quota Check — count only active (non-rejected) submissions today
        const dailyStats: any = await query(`
            SELECT COUNT(*) as count
            FROM reviews_submissions
            WHERE order_id = ? AND DATE(submitted_at) = CURDATE() AND status != 'rejected'
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
            WHERE order_id = ? AND deleted_at IS NULL
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
            submissions,
            daily_submissions_count: dailyCount
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
        gmailAccountId?: number,
        baseUrl?: string
    }) {
        // 0. 🎯 TRUST SCORE: Vérifier quota mensuel du compte Gmail sélectionné
        if (data.gmailAccountId) {
            const gmailAccountResult: any = await query(`
                SELECT * FROM guide_gmail_accounts 
                WHERE id = ? AND user_id = ?
            `, [data.gmailAccountId, guideId]);

            if (gmailAccountResult && gmailAccountResult.length > 0) {
                const gmailAccount = gmailAccountResult[0];

                // Vérifier si bloqué
                if (gmailAccount.is_blocked === true) {
                    throw new Error('ce compte mail est bloqué par l\'administration.');
                }

                // Vérifier quota mensuel (Min 20)
                const monthlyLimit = Math.max(20, gmailAccount.monthly_quota_limit || 0);
                const monthlyUsed = gmailAccount.monthly_reviews_posted || 0;

                if (monthlyUsed >= monthlyLimit) {
                    throw new Error(`Quota mensuel atteint pour ce mail (${monthlyUsed}/${monthlyLimit} avis).`);
                }
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
                payoutAmount = Number(orderInfo[0].payout_per_review || 1.00);
            }
        } else {
            // Fallback fetch if no gmail account used (should not happen in prod for most cases but good for safety)
            const orderInfo: any = await query('SELECT payout_per_review FROM reviews_orders WHERE id = ?', [data.orderId]);
            payoutAmount = Number(orderInfo[0]?.payout_per_review || 1.00);
        }

        // 1. Check if this guide already submitted for THIS proposal
        const existingProp: any = await query(`
            SELECT id FROM reviews_submissions 
            WHERE guide_id = ? AND proposal_id = ?
        `, [guideId, data.proposalId]);

        if (existingProp && existingProp.length > 0) {
            throw new Error('Vous avez déjà soumis une preuve pour cet avis.');
        }

        // 2. Check if this Google email was already used for this specific fiche (order)
        const existingEmail: any = await query(`
            SELECT id FROM reviews_submissions
            WHERE order_id = ? AND google_email = ?
        `, [data.orderId, data.googleEmail]);

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

        // 4. Increment reviews_received in order (slot count only).
        // Le passage en 'completed' se fait désormais uniquement quand un avis est validé
        // (dans adminService.updateSubmissionStatus), pas dès la soumission.
        await query(`
            UPDATE reviews_orders
            SET reviews_received = reviews_received + 1,
                locked_by = NULL,
                locked_until = NULL
            WHERE id = ?
        `, [data.orderId]);

        // 5. Mettre à jour les logs d'activité anti-détection
        if (data.gmailAccountId && currentSectorSlug) {
            await antiDetectionService.updateGmailActivity(data.gmailAccountId, currentSectorSlug);
        }



        // 7. Notify Artisan
        notificationService.sendToUser(data.artisanId, {
            type: 'order_update',
            title: 'Nouvel avis reçu ! ✨',
            message: 'Un guide vient de soumettre une preuve pour votre fiche.',
            link: '/artisan/dashboard'
        });

        // 8. Notify Admin — new review proof submitted
        const orderDetails: any = await query(
            `SELECT company_name, quantity, reviews_received FROM reviews_orders WHERE id = ?`,
            [data.orderId]
        );
        const guideInfo: any = await query('SELECT full_name FROM users WHERE id = ?', [guideId]);
        const od = orderDetails?.[0];
        const guideName = guideInfo?.[0]?.full_name || 'Guide';

        sendAdminEventNotification({
            emoji: '📝',
            title: `Nouvel avis soumis — ${od?.company_name || 'Fiche'}`,
            details: [
                { label: 'Guide', value: guideName },
                { label: 'Email Google', value: data.googleEmail },
                { label: 'Entreprise', value: od?.company_name || '—' },
                { label: 'Progression', value: `${od?.reviews_received || '?'}/${od?.quantity || '?'} avis` },
            ],
            ctaLabel: 'Voir les soumissions',
            ctaUrl: '/admin/submissions',
        }, data.baseUrl).catch(() => {});

        // 9. Notify Admin if order just completed
        if (od && od.reviews_received >= od.quantity) {
            sendAdminEventNotification({
                emoji: '✅',
                title: `Fiche complétée — ${od.company_name}`,
                details: [
                    { label: 'Entreprise', value: od.company_name },
                    { label: 'Total avis', value: `${od.quantity}` },
                ],
                ctaLabel: 'Voir les fiches',
                ctaUrl: '/admin/fiches',
            }, data.baseUrl).catch(() => {});
        }

        return { id: submissionId, success: true };
    },

    async getEarningsStats(guideId: string) {
        const stats: any = await query(`
            SELECT
                COALESCE(SUM(CASE WHEN status = 'validated' THEN earnings ELSE 0 END), 0) as total_earned
            FROM reviews_submissions
            WHERE guide_id = ?
        `, [guideId]);

        const bonuses: any = await query(`
            SELECT COALESCE(SUM(amount), 0) as total_bonuses
            FROM guide_bonuses
            WHERE guide_id = ?
        `, [guideId]);

        const payouts: any = await query(`
            SELECT
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_paid,
                COALESCE(SUM(CASE WHEN status IN ('pending', 'in_revision') THEN amount ELSE 0 END), 0) as total_pending
            FROM payout_requests
            WHERE guide_id = ?
        `, [guideId]);

        const totalEarned = Number(stats[0].total_earned) + Number(bonuses[0].total_bonuses);
        const totalBonuses = Number(bonuses[0].total_bonuses);
        const totalPaid = Number(payouts[0].total_paid);
        const totalPending = Number(payouts[0].total_pending);
        // Solde peut être négatif si l'admin a versé une avance.
        // Les futurs avis validés réduiront automatiquement la dette.
        const balance = totalEarned - totalPaid - totalPending;

        return {
            totalEarned,
            totalBonuses,
            totalPaid,
            totalPending,
            balance,
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
        const existingPending: any = await query(`
            SELECT COUNT(*) as count FROM payout_requests
            WHERE guide_id = ? AND status IN ('pending', 'in_revision')
        `, [guideId]);

        if (existingPending[0].count > 0) {
            throw new Error('Vous avez déjà une demande de retrait en attente.');
        }

        const stats = await this.getEarningsStats(guideId);

        if (stats.balance < 10) {
            throw new Error('Le montant minimum pour un retrait est de 10€.');
        }

        const payoutId = crypto.randomUUID();
        await query(`
            INSERT INTO payout_requests (id, guide_id, amount, status, requested_at)
            VALUES (?, ?, ?, 'pending', NOW())
        `, [payoutId, guideId, stats.balance]);

        // Notify admin of payout request
        const guideUser: any = await query('SELECT full_name, email FROM users WHERE id = ?', [guideId]);
        const gu = guideUser?.[0];
        sendAdminEventNotification({
            emoji: '💰',
            title: `Demande de retrait — ${gu?.full_name || 'Guide'}`,
            details: [
                { label: 'Guide', value: gu?.full_name || '—' },
                { label: 'Email', value: gu?.email || '—' },
                { label: 'Montant', value: `${stats.balance.toFixed(2)}€` },
            ],
            ctaLabel: 'Gérer les retraits',
            ctaUrl: '/admin/payouts',
        }).catch(() => {});

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
    },

    async getPaymentMethod(userId: string) {
        const result: any = await query(`
            SELECT preferred_payout_method, payout_details
            FROM guides_profiles
            WHERE user_id = ?
        `, [userId]);

        if (!result || result.length === 0) return null;

        return {
            method: result[0].preferred_payout_method,
            details: result[0].payout_details
        };
    },

    async updatePaymentMethod(userId: string, method: string, details: any) {
        const result: any = await query(`
            UPDATE guides_profiles
            SET preferred_payout_method = ?, payout_details = ?
            WHERE user_id = ?
        `, [method, JSON.stringify(details), userId]);

        if (result && result.affectedRows === 0) {
            throw new Error('Profil guide introuvable. Veuillez contacter le support.');
        }

        return result;
    },

    async updateSubmission(guideId: string, submissionId: string, data: { reviewUrl?: string, googleEmail?: string }) {
        // 1. Verify submission exists and belongs to the guide
        const existing: any = await query(`
            SELECT s.id, s.status, s.allow_resubmit, s.allow_appeal, p.order_id
            FROM reviews_submissions s
            LEFT JOIN review_proposals p ON s.proposal_id = p.id
            WHERE s.id = ? AND s.guide_id = ?
        `, [submissionId, guideId]);

        if (!existing || existing.length === 0) {
            throw new Error('Soumission non trouvée ou non autorisée');
        }

        const submission = existing[0];
        const isCorrection = submission.status === 'rejected' && submission.allow_resubmit === 1;
        const isAppeal = submission.status === 'rejected' && submission.allow_appeal === 1;

        if (submission.status !== 'pending' && !isCorrection && !isAppeal) {
            throw new Error('Seules les soumissions en attente peuvent être modifiées');
        }

        // 2. Prepare update fields
        const updates: string[] = [];
        const params: any[] = [];

        if (data.reviewUrl) {
            updates.push('review_url = ?');
            params.push(data.reviewUrl);
        }

        if (data.googleEmail) {
            updates.push('google_email = ?');
            params.push(data.googleEmail);
        }

        if (updates.length === 0) return { success: true, message: 'Aucune modification' };

        // 3. If this is a correction or appeal, reset status to pending
        if (isCorrection || isAppeal) {
            updates.push('status = ?');
            params.push('pending');
            updates.push('allow_resubmit = ?');
            params.push(0);
            updates.push('allow_appeal = ?');
            params.push(0);
            updates.push('rejection_reason = ?');
            params.push(null);
        }

        params.push(submissionId);

        // 4. Perform update
        await query(`
            UPDATE reviews_submissions
            SET ${updates.join(', ')}
            WHERE id = ?
        `, params);

        // 5. Réincrémenter uniquement pour appel (où le slot avait été libéré au rejet).
        // Pour allow_resubmit, le slot était conservé donc pas besoin de réincrémenter.
        if (isAppeal && submission.order_id) {
            await query(`
                UPDATE reviews_orders
                SET reviews_received = COALESCE(reviews_received, 0) + 1
                WHERE id = ?
            `, [submission.order_id]);
        }

        // Marquer la submission comme "slot à nouveau actif" : reset rejected_at et slot_released_at
        if (isCorrection || isAppeal) {
            await query(`
                UPDATE reviews_submissions
                SET slot_released_at = NULL, rejected_at = NULL
                WHERE id = ?
            `, [submissionId]);
        }

        return { success: true, message: (isCorrection || isAppeal) ? 'Avis relancé avec succès' : 'Soumission mise à jour avec succès' };
    },

    async getCorrectableSubmissions(guideId: string) {
        return query(`
            SELECT s.id, s.review_url, s.google_email, s.rejection_reason, s.submitted_at, s.earnings,
                   s.allow_resubmit, s.allow_appeal,
                   ro.company_name as artisan_company, ro.sector
            FROM reviews_submissions s
            LEFT JOIN review_proposals p ON s.proposal_id = p.id
            LEFT JOIN reviews_orders ro ON p.order_id = ro.id
            WHERE s.guide_id = ? AND s.status = 'rejected' AND (s.allow_resubmit = 1 OR s.allow_appeal = 1)
            ORDER BY s.submitted_at DESC
        `, [guideId]);
    },

    async getLeaderboard(currentGuideId: string) {
        const rows: any = await query(`
            SELECT
                u.id,
                u.full_name,
                COUNT(s.id) as total_posted,
                SUM(CASE WHEN s.status = 'validated' THEN 1 ELSE 0 END) as total_validated,
                SUM(CASE WHEN s.status = 'pending' THEN 1 ELSE 0 END) as total_pending,
                SUM(CASE WHEN s.status = 'rejected' THEN 1 ELSE 0 END) as total_rejected,
                ROUND(
                    SUM(CASE WHEN s.status = 'validated' THEN 1 ELSE 0 END) * 100.0 /
                    NULLIF(COUNT(s.id), 0)
                , 1) as validation_rate
            FROM users u
            INNER JOIN reviews_submissions s ON s.guide_id = u.id
            WHERE u.role = 'guide'
            GROUP BY u.id, u.full_name
            HAVING total_posted > 0
            ORDER BY validation_rate DESC, total_validated DESC
            LIMIT 20
        `);

        return rows.map((row: any, index: number) => ({
            rank: index + 1,
            name: row.full_name || 'Guide Anonyme',
            totalPosted: Number(row.total_posted),
            totalValidated: Number(row.total_validated),
            totalPending: Number(row.total_pending),
            totalRejected: Number(row.total_rejected),
            validationRate: Number(row.validation_rate) || 0,
            isCurrentUser: row.id === currentGuideId
        }));
    }
};
