import { query, pool } from '../config/database';
import { sendUserStatusUpdateEmail, sendMissionDecisionEmail, sendSubmissionDecisionEmail } from './emailService';

/**
 * Get all artisans with their profiles
 */
export const getArtisans = async () => {
    return await query(`
        SELECT u.id, u.email, u.full_name, u.avatar_url, u.status, u.created_at, u.last_login, u.warning_count,
               ap.company_name, ap.siret, ap.trade, ap.phone, ap.city, 
               ap.subscription_status, ap.subscription_end_date
        FROM users u
        JOIN artisans_profiles ap ON u.id = ap.user_id
        WHERE u.role = 'artisan'
        ORDER BY u.created_at DESC
    `);
};

/**
 * Get all local guides with their profiles
 */
export const getGuides = async () => {
    return await query(`
        SELECT u.id, u.email, u.full_name, u.avatar_url, u.status, u.created_at, u.last_login, u.warning_count,
               gp.google_email, gp.local_guide_level, gp.total_reviews_count, 
               gp.phone, gp.city
        FROM users u
        JOIN guides_profiles gp ON u.id = gp.user_id
        WHERE u.role = 'guide'
        ORDER BY u.created_at DESC
    `);
};

/**
 * Update user status (active, pending, suspended, rejected)
 */
export const updateUserStatus = async (userId: string, status: string, reason?: string) => {
    // If status is suspended, we use the suspension service to trigger the full flow
    if (status === 'suspended') {
        const { suspensionService } = await import('./suspensionService');
        await suspensionService.detectAndSuspend(
            userId,
            'manual_admin',
            reason || 'Suspension manuelle par un administrateur'
        );
        return { message: 'User suspended via suspension service' };
    }

    const result = await query(
        `UPDATE users SET status = ? WHERE id = ?`,
        [status, userId]
    );

    // Send notification email (for non-suspension updates)
    try {
        const user: any = await query('SELECT full_name, email FROM users WHERE id = ?', [userId]);
        if (user && user.length > 0) {
            await sendUserStatusUpdateEmail(user[0].email, user[0].full_name, status);
        }
    } catch (error) {
        console.error('Error sending user status update email:', error);
    }

    return result;
};

/**
 * Delete a user and their associated profile
 */
export const deleteUser = async (userId: string) => {
    return await query(`DELETE FROM users WHERE id = ?`, [userId]);
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
        SELECT u.id, u.email, u.full_name, u.avatar_url, u.status, u.created_at, u.last_login, u.warning_count,
               ap.company_name, ap.siret, ap.trade, ap.phone, ap.address, ap.city, ap.postal_code,
               ap.google_business_url, ap.subscription_status, ap.subscription_end_date
        FROM users u
        JOIN artisans_profiles ap ON u.id = ap.user_id
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

    return {
        profile: profile[0],
        orders: orders as any[]
    };
};

/**
 * Get detailed guide info including submissions
 */
export const getGuideDetail = async (userId: string) => {
    const profile: any = await query(`
        SELECT u.id, u.email, u.full_name, u.avatar_url, u.status, u.created_at, u.last_login, u.warning_count,
               gp.google_email, gp.local_guide_level, gp.total_reviews_count, 
               gp.phone, gp.city
        FROM users u
        JOIN guides_profiles gp ON u.id = gp.user_id
        WHERE u.id = ? AND u.role = 'guide'
    `, [userId]);

    if (!profile || profile.length === 0) return null;

    const submissions = await query(`
        SELECT s.id, s.status, s.earnings, s.submitted_at as created_at, s.review_url as proof_url,
               ap.company_name as artisan_name
        FROM reviews_submissions s
        JOIN artisans_profiles ap ON s.artisan_id = ap.user_id
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
        SELECT * FROM guide_gmail_accounts WHERE user_id = ? AND is_active = TRUE
    `, [userId]);

    return {
        profile: profile[0],
        submissions,
        gmail_accounts: gmailAccounts,
        stats: stats[0]
    };
};

/**
 * Get global statistics for the admin dashboard
 */
export const getGlobalStats = async () => {
    // Total Revenue & Revenue Trend (last 30 days)
    const revenueStats: any = await query(`
        SELECT 
            SUM(amount) as total_revenue,
            DATE_FORMAT(created_at, '%Y-%m-%d') as day,
            DATE_FORMAT(created_at, '%d/%m') as label
        FROM payments
        WHERE status = 'completed'
          AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY day, label
        ORDER BY day ASC
    `);

    // Total All Time Revenue (sum of all completed payments)
    const totalAllTimeRevenue: any = await query(`
        SELECT SUM(amount) as total
        FROM payments
        WHERE status = 'completed'
    `);

    // User growth (last 6 months)
    const userGrowth: any = await query(`
        SELECT 
            COUNT(*) as count,
            role,
            DATE_FORMAT(created_at, '%Y-%m') as month
        FROM users
        GROUP BY month, role
        ORDER BY month DESC
        LIMIT 12
    `);

    // Pending actions
    const pendingActions: any = await query(`
        SELECT 
            (SELECT COUNT(*) FROM reviews_submissions WHERE status = 'pending' AND submitted_at <= DATE_SUB(NOW(), INTERVAL 7 DAY)) as pending_reviews,
            (SELECT COUNT(*) FROM users WHERE status = 'pending') as pending_users
    `);

    // Total counts
    const totalCounts: any = await query(`
        SELECT 
            (SELECT COUNT(*) FROM users WHERE role = 'artisan') as total_artisans,
            (SELECT COUNT(*) FROM users WHERE role = 'guide') as total_guides,
            (SELECT COUNT(*) FROM reviews_orders) as total_orders,
            (SELECT COUNT(*) FROM review_proposals WHERE status = 'draft') as pending_proposals,
            (SELECT COUNT(*) FROM reviews_orders WHERE status = 'submitted') as pending_missions,
            (SELECT COUNT(*) FROM payout_requests WHERE status = 'pending') as pending_payouts
    `);

    return {
        revenue: revenueStats,
        totalAllTimeRevenue: totalAllTimeRevenue[0]?.total || 0,
        growth: userGrowth,
        pending: pendingActions[0],
        totals: totalCounts[0]
    };
};

/**
 * Get all payout requests for admin management
 */
export const getAllPayoutRequests = async () => {
    return await query(`
        SELECT p.*, u.full_name as guide_name, u.email as guide_email, gp.google_email
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
               p.content as proposal_content
        FROM reviews_submissions s
        JOIN users u ON s.guide_id = u.id
        JOIN guides_profiles gp ON u.id = gp.user_id
        JOIN artisans_profiles ap ON s.artisan_id = ap.user_id
        JOIN review_proposals p ON s.proposal_id = p.id
        ORDER BY s.submitted_at DESC
    `);
};

/**
 * Update review submission status (validate/reject)
 */
export const updateSubmissionStatus = async (submissionId: string, status: string, rejectionReason?: string) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Update submission status
        // We handle validated_at separately for clarity
        let validatedAtPart = "";
        if (status === 'validated') {
            validatedAtPart = ", validated_at = NOW()";
        }

        await connection.query(`
            UPDATE reviews_submissions
            SET status = :status, 
                rejection_reason = :rejectionReason
                ${validatedAtPart}
            WHERE id = :submissionId
        `, {
            status,
            rejectionReason: rejectionReason || null,
            submissionId
        });

        // 2. Handle reviews_received in reviews_orders
        // We increment on submission (in guideService), so here we:
        // - Do nothing on validation (already counted)
        // - Decrement on rejection (to reopen the slot)
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
                    // Update Global Profile Stats
                    await connection.query(`
                        UPDATE artisans_profiles 
                        SET current_month_reviews = COALESCE(current_month_reviews, 0) + 1,
                            total_reviews_received = COALESCE(total_reviews_received, 0) + 1
                        WHERE user_id = :artisan_id
                    `, { artisan_id });
                } else if (status === 'rejected') {
                    // Decrement Specific Order Stats to re-open slot
                    if (order_id) {
                        await connection.query(`
                            UPDATE reviews_orders
                            SET reviews_received = GREATEST(0, COALESCE(reviews_received, 1) - 1),
                                status = 'in_progress'
                            WHERE id = :order_id
                        `, { order_id });
                    }
                }
            }
        }

        await connection.commit();

        // 3. Send notification to guide
        try {
            const [rows]: any = await connection.query(`
                SELECT s.guide_id, u.full_name, u.email 
                FROM reviews_submissions s
                JOIN users u ON s.guide_id = u.id
                WHERE s.id = :submissionId
            `, { submissionId });

            if (rows && rows.length > 0) {
                await sendSubmissionDecisionEmail(rows[0].email, rows[0].full_name, status, rejectionReason);

                // NOUVEAU : Vérifier rejets répététés si statut = rejected
                if (status === 'rejected') {
                    const { suspensionTriggers } = await import('./suspensionTriggers');
                    await suspensionTriggers.checkRepeatedRejections(rows[0].guide_id, submissionId);
                }
            }
        } catch (error) {
            console.error('Error sending submission decision email:', error);
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
            p.missions_quota as total_quota,
            p.missions_used as is_pack_used,
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
    const { id, name, price_cents, quantity, features, color, is_popular } = pack;
    return await query(
        `INSERT INTO subscription_packs (id, name, price_cents, quantity, features, color, is_popular) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, name, price_cents, quantity, JSON.stringify(features), color, is_popular]
    );
};

/**
 * Update an existing subscription pack
 */
export const updatePack = async (id: string, pack: any) => {
    const { name, price_cents, quantity, features, color, is_popular } = pack;
    return await query(
        `UPDATE subscription_packs 
         SET name = ?, price_cents = ?, quantity = ?, features = ?, color = ?, is_popular = ? 
         WHERE id = ?`,
        [name, price_cents, quantity, JSON.stringify(features), color, is_popular, id]
    );
};

/**
 * Delete a subscription pack
 */
export const deletePack = async (id: string) => {
    return await query(`DELETE FROM subscription_packs WHERE id = ?`, [id]);
};

/**
 * Get missions pending admin approval (status = 'submitted')
 */
export const getPendingMissions = async () => {
    return await query(`
        SELECT o.*, u.full_name as artisan_name, ap.company_name
        FROM reviews_orders o
        JOIN users u ON o.artisan_id = u.id
        JOIN artisans_profiles ap ON u.id = ap.user_id
        WHERE o.status = 'submitted'
        ORDER BY o.created_at DESC
    `);
};

/**
 * Approve a mission and make it available for guides
 */
export const approveMission = async (orderId: string) => {
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
                SELECT u.full_name, u.email 
                FROM reviews_orders o
                JOIN users u ON o.artisan_id = u.id
                WHERE o.id = ?
            `, [orderId]);

            if (rows && rows.length > 0) {
                await sendMissionDecisionEmail(rows[0].email, rows[0].full_name, orderId, 'in_progress');
            }
        } catch (error) {
            console.error('Error sending mission decision email:', error);
        }
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};
/**
 * Get all missions with artisan and company details
 */
export const getAllMissions = async () => {
    return await query(`
        SELECT o.*, 
               COALESCE(pay.amount, o.price) as price,
               u.full_name as artisan_name, 
               ap.company_name as original_company_name
        FROM reviews_orders o
        JOIN users u ON o.artisan_id = u.id
        JOIN artisans_profiles ap ON u.id = ap.user_id
        LEFT JOIN payments pay ON o.payment_id = pay.id
        ORDER BY o.created_at DESC
    `);
};

/**
 * Get full mission details for admin editing
 */
export const getAdminMissionDetail = async (orderId: string) => {
    const orders: any = await query(`
        SELECT o.*, u.full_name as artisan_name, u.email as artisan_email, ap.company_name as artisan_company,
               COALESCE(sp.name, pay.description) as pack_name, 
               pay.missions_quota, pay.missions_used as pack_missions_used,
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
        SELECT * FROM review_proposals WHERE order_id = ? ORDER BY created_at ASC
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
 * Update any mission field (Admin CRUD)
 */
export const updateMission = async (orderId: string, data: any) => {
    const fields = Object.keys(data);
    const values = Object.values(data);

    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');

    // Perform the update on reviews_orders
    const result = await query(
        `UPDATE reviews_orders SET ${setClause} WHERE id = ?`,
        [...values, orderId]
    );

    // If payout_per_review was updated, cascade the change to PENDING submissions
    if (data.payout_per_review !== undefined) {
        await query(
            `UPDATE reviews_submissions 
             SET earnings = ? 
             WHERE order_id = ? AND status = 'pending'`,
            [data.payout_per_review, orderId]
        );
    }

    return result;
};

/**
 * Delete a mission (Admin CRUD)
 */
export const deleteMission = async (orderId: string) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Submissions and proposals might have FK with ON DELETE CASCADE, 
        // but let's be safe if they don't or if there's other cleanup.
        // Usually, reviews_submissions should be deleted or handled.

        await connection.query(`DELETE FROM review_proposals WHERE order_id = ?`, [orderId]);
        await connection.query(`DELETE FROM reviews_orders WHERE id = ?`, [orderId]);

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};
