// CRUD de la vidéothèque (admin) + liste filtrée côté guide, par COMPTE
// (un guide peut avoir plusieurs comptes de paliers différents, donc la
// vidéothèque visible dépend du compte sélectionné, pas juste du guide).

import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/database';
import { RepostVideo, CreateVideoInput, UpdateVideoInput } from '../../types/repost';
import { getAccountById } from './accountService';
import { getTierById } from './tierService';

export const listVideosForAdmin = async (includeInactive = true): Promise<RepostVideo[]> => {
    const whereActive = includeInactive ? '' : 'AND is_active = 1';
    const rows: any = await query(
        `SELECT * FROM repost_videos
         WHERE deleted_at IS NULL ${whereActive}
         ORDER BY created_at DESC`
    );
    return rows.map(rowToVideo);
};

export const getVideoById = async (id: string): Promise<RepostVideo | null> => {
    const rows: any = await query(
        `SELECT * FROM repost_videos WHERE id = ? AND deleted_at IS NULL`,
        [id]
    );
    return rows[0] ? rowToVideo(rows[0]) : null;
};

export const createVideo = async (
    createdBy: string,
    input: CreateVideoInput
): Promise<RepostVideo> => {
    const id = uuidv4();
    await query(
        `INSERT INTO repost_videos
         (id, title, description, video_url, thumbnail_url, platforms, min_tier_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            input.title,
            input.description ?? null,
            input.video_url,
            input.thumbnail_url ?? null,
            input.platforms ?? null,
            input.min_tier_id ?? null,
            createdBy,
        ]
    );
    const created = await getVideoById(id);
    if (!created) throw new Error('Vidéo créée mais introuvable');
    return created;
};

export const updateVideo = async (
    id: string,
    input: UpdateVideoInput
): Promise<RepostVideo | null> => {
    const fields: string[] = [];
    const values: any[] = [];

    if (input.title !== undefined) {
        fields.push('title = ?');
        values.push(input.title);
    }
    if (input.description !== undefined) {
        fields.push('description = ?');
        values.push(input.description);
    }
    if (input.video_url !== undefined) {
        fields.push('video_url = ?');
        values.push(input.video_url);
    }
    if (input.thumbnail_url !== undefined) {
        fields.push('thumbnail_url = ?');
        values.push(input.thumbnail_url);
    }
    if (input.platforms !== undefined) {
        fields.push('platforms = ?');
        values.push(input.platforms);
    }
    if (input.min_tier_id !== undefined) {
        fields.push('min_tier_id = ?');
        values.push(input.min_tier_id);
    }
    if (input.is_active !== undefined) {
        fields.push('is_active = ?');
        values.push(input.is_active ? 1 : 0);
    }

    if (fields.length === 0) return getVideoById(id);

    values.push(id);
    await query(
        `UPDATE repost_videos SET ${fields.join(', ')}
         WHERE id = ? AND deleted_at IS NULL`,
        values
    );

    return getVideoById(id);
};

export const softDeleteVideo = async (id: string): Promise<void> => {
    await query(
        `UPDATE repost_videos SET deleted_at = NOW()
         WHERE id = ? AND deleted_at IS NULL`,
        [id]
    );
};

/**
 * Vidéos visibles pour UN compte approuvé : actives, dont min_tier_id est NULL
 * ou dont le montant est <= au palier de ce compte.
 */
export const listVideosForAccount = async (accountId: string): Promise<RepostVideo[]> => {
    const account = await getAccountById(accountId);
    if (!account || account.status !== 'approved' || !account.tier_id) return [];

    const accountTier = await getTierById(account.tier_id);
    const accountAmount = accountTier?.amount_cents ?? 0;

    const rows: any = await query(
        `SELECT v.* FROM repost_videos v
         LEFT JOIN repost_tiers t ON t.id = v.min_tier_id
         WHERE v.deleted_at IS NULL AND v.is_active = 1
           AND (v.min_tier_id IS NULL OR t.amount_cents <= ?)
         ORDER BY v.created_at DESC`,
        [accountAmount]
    );
    return rows.map(rowToVideo);
};

function rowToVideo(row: any): RepostVideo {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        video_url: row.video_url,
        thumbnail_url: row.thumbnail_url,
        platforms: row.platforms,
        min_tier_id: row.min_tier_id,
        is_active: row.is_active === 1 || row.is_active === true,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
    };
}
