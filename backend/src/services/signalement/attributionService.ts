// Gestion des attributions de packs aux artisans (cumul possible).
// Le compteur global d'avis restants pour un artisan est calculé dynamiquement
// via SUM(nb_avis_total - nb_avis_consumed) — jamais stocké.
//
// Une attribution snapshot nb_avis_total et nb_signalements_par_avis du pack
// au moment de l'attribution → modifier le pack template ne casse pas les
// attributions existantes.

import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/database';
import {
    SignalementAttribution,
    CreateAttributionInput,
} from '../../types/signalement';
import { getPackById } from './packService';

export const createAttribution = async (
    input: CreateAttributionInput,
    attributedByAdminId: string
): Promise<SignalementAttribution> => {
    const pack = await getPackById(input.pack_id);
    if (!pack) throw new Error('Pack introuvable');
    if (!pack.is_active) throw new Error('Pack inactif, impossible à attribuer');

    const id = uuidv4();
    await query(
        `INSERT INTO signalement_attributions
         (id, artisan_id, pack_id, nb_avis_total, nb_signalements_par_avis,
          attributed_by, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            input.artisan_id,
            pack.id,
            pack.nb_avis,
            pack.nb_signalements_par_avis,
            attributedByAdminId,
            input.note ?? null,
        ]
    );

    const created = await getAttributionById(id);
    if (!created) throw new Error('Attribution créée mais introuvable');
    return created;
};

export const getAttributionById = async (
    id: string
): Promise<SignalementAttribution | null> => {
    const rows: any = await query(
        `SELECT * FROM signalement_attributions
         WHERE id = ? AND deleted_at IS NULL`,
        [id]
    );
    return rows[0] ? rowToAttribution(rows[0]) : null;
};

export const listAttributionsForArtisan = async (
    artisanId: string,
    includeDeleted = false
): Promise<SignalementAttribution[]> => {
    const filterDeleted = includeDeleted ? '' : 'AND deleted_at IS NULL';
    const rows: any = await query(
        `SELECT * FROM signalement_attributions
         WHERE artisan_id = ? ${filterDeleted}
         ORDER BY attributed_at DESC`,
        [artisanId]
    );
    return rows.map(rowToAttribution);
};

/**
 * Compteur global "avis restants" pour un artisan.
 * = SUM(nb_avis_total - nb_avis_consumed) sur attributions non supprimées.
 */
export const getRemainingAvisForArtisan = async (
    artisanId: string
): Promise<number> => {
    const rows: any = await query(
        `SELECT COALESCE(SUM(nb_avis_total - nb_avis_consumed), 0) AS remaining
         FROM signalement_attributions
         WHERE artisan_id = ? AND deleted_at IS NULL`,
        [artisanId]
    );
    return Number(rows[0]?.remaining ?? 0);
};

/**
 * Trouve l'attribution la plus ancienne avec encore des slots disponibles.
 * Stratégie FIFO : on consomme en priorité les vieux crédits.
 *
 * Si une connection (transactionnelle) est fournie, le SELECT utilise FOR UPDATE
 * pour verrouiller la ligne pendant la transaction (évite double-consommation
 * si deux soumissions parallèles arrivent en même temps).
 */
export const pickAttributionWithFreeSlot = async (
    artisanId: string,
    connection?: any
): Promise<SignalementAttribution | null> => {
    if (connection) {
        const [rows]: any = await connection.execute(
            `SELECT * FROM signalement_attributions
             WHERE artisan_id = ? AND deleted_at IS NULL
               AND nb_avis_consumed < nb_avis_total
             ORDER BY attributed_at ASC
             LIMIT 1
             FOR UPDATE`,
            [artisanId]
        );
        return rows[0] ? rowToAttribution(rows[0]) : null;
    }

    const rows: any = await query(
        `SELECT * FROM signalement_attributions
         WHERE artisan_id = ? AND deleted_at IS NULL
           AND nb_avis_consumed < nb_avis_total
         ORDER BY attributed_at ASC
         LIMIT 1`,
        [artisanId]
    );
    return rows[0] ? rowToAttribution(rows[0]) : null;
};

/**
 * Décrémente 1 slot (= incrémente nb_avis_consumed de 1).
 * À appeler dans une transaction depuis avisService.createAvis() et relaunch.
 */
export const consumeOneAvisSlot = async (
    attributionId: string,
    connection: any
): Promise<void> => {
    await connection.execute(
        `UPDATE signalement_attributions
         SET nb_avis_consumed = nb_avis_consumed + 1
         WHERE id = ? AND deleted_at IS NULL
           AND nb_avis_consumed < nb_avis_total`,
        [attributionId]
    );
};

/**
 * Restitue 1 slot (cas exceptionnel : annulation admin avec refund_slot=true).
 */
export const refundOneAvisSlot = async (
    attributionId: string,
    connection?: any
): Promise<void> => {
    const sql = `UPDATE signalement_attributions
         SET nb_avis_consumed = GREATEST(nb_avis_consumed - 1, 0)
         WHERE id = ? AND deleted_at IS NULL`;
    if (connection) {
        await connection.execute(sql, [attributionId]);
    } else {
        await query(sql, [attributionId]);
    }
};

export const softDeleteAttribution = async (id: string): Promise<void> => {
    await query(
        `UPDATE signalement_attributions SET deleted_at = NOW()
         WHERE id = ? AND deleted_at IS NULL`,
        [id]
    );
};

function rowToAttribution(row: any): SignalementAttribution {
    return {
        id: row.id,
        artisan_id: row.artisan_id,
        pack_id: row.pack_id,
        nb_avis_total: row.nb_avis_total,
        nb_signalements_par_avis: row.nb_signalements_par_avis,
        nb_avis_consumed: row.nb_avis_consumed,
        attributed_by: row.attributed_by,
        attributed_at: row.attributed_at,
        note: row.note,
        deleted_at: row.deleted_at,
    };
}
