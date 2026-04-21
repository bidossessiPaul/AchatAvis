import { query, pool } from '../config/database';
import { sendUserStatusUpdateEmail, sendficheDecisionEmail, sendSubmissionDecisionEmail, sendNewFicheToGuidesEmail, sendBadLinkWarningEmail } from './emailService';
import { notificationService } from './notificationService';
import { invalidateAuthCache } from '../middleware/auth';
import { TokenPayload } from '../utils/token';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';

/**
 * Get all artisans with their profiles
 */
export const getArtisans = async () => {
    return await query(`
        SELECT u.id, u.email, u.full_name, u.avatar_url, u.status, u.created_at, u.last_login, u.last_seen,
               ap.company_name, ap.trade, ap.phone, ap.city, 
               ap.subscription_status, ap.subscription_end_date
        FROM users u
        JOIN artisans_profiles ap ON u.id = ap.user_id
        WHERE u.role = 'artisan' AND u.deleted_at IS NULL
        ORDER BY u.created_at DESC
    `);
};

/**
 * Get all local guides with their profiles
 */
export const getGuides = async () => {
    return await query(`
        SELECT u.id, u.email, u.full_name, u.avatar_url, u.status, u.created_at, u.last_login, u.last_seen,
               u.detected_ip, u.detected_country, u.detected_country_code, u.detected_city,
               u.detected_region, u.detected_isp, u.detected_is_vpn, u.detected_at,
               gp.google_email, gp.local_guide_level, gp.total_reviews_count,
               gp.phone, gp.city,
               COUNT(DISTINCT rs.id) as submitted_reviews_count
        FROM users u
        JOIN guides_profiles gp ON u.id = gp.user_id
        LEFT JOIN reviews_submissions rs ON u.id = rs.guide_id
        WHERE u.role = 'guide' AND u.deleted_at IS NULL
        GROUP BY u.id, u.email, u.full_name, u.avatar_url, u.status, u.created_at, u.last_login, u.last_seen,
                 u.detected_ip, u.detected_country, u.detected_country_code, u.detected_city,
                 u.detected_region, u.detected_isp, u.detected_is_vpn, u.detected_at,
                 gp.google_email, gp.local_guide_level, gp.total_reviews_count, gp.phone, gp.city
        ORDER BY u.created_at DESC
    `);
};

/**
 * Update user status (active, pending, suspended, rejected)
 */
export const updateUserStatus = async (userId: string, status: string, _reason?: string) => {
    // NOTE: Automatic suspension system has been removed.
    // Admins can still manually update user status (including 'suspended') via this function.
    const result = await query(
        `UPDATE users SET status = ? WHERE id = ?`,
        [status, userId]
    );

    // Invalidate the auth cache so the new status is enforced immediately
    // on the very next request (no 30s wait).
    invalidateAuthCache(userId);

    // Send notification email
    try {
        const user: any = await query('SELECT full_name, email FROM users WHERE id = ?', [userId]);
        if (user && user.length > 0) {
            await sendUserStatusUpdateEmail(user[0].email, user[0].full_name, status);
        }
    } catch (error) {
        console.error('Error sending user status update email:', error);
    }

    // REAL-TIME NOTIFICATION
    notificationService.sendToUser(userId, {
        type: 'system',
        title: 'Mise à jour du compte 👤',
        message: `Le statut de votre compte a été mis à jour: ${status}`,
        link: '/profile'
    });

    return result;
};

/**
 * Unblock a guide suspended for bad links: reactivate account + unblock all gmail accounts
 */
export const unblockBadLinkGuide = async (userId: string) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Reactivate user account
        await connection.query(`UPDATE users SET status = 'active' WHERE id = ? AND role = 'guide'`, [userId]);

        // 2. Unblock all gmail accounts
        await connection.query(`
            UPDATE guide_gmail_accounts
            SET is_blocked = FALSE, trust_level = 'BRONZE'
            WHERE user_id = ? AND is_blocked = TRUE
        `, [userId]);

        await connection.commit();

        // 3. Invalidate auth cache
        invalidateAuthCache(userId);

        // 4. Send reactivation email
        const user: any = await query('SELECT full_name, email FROM users WHERE id = ?', [userId]);
        if (user && user.length > 0) {
            await sendUserStatusUpdateEmail(user[0].email, user[0].full_name, 'active');
        }

        // 5. Real-time notification
        notificationService.sendToUser(userId, {
            type: 'system',
            title: 'Compte Réactivé',
            message: 'Votre compte a été réactivé par un administrateur. Vos comptes Gmail ont été débloqués.',
            link: '/guide/dashboard'
        });

        console.log(`[ADMIN] Guide ${userId} unblocked (bad link suspension lifted)`);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Delete a user and their associated profile
 */
export const deleteUser = async (userId: string) => {
    console.log(`[ADMIN] Soft-deleting user ${userId} (historique préservé)`);

    // Soft delete : on NE supprime PAS la ligne, on marque deleted_at.
    // Ainsi l'historique (avis, commandes, paiements, logs) reste intact
    // et joignable sur cet userId. L'utilisateur ne peut plus se connecter
    // (login check WHERE deleted_at IS NULL), ne figure plus dans les listes admin,
    // mais toutes ses données passées restent visibles.
    const result = await query(
        `UPDATE users SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
        [userId]
    );

    // Invalidate the auth cache so any in-flight token for this user fails fast.
    invalidateAuthCache(userId);

    // REAL-TIME BROADCAST (optional, to update other admin dashboards)
    notificationService.broadcast({
        type: 'user_deleted',
        userId: userId
    });

    return result;
};

/**
 * Get all users simple list for dropdowns
 */
export const getAllUsers = async () => {
    return await query(`
        SELECT id, email, full_name, role, avatar_url, status
        FROM users
        ORDER BY full_name ASC
    `);
};

/**
 * Get detailed artisan info including orders
 */
export const getArtisanDetail = async (userId: string) => {
    const profile: any = await query(`
        SELECT u.id, u.email, u.full_name, u.avatar_url, u.status, u.created_at, u.last_login, u.last_seen,
               ap.company_name, ap.trade, ap.phone, ap.whatsapp_number, ap.address, ap.city, ap.postal_code,
               ap.google_business_url, ap.subscription_status, ap.subscription_end_date,
               ap.monthly_reviews_quota, ap.current_month_reviews,
               sp.name as active_pack_name
        FROM users u
        JOIN artisans_profiles ap ON u.id = ap.user_id
        LEFT JOIN subscription_packs sp ON ap.subscription_product_id = sp.id
        WHERE u.id = ? AND u.role = 'artisan'
    `, [userId]);

    if (!profile || profile.length === 0) return null;

    const orders = await query(`
        SELECT id, status, price as amount, quantity as credits_purchased, created_at, reviews_received as validated_reviews_count
        FROM reviews_orders
        WHERE artisan_id = ?
        ORDER BY created_at DESC
        LIMIT 20
    `, [userId]);

    const payments: any = await query(`
        SELECT id, amount, status, type, description, processed_at as created_at
        FROM payments
        WHERE user_id = ?
        ORDER BY created_at DESC
    `, [userId]);

    return {
        profile: profile[0],
        orders: orders as any[],
        payments: payments as any[]
    };
};

/**
 * Get detailed guide info including submissions
 */
export const getGuideDetail = async (userId: string) => {
    const profile: any = await query(`
        SELECT u.id, u.email, u.full_name, u.avatar_url, u.status, u.created_at, u.last_login, u.last_seen,
               gp.google_email, gp.local_guide_level, gp.total_reviews_count, 
               gp.phone, gp.whatsapp_number, gp.city,
               gp.preferred_payout_method, gp.payout_details
        FROM users u
        JOIN guides_profiles gp ON u.id = gp.user_id
        WHERE u.id = ? AND u.role = 'guide'
    `, [userId]);

    if (!profile || profile.length === 0) return null;

    const submissions = await query(`
        SELECT s.id, s.status, s.earnings, s.submitted_at as created_at, s.review_url as proof_url,
               s.artisan_id, s.order_id,
               ap.company_name as artisan_name,
               ro.company_name as fiche_name,
               p.content as review_text,
               p.rating
        FROM reviews_submissions s
        JOIN artisans_profiles ap ON s.artisan_id = ap.user_id
        JOIN reviews_orders ro ON s.order_id = ro.id
        JOIN review_proposals p ON s.proposal_id = p.id
        WHERE s.guide_id = ?
        ORDER BY s.submitted_at DESC
        LIMIT 20
    `, [userId]);

    const stats: any = await query(`
        SELECT 
            COUNT(*) as total_submissions,
            SUM(CASE WHEN status = 'validated' THEN 1 ELSE 0 END) as validated_count,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
            SUM(CASE WHEN status = 'validated' THEN earnings ELSE 0 END) as total_earnings
        FROM reviews_submissions
        WHERE guide_id = ?
    `, [userId]);

    const gmailAccounts = await query(`
        SELECT *, GREATEST(20, COALESCE(monthly_quota_limit, 0)) as monthly_quota_limit FROM guide_gmail_accounts WHERE user_id = ? AND is_active = TRUE
    `, [userId]);

    // Fetch compliance data
    const { antiDetectionService } = await import('./antiDetectionService');
    const complianceRaw = await antiDetectionService.getExtendedComplianceData(userId);

    // Add visual meta (labels and colors)
    let scoreColor = 'green';
    let scoreLabel = 'Excellent';
    if (complianceRaw.compliance_score < 50) { scoreColor = 'red'; scoreLabel = 'Critique'; }
    else if (complianceRaw.compliance_score < 70) { scoreColor = 'orange'; scoreLabel = 'À améliorer'; }
    else if (complianceRaw.compliance_score < 90) { scoreColor = 'blue'; scoreLabel = 'Bon'; }

    const complianceData = {
        ...complianceRaw,
        score_color: scoreColor,
        score_label: scoreLabel
    };

    return {
        profile: profile[0],
        submissions,
        gmail_accounts: gmailAccounts,
        stats: stats[0],
        compliance_data: complianceData
    };
};

/**
 * Get global statistics for the admin dashboard
 */
export const getGlobalStats = async () => {
    // Total Revenue, Payouts & Trend (last 30 days) - Filling missing dates
    const financialStats: any = await query(`
        WITH RECURSIVE days AS (
            SELECT DATE(DATE_SUB(NOW(), INTERVAL 29 DAY)) as day
            UNION ALL
            SELECT DATE_ADD(day, INTERVAL 1 DAY)
            FROM days
            WHERE day < DATE(NOW())
        )
        SELECT 
            d.day,
            DATE_FORMAT(d.day, '%d/%m') as label,
            COALESCE((
                SELECT SUM(p.amount) 
                FROM payments p 
                WHERE DATE(p.created_at) = d.day 
                AND p.status = 'completed'
            ), 0) as total_revenue,
            COALESCE((
                SELECT SUM(pr.amount)
                FROM payout_requests pr
                WHERE DATE(pr.processed_at) = d.day
                AND pr.status = 'paid'
            ), 0) as total_payouts
        FROM days d
        GROUP BY d.day, label
        ORDER BY d.day ASC
    `);

    // Total All Time Revenue (exclut les users supprimés)
    const totalAllTimeRevenue: any = await query(`
        SELECT SUM(p.amount) as total
        FROM payments p
        JOIN users u ON p.user_id = u.id
        WHERE p.status = 'completed'
          AND u.status NOT IN ('suspended', 'deactivated', 'rejected')
          AND u.deleted_at IS NULL
    `);

    // Submission Stats (for Donut Chart)
    // Les submissions ne sont jamais supprimées — on les compte toutes.
    const submissionStats: any = await query(`
        SELECT status, COUNT(*) as count
        FROM reviews_submissions
        GROUP BY status
    `);

    // Top Sectors (for Bar Chart) — basé sur les SUBMISSIONS actives, pas les fiches,
    // pour refléter la vraie activité des guides (pas juste les intentions d'artisans).
    let sectorStats: any = [];
    try {
        sectorStats = await query(`
            SELECT
                COALESCE(sd.sector_name, 'Autre') as label,
                COUNT(s.id) as value
            FROM reviews_submissions s
            JOIN reviews_orders o ON s.order_id = o.id AND o.deleted_at IS NULL
            LEFT JOIN sector_difficulty sd ON o.sector_id = sd.id
            WHERE s.status != 'rejected'
            GROUP BY label
            ORDER BY value DESC
            LIMIT 6
        `);
    } catch (error) {
        console.error('Failed to fetch sector stats:', error);
    }

    // Trust Level Distribution (for Bar Chart) - From guide_gmail_accounts
    let trustDistribution: any = [];
    try {
        trustDistribution = await query(`
            SELECT
                COALESCE(trust_level, 'BRONZE') as label,
                COUNT(*) as value
            FROM guide_gmail_accounts
            WHERE deleted_at IS NULL
            GROUP BY label
        `);
    } catch (error) {
        console.error('Failed to fetch trust distribution stats:', error);
    }

    // User growth (last 12 months) — exclut les users supprimés
    const userGrowth: any = await query(`
        SELECT
            COUNT(*) as count,
            role,
            DATE_FORMAT(created_at, '%Y-%m') as month
        FROM users
        WHERE deleted_at IS NULL
        GROUP BY month, role
        ORDER BY month DESC
        LIMIT 12
    `);

    // Pending actions
    const pendingActions: any = await query(`
        SELECT
            (SELECT COUNT(*) FROM reviews_submissions WHERE status = 'pending' AND submitted_at <= DATE_SUB(NOW(), INTERVAL 7 DAY)) as pending_reviews,
            (SELECT COUNT(*) FROM users WHERE status = 'pending' AND deleted_at IS NULL) as pending_users
    `);

    // Total counts — n'inclut pas les soft-deleted
    const totalCounts: any = await query(`
        SELECT
            (SELECT COUNT(*) FROM users WHERE role = 'artisan' AND deleted_at IS NULL) as total_artisans,
            (SELECT COUNT(*) FROM users WHERE role = 'guide' AND deleted_at IS NULL) as total_guides,
            (SELECT COUNT(*) FROM reviews_orders WHERE deleted_at IS NULL) as total_orders,
            (SELECT COUNT(*) FROM review_proposals WHERE status = 'draft' AND deleted_at IS NULL) as pending_proposals,
            (SELECT COUNT(*) FROM reviews_orders WHERE status = 'submitted' AND deleted_at IS NULL) as pending_fiches,
            (SELECT COUNT(*) FROM payout_requests WHERE status = 'pending') as pending_payouts
    `);

    // Recent Activities (exclut les users supprimés)
    const recentActivities: any = await query(`
        SELECT * FROM (
            -- New Users
            SELECT 'new_user' as type, full_name as title, CONCAT(role, ' ( Création de compte )') as subtitle, created_at as date, NULL as amount
            FROM users
            WHERE deleted_at IS NULL
            UNION ALL
            -- New Submissions
            SELECT 'submission' as type, u.full_name as title, CONCAT(u.role, ' ( Nouvel avis soumis )') as subtitle, s.submitted_at as date, s.earnings as amount
            FROM reviews_submissions s
            JOIN users u ON s.guide_id = u.id
            WHERE u.deleted_at IS NULL
            UNION ALL
            -- Validated Submissions
            SELECT 'validation' as type, u.full_name as title, CONCAT(u.role, ' ( Avis validé )') as subtitle, s.validated_at as date, s.earnings as amount
            FROM reviews_submissions s
            JOIN users u ON s.guide_id = u.id
            WHERE s.status = 'validated' AND s.validated_at IS NOT NULL AND u.deleted_at IS NULL
            UNION ALL
            -- Payments
            SELECT 'payment' as type, u.full_name as title, p.description as subtitle, p.created_at as date, p.amount as amount
            FROM payments p
            JOIN users u ON p.user_id = u.id
            WHERE p.status = 'completed' AND u.deleted_at IS NULL
        ) activities
        ORDER BY date DESC
        LIMIT 10
    `);

    return {
        revenue: financialStats,
        submissionStats,
        sectorStats,
        trustDistribution,
        totalAllTimeRevenue: totalAllTimeRevenue[0]?.total || 0,
        growth: userGrowth,
        pending: pendingActions[0],
        totals: totalCounts[0],
        activities: recentActivities
    };
};

/**
 * Get all payout requests for admin management
 */
export const getAllPayoutRequests = async () => {
    return await query(`
        SELECT p.*, u.full_name as guide_name, u.email as guide_email, gp.google_email, 
               gp.preferred_payout_method, gp.payout_details
        FROM payout_requests p
        JOIN users u ON p.guide_id = u.id
        JOIN guides_profiles gp ON u.id = gp.user_id
        ORDER BY p.requested_at DESC
    `);
};

/**
 * Update payout request status
 */
export const updatePayoutStatus = async (payoutId: string, status: string, adminNote?: string) => {
    return await query(`
        UPDATE payout_requests 
        SET status = ?, admin_note = ?, processed_at = IF(? = 'paid', NOW(), processed_at)
        WHERE id = ?
    `, [status, adminNote, status, payoutId]);
};
/**
 * Get all review submissions for admin validation
 */
export const getAllSubmissions = async () => {
    return await query(`
        SELECT s.*,
               u.full_name as guide_name, u.avatar_url as guide_avatar,
               gp.google_email,
               ap.company_name as artisan_name,
               ro.company_name as fiche_name,
               p.content as proposal_content,
               validator.full_name as validated_by_name
        FROM reviews_submissions s
        JOIN users u ON s.guide_id = u.id
        JOIN guides_profiles gp ON u.id = gp.user_id
        JOIN artisans_profiles ap ON s.artisan_id = ap.user_id
        JOIN review_proposals p ON s.proposal_id = p.id
        JOIN reviews_orders ro ON s.order_id = ro.id
        LEFT JOIN users validator ON s.validated_by = validator.id
        ORDER BY s.submitted_at DESC
    `);
};

/**
 * Get submissions for a specific artisan
 */
export const getArtisanSubmissions = async (artisanId: string) => {
    return await query(`
        SELECT 
            p.id as proposal_id,
            p.content as proposal_content,
            p.author_name as proposal_author,
            p.rating,
            p.status as proposal_status,
            s.id as submission_id,
            s.status as submission_status,
            s.review_url,
            s.submitted_at,
            s.earnings,
            s.rejection_reason,
            o.company_name as fiche_name,
            o.id as order_id,
            u.full_name as guide_name,
            u.id as guide_id,
            p.created_at as proposal_date
        FROM review_proposals p
        JOIN reviews_orders o ON p.order_id = o.id
        LEFT JOIN reviews_submissions s ON p.id = s.proposal_id
        LEFT JOIN users u ON s.guide_id = u.id
        WHERE o.artisan_id = ?
        ORDER BY COALESCE(s.submitted_at, p.created_at) DESC
    `, [artisanId]);
};

/**
 * Update review submission status (validate/reject)
 */
export const updateSubmissionStatus = async (submissionId: string, status: string, rejectionReason?: string, allowResubmit?: boolean, allowAppeal?: boolean, adminId?: string) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 0. Pre-fetch guide + artisan info (needed after commit, even if submission gets deleted)
        const [preInfo]: any = await connection.query(`
            SELECT s.guide_id, s.artisan_id, p.order_id,
                   u.full_name as guide_name, u.email as guide_email, u.status as guide_status
            FROM reviews_submissions s
            JOIN review_proposals p ON s.proposal_id = p.id
            JOIN users u ON s.guide_id = u.id
            WHERE s.id = :submissionId
        `, { submissionId });
        const subInfo = preInfo?.[0] || null;

        // 1. Update submission status
        let validatedAtPart = "";
        if (status === 'validated') {
            validatedAtPart = ", validated_at = NOW(), validated_by = :adminId";
        } else if (status === 'rejected') {
            validatedAtPart = ", validated_by = :adminId";
        }

        const allowResubmitValue = (status === 'rejected' && allowResubmit) ? 1 : 0;
        const allowAppealValue = (status === 'rejected' && allowAppeal) ? 1 : 0;

        await connection.query(`
            UPDATE reviews_submissions
            SET status = :status,
                rejection_reason = :rejectionReason,
                allow_resubmit = :allowResubmitValue,
                allow_appeal = :allowAppealValue
                ${validatedAtPart}
            WHERE id = :submissionId
        `, {
            status,
            rejectionReason: rejectionReason || null,
            allowResubmitValue,
            allowAppealValue,
            adminId: adminId || null,
            submissionId
        });

        // 2. Handle reviews_received in reviews_orders + statut completed
        // Logique :
        // - validation : ne touche pas reviews_received (déjà incrémenté à la soumission),
        //   mais peut faire passer la fiche en 'completed' si validated >= quantity
        // - rejet allow_resubmit : slot conservé pendant 24h, releaseExpiredResubmitSlots libérera après
        // - rejet allow_appeal ou rejet sec : slot libéré immédiatement
        if (status === 'rejected' || status === 'validated') {
            const [rows]: any = await connection.query(
                `SELECT s.artisan_id, p.order_id
                 FROM reviews_submissions s
                 JOIN review_proposals p ON s.proposal_id = p.id
                 WHERE s.id = :submissionId`,
                { submissionId }
            );

            if (rows && rows.length > 0) {
                const { artisan_id, order_id } = rows[0];

                if (status === 'validated') {
                    // Stats globales artisan
                    await connection.query(`
                        UPDATE artisans_profiles
                        SET current_month_reviews = COALESCE(current_month_reviews, 0) + 1,
                            total_reviews_received = COALESCE(total_reviews_received, 0) + 1
                        WHERE user_id = :artisan_id
                    `, { artisan_id });

                    // Recalculer le statut de la fiche basé sur les avis VALIDÉS
                    if (order_id) {
                        await connection.query(`
                            UPDATE reviews_orders ro
                            SET status = CASE
                              WHEN (SELECT COUNT(*) FROM reviews_submissions s2
                                    WHERE s2.order_id = ro.id AND s2.status = 'validated') >= ro.quantity
                              THEN 'completed'
                              ELSE ro.status
                            END
                            WHERE ro.id = :order_id
                        `, { order_id });
                    }
                } else if (status === 'rejected' && order_id) {
                    // Marquer la date de rejet
                    await connection.query(`
                        UPDATE reviews_submissions
                        SET rejected_at = NOW()
                        WHERE id = :submissionId
                    `, { submissionId });

                    // Logique slot : resubmit garde le slot 24h, sinon libération immédiate
                    const shouldReleaseSlot = !allowResubmit;
                    if (shouldReleaseSlot) {
                        await connection.query(`
                            UPDATE reviews_orders
                            SET reviews_received = GREATEST(0, COALESCE(reviews_received, 1) - 1),
                                status = CASE WHEN status = 'completed' THEN 'in_progress' ELSE status END
                            WHERE id = :order_id
                        `, { order_id });
                        await connection.query(`
                            UPDATE reviews_submissions
                            SET slot_released_at = NOW()
                            WHERE id = :submissionId
                        `, { submissionId });
                    }
                    // Si allow_resubmit : slot reste occupé, releaseExpiredResubmitSlots() le libérera après 24h
                }
            }
        }

        await connection.commit();

        // 3. BAD LINK WARNING SYSTEM: auto-suspend at 3 bad links in a month
        if (status === 'rejected' && allowResubmit && subInfo) {
            try {
                // Count + fetch bad link submissions this month for this guide
                const [badLinkRows]: any = await pool.query(`
                    SELECT rs.id, rs.review_url, rs.rejection_reason, rs.rejected_at,
                           ro.company_name, ro.fiche_name
                    FROM reviews_submissions rs
                    JOIN review_proposals rp ON rs.proposal_id = rp.id
                    JOIN reviews_orders ro ON rp.order_id = ro.id
                    WHERE rs.guide_id = :guideId
                      AND rs.allow_resubmit = 1
                      AND rs.status = 'rejected'
                      AND rs.rejected_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
                    ORDER BY rs.rejected_at DESC
                `, { guideId: subInfo.guide_id });

                const badLinkCount = badLinkRows?.length || 0;
                const badLinkDetails = (badLinkRows || []).map((r: any) => ({
                    ficheName: r.fiche_name || r.company_name || 'Fiche inconnue',
                    reviewUrl: r.review_url || '',
                    reason: r.rejection_reason || '',
                    date: r.rejected_at ? new Date(r.rejected_at).toLocaleDateString('fr-FR') : ''
                }));

                if (badLinkCount >= 3 && subInfo.guide_status === 'active') {
                    // AUTO-SUSPEND: 3 bad links reached
                    await pool.query(`UPDATE users SET status = 'suspended' WHERE id = ?`, [subInfo.guide_id]);
                    invalidateAuthCache(subInfo.guide_id);

                    // Block ALL gmail accounts for this guide
                    await pool.query(`
                        UPDATE guide_gmail_accounts
                        SET is_blocked = TRUE, trust_level = 'BLOCKED'
                        WHERE user_id = ?
                    `, [subInfo.guide_id]);

                    await sendBadLinkWarningEmail(subInfo.guide_email, subInfo.guide_name, 3, true, badLinkDetails);

                    notificationService.sendToUser(subInfo.guide_id, {
                        type: 'system',
                        title: 'Compte Suspendu',
                        message: 'Votre compte a été suspendu automatiquement suite à 3 mauvais liens en un mois. Contactez le support.',
                        link: '/profile'
                    });

                    console.log(`[AUTO-SUSPEND] Guide ${subInfo.guide_id} (${subInfo.guide_email}) suspended: 3 bad links this month`);
                } else if (badLinkCount < 3) {
                    await sendBadLinkWarningEmail(subInfo.guide_email, subInfo.guide_name, badLinkCount, false, badLinkDetails);
                }
            } catch (warningError) {
                console.error('Error in bad link warning system:', warningError);
            }
        }

        // 4. Send notification to guide (using pre-fetched subInfo since submission may have been deleted)
        if (subInfo) {
            try {
                await sendSubmissionDecisionEmail(subInfo.guide_email, subInfo.guide_name, status, rejectionReason, allowResubmit, allowAppeal);

                // SSE NOTIFICATION - Guide
                const rejectMsg = allowResubmit
                    ? 'Votre avis a été rejeté. Vous avez 24h pour corriger le lien depuis la page Corrections, sinon le slot sera libéré.'
                    : allowAppeal
                    ? 'Votre avis a été rejeté. Vous pouvez faire appel depuis la page Corrections si l\'avis revient en ligne.'
                    : 'Désolé, votre soumission n\'a pas été retenue.';
                const hasCorrection = allowResubmit || allowAppeal;
                notificationService.sendToUser(subInfo.guide_id, {
                    type: 'system',
                    title: status === 'validated' ? 'Avis Validé ! 🎉' : 'Avis Rejeté ❌',
                    message: status === 'validated' ? 'Félicitations ! Vos gains ont été crédités.' : rejectMsg,
                    link: status === 'validated' ? '/guide/dashboard' : (hasCorrection ? '/guide/corrections' : '/guide/dashboard')
                });

                // SSE NOTIFICATION - Artisan (only if validated)
                if (status === 'validated' && subInfo.artisan_id) {
                    notificationService.sendToUser(subInfo.artisan_id, {
                        type: 'order_update',
                        title: 'Un avis a été publié ! ✅',
                        message: 'Google a validé un nouvel avis pour votre entreprise.',
                        link: '/artisan/dashboard'
                    });
                }
            } catch (error) {
                console.error('Error sending submission decision email:', error);
            }
        }
    } catch (error) {
        console.error('Error in updateSubmissionStatus:', error);
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Liste des avis rejetés avec filtres (page admin dédiée)
 */
export const getRejectedSubmissions = async (filters: {
    orderId?: string;
    artisanId?: string;
    guideId?: string;
    reasonSearch?: string;
    page?: number;
    limit?: number;
}) => {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const where: string[] = [`s.status = 'rejected'`, `s.dismissed_at IS NULL`];
    const params: any = {};

    if (filters.orderId) {
        where.push('ro.id = :orderId');
        params.orderId = filters.orderId;
    }
    if (filters.artisanId) {
        where.push('ro.artisan_id = :artisanId');
        params.artisanId = filters.artisanId;
    }
    if (filters.guideId) {
        where.push('s.guide_id = :guideId');
        params.guideId = filters.guideId;
    }
    if (filters.reasonSearch) {
        where.push('s.rejection_reason LIKE :reasonSearch');
        params.reasonSearch = `%${filters.reasonSearch}%`;
    }

    const connection = await pool.getConnection();
    try {
        const [rows]: any = await connection.query(`
            SELECT s.id, s.review_url, s.google_email, s.rejection_reason, s.rejected_at,
                   s.allow_resubmit, s.allow_appeal, s.slot_released_at,
                   s.earnings, s.submitted_at,
                   s.proposal_id, p.content as review_text,
                   u.id as guide_id, u.full_name as guide_name, u.email as guide_email,
                   ro.id as order_id, ro.company_name, ro.quantity, ro.reviews_received, ro.status as order_status,
                   au.id as artisan_id, au.full_name as artisan_name,
                   (SELECT COUNT(*) FROM reviews_submissions s2
                    WHERE s2.order_id = ro.id AND s2.status = 'validated') as reviews_validated
            FROM reviews_submissions s
            JOIN users u ON s.guide_id = u.id
            LEFT JOIN review_proposals p ON s.proposal_id = p.id
            LEFT JOIN reviews_orders ro ON p.order_id = ro.id
            LEFT JOIN users au ON ro.artisan_id = au.id
            WHERE ${where.join(' AND ')}
            ORDER BY s.rejected_at DESC, s.submitted_at DESC
            LIMIT :limit OFFSET :offset
        `, { ...params, limit, offset });

        const [countRows]: any = await connection.query(`
            SELECT COUNT(*) as total
            FROM reviews_submissions s
            LEFT JOIN review_proposals p ON s.proposal_id = p.id
            LEFT JOIN reviews_orders ro ON p.order_id = ro.id
            WHERE ${where.join(' AND ')}
        `, params);

        return {
            rows,
            total: countRows?.[0]?.total || 0,
            page,
            limit,
        };
    } finally {
        connection.release();
    }
};

/**
 * Liste les IDs des avis rejetés correspondant aux mêmes filtres que getRejectedSubmissions.
 * Utilisé par l'action bulk "Tout sélectionner".
 */
export const getRejectedSubmissionIds = async (filters: {
    orderId?: string;
    artisanId?: string;
    guideId?: string;
    reasonSearch?: string;
}): Promise<string[]> => {
    const where: string[] = [`s.status = 'rejected'`, `s.dismissed_at IS NULL`];
    const params: any = {};

    if (filters.orderId) {
        where.push('ro.id = :orderId');
        params.orderId = filters.orderId;
    }
    if (filters.artisanId) {
        where.push('ro.artisan_id = :artisanId');
        params.artisanId = filters.artisanId;
    }
    if (filters.guideId) {
        where.push('s.guide_id = :guideId');
        params.guideId = filters.guideId;
    }
    if (filters.reasonSearch) {
        where.push('s.rejection_reason LIKE :reasonSearch');
        params.reasonSearch = `%${filters.reasonSearch}%`;
    }

    const rows: any = await query(`
        SELECT s.id
        FROM reviews_submissions s
        LEFT JOIN review_proposals p ON s.proposal_id = p.id
        LEFT JOIN reviews_orders ro ON p.order_id = ro.id
        WHERE ${where.join(' AND ')}
    `, params);

    return rows.map((r: any) => r.id);
};

/**
 * Revalide en lot une liste d'avis rejetés. Réutilise updateSubmissionStatus
 * pour conserver la logique métier (transactions, notifications, recalcul stats).
 */
/**
 * Remet des avis rejetés en "pending" pour qu'ils soient re-vérifiés.
 * Délègue à bulkResetToPending qui gère correctement les slots et stats.
 */
export const bulkRevalidateSubmissions = async (ids: string[]): Promise<{
    success: number;
    failed: number;
    errors: { id: string; error: string }[];
}> => {
    return bulkResetToPending(ids);
};

/**
 * Remet des avis rejetés en "pending" (non publié) pour qu'ils puissent être revalidés.
 * - Remet le statut de la soumission en "pending"
 * - Réinitialise les champs de rejet
 * - Si le slot avait été libéré, ré-incrémente reviews_received sur la fiche
 * - Si la fiche avait atteint son quota journalier, décrémente de 1 pour laisser de la place
 */
export const bulkResetToPending = async (ids: string[]): Promise<{
    success: number;
    failed: number;
    errors: { id: string; error: string }[];
}> => {
    let success = 0;
    let failed = 0;
    const errors: { id: string; error: string }[] = [];

    const connection = await pool.getConnection();
    try {
        for (const submissionId of ids) {
            try {
                await connection.beginTransaction();

                // 1. Get submission + order info
                const [subRows]: any = await connection.query(`
                    SELECT s.id, s.guide_id, s.status, s.slot_released_at, s.allow_resubmit,
                           p.order_id, ro.reviews_received, ro.quantity, ro.status as order_status
                    FROM reviews_submissions s
                    JOIN review_proposals p ON s.proposal_id = p.id
                    JOIN reviews_orders ro ON p.order_id = ro.id
                    WHERE s.id = :submissionId AND s.status = 'rejected'
                `, { submissionId });

                if (!subRows || subRows.length === 0) {
                    await connection.rollback();
                    errors.push({ id: submissionId, error: 'Soumission non trouvée ou pas rejetée' });
                    failed++;
                    continue;
                }

                const sub = subRows[0];

                // 2. Reset submission to pending
                await connection.query(`
                    UPDATE reviews_submissions
                    SET status = 'pending',
                        rejection_reason = NULL,
                        allow_resubmit = 0,
                        allow_appeal = 0,
                        rejected_at = NULL,
                        slot_released_at = NULL,
                        validated_at = NULL
                    WHERE id = :submissionId
                `, { submissionId });

                // 3. If slot was released, re-increment reviews_received
                if (sub.slot_released_at) {
                    await connection.query(`
                        UPDATE reviews_orders
                        SET reviews_received = COALESCE(reviews_received, 0) + 1
                        WHERE id = :orderId
                    `, { orderId: sub.order_id });
                }

                // 4. Ensure fiche is in_progress (not completed/cancelled)
                await connection.query(`
                    UPDATE reviews_orders
                    SET status = 'in_progress'
                    WHERE id = :orderId AND status IN ('completed', 'cancelled')
                `, { orderId: sub.order_id });

                await connection.commit();
                success++;
            } catch (e: any) {
                await connection.rollback();
                failed++;
                errors.push({ id: submissionId, error: e?.message || 'unknown error' });
            }
        }
    } finally {
        connection.release();
    }

    return { success, failed, errors };
};

/**
 * Recycle des avis rejetés : supprime la soumission et libère le slot
 * pour qu'un autre guide puisse reprendre la fiche.
 *
 * Flow: Admin régénère le contenu IA → recycle → la proposition existe avec du nouveau
 * contenu mais sans soumission active → un nouveau guide peut la prendre.
 *
 * - Marque la soumission comme recyclée (`recycled_at`) au lieu de la supprimer
 *   → le guide d'origine garde son historique et comprend ce qui s'est passé.
 * - Libère le slot (décrémente reviews_received si pas déjà fait)
 * - Remet la fiche en in_progress si besoin
 * - Désactive allow_resubmit/allow_appeal (le guide ne peut plus corriger)
 * - Marque dismissed_at pour retirer de la file admin des rejets à traiter
 */
export const recycleRejectedSubmissions = async (ids: string[]): Promise<{
    success: number;
    failed: number;
    errors: { id: string; error: string }[];
}> => {
    let success = 0;
    let failed = 0;
    const errors: { id: string; error: string }[] = [];

    const connection = await pool.getConnection();
    try {
        for (const submissionId of ids) {
            try {
                await connection.beginTransaction();

                // 1. Get submission + order info
                const [subRows]: any = await connection.query(`
                    SELECT s.id, s.guide_id, s.status, s.slot_released_at,
                           p.order_id, p.id as proposal_id,
                           ro.reviews_received, ro.quantity
                    FROM reviews_submissions s
                    JOIN review_proposals p ON s.proposal_id = p.id
                    JOIN reviews_orders ro ON p.order_id = ro.id
                    WHERE s.id = :submissionId AND s.status = 'rejected'
                `, { submissionId });

                if (!subRows || subRows.length === 0) {
                    await connection.rollback();
                    errors.push({ id: submissionId, error: 'Soumission non trouvée ou pas rejetée' });
                    failed++;
                    continue;
                }

                const sub = subRows[0];

                // 2. Free the slot FIRST (before marking as recycled) so the check on
                //    slot_released_at still reflects the state at admin decision time.
                if (!sub.slot_released_at) {
                    await connection.query(`
                        UPDATE reviews_orders
                        SET reviews_received = GREATEST(0, COALESCE(reviews_received, 1) - 1)
                        WHERE id = :orderId
                    `, { orderId: sub.order_id });
                }

                // 3. Mark the submission as RECYCLED (instead of deleting).
                //    - recycled_at: new flag for guide UI ("Recyclé" badge)
                //    - dismissed_at: retire de la file /admin/rejected-reviews
                //    - slot_released_at: empêche releaseExpiredResubmitSlots de re-décrémenter
                //    - allow_resubmit/allow_appeal = 0: le guide ne peut plus corriger/contester
                //    - status reste 'rejected': toutes les queries existantes continuent de fonctionner
                //      (quotas, compteurs, stats) car elles filtrent déjà sur status != 'rejected'
                await connection.query(`
                    UPDATE reviews_submissions
                    SET recycled_at = NOW(),
                        dismissed_at = COALESCE(dismissed_at, NOW()),
                        slot_released_at = COALESCE(slot_released_at, NOW()),
                        allow_resubmit = 0,
                        allow_appeal = 0
                    WHERE id = :submissionId
                `, { submissionId });

                // 4. Ensure fiche is in_progress so new guides can see it
                await connection.query(`
                    UPDATE reviews_orders
                    SET status = 'in_progress'
                    WHERE id = :orderId AND status IN ('completed', 'cancelled')
                `, { orderId: sub.order_id });

                // 5. Reset the proposal status so it's available for a new guide
                // Note: CHECK constraint only allows ('draft', 'approved', 'rejected')
                // 'approved' = content ready, waiting for a guide to submit proof
                await connection.query(`
                    UPDATE review_proposals
                    SET status = 'approved'
                    WHERE id = :proposalId AND status != 'approved'
                `, { proposalId: sub.proposal_id });

                await connection.commit();
                success++;
            } catch (e: any) {
                await connection.rollback();
                failed++;
                errors.push({ id: submissionId, error: e?.message || 'unknown error' });
            }
        }
    } finally {
        connection.release();
    }

    return { success, failed, errors };
};

/**
 * Force la remise en ligne d'une fiche (admin).
 * Marque aussi toutes les soumissions rejetées de cet order comme "traitées"
 * pour qu'elles disparaissent de la liste /admin/rejected-reviews.
 */
export const forceRelistOrder = async (orderId: string) => {
    await query(`
        UPDATE reviews_orders
        SET status = 'in_progress', paused_at = NULL, status_before_pause = NULL
        WHERE id = ?
    `, [orderId]);

    // Cache les rejets de cet order : l'admin a explicitement choisi de relancer
    // la fiche, donc ces lignes ne sont plus pertinentes dans la file de traitement.
    await query(`
        UPDATE reviews_submissions s
        JOIN review_proposals p ON s.proposal_id = p.id
        SET s.dismissed_at = NOW()
        WHERE p.order_id = ?
          AND s.status = 'rejected'
          AND s.dismissed_at IS NULL
    `, [orderId]);

    return { success: true };
};

/**
 * Get all subscriptions with user and pack details
 */
export const getAllSubscriptions = async () => {
    return await query(`
        SELECT 
            p.id as payment_id,
            u.id as user_id,
            COALESCE(u.full_name, u.email) as full_name,
            u.email,
            u.avatar_url,
            ap.company_name,
            CASE WHEN p.status = 'completed' THEN 'active' ELSE p.status END as subscription_status,
            p.created_at as subscription_start_date,
            DATE_ADD(p.created_at, INTERVAL 1 MONTH) as subscription_end_date,
            COALESCE(sp.name, p.description) as pack_name,
            CAST(p.amount * 100 AS UNSIGNED) as price_cents,
            COALESCE(sp.color, 'standard') as pack_color,
            p.fiches_quota as total_quota,
            p.fiches_used as is_pack_used,
            (
                SELECT COALESCE(SUM(ro.reviews_received), 0)
                FROM reviews_orders ro
                WHERE ro.payment_id = p.id
            ) as total_used,
            (
                SELECT id FROM reviews_orders WHERE payment_id = p.id LIMIT 1
            ) as order_id
        FROM payments p
        JOIN users u ON p.user_id = u.id
        JOIN artisans_profiles ap ON ap.user_id = u.id
        LEFT JOIN subscription_packs sp ON p.description LIKE CONCAT('%', sp.id, '%')
        WHERE p.type = 'subscription'
        ORDER BY p.created_at DESC
    `);
};

/**
 * Get subscription statistics for dashboard
 */
export const getSubscriptionStats = async () => {
    // Total active subscription packs (records in payments)
    const totalActivePacks: any = await query(`
        SELECT COUNT(*) as count 
        FROM payments 
        WHERE type = 'subscription' AND status = 'completed'
    `);

    try {
        // Monthly recurring revenue (MRR) estimation based on active packs
        const mrr: any = await query(`
            SELECT COALESCE(SUM(amount), 0) as mrr
            FROM payments
            WHERE type = 'subscription' AND status = 'completed'
        `);

        // Distribution by pack name (from payment description)
        const distribution: any = await query(`
            SELECT 
                COALESCE(sp.name, p.description) as name,
                'standard' as color,
                COUNT(*) as value
            FROM payments p
            LEFT JOIN subscription_packs sp ON p.description LIKE CONCAT('%', sp.id, '%')
            WHERE p.type = 'subscription' AND p.status = 'completed'
            GROUP BY name
            ORDER BY value DESC
        `);

        // Distribution by status
        const statusDistribution: any = await query(`
            SELECT 
                subscription_status as status,
                COUNT(*) as count
            FROM artisans_profiles
            WHERE subscription_status IS NOT NULL AND subscription_status != 'none'
            GROUP BY subscription_status
        `);

        // Pack Purchase Trends
        const packTrends: any = await query(`
            SELECT 
                DATE_FORMAT(p.created_at, '%Y-%m') as month,
                COALESCE(sp.name, p.description) as pack_name,
                COUNT(*) as count
            FROM payments p
            LEFT JOIN subscription_packs sp ON p.description LIKE CONCAT('%', sp.id, '%')
            WHERE p.type = 'subscription' AND p.status = 'completed'
              AND p.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY month, pack_name
            ORDER BY month ASC
        `);

        return {
            totalActive: totalActivePacks[0].count,
            mrr: parseFloat(mrr[0].mrr) || 0,
            distribution: distribution.map((d: any) => ({
                ...d,
                color: (d.name || '').includes('Découverte') ? '#3b82f6' : (d.name || '').includes('Croissance') ? '#10b981' : (d.name || '').includes('Expert') ? '#a855f7' : '#94a3b8'
            })),
            statusDistribution: statusDistribution,
            packTrends: packTrends
        };
    } catch (error) {
        console.error('Error fetching subscription stats with packs:', error);
        // Fallback without pack details if subscription_packs table doesn't exist
        const statusDistribution: any = await query(`
            SELECT 
                subscription_status as status,
                COUNT(*) as count
            FROM artisans_profiles
            WHERE subscription_status IS NOT NULL AND subscription_status != 'none'
            GROUP BY subscription_status
        `);

        return {
            totalActive: totalActivePacks[0].count,
            mrr: 0,
            distribution: [],
            statusDistribution: statusDistribution,
            packTrends: []
        };
    }
};

/**
 * Get all subscription packs
 */
export const getPacks = async () => {
    return await query(`SELECT * FROM subscription_packs ORDER BY price_cents ASC`);
};

/**
 * Create a new subscription pack
 */
export const createPack = async (pack: any) => {
    const { id, name, price_cents, quantity, fiches_quota, features, color, is_popular, stripe_link } = pack;
    return await query(
        `INSERT INTO subscription_packs (id, name, price_cents, quantity, fiches_quota, features, color, is_popular, stripe_link)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, name, price_cents, quantity, fiches_quota || 1, JSON.stringify(features), color, is_popular, stripe_link || null]
    );
};

/**
 * Update an existing subscription pack
 */
export const updatePack = async (id: string, pack: any) => {
    const { name, price_cents, quantity, fiches_quota, features, color, is_popular, stripe_link } = pack;
    return await query(
        `UPDATE subscription_packs
         SET name = ?, price_cents = ?, quantity = ?, fiches_quota = ?, features = ?, color = ?, is_popular = ?, stripe_link = ?
         WHERE id = ?`,
        [name, price_cents, quantity, fiches_quota || 1, JSON.stringify(features), color, is_popular, stripe_link || null, id]
    );
};

/**
 * Delete a subscription pack
 */
export const deletePack = async (id: string) => {
    return await query(`DELETE FROM subscription_packs WHERE id = ?`, [id]);
};

/**
 * Get fiches pending admin approval (status = 'submitted')
 */
export const getPendingfiches = async () => {
    return await query(`
        SELECT o.*, u.full_name as artisan_name, ap.company_name
        FROM reviews_orders o
        JOIN users u ON o.artisan_id = u.id
        JOIN artisans_profiles ap ON u.id = ap.user_id
        WHERE o.status = 'submitted' AND o.deleted_at IS NULL
        ORDER BY o.created_at DESC
    `);
};

/**
 * Approve a fiche and make it available for guides
 */
export const approvefiche = async (orderId: string, baseUrl?: string) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Update order status and publication date
        await connection.query(
            `UPDATE reviews_orders SET status = 'in_progress', published_at = NOW() WHERE id = ?`,
            [orderId]
        );

        // 2. Approve all draft proposals for this order
        await connection.query(
            `UPDATE review_proposals SET status = 'approved' WHERE order_id = ? AND status = 'draft'`,
            [orderId]
        );

        await connection.commit();

        // 3. Send notification to artisan
        try {
            const [rows]: any = await connection.query(`
                SELECT u.id, u.full_name, u.email, o.artisan_id
                FROM reviews_orders o
                JOIN users u ON o.artisan_id = u.id
                WHERE o.id = ?
            `, [orderId]);

            if (rows && rows.length > 0) {
                await sendficheDecisionEmail(rows[0].email, rows[0].full_name, orderId, 'in_progress', baseUrl);

                // SSE NOTIFICATION
                notificationService.sendToUser(rows[0].artisan_id || rows[0].id, {
                    type: 'new_fiche',
                    title: 'fiche Validée ! 🎈',
                    message: 'Votre fiche est maintenant visible par nos Guides Locaux.',
                    link: '/artisan/dashboard'
                });
            }
        } catch (error) {
            console.error('Error sending fiche decision email:', error);
        }

        // 4. Notify all active guides by email
        try {
            // Get the approved fiche details
            const [ficheRows]: any = await pool.query(`
                SELECT o.id, o.company_name, o.quantity, o.city,
                       sd.sector_name as sector
                FROM reviews_orders o
                LEFT JOIN sector_difficulty sd ON o.sector_id = sd.id
                WHERE o.id = ?
            `, [orderId]);

            // Get all active guides' emails
            const [guides]: any = await pool.query(
                `SELECT email FROM users WHERE role = 'guide' AND status = 'active'`
            );

            if (ficheRows.length > 0 && guides.length > 0) {
                // Get the 10 most recent available fiches (excluding the one just approved)
                const [recentFiches]: any = await pool.query(`
                    SELECT o.id, o.company_name, o.quantity, o.city,
                           sd.sector_name as sector
                    FROM reviews_orders o
                    LEFT JOIN sector_difficulty sd ON o.sector_id = sd.id
                    WHERE o.status = 'in_progress'
                      AND o.reviews_received < o.quantity
                      AND o.id != ?
                    ORDER BY o.published_at DESC
                    LIMIT 10
                `, [orderId]);

                const guideEmails = guides.map((g: any) => g.email);
                await sendNewFicheToGuidesEmail(guideEmails, ficheRows[0], recentFiches, baseUrl);
            }
        } catch (error) {
            console.error('Error sending new fiche notification to guides:', error);
        }
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};
/**
 * Get all fiches with artisan and company details
 */
export const getAllfiches = async () => {
    return await query(`
        SELECT o.*,
               COALESCE(pay.amount, o.price) as price,
               u.full_name as artisan_name,
               ap.company_name as original_company_name,
               (SELECT COUNT(*) FROM reviews_submissions s
                WHERE s.order_id = o.id AND s.status = 'validated') as validated_count
        FROM reviews_orders o
        JOIN users u ON o.artisan_id = u.id
        JOIN artisans_profiles ap ON u.id = ap.user_id
        LEFT JOIN payments pay ON o.payment_id = pay.id
        ORDER BY o.created_at DESC
    `);
};

/**
 * Get full fiche details for admin editing
 */
export const getAdminficheDetail = async (orderId: string) => {
    const orders: any = await query(`
        SELECT o.*, u.full_name as artisan_name, u.email as artisan_email, ap.company_name as artisan_company,
               COALESCE(sp.name, pay.description) as pack_name, 
               sp.quantity as pack_reviews_per_fiche,
               sp.features as pack_features,
               pay.fiches_quota, pay.fiches_used as pack_fiches_used,
               pay.amount as payment_amount,
               o.payout_per_review
        FROM reviews_orders o
        JOIN users u ON o.artisan_id = u.id
        JOIN artisans_profiles ap ON u.id = ap.user_id
        LEFT JOIN payments pay ON o.payment_id = pay.id
        LEFT JOIN subscription_packs sp ON pay.description LIKE CONCAT('%', sp.id, '%')
        WHERE o.id = ?
    `, [orderId]);

    if (!orders || orders.length === 0) return null;

    const proposals = await query(`
        SELECT * FROM review_proposals WHERE order_id = ? AND deleted_at IS NULL ORDER BY created_at ASC
    `, [orderId]);

    const order = orders[0];
    return {
        ...order,
        // If we have a linked payment, show its actual amount as the price
        price: order.payment_amount ? parseFloat(order.payment_amount) : order.price,
        proposals
    };
};

/**
 * Update any fiche field (Admin CRUD)
 */
export const updatefiche = async (orderId: string, data: any) => {
    // Filter out fields that don't exist in reviews_orders table
    // These are read-only fields from JOINs or computed values
    const invalidFields = ['pack_reviews_per_fiche', 'pack_features', 'pack_name', 'artisan_name', 'artisan_email', 'artisan_company'];

    const filteredData = Object.keys(data)
        .filter(key => !invalidFields.includes(key))
        .reduce((obj: any, key) => {
            obj[key] = data[key];
            return obj;
        }, {});

    const fields = Object.keys(filteredData);
    const values = Object.values(filteredData);

    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');

    // Perform the update on reviews_orders
    const result = await query(
        `UPDATE reviews_orders SET ${setClause} WHERE id = ?`,
        [...values, orderId]
    );

    // If payout_per_review was updated, cascade the change to PENDING submissions
    if (filteredData.payout_per_review !== undefined) {
        await query(
            `UPDATE reviews_submissions 
             SET earnings = ? 
             WHERE order_id = ? AND status = 'pending'`,
            [filteredData.payout_per_review, orderId]
        );
    }

    return result;
};

/**
 * Delete a fiche (Admin CRUD)
 */
export const deletefiche = async (orderId: string) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Submissions and proposals might have FK with ON DELETE CASCADE, 
        // but let's be safe if they don't or if there's other cleanup.
        // Usually, reviews_submissions should be deleted or handled.

        // Soft delete : on marque deleted_at sans supprimer les lignes.
        // L'historique des avis (reviews_submissions) reste intact et joignable
        // sur cet order_id, donc le guide garde toutes ses preuves et gains.
        await connection.query(
            `UPDATE review_proposals SET deleted_at = NOW() WHERE order_id = ? AND deleted_at IS NULL`,
            [orderId]
        );
        await connection.query(
            `UPDATE reviews_orders SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
            [orderId]
        );

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Manually activate a subscription pack for an artisan
 * Used when payment is done offline
 */
export const activateArtisanPack = async (userId: string, packId: string, baseUrl?: string) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Fetch pack details
        const [packs]: any = await connection.query('SELECT * FROM subscription_packs WHERE id = ?', [packId]);
        const pack = packs.length > 0 ? packs[0] : null;

        if (!pack) throw new Error("Pack non trouvé");

        const fichesQuota = pack.fiches_quota || 1;
        const amount = pack.price_cents / 100;
        const packName = pack.name;

        // Calculate dates
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        // 2. Update artisan profile
        await connection.query(
            `UPDATE artisans_profiles 
             SET subscription_status = 'active',
                 subscription_product_id = ?,
                 subscription_start_date = ?,
                 subscription_end_date = ?,
                 last_payment_date = ?,
                 fiches_allowed = fiches_allowed + ?
             WHERE user_id = ?`,
            [packId, startDate, endDate, startDate, fichesQuota, userId]
        );

        // 3. Ensure user account is active
        await connection.query(
            `UPDATE users SET status = 'active' WHERE id = ?`,
            [userId]
        );

        // 4. Log manual payment
        const paymentId = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        await connection.query(`
            INSERT INTO payments (id, user_id, type, amount, status, stripe_payment_id, description, fiches_quota, review_credits, processed_at)
            VALUES (?, ?, 'subscription', ?, 'completed', ?, ?, ?, ?, NOW())
        `, [
            paymentId,
            userId,
            amount,
            `MANUAL_${paymentId}`,
            `Abonnement ${packName} (Activé par Admin)`,
            fichesQuota,
            pack.quantity || 0
        ]);

        await connection.commit();

        // Invalidate auth cache: user status may have been flipped to 'active'.
        invalidateAuthCache(userId);

        // 5. Send notification email
        try {
            const { sendPackActivationEmail } = await import('./emailService');
            const [user]: any = await connection.query('SELECT full_name, email FROM users WHERE id = ?', [userId]);
            if (user && user.length > 0) {
                await sendPackActivationEmail(user[0].email, user[0].full_name, packId, pack.quantity || 0, baseUrl);
            }
        } catch (emailError) {
            console.error('Failed to send manual pack activation email:', emailError);
        }

        // 6. SSE Notification
        notificationService.sendToUser(userId, {
            type: 'system',
            title: 'Pack Activé ! 🚀',
            message: `Votre pack ${packName} a été activé manuellement par un administrateur.`,
            link: '/artisan/dashboard'
        });

        return { success: true, message: `Pack ${packName} activé pour l'utilisateur.` };

    } catch (error) {
        await connection.rollback();
        console.error('Error in activateArtisanPack:', error);
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Cancel a manual payment and revert credits
 */
export const cancelPayment = async (paymentId: string) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Fetch payment details
        const [payments]: any = await connection.query(
            'SELECT * FROM payments WHERE id = ?',
            [paymentId]
        );
        const payment = payments.length > 0 ? payments[0] : null;

        if (!payment) throw new Error("Paiement non trouvé");
        if (payment.status === 'cancelled') throw new Error("Paiement déjà annulé");

        const userId = payment.user_id;
        const fichesQuota = payment.fiches_quota || 0;

        // 2. Revert credits in artisan profile
        await connection.query(
            `UPDATE artisans_profiles 
             SET fiches_allowed = GREATEST(0, fiches_allowed - ?)
             WHERE user_id = ?`,
            [fichesQuota, userId]
        );

        // 3. Update payment status
        await connection.query(
            `UPDATE payments SET status = 'cancelled' WHERE id = ?`,
            [paymentId]
        );

        await connection.commit();
        return { success: true, message: "Paiement annulé et quotas mis à jour." };

    } catch (error) {
        await connection.rollback();
        console.error('Error in cancelPayment:', error);
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Block a payment/pack (same as cancel but different status for UI)
 */
export const blockPayment = async (paymentId: string) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Fetch payment
        const [payments]: any = await connection.query('SELECT * FROM payments WHERE id = ?', [paymentId]);
        const payment = payments.length > 0 ? payments[0] : null;

        if (!payment) throw new Error("Paiement non trouvé");

        const userId = payment.user_id;
        const fichesQuota = payment.fiches_quota || 0;

        // 2. Revert credits
        await connection.query(
            `UPDATE artisans_profiles SET fiches_allowed = GREATEST(0, fiches_allowed - ?) WHERE user_id = ?`,
            [fichesQuota, userId]
        );

        // 3. Set status to blocked
        await connection.query(`UPDATE payments SET status = 'blocked' WHERE id = ?`, [paymentId]);

        await connection.commit();
        return { success: true, message: "Pack bloqué." };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Mark a payment/pack as deleted
 */
export const deletePaymentStatus = async (paymentId: string) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Fetch payment
        const [payments]: any = await connection.query('SELECT * FROM payments WHERE id = ?', [paymentId]);
        const payment = payments.length > 0 ? payments[0] : null;

        if (!payment) throw new Error("Paiement non trouvé");

        const userId = payment.user_id;
        const fichesQuota = payment.fiches_quota || 0;

        // 2. Revert credits (if it was completed)
        if (payment.status === 'completed') {
            await connection.query(
                `UPDATE artisans_profiles SET fiches_allowed = GREATEST(0, fiches_allowed - ?) WHERE user_id = ?`,
                [fichesQuota, userId]
            );
        }

        // 3. Set status to deleted
        await connection.query(`UPDATE payments SET status = 'deleted' WHERE id = ?`, [paymentId]);

        await connection.commit();
        return { success: true, message: "Paiement marqué comme supprimé." };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Reactivate a previously cancelled manual payment
 */
export const reactivatePayment = async (paymentId: string) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Fetch payment details
        const [payments]: any = await connection.query(
            'SELECT * FROM payments WHERE id = ?',
            [paymentId]
        );
        const payment = payments.length > 0 ? payments[0] : null;

        if (!payment) throw new Error("Paiement non trouvé");
        if (payment.status !== 'cancelled' && payment.status !== 'deactivated') {
            throw new Error("Seuls les paiements annulés ou désactivés peuvent être réactivés");
        }

        const userId = payment.user_id;
        const fichesQuota = payment.fiches_quota || 0;

        // 2. Add back credits in artisan profile
        await connection.query(
            `UPDATE artisans_profiles 
             SET fiches_allowed = fiches_allowed + ?
             WHERE user_id = ?`,
            [fichesQuota, userId]
        );

        // 3. Update payment status back to completed
        await connection.query(
            `UPDATE payments SET status = 'completed' WHERE id = ?`,
            [paymentId]
        );

        await connection.commit();
        return { success: true, message: "Paiement réactivé et quotas restaurés." };

    } catch (error) {
        await connection.rollback();
        console.error('Error in reactivatePayment:', error);
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Create a new artisan account from admin panel
 * Optionally activate a pack and send welcome email
 */
export const createArtisan = async (data: {
    email: string;
    fullName: string;
    companyName: string;
    trade: string;
    phone: string;
    address?: string;
    city: string;
    postalCode?: string;
    googleBusinessUrl?: string;
    packId?: string;
    password?: string;
    baseUrl?: string;
}) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Check if email already exists
        const [existingUsers]: any = await connection.query(
            'SELECT id FROM users WHERE email = ?',
            [data.email]
        );

        if (existingUsers && existingUsers.length > 0) {
            throw new Error('Un compte avec cet email existe déjà');
        }

        // 2. Generate UUID and handle password
        const { v4: uuidv4 } = await import('uuid');
        const userId = uuidv4();
        const profileId = uuidv4();

        // Use provided password or generate a temporary one
        const manualPassword = data.password;
        const tempPassword = manualPassword || (Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8));
        const { hashPassword } = await import('../utils/password');
        const hashedPassword = await hashPassword(tempPassword);

        // 3. Create user
        await connection.query(
            `INSERT INTO users (id, email, full_name, password_hash, role, status, email_verified)
             VALUES (?, ?, ?, ?, 'artisan', 'active', TRUE)`,
            [userId, data.email, data.fullName, hashedPassword]
        );

        // 4. Create artisan profile
        await connection.query(
            `INSERT INTO artisans_profiles 
             (id, user_id, company_name, trade, phone, address, city, postal_code, google_business_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                profileId,
                userId,
                data.companyName,
                data.trade,
                data.phone,
                data.address || '',
                data.city,
                data.postalCode || '',
                data.googleBusinessUrl || null
            ]
        );

        await connection.commit();

        // 5. Activate pack if provided
        if (data.packId) {
            try {
                await activateArtisanPack(userId, data.packId);
            } catch (packError) {
                console.error('Error activating pack:', packError);
                // Continue even if pack activation fails
            }
        }

        // 6. Send welcome email with temp password
        try {
            const { sendWelcomeEmail } = await import('./emailService');
            await sendWelcomeEmail(data.email, data.fullName, 'artisan', data.baseUrl);

            // TODO: Send email with temporary password
            // For now, we'll just log it
            console.log(`Temporary password for ${data.email}: ${tempPassword}`);
        } catch (emailError) {
            console.error('Error sending welcome email:', emailError);
        }

        return {
            success: true,
            message: `Artisan créé avec succès`,
            userId,
            tempPassword // Return this so admin can communicate it
        };

    } catch (error) {
        await connection.rollback();
        console.error('Error in createArtisan:', error);
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Create a new local guide account from admin panel
 */
export const createGuide = async (data: {
    email: string;
    fullName: string;
    googleEmail: string;
    phone: string;
    city: string;
    password?: string;
    baseUrl?: string;
}) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Check if email already exists
        const [existingUsers]: any = await connection.query(
            'SELECT id FROM users WHERE email = ?',
            [data.email]
        );

        if (existingUsers && existingUsers.length > 0) {
            throw new Error('Un compte avec cet email existe déjà');
        }

        // 2. Generate UUIDs
        const { v4: uuidv4 } = await import('uuid');
        const userId = uuidv4();
        const profileId = uuidv4();

        // 3. Handle password
        const manualPassword = data.password;
        const tempPassword = manualPassword || (Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8));
        const { hashPassword } = await import('../utils/password');
        const hashedPassword = await hashPassword(tempPassword);

        // 4. Create user
        await connection.query(
            `INSERT INTO users (id, email, full_name, password_hash, role, status, email_verified)
             VALUES (?, ?, ?, ?, 'guide', 'active', TRUE)`,
            [userId, data.email, data.fullName, hashedPassword]
        );

        // 5. Create guide profile
        await connection.query(
            `INSERT INTO guides_profiles 
             (id, user_id, google_email, phone, city, local_guide_level, total_reviews_count)
             VALUES (?, ?, ?, ?, ?, 1, 0)`,
            [
                profileId,
                userId,
                data.googleEmail,
                data.phone,
                data.city
            ]
        );

        await connection.commit();

        // 6. Send welcome email (optional)
        try {
            const { sendWelcomeEmail } = await import('./emailService');
            await sendWelcomeEmail(data.email, data.fullName, 'guide', data.baseUrl);
            console.log(`Temporary password for guide ${data.email}: ${tempPassword}`);
        } catch (emailError) {
            console.error('Error sending welcome email to guide:', emailError);
        }

        return {
            success: true,
            message: `Guide créé avec succès`,
            userId,
            tempPassword
        };

    } catch (error) {
        await connection.rollback();
        console.error('Error in createGuide:', error);
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Update artisan profile and user info
 */
export const updateArtisanProfile = async (userId: string, data: any) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Update users table (full_name, email, password if provided)
        const userUpdates = ['full_name = ?', 'email = ?'];
        const userParams = [data.full_name, data.email];

        if (data.password && data.password.trim() !== '') {
            const { hashPassword } = await import('../utils/password');
            const hashedPassword = await hashPassword(data.password);
            userUpdates.push('password_hash = ?');
            userParams.push(hashedPassword);
        }

        userParams.push(userId);
        await connection.query(
            `UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`,
            userParams
        );

        // 2. Update artisans_profiles table
        await connection.query(
            `UPDATE artisans_profiles SET 
                company_name = ?, 
                trade = ?, 
                phone = ?, 
                whatsapp_number = ?, 
                address = ?, 
                city = ?, 
                postal_code = ?, 
                google_business_url = ?
             WHERE user_id = ?`,
            [
                data.company_name,
                data.trade,
                data.phone,
                data.whatsapp_number,
                data.address,
                data.city,
                data.postal_code,
                data.google_business_url,
                userId
            ]
        );

        await connection.commit();
        return { success: true, message: 'Profil mis à jour' };
    } catch (error) {
        await connection.rollback();
        console.error('Error in updateArtisanProfile:', error);
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Update guide profile and user info
 */
export const updateGuideProfile = async (userId: string, data: any) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Update users table (full_name, email, password if provided)
        const userUpdates = ['full_name = ?', 'email = ?'];
        const userParams = [data.full_name, data.email];

        if (data.password && data.password.trim() !== '') {
            const { hashPassword } = await import('../utils/password');
            const hashedPassword = await hashPassword(data.password);
            userUpdates.push('password_hash = ?');
            userParams.push(hashedPassword);
        }

        userParams.push(userId);
        await connection.query(
            `UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`,
            userParams
        );

        // 2. Update guides_profiles table
        await connection.query(
            `UPDATE guides_profiles SET 
                google_email = ?, 
                phone = ?, 
                whatsapp_number = ?, 
                city = ?, 
                local_guide_level = ?, 
                total_reviews_count = ?
             WHERE user_id = ?`,
            [
                data.google_email,
                data.phone,
                data.whatsapp_number,
                data.city,
                data.local_guide_level,
                data.total_reviews_count,
                userId
            ]
        );

        await connection.commit();
        return { success: true, message: 'Profil guide mis à jour' };
    } catch (error) {
        await connection.rollback();
        console.error('Error in updateGuideProfile:', error);
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Get all sectors from sector_difficulty table
 */
export const getSectors = async () => {
    return await query(`SELECT * FROM sector_difficulty ORDER BY difficulty ASC, sector_name ASC`);
};

/**
 * Create a new sector
 */
export const createSector = async (data: any) => {
    const { sector_name, sector_slug, difficulty, google_strictness_level, icon_emoji, max_reviews_per_month_per_email, min_days_between_reviews, is_active } = data;
    return await query(
        `INSERT INTO sector_difficulty (sector_name, sector_slug, difficulty, google_strictness_level, icon_emoji, max_reviews_per_month_per_email, min_days_between_reviews, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [sector_name, sector_slug, difficulty, google_strictness_level || 1, icon_emoji, max_reviews_per_month_per_email, min_days_between_reviews || 3, is_active !== undefined ? is_active : true]
    );
};

/**
 * Update an existing sector by slug
 */
export const updateSector = async (slug: string, data: any) => {
    const fields = Object.keys(data).filter(key => key !== 'sector_slug' && key !== 'id');
    const values = fields.map(field => data[field]);

    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');

    return await query(
        `UPDATE sector_difficulty SET ${setClause} WHERE sector_slug = ?`,
        [...values, slug]
    );
};

/**
 * Delete a sector by slug
 */
export const deleteSector = async (slug: string) => {
    return await query(`DELETE FROM sector_difficulty WHERE sector_slug = ?`, [slug]);
};
/**
 * Get all reviews in a 360 view (Proposals + Submissions)
 */
export const getReview360Data = async () => {
    const result = await query(
        `SELECT 
            p.id as proposal_id, 
            p.content as proposal_content, 
            p.author_name as proposal_author, 
            p.status as proposal_status, 
            p.order_id,
            ro.company_name as fiche_name, 
            ap.company_name as artisan_name,
            ua.avatar_url as artisan_avatar,
            ro.artisan_id,
            ap.whatsapp_number as artisan_whatsapp,
            s.id as submission_id, 
            s.status as submission_status, 
            s.submitted_at, 
            s.review_url,
            s.guide_id,
            u.full_name as guide_name,
            gp.google_email as guide_google_email,
            gp.whatsapp_number as guide_whatsapp
        FROM review_proposals p
        JOIN reviews_orders ro ON p.order_id = ro.id
        JOIN artisans_profiles ap ON ro.artisan_id = ap.user_id
        JOIN users ua ON ap.user_id = ua.id
        LEFT JOIN reviews_submissions s ON p.id = s.proposal_id
        LEFT JOIN users u ON s.guide_id = u.id
        LEFT JOIN guides_profiles gp ON u.id = gp.user_id
        WHERE p.status != 'draft'
        ORDER BY COALESCE(s.submitted_at, p.created_at) DESC`
    );
    return result;
};

/**
 * Update a review proposal
 */
export const updateProposal = async (proposalId: string, data: { content: string }) => {
    return await query('UPDATE review_proposals SET content = ? WHERE id = ?', [data.content, proposalId]);
};

/**
 * Regenerate a single proposal's content using AI, keeping the same fiche context
 */
export const regenerateProposal = async (proposalId: string): Promise<{ content: string; author_name: string; rating: number }> => {
    // 1. Get proposal + order context
    const rows: any = await query(`
        SELECT p.id, p.order_id, p.author_name, p.rating,
               ro.company_name, ro.fiche_name, ro.company_context, ro.sector,
               ro.zones, ro.services, ro.staff_names, ro.specific_instructions,
               ap.company_name as artisan_company, ap.trade
        FROM review_proposals p
        JOIN reviews_orders ro ON p.order_id = ro.id
        JOIN artisans_profiles ap ON ro.artisan_id = ap.user_id
        WHERE p.id = ?
    `, [proposalId]);

    if (!rows || rows.length === 0) {
        throw new Error('Proposal not found');
    }

    const order = rows[0];

    // 2. Generate 1 new review with AI
    const { aiService } = await import('./aiService');
    const generated = await aiService.generateReviews({
        companyName: order.company_name || order.artisan_company || 'Artisan',
        ficheName: order.fiche_name,
        trade: order.trade || 'Artisan',
        quantity: 1,
        context: order.company_context,
        sector: order.sector,
        zones: order.zones,
        services: order.services,
        staffNames: order.staff_names,
        specificInstructions: order.specific_instructions,
    });

    if (!generated || generated.length === 0) {
        throw new Error('AI did not return any review');
    }

    const newReview = generated[0];

    // 3. Update the proposal with new content
    await query(
        'UPDATE review_proposals SET content = ?, author_name = ?, rating = ? WHERE id = ?',
        [newReview.content, newReview.author_name, newReview.rating || 5, proposalId]
    );

    return {
        content: newReview.content,
        author_name: newReview.author_name,
        rating: newReview.rating || 5,
    };
};

/**
 * Get all level verification requests (admin)
 */
export const getLevelVerifications = async () => {
    return await query(`
        SELECT
            v.*,
            u.full_name as guide_name,
            u.email as guide_email,
            u.avatar_url as guide_avatar,
            g.email as gmail_email,
            g.local_guide_level as gmail_current_level,
            g.maps_profile_url as gmail_maps_url,
            reviewer.full_name as reviewer_name
        FROM guide_level_verifications v
        JOIN users u ON v.guide_id = u.id
        JOIN guide_gmail_accounts g ON v.gmail_account_id = g.id
        LEFT JOIN users reviewer ON v.reviewed_by = reviewer.id
        ORDER BY
            CASE v.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 WHEN 'rejected' THEN 2 END,
            v.created_at DESC
    `);
};

/**
 * Review a level verification request (approve/reject)
 */
export const reviewLevelVerification = async (
    verificationId: number,
    status: 'approved' | 'rejected',
    adminNotes: string | undefined,
    adminId: string
) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get the verification request
        const [verifications]: any = await connection.query(
            'SELECT * FROM guide_level_verifications WHERE id = ?',
            [verificationId]
        );
        if (!verifications || verifications.length === 0) {
            throw new Error('Demande de vérification introuvable');
        }
        const verification = verifications[0];

        if (verification.status !== 'pending') {
            throw new Error('Cette demande a déjà été traitée');
        }

        // 2. Update the verification record
        await connection.query(`
            UPDATE guide_level_verifications
            SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = NOW()
            WHERE id = ?
        `, [status, adminNotes || null, adminId, verificationId]);

        // 3. If approved, update both gmail account level AND guide profile level + credit bonus
        let bonusAmount = 0;
        if (status === 'approved') {
            // Update the specific Gmail account
            await connection.query(
                'UPDATE guide_gmail_accounts SET local_guide_level = ? WHERE id = ?',
                [verification.claimed_level, verification.gmail_account_id]
            );

            // Update the guide profile to the max level across all their gmail accounts
            const [maxLevel]: any = await connection.query(`
                SELECT MAX(local_guide_level) as max_level
                FROM guide_gmail_accounts
                WHERE user_id = ? AND is_active = 1
            `, [verification.guide_id]);

            if (maxLevel && maxLevel.length > 0) {
                await connection.query(
                    'UPDATE guides_profiles SET local_guide_level = ? WHERE user_id = ?',
                    [maxLevel[0].max_level, verification.guide_id]
                );
            }

            // Credit level bonus to guide account
            const level = verification.claimed_level;
            if (level === 4) bonusAmount = 3;
            else if (level === 5 || level === 6) bonusAmount = 5;
            else if (level === 7 || level === 8) bonusAmount = 10;
            else if (level >= 9) bonusAmount = 20;

            if (bonusAmount > 0) {
                await connection.query(`
                    INSERT INTO guide_bonuses (guide_id, amount, reason, reference_id, reference_type, created_at)
                    VALUES (?, ?, ?, ?, 'level_verification', NOW())
                `, [verification.guide_id, bonusAmount, `Prime niveau ${level} Local Guide`, verificationId]);
            }
        }

        await connection.commit();

        // 4. Send notification to guide
        try {
            const bonusText = bonusAmount > 0 ? ` Une prime de ${bonusAmount}€ a été créditée sur votre compte.` : '';
            notificationService.sendToUser(verification.guide_id, {
                type: status === 'approved' ? 'success' : 'warning',
                title: status === 'approved'
                    ? 'Niveau Local Guide validé !'
                    : 'Vérification de niveau refusée',
                message: status === 'approved'
                    ? `Votre niveau Local Guide a été mis à jour au niveau ${verification.claimed_level}.${bonusText}`
                    : `Votre demande a été refusée. ${adminNotes || ''}`,
                link: '/guide/my-gmails'
            });
        } catch (notifError) {
            console.error('Notification error (non-blocking):', notifError);
        }

        return { success: true, message: `Vérification ${status === 'approved' ? 'approuvée' : 'rejetée'}` };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Get all guides who have at least 1 validated review, with their calculated balance
 */
export const getGuidesWithBalance = async () => {
    return await query(`
        SELECT
            u.id, u.full_name, u.email, u.avatar_url, u.status,
            gp.google_email, gp.phone, gp.preferred_payout_method, gp.payout_details,
            sub.validated_reviews_count,
            sub.earned_from_reviews,
            COALESCE(bon.total_bonuses, 0) as total_bonuses,
            (sub.earned_from_reviews + COALESCE(bon.total_bonuses, 0)) as total_earned,
            COALESCE(pay.total_paid, 0) as total_paid,
            COALESCE(pay.total_pending, 0) as total_pending,
            GREATEST(
                (sub.earned_from_reviews + COALESCE(bon.total_bonuses, 0))
                - COALESCE(pay.total_paid, 0)
                - COALESCE(pay.total_pending, 0),
                0
            ) as balance
        FROM users u
        JOIN guides_profiles gp ON u.id = gp.user_id
        INNER JOIN (
            SELECT guide_id,
                   COUNT(*) as validated_reviews_count,
                   COALESCE(SUM(earnings), 0) as earned_from_reviews
            FROM reviews_submissions
            WHERE status = 'validated'
            GROUP BY guide_id
        ) sub ON u.id = sub.guide_id
        LEFT JOIN (
            SELECT guide_id, COALESCE(SUM(amount), 0) as total_bonuses
            FROM guide_bonuses
            GROUP BY guide_id
        ) bon ON u.id = bon.guide_id
        LEFT JOIN (
            SELECT guide_id,
                   COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_paid,
                   COALESCE(SUM(CASE WHEN status IN ('pending', 'in_revision') THEN amount ELSE 0 END), 0) as total_pending
            FROM payout_requests
            GROUP BY guide_id
        ) pay ON u.id = pay.guide_id
        WHERE u.role = 'guide'
        ORDER BY balance DESC
    `);
};

/**
 * Force pay a guide (admin encouragement payment, bypasses minimum amount)
 */
export const forcePayGuide = async (guideId: string, amount: number, adminNote?: string) => {
    const crypto = require('crypto');
    const payoutId = crypto.randomUUID();
    const note = adminNote
        ? `Paiement encouragement - ${adminNote}`
        : 'Paiement encouragement';

    await query(`
        INSERT INTO payout_requests (id, guide_id, amount, status, requested_at, processed_at, admin_note)
        VALUES (?, ?, ?, 'paid', NOW(), NOW(), ?)
    `, [payoutId, guideId, amount, note]);

    // Send notification to guide
    try {
        notificationService.sendToUser(guideId, {
            type: 'payout_processed',
            title: 'Paiement reçu !',
            message: `Un paiement de ${amount.toFixed(2)}€ a été effectué sur votre compte.`,
            data: { payoutId, amount }
        });
    } catch (notifError) {
        console.error('Notification error (non-blocking):', notifError);
    }

    return { success: true, payoutId, amount };
};

/**
 * Get all Gmail accounts used by guides
 */
export const getAllGmailAccounts = async () => {
    return await query(`
        SELECT
            gga.id,
            gga.user_id,
            gga.email,
            gga.maps_profile_url,
            gga.local_guide_level,
            gga.is_verified,
            gga.is_active,
            gga.is_blocked,
            gga.trust_level,
            gga.monthly_reviews_posted,
            gga.monthly_quota_limit,
            gga.total_reviews_posted,
            gga.last_review_posted_at,
            gga.created_at,
            u.full_name AS guide_name,
            u.email AS guide_account_email,
            u.avatar_url AS guide_avatar,
            u.status AS guide_status,
            gp.phone AS guide_phone,
            gp.city AS guide_city
        FROM guide_gmail_accounts gga
        JOIN users u ON gga.user_id = u.id
        LEFT JOIN guides_profiles gp ON u.id = gp.user_id
        WHERE gga.deleted_at IS NULL
        ORDER BY gga.created_at DESC
    `);
};

/**
 * Toggle block status on a Gmail account
 */
export const toggleGmailAccountBlock = async (accountId: number, block: boolean, reason?: string) => {
    // Get the gmail account info + guide info for emails
    const [account] = await query(
        `SELECT gga.email, gga.user_id, u.full_name, u.email AS guide_email
         FROM guide_gmail_accounts gga
         JOIN users u ON gga.user_id = u.id
         WHERE gga.id = ?`,
        [accountId]
    ) as any[];

    if (!account) {
        throw new Error('Compte Gmail introuvable');
    }

    if (block) {
        await query(
            `UPDATE guide_gmail_accounts SET is_blocked = TRUE, trust_level = 'BLOCKED' WHERE id = ?`,
            [accountId]
        );

        // Send emails if blocking with a reason
        if (reason) {
            const { sendGmailBlockedEmail, sendGuideGmailBlockedNotification } = await import('./emailService');
            // Email to the blocked gmail
            sendGmailBlockedEmail(account.email, reason);
            // Email to the guide's account
            sendGuideGmailBlockedNotification(account.guide_email, account.full_name || account.guide_email, account.email, reason);
        }
    } else {
        await query(
            `UPDATE guide_gmail_accounts SET is_blocked = FALSE, trust_level = 'BRONZE' WHERE id = ?`,
            [accountId]
        );
    }
    return { success: true, message: block ? 'Compte Gmail bloqué' : 'Compte Gmail débloqué' };
};

/**
 * Impersonate a user — generate a temporary access token for the target user
 */
export const impersonateUser = async (adminId: string, targetUserId: string) => {
    // Fetch target user
    const rows: any = await query(`
        SELECT u.id, u.email, u.full_name, u.role, u.status, u.permissions,
               ap.company_name, ap.trade, ap.google_business_url,
               ap.subscription_status, ap.subscription_end_date, ap.subscription_tier,
               ap.monthly_reviews_quota, ap.current_month_reviews, ap.subscription_start_date, ap.fiches_allowed,
               COALESCE(ap.phone, gp.phone) as phone,
               COALESCE(ap.city, gp.city) as city,
               gp.google_email, gp.local_guide_level
        FROM users u
        LEFT JOIN artisans_profiles ap ON u.id = ap.user_id
        LEFT JOIN guides_profiles gp ON u.id = gp.user_id
        WHERE u.id = ?
    `, [targetUserId]);

    if (!rows || rows.length === 0) {
        throw new Error('Utilisateur non trouvé');
    }

    const user = rows[0];

    if (user.role === 'admin') {
        throw new Error('Impossible d\'impersonifier un admin');
    }

    // Generate a 1-hour access token for the target user
    const payload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        permissions: user.permissions,
    };

    const accessToken = jwt.sign(payload, jwtConfig.accessTokenSecret as string, {
        expiresIn: '1h',
    });

    console.log(`[ADMIN IMPERSONATE] Admin ${adminId} is impersonating user ${targetUserId} (${user.email}, ${user.role})`);

    // Build user response (same shape as login response)
    const { password_hash, two_factor_secret, ...safeUser } = user;

    return {
        accessToken,
        user: safeUser,
    };
};

