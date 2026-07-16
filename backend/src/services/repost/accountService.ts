// Comptes réseaux sociaux d'un guide (un guide peut en déclarer plusieurs,
// comme les comptes Gmail). Chacun est soumis avec une preuve (lien + capture
// + abonnés déclarés), validé par l'admin qui lui assigne un palier.

import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/database';
import { uploadToCloudinary } from '../cloudinaryService';
import { RepostAccount, SubmitAccountInput } from '../../types/repost';
import { findTierForFollowerCount, getTierById } from './tierService';

export const submitAccount = async (data: SubmitAccountInput): Promise<RepostAccount> => {
    // Pas deux demandes pending pour le même couple plateforme/lien.
    const pending: any = await query(
        `SELECT id FROM repost_accounts
         WHERE guide_id = ? AND platform = ? AND profile_link = ?
           AND status = 'pending' AND deleted_at IS NULL`,
        [data.guideId, data.platform, data.profileLink]
    );
    if (pending[0]) {
        throw new Error('Une demande pour ce compte est déjà en attente de validation');
    }

    const uploaded = await uploadToCloudinary(
        data.screenshotBuffer,
        'repost-accounts',
        { resourceType: 'image' }
    );

    const id = uuidv4();
    await query(
        `INSERT INTO repost_accounts
         (id, guide_id, platform, profile_link, screenshot_url, claimed_followers_count)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            id,
            data.guideId,
            data.platform,
            data.profileLink,
            uploaded.secure_url,
            data.claimedFollowersCount,
        ]
    );

    const created = await getAccountById(id);
    if (!created) throw new Error('Compte créé mais introuvable');
    return created;
};

export const getAccountById = async (id: string): Promise<RepostAccount | null> => {
    const rows: any = await query(
        `SELECT * FROM repost_accounts WHERE id = ? AND deleted_at IS NULL`,
        [id]
    );
    return rows[0] ? rowToAccount(rows[0]) : null;
};

export const listAccountsForGuide = async (guideId: string): Promise<RepostAccount[]> => {
    const rows: any = await query(
        `SELECT * FROM repost_accounts
         WHERE guide_id = ? AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [guideId]
    );
    return rows.map(rowToAccount);
};

export const listAccountsForAdmin = async (
    status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending',
    limit = 50,
    offset = 0
): Promise<Array<RepostAccount & { guide_full_name: string; guide_email: string; suggested_tier_id: string | null }>> => {
    const where = status === 'all'
        ? 'r.deleted_at IS NULL'
        : `r.status = '${status}' AND r.deleted_at IS NULL`;
    const orderBy = status === 'pending' ? 'r.created_at ASC' : 'r.created_at DESC';

    const rows: any = await query(
        `SELECT r.*, u.full_name AS guide_full_name, u.email AS guide_email
         FROM repost_accounts r
         JOIN users u ON u.id = r.guide_id
         WHERE ${where}
         ORDER BY ${orderBy}
         LIMIT ${Number(limit)} OFFSET ${Number(offset)}`
    );

    const results = [];
    for (const r of rows) {
        const suggestedTier = await findTierForFollowerCount(r.claimed_followers_count);
        results.push({
            ...rowToAccount(r),
            guide_full_name: r.guide_full_name,
            guide_email: r.guide_email,
            suggested_tier_id: suggestedTier?.id ?? null,
        });
    }
    return results;
};

/**
 * Un guide a accès à la vidéothèque dès qu'il a au moins un compte approuvé
 * ET non bloqué. Un compte bloqué (blocked_at renseigné) ne donne plus accès.
 */
export const guideHasApprovedAccount = async (guideId: string): Promise<boolean> => {
    const rows: any = await query(
        `SELECT id FROM repost_accounts
         WHERE guide_id = ? AND status = 'approved'
           AND blocked_at IS NULL AND deleted_at IS NULL
         LIMIT 1`,
        [guideId]
    );
    return !!rows[0];
};

export const reviewAccount = async (
    accountId: string,
    adminId: string,
    status: 'approved' | 'rejected',
    tierId: string | null,
    adminNotes?: string
): Promise<void> => {
    const account = await getAccountById(accountId);
    if (!account) throw new Error('Compte introuvable');
    if (account.status !== 'pending') throw new Error('Compte déjà traité');

    if (status === 'approved' && !tierId) {
        throw new Error('Palier requis pour approuver un compte');
    }

    await query(
        `UPDATE repost_accounts
         SET status = ?, tier_id = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = NOW()
         WHERE id = ?`,
        [status, status === 'approved' ? tierId : null, adminNotes ?? null, adminId, accountId]
    );
};

/**
 * Change le palier assigné à un compte déjà approuvé (corriger une erreur de
 * classement ou refléter une évolution du nombre d'abonnés).
 */
export const updateAccountTier = async (accountId: string, tierId: string): Promise<void> => {
    const account = await getAccountById(accountId);
    if (!account) throw new Error('Compte introuvable');
    if (account.status !== 'approved') throw new Error('Seul un compte approuvé peut changer de palier');

    const tier = await getTierById(tierId);
    if (!tier) throw new Error('Palier introuvable');

    await query(
        `UPDATE repost_accounts SET tier_id = ? WHERE id = ? AND deleted_at IS NULL`,
        [tierId, accountId]
    );
};

/**
 * Bloque / débloque un compte approuvé. Bloqué = accès vidéothèque coupé, mais
 * le statut 'approved' et l'historique sont conservés (réversible).
 */
export const setAccountBlocked = async (accountId: string, blocked: boolean): Promise<void> => {
    const account = await getAccountById(accountId);
    if (!account) throw new Error('Compte introuvable');
    if (blocked && account.status !== 'approved') {
        throw new Error('Seul un compte approuvé peut être bloqué');
    }

    await query(
        `UPDATE repost_accounts
         SET blocked_at = ${blocked ? 'NOW()' : 'NULL'}
         WHERE id = ? AND deleted_at IS NULL`,
        [accountId]
    );
};

/** Soft-delete d'un compte (table d'historique : jamais de hard-delete). */
export const softDeleteAccount = async (accountId: string): Promise<void> => {
    await query(
        `UPDATE repost_accounts SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
        [accountId]
    );
};

function rowToAccount(row: any): RepostAccount {
    return {
        id: row.id,
        guide_id: row.guide_id,
        platform: row.platform,
        profile_link: row.profile_link,
        screenshot_url: row.screenshot_url,
        claimed_followers_count: row.claimed_followers_count,
        tier_id: row.tier_id,
        status: row.status,
        admin_notes: row.admin_notes,
        reviewed_by: row.reviewed_by,
        reviewed_at: row.reviewed_at,
        blocked_at: row.blocked_at ?? null,
        created_at: row.created_at,
        deleted_at: row.deleted_at,
    };
}
