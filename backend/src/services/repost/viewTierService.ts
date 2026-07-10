// CRUD des paliers de vues (configurables par l'admin), rattachés chacun à un
// palier d'abonnés — chaque palier d'abonnés a son propre barème de vues.

import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/database';
import { RepostViewTier, CreateViewTierInput, UpdateViewTierInput } from '../../types/repost';

export const listViewTiers = async (
    subscriberTierId?: string,
    includeInactive = false
): Promise<RepostViewTier[]> => {
    const conditions = ['deleted_at IS NULL'];
    const params: any[] = [];
    if (!includeInactive) conditions.push('is_active = 1');
    if (subscriberTierId) {
        conditions.push('subscriber_tier_id = ?');
        params.push(subscriberTierId);
    }
    const rows: any = await query(
        `SELECT * FROM repost_view_tiers
         WHERE ${conditions.join(' AND ')}
         ORDER BY subscriber_tier_id ASC, sort_order ASC, min_views ASC`,
        params
    );
    return rows.map(rowToViewTier);
};

export const getViewTierById = async (id: string): Promise<RepostViewTier | null> => {
    const rows: any = await query(
        `SELECT * FROM repost_view_tiers WHERE id = ? AND deleted_at IS NULL`,
        [id]
    );
    return rows[0] ? rowToViewTier(rows[0]) : null;
};

export const createViewTier = async (input: CreateViewTierInput): Promise<RepostViewTier> => {
    const id = uuidv4();
    await query(
        `INSERT INTO repost_view_tiers
         (id, subscriber_tier_id, label, min_views, max_views, amount_cents, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            input.subscriber_tier_id,
            input.label,
            input.min_views,
            input.max_views ?? null,
            input.amount_cents,
            input.sort_order ?? 0,
        ]
    );
    const created = await getViewTierById(id);
    if (!created) throw new Error('Palier de vues créé mais introuvable');
    return created;
};

export const updateViewTier = async (
    id: string,
    input: UpdateViewTierInput
): Promise<RepostViewTier | null> => {
    const fields: string[] = [];
    const values: any[] = [];

    if (input.label !== undefined) {
        fields.push('label = ?');
        values.push(input.label);
    }
    if (input.min_views !== undefined) {
        fields.push('min_views = ?');
        values.push(input.min_views);
    }
    if (input.max_views !== undefined) {
        fields.push('max_views = ?');
        values.push(input.max_views);
    }
    if (input.amount_cents !== undefined) {
        fields.push('amount_cents = ?');
        values.push(input.amount_cents);
    }
    if (input.sort_order !== undefined) {
        fields.push('sort_order = ?');
        values.push(input.sort_order);
    }
    if (input.is_active !== undefined) {
        fields.push('is_active = ?');
        values.push(input.is_active ? 1 : 0);
    }

    if (fields.length === 0) return getViewTierById(id);

    values.push(id);
    await query(
        `UPDATE repost_view_tiers SET ${fields.join(', ')}
         WHERE id = ? AND deleted_at IS NULL`,
        values
    );

    return getViewTierById(id);
};

export const softDeleteViewTier = async (id: string): Promise<void> => {
    await query(
        `UPDATE repost_view_tiers SET deleted_at = NOW()
         WHERE id = ? AND deleted_at IS NULL`,
        [id]
    );
};

/**
 * Trouve le palier de vues applicable pour un palier d'abonnés + nombre de vues donné.
 */
export const findViewTierForCount = async (
    subscriberTierId: string,
    viewsCount: number
): Promise<RepostViewTier | null> => {
    const rows: any = await query(
        `SELECT * FROM repost_view_tiers
         WHERE deleted_at IS NULL AND is_active = 1
           AND subscriber_tier_id = ?
           AND min_views <= ?
           AND (max_views IS NULL OR max_views >= ?)
         ORDER BY min_views DESC
         LIMIT 1`,
        [subscriberTierId, viewsCount, viewsCount]
    );
    return rows[0] ? rowToViewTier(rows[0]) : null;
};

function rowToViewTier(row: any): RepostViewTier {
    return {
        id: row.id,
        subscriber_tier_id: row.subscriber_tier_id,
        label: row.label,
        min_views: row.min_views,
        max_views: row.max_views,
        amount_cents: row.amount_cents,
        is_active: row.is_active === 1 || row.is_active === true,
        sort_order: row.sort_order,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
    };
}
