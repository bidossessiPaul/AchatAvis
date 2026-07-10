// Déclarations de vues successives par le guide sur un repost déjà posté.
// Chaque déclaration validée par l'admin crédite le DELTA vers le palier de
// vues atteint (le palier dépend du palier d'abonnés du compte). Si le palier
// n'a pas changé depuis la dernière déclaration approuvée, le delta est 0 —
// pas de double comptage.

import { v4 as uuidv4 } from 'uuid';
import { query, pool } from '../../config/database';
import { uploadToCloudinary } from '../cloudinaryService';
import { RepostViewUpdate, SubmitViewUpdateInput } from '../../types/repost';
import { findViewTierForCount } from './viewTierService';
import { getSubmissionById } from './submissionService';
import { getAccountById } from './accountService';

export const submitViewUpdate = async (data: SubmitViewUpdateInput): Promise<RepostViewUpdate> => {
    const submission = await getSubmissionById(data.submissionId);
    if (!submission) throw new Error('Repost introuvable');
    if (submission.status !== 'approved') {
        throw new Error("Le repost doit d'abord être validé avant de déclarer des vues");
    }

    const pending: any = await query(
        `SELECT id FROM repost_view_updates
         WHERE submission_id = ? AND status = 'pending' AND deleted_at IS NULL`,
        [data.submissionId]
    );
    if (pending[0]) {
        throw new Error('Une déclaration de vues est déjà en attente de validation pour ce repost');
    }

    const uploaded = await uploadToCloudinary(
        data.screenshotBuffer,
        'repost-view-updates',
        { resourceType: 'image' }
    );

    const id = uuidv4();
    await query(
        `INSERT INTO repost_view_updates (id, submission_id, declared_views, screenshot_url)
         VALUES (?, ?, ?, ?)`,
        [id, data.submissionId, data.declaredViews, uploaded.secure_url]
    );

    const created = await getViewUpdateById(id);
    if (!created) throw new Error('Déclaration créée mais introuvable');
    return created;
};

export const getViewUpdateById = async (id: string): Promise<RepostViewUpdate | null> => {
    const rows: any = await query(
        `SELECT * FROM repost_view_updates WHERE id = ? AND deleted_at IS NULL`,
        [id]
    );
    return rows[0] ? rowToViewUpdate(rows[0]) : null;
};

export const listViewUpdatesForSubmission = async (submissionId: string): Promise<RepostViewUpdate[]> => {
    const rows: any = await query(
        `SELECT * FROM repost_view_updates
         WHERE submission_id = ? AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [submissionId]
    );
    return rows.map(rowToViewUpdate);
};

export const listViewUpdatesForAdmin = async (
    status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending',
    limit = 50,
    offset = 0
): Promise<Array<RepostViewUpdate & {
    guide_full_name: string; guide_email: string; video_title: string; platform: string; post_link: string;
}>> => {
    const where = status === 'all'
        ? 'vu.deleted_at IS NULL'
        : `vu.status = '${status}' AND vu.deleted_at IS NULL`;
    const orderBy = status === 'pending' ? 'vu.created_at ASC' : 'vu.created_at DESC';

    const rows: any = await query(
        `SELECT vu.*, u.full_name AS guide_full_name, u.email AS guide_email,
                v.title AS video_title, a.platform, s.post_link
         FROM repost_view_updates vu
         JOIN repost_submissions s ON s.id = vu.submission_id
         JOIN repost_accounts a ON a.id = s.account_id
         JOIN users u ON u.id = a.guide_id
         JOIN repost_videos v ON v.id = s.video_id
         WHERE ${where}
         ORDER BY ${orderBy}
         LIMIT ${Number(limit)} OFFSET ${Number(offset)}`
    );
    return rows.map((r: any) => ({
        ...rowToViewUpdate(r),
        guide_full_name: r.guide_full_name,
        guide_email: r.guide_email,
        video_title: r.video_title,
        platform: r.platform,
        post_link: r.post_link,
    }));
};

/**
 * Valide une déclaration de vues : calcule le palier atteint (selon le palier
 * d'abonnés du compte), crédite le delta par rapport à ce qui a déjà été
 * crédité sur ce repost, et met à jour le cumul sur la soumission.
 */
export const approveViewUpdate = async (updateId: string, adminId: string): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [updateRows]: any = await connection.execute(
            `SELECT * FROM repost_view_updates WHERE id = ? AND deleted_at IS NULL FOR UPDATE`,
            [updateId]
        );
        const viewUpdate = updateRows[0];
        if (!viewUpdate) throw new Error('Déclaration introuvable');
        if (viewUpdate.status !== 'pending') throw new Error('Déclaration déjà traitée');

        const [submissionRows]: any = await connection.execute(
            `SELECT * FROM repost_submissions WHERE id = ? FOR UPDATE`,
            [viewUpdate.submission_id]
        );
        const submission = submissionRows[0];
        if (!submission) throw new Error('Repost introuvable');

        const account = await getAccountById(submission.account_id);
        if (!account || !account.tier_id) throw new Error('Compte ou palier introuvable');

        const matchedTier = await findViewTierForCount(account.tier_id, viewUpdate.declared_views);
        const newTotal = matchedTier?.amount_cents ?? 0;
        const delta = Math.max(0, newTotal - submission.view_earnings_cents);

        await connection.execute(
            `UPDATE repost_view_updates
             SET status = 'approved', matched_view_tier_id = ?, credited_amount_cents = ?,
                 reviewed_by = ?, reviewed_at = NOW()
             WHERE id = ?`,
            [matchedTier?.id ?? null, delta, adminId, updateId]
        );

        await connection.execute(
            `UPDATE repost_submissions
             SET latest_declared_views = ?, view_earnings_cents = view_earnings_cents + ?
             WHERE id = ?`,
            [viewUpdate.declared_views, delta, submission.id]
        );

        await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

export const rejectViewUpdate = async (
    updateId: string,
    adminId: string,
    rejectionReason: string
): Promise<void> => {
    if (!rejectionReason || rejectionReason.trim().length < 3) {
        throw new Error('Raison du rejet requise (min 3 caractères)');
    }

    const viewUpdate = await getViewUpdateById(updateId);
    if (!viewUpdate) throw new Error('Déclaration introuvable');
    if (viewUpdate.status !== 'pending') throw new Error('Déclaration déjà traitée');

    await query(
        `UPDATE repost_view_updates
         SET status = 'rejected', rejection_reason = ?, reviewed_by = ?, reviewed_at = NOW()
         WHERE id = ?`,
        [rejectionReason.trim(), adminId, updateId]
    );
};

function rowToViewUpdate(row: any): RepostViewUpdate {
    return {
        id: row.id,
        submission_id: row.submission_id,
        declared_views: row.declared_views,
        screenshot_url: row.screenshot_url,
        matched_view_tier_id: row.matched_view_tier_id,
        credited_amount_cents: row.credited_amount_cents,
        status: row.status,
        rejection_reason: row.rejection_reason,
        reviewed_by: row.reviewed_by,
        reviewed_at: row.reviewed_at,
        created_at: row.created_at,
        deleted_at: row.deleted_at,
    };
}
