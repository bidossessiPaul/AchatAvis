// Un repost = un COMPTE (repost_accounts) qui poste une vidéo précise.
// base_earnings_cents = snapshot du montant du palier d'abonnés du compte au
// moment du post (crédité à la validation admin du post lui-même).
// Le bonus lié aux vues est géré séparément par viewUpdateService.

import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/database';
import { uploadToCloudinary } from '../cloudinaryService';
import { RepostSubmission, SubmitRepostProofInput } from '../../types/repost';
import { getAccountById } from './accountService';
import { getTierById } from './tierService';
import { getVideoById } from './videoService';

export const submitProof = async (data: SubmitRepostProofInput): Promise<RepostSubmission> => {
    const account = await getAccountById(data.accountId);
    if (!account || account.status !== 'approved' || !account.tier_id) {
        throw new Error("Ce compte n'est pas approuvé pour le repost social");
    }
    const tier = await getTierById(account.tier_id);
    if (!tier) throw new Error('Palier introuvable');

    const video = await getVideoById(data.videoId);
    if (!video || !video.is_active) {
        throw new Error('Vidéo introuvable ou inactive');
    }

    const uploaded = await uploadToCloudinary(
        data.screenshotBuffer,
        'repost-submissions',
        { resourceType: 'image' }
    );

    const id = uuidv4();
    await query(
        `INSERT INTO repost_submissions
         (id, account_id, video_id, post_link, screenshot_url, base_earnings_cents)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, data.accountId, data.videoId, data.postLink, uploaded.secure_url, tier.amount_cents]
    );

    const created = await getSubmissionById(id);
    if (!created) throw new Error('Soumission créée mais introuvable');
    return created;
};

export const getSubmissionById = async (id: string): Promise<RepostSubmission | null> => {
    const rows: any = await query(
        `SELECT * FROM repost_submissions WHERE id = ? AND deleted_at IS NULL`,
        [id]
    );
    return rows[0] ? rowToSubmission(rows[0]) : null;
};

export const listSubmissionsForGuide = async (
    guideId: string,
    limit = 50,
    offset = 0
): Promise<Array<RepostSubmission & { platform: string; profile_link: string; video_title: string }>> => {
    const rows: any = await query(
        `SELECT s.*, a.platform, a.profile_link, v.title AS video_title
         FROM repost_submissions s
         JOIN repost_accounts a ON a.id = s.account_id
         JOIN repost_videos v ON v.id = s.video_id
         WHERE a.guide_id = ? AND s.deleted_at IS NULL
         ORDER BY s.created_at DESC
         LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
        [guideId]
    );
    return rows.map((r: any) => ({
        ...rowToSubmission(r),
        platform: r.platform,
        profile_link: r.profile_link,
        video_title: r.video_title,
    }));
};

export const listSubmissionsForAdmin = async (
    status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending',
    limit = 50,
    offset = 0
): Promise<Array<RepostSubmission & {
    guide_full_name: string; guide_email: string; platform: string; profile_link: string; video_title: string;
}>> => {
    const where = status === 'all'
        ? 's.deleted_at IS NULL'
        : `s.status = '${status}' AND s.deleted_at IS NULL`;
    const orderBy = status === 'pending' ? 's.created_at ASC' : 's.created_at DESC';

    const rows: any = await query(
        `SELECT s.*, u.full_name AS guide_full_name, u.email AS guide_email,
                a.platform, a.profile_link, v.title AS video_title
         FROM repost_submissions s
         JOIN repost_accounts a ON a.id = s.account_id
         JOIN users u ON u.id = a.guide_id
         JOIN repost_videos v ON v.id = s.video_id
         WHERE ${where}
         ORDER BY ${orderBy}
         LIMIT ${Number(limit)} OFFSET ${Number(offset)}`
    );
    return rows.map((r: any) => ({
        ...rowToSubmission(r),
        guide_full_name: r.guide_full_name,
        guide_email: r.guide_email,
        platform: r.platform,
        profile_link: r.profile_link,
        video_title: r.video_title,
    }));
};

export const approveSubmission = async (submissionId: string, adminId: string): Promise<void> => {
    const submission = await getSubmissionById(submissionId);
    if (!submission) throw new Error('Soumission introuvable');
    if (submission.status !== 'pending') throw new Error('Soumission déjà traitée');

    await query(
        `UPDATE repost_submissions
         SET status = 'approved', reviewed_by = ?, reviewed_at = NOW()
         WHERE id = ?`,
        [adminId, submissionId]
    );
};

export const rejectSubmission = async (
    submissionId: string,
    adminId: string,
    rejectionReason: string
): Promise<void> => {
    if (!rejectionReason || rejectionReason.trim().length < 3) {
        throw new Error('Raison du rejet requise (min 3 caractères)');
    }

    const submission = await getSubmissionById(submissionId);
    if (!submission) throw new Error('Soumission introuvable');
    if (submission.status !== 'pending') throw new Error('Soumission déjà traitée');

    await query(
        `UPDATE repost_submissions
         SET status = 'rejected', rejection_reason = ?, reviewed_by = ?, reviewed_at = NOW()
         WHERE id = ?`,
        [rejectionReason.trim(), adminId, submissionId]
    );
};

function rowToSubmission(row: any): RepostSubmission {
    return {
        id: row.id,
        account_id: row.account_id,
        video_id: row.video_id,
        post_link: row.post_link,
        screenshot_url: row.screenshot_url,
        base_earnings_cents: row.base_earnings_cents,
        status: row.status,
        rejection_reason: row.rejection_reason,
        reviewed_by: row.reviewed_by,
        reviewed_at: row.reviewed_at,
        latest_declared_views: row.latest_declared_views,
        view_earnings_cents: row.view_earnings_cents,
        created_at: row.created_at,
        deleted_at: row.deleted_at,
    };
}
