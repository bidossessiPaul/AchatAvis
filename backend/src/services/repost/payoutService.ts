// Balance et stats repost social pour un guide. Le pattern projet : la
// balance n'est pas stockée, elle est dynamique.
// Total = SUM(base_earnings_cents des reposts approuvés)
//       + SUM(credited_amount_cents des déclarations de vues approuvées)

import { query } from '../../config/database';

export const getGuideRepostBalanceCents = async (guideId: string): Promise<number> => {
    const baseRows: any = await query(
        `SELECT COALESCE(SUM(s.base_earnings_cents), 0) AS base_earned
         FROM repost_submissions s
         JOIN repost_accounts a ON a.id = s.account_id
         WHERE a.guide_id = ? AND s.status = 'approved' AND s.deleted_at IS NULL`,
        [guideId]
    );
    const viewRows: any = await query(
        `SELECT COALESCE(SUM(vu.credited_amount_cents), 0) AS views_earned
         FROM repost_view_updates vu
         JOIN repost_submissions s ON s.id = vu.submission_id
         JOIN repost_accounts a ON a.id = s.account_id
         WHERE a.guide_id = ? AND vu.status = 'approved' AND vu.deleted_at IS NULL`,
        [guideId]
    );
    return Number(baseRows[0]?.base_earned ?? 0) + Number(viewRows[0]?.views_earned ?? 0);
};

export const getGuideRepostStats = async (
    guideId: string
): Promise<{
    pending_submissions_count: number;
    approved_submissions_count: number;
    rejected_submissions_count: number;
    pending_view_updates_count: number;
    total_earnings_cents: number;
}> => {
    const subRows: any = await query(
        `SELECT
            SUM(CASE WHEN s.status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
            SUM(CASE WHEN s.status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
            SUM(CASE WHEN s.status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count
         FROM repost_submissions s
         JOIN repost_accounts a ON a.id = s.account_id
         WHERE a.guide_id = ? AND s.deleted_at IS NULL`,
        [guideId]
    );
    const viewPendingRows: any = await query(
        `SELECT COUNT(*) AS n
         FROM repost_view_updates vu
         JOIN repost_submissions s ON s.id = vu.submission_id
         JOIN repost_accounts a ON a.id = s.account_id
         WHERE a.guide_id = ? AND vu.status = 'pending' AND vu.deleted_at IS NULL`,
        [guideId]
    );
    const balance = await getGuideRepostBalanceCents(guideId);
    const r = subRows[0] || {};
    return {
        pending_submissions_count: Number(r.pending_count ?? 0),
        approved_submissions_count: Number(r.approved_count ?? 0),
        rejected_submissions_count: Number(r.rejected_count ?? 0),
        pending_view_updates_count: Number(viewPendingRows[0]?.n ?? 0),
        total_earnings_cents: balance,
    };
};

export const getGlobalRepostStats = async (): Promise<{
    pending_accounts_count: number;
    pending_submissions_count: number;
    pending_view_updates_count: number;
    total_accounts_count: number;
    active_accounts_count: number;
    blocked_accounts_count: number;
    guides_count: number;
    total_submissions_count: number;
    approved_submissions_count: number;
    rejected_submissions_count: number;
    total_views_declared: number;
    total_paid_cents: number;
}> => {
    // Une seule requête par table : les compteurs par statut sont agrégés en
    // SUM(CASE ...) plutôt qu'en N requêtes séparées.
    const accountRows: any = await query(
        `SELECT
            COUNT(*) AS total,
            SUM(status = 'pending') AS pending,
            SUM(status = 'approved' AND blocked_at IS NULL) AS active,
            SUM(blocked_at IS NOT NULL) AS blocked,
            COUNT(DISTINCT guide_id) AS guides
         FROM repost_accounts
         WHERE deleted_at IS NULL`
    );
    const submissionRows: any = await query(
        `SELECT
            COUNT(*) AS total,
            SUM(status = 'pending') AS pending,
            SUM(status = 'approved') AS approved,
            SUM(status = 'rejected') AS rejected,
            COALESCE(SUM(CASE WHEN status = 'approved' THEN base_earnings_cents ELSE 0 END), 0) AS base_paid
         FROM repost_submissions
         WHERE deleted_at IS NULL`
    );
    const viewRows: any = await query(
        `SELECT
            SUM(status = 'pending') AS pending,
            COALESCE(SUM(CASE WHEN status = 'approved' THEN credited_amount_cents ELSE 0 END), 0) AS view_paid
         FROM repost_view_updates
         WHERE deleted_at IS NULL`
    );
    // Vues déclarées : on ne somme que la dernière déclaration validée par
    // soumission, sinon les déclarations successives se cumuleraient.
    const declaredRows: any = await query(
        `SELECT COALESCE(SUM(latest.views), 0) AS total_views
         FROM (
            SELECT MAX(vu.declared_views) AS views
            FROM repost_view_updates vu
            WHERE vu.status = 'approved' AND vu.deleted_at IS NULL
            GROUP BY vu.submission_id
         ) AS latest`
    );

    const a = accountRows[0] ?? {};
    const s = submissionRows[0] ?? {};
    const v = viewRows[0] ?? {};

    return {
        pending_accounts_count: Number(a.pending ?? 0),
        pending_submissions_count: Number(s.pending ?? 0),
        pending_view_updates_count: Number(v.pending ?? 0),
        total_accounts_count: Number(a.total ?? 0),
        active_accounts_count: Number(a.active ?? 0),
        blocked_accounts_count: Number(a.blocked ?? 0),
        guides_count: Number(a.guides ?? 0),
        total_submissions_count: Number(s.total ?? 0),
        approved_submissions_count: Number(s.approved ?? 0),
        rejected_submissions_count: Number(s.rejected ?? 0),
        total_views_declared: Number(declaredRows[0]?.total_views ?? 0),
        total_paid_cents: Number(s.base_paid ?? 0) + Number(v.view_paid ?? 0),
    };
};
