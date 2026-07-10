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
}> => {
    const accountRows: any = await query(
        `SELECT COUNT(*) AS n FROM repost_accounts
         WHERE status = 'pending' AND deleted_at IS NULL`
    );
    const submissionRows: any = await query(
        `SELECT COUNT(*) AS n FROM repost_submissions
         WHERE status = 'pending' AND deleted_at IS NULL`
    );
    const viewRows: any = await query(
        `SELECT COUNT(*) AS n FROM repost_view_updates
         WHERE status = 'pending' AND deleted_at IS NULL`
    );
    return {
        pending_accounts_count: Number(accountRows[0]?.n ?? 0),
        pending_submissions_count: Number(submissionRows[0]?.n ?? 0),
        pending_view_updates_count: Number(viewRows[0]?.n ?? 0),
    };
};
