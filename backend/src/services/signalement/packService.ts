// CRUD des packs signalement (templates créés par l'admin).
// Soft-delete via deleted_at.

import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/database';
import {
    SignalementPack,
    CreateSignalementPackInput,
    UpdateSignalementPackInput,
} from '../../types/signalement';

export const listPacks = async (
    includeInactive = false
): Promise<SignalementPack[]> => {
    const whereActive = includeInactive ? '' : 'AND is_active = 1';
    const rows: any = await query(
        `SELECT * FROM signalement_packs
         WHERE deleted_at IS NULL ${whereActive}
         ORDER BY created_at DESC`
    );
    return rows.map(rowToPack);
};

export const getPackById = async (id: string): Promise<SignalementPack | null> => {
    const rows: any = await query(
        `SELECT * FROM signalement_packs WHERE id = ? AND deleted_at IS NULL`,
        [id]
    );
    return rows[0] ? rowToPack(rows[0]) : null;
};

export const createPack = async (
    input: CreateSignalementPackInput
): Promise<SignalementPack> => {
    const id = uuidv4();
    await query(
        `INSERT INTO signalement_packs
         (id, name, nb_avis, nb_signalements_par_avis, price_cents)
         VALUES (?, ?, ?, ?, ?)`,
        [id, input.name, input.nb_avis, input.nb_signalements_par_avis, input.price_cents]
    );
    const created = await getPackById(id);
    if (!created) throw new Error('Pack créé mais introuvable');
    return created;
};

export const updatePack = async (
    id: string,
    input: UpdateSignalementPackInput
): Promise<SignalementPack | null> => {
    const fields: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
        fields.push('name = ?');
        values.push(input.name);
    }
    if (input.nb_avis !== undefined) {
        fields.push('nb_avis = ?');
        values.push(input.nb_avis);
    }
    if (input.nb_signalements_par_avis !== undefined) {
        fields.push('nb_signalements_par_avis = ?');
        values.push(input.nb_signalements_par_avis);
    }
    if (input.price_cents !== undefined) {
        fields.push('price_cents = ?');
        values.push(input.price_cents);
    }
    if (input.is_active !== undefined) {
        fields.push('is_active = ?');
        values.push(input.is_active ? 1 : 0);
    }

    if (fields.length === 0) return getPackById(id);

    values.push(id);
    await query(
        `UPDATE signalement_packs SET ${fields.join(', ')}
         WHERE id = ? AND deleted_at IS NULL`,
        values
    );

    return getPackById(id);
};

export const softDeletePack = async (id: string): Promise<void> => {
    await query(
        `UPDATE signalement_packs SET deleted_at = NOW()
         WHERE id = ? AND deleted_at IS NULL`,
        [id]
    );
};

function rowToPack(row: any): SignalementPack {
    return {
        id: row.id,
        name: row.name,
        nb_avis: row.nb_avis,
        nb_signalements_par_avis: row.nb_signalements_par_avis,
        price_cents: row.price_cents,
        is_active: row.is_active === 1 || row.is_active === true,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
    };
}
