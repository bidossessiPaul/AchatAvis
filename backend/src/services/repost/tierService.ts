// CRUD des paliers d'abonnés (configurables par l'admin).
// Soft-delete via deleted_at.

import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/database';
import { RepostTier, CreateTierInput, UpdateTierInput } from '../../types/repost';

export const listTiers = async (includeInactive = false): Promise<RepostTier[]> => {
    const whereActive = includeInactive ? '' : 'AND is_active = 1';
    const rows: any = await query(
        `SELECT * FROM repost_tiers
         WHERE deleted_at IS NULL ${whereActive}
         ORDER BY sort_order ASC, min_followers ASC`
    );
    return rows.map(rowToTier);
};

export const getTierById = async (id: string): Promise<RepostTier | null> => {
    const rows: any = await query(
        `SELECT * FROM repost_tiers WHERE id = ? AND deleted_at IS NULL`,
        [id]
    );
    return rows[0] ? rowToTier(rows[0]) : null;
};

export const createTier = async (input: CreateTierInput): Promise<RepostTier> => {
    const id = uuidv4();
    await query(
        `INSERT INTO repost_tiers
         (id, label, min_followers, max_followers, amount_cents, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            id,
            input.label,
            input.min_followers,
            input.max_followers ?? null,
            input.amount_cents,
            input.sort_order ?? 0,
        ]
    );
    const created = await getTierById(id);
    if (!created) throw new Error('Palier créé mais introuvable');
    return created;
};

export const updateTier = async (
    id: string,
    input: UpdateTierInput
): Promise<RepostTier | null> => {
    const fields: string[] = [];
    const values: any[] = [];

    if (input.label !== undefined) {
        fields.push('label = ?');
        values.push(input.label);
    }
    if (input.min_followers !== undefined) {
        fields.push('min_followers = ?');
        values.push(input.min_followers);
    }
    if (input.max_followers !== undefined) {
        fields.push('max_followers = ?');
        values.push(input.max_followers);
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

    if (fields.length === 0) return getTierById(id);

    values.push(id);
    await query(
        `UPDATE repost_tiers SET ${fields.join(', ')}
         WHERE id = ? AND deleted_at IS NULL`,
        values
    );

    return getTierById(id);
};

export const softDeleteTier = async (id: string): Promise<void> => {
    await query(
        `UPDATE repost_tiers SET deleted_at = NOW()
         WHERE id = ? AND deleted_at IS NULL`,
        [id]
    );
};

/**
 * Suggère le palier correspondant à un nombre d'abonnés déclaré.
 * Utilisé pour pré-remplir la validation admin (l'admin garde la main pour corriger).
 */
export const findTierForFollowerCount = async (
    followersCount: number
): Promise<RepostTier | null> => {
    const rows: any = await query(
        `SELECT * FROM repost_tiers
         WHERE deleted_at IS NULL AND is_active = 1
           AND min_followers <= ?
           AND (max_followers IS NULL OR max_followers >= ?)
         ORDER BY min_followers DESC
         LIMIT 1`,
        [followersCount, followersCount]
    );
    return rows[0] ? rowToTier(rows[0]) : null;
};

function rowToTier(row: any): RepostTier {
    return {
        id: row.id,
        label: row.label,
        min_followers: row.min_followers,
        max_followers: row.max_followers,
        amount_cents: row.amount_cents,
        is_active: row.is_active === 1 || row.is_active === true,
        sort_order: row.sort_order,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
    };
}
