// Avis Google à signaler — création (avec génération des N slots), liste,
// transitions de statut, relance, annulation admin.
//
// Quota : 5 signalements par pack 499€ (review_credits >= 90) actif.
// attribution_id = NULL pour les avis créés via ce nouveau chemin.

import { v4 as uuidv4 } from 'uuid';
import { query, pool } from '../../config/database';
import {
    SignalementAvis,
    SignalementAvisStatus,
    CreateAvisInput,
} from '../../types/signalement';
import { isValidRaison } from '../../constants/signalementRaisons';
import { refundOneAvisSlot } from './attributionService';

// 5 signalements par pack 499€ (= review_credits >= 90)
const SIGNALEMENTS_PER_PACK = 5;

/**
 * Quota total de signalements pour un artisan = nb de packs 499€ × 5.
 */
export const getArtisanSignalementQuota = async (artisanId: string): Promise<number> => {
    const rows: any = await query(
        `SELECT COUNT(*) AS nb_packs
         FROM payments
         WHERE user_id = ? AND review_credits >= 90
           AND status = 'completed' AND type = 'subscription'`,
        [artisanId]
    );
    return (rows[0]?.nb_packs ?? 0) * SIGNALEMENTS_PER_PACK;
};

/**
 * Nombre de signalements déjà utilisés (non annulés, non supprimés).
 */
export const getArtisanSignalementUsed = async (artisanId: string): Promise<number> => {
    const rows: any = await query(
        `SELECT COUNT(*) AS used
         FROM signalement_avis
         WHERE artisan_id = ? AND status != 'cancelled_by_admin' AND deleted_at IS NULL`,
        [artisanId]
    );
    return rows[0]?.used ?? 0;
};

/**
 * Crée un nouvel avis à signaler pour un artisan.
 * Quota basé sur les packs 499€ (review_credits >= 90) actifs.
 */
export const createAvisForArtisan = async (
    artisanId: string,
    input: CreateAvisInput,
    options?: { relaunchedFromAvisId?: string }
): Promise<SignalementAvis> => {
    if (!input.google_review_url?.trim()) {
        throw new Error('URL requise');
    }
    if (!isValidRaison(input.raison)) {
        throw new Error(`Raison inconnue : ${input.raison}`);
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Vérif quota pack-based (FOR UPDATE sur les avis existants)
        const [quotaRows]: any = await connection.execute(
            `SELECT COUNT(*) AS nb_packs FROM payments
             WHERE user_id = ? AND review_credits >= 90
               AND status = 'completed' AND type = 'subscription'`,
            [artisanId]
        );
        const totalQuota = (quotaRows[0]?.nb_packs ?? 0) * SIGNALEMENTS_PER_PACK;

        const [usedRows]: any = await connection.execute(
            `SELECT COUNT(*) AS used FROM signalement_avis
             WHERE artisan_id = ? AND status != 'cancelled_by_admin' AND deleted_at IS NULL
             FOR UPDATE`,
            [artisanId]
        );
        const used = usedRows[0]?.used ?? 0;

        if (totalQuota === 0) {
            throw new Error('Vous devez activer le pack 499€ (90 avis) pour accéder au signalement');
        }
        if (used >= totalQuota) {
            throw new Error(`Quota de signalements atteint (${used}/${totalQuota})`);
        }

        // Lit config : nb_signalements_par_avis (combien de guides par avis) + payout
        const [configRows]: any = await connection.execute(
            `SELECT default_payout_cents, nb_signalements_par_avis_default
             FROM signalement_config WHERE id = 'global'`
        );
        const payout = configRows[0]?.default_payout_cents ?? 10;
        const nbSlots = configRows[0]?.nb_signalements_par_avis_default ?? 1;

        const avisId = uuidv4();
        await connection.execute(
            `INSERT INTO signalement_avis
             (id, artisan_id, order_id, attribution_id, google_review_url, raison, raison_details,
              nb_signalements_target, payout_per_signalement_cents,
              relaunched_from_avis_id)
             VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
            [
                avisId,
                artisanId,
                input.order_id ?? null,
                input.google_review_url,
                input.raison,
                input.raison_details ?? null,
                nbSlots,
                payout,
                options?.relaunchedFromAvisId ?? null,
            ]
        );

        for (let i = 1; i <= nbSlots; i++) {
            await connection.execute(
                `INSERT INTO signalement_slots (id, avis_id, slot_index) VALUES (?, ?, ?)`,
                [uuidv4(), avisId, i]
            );
        }

        await connection.commit();

        const created = await getAvisById(avisId);
        if (!created) throw new Error('Avis créé mais introuvable');
        return created;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

/**
 * Relance un avis en status terminated_inconclusive.
 * Crée un NOUVEL avis (consomme un nouveau slot) avec relaunched_from_avis_id pointant
 * sur l'ancien.
 */
export const relaunchAvis = async (
    artisanId: string,
    sourceAvisId: string
): Promise<SignalementAvis> => {
    const source = await getAvisById(sourceAvisId);
    if (!source) throw new Error('Avis source introuvable');
    if (source.artisan_id !== artisanId) throw new Error('Avis non autorisé');
    if (source.status !== 'terminated_inconclusive') {
        throw new Error('Seul un avis non concluant peut être relancé');
    }

    return createAvisForArtisan(
        artisanId,
        {
            google_review_url: source.google_review_url,
            raison: source.raison,
            raison_details: source.raison_details ?? undefined,
        },
        { relaunchedFromAvisId: sourceAvisId }
    );
};

export const getAvisById = async (id: string): Promise<SignalementAvis | null> => {
    const rows: any = await query(
        `SELECT * FROM signalement_avis
         WHERE id = ? AND deleted_at IS NULL`,
        [id]
    );
    return rows[0] ? rowToAvis(rows[0]) : null;
};

export const listAvisForArtisan = async (
    artisanId: string
): Promise<SignalementAvis[]> => {
    const rows: any = await query(
        `SELECT * FROM signalement_avis
         WHERE artisan_id = ? AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [artisanId]
    );
    return rows.map(rowToAvis);
};

interface ListAvisFilters {
    status?: SignalementAvisStatus | SignalementAvisStatus[];
    artisanId?: string;
    raison?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
}

export const listAvisForAdmin = async (
    filters: ListAvisFilters = {}
): Promise<{ rows: SignalementAvis[]; total: number }> => {
    const where: string[] = ['deleted_at IS NULL'];
    const params: any[] = [];

    if (filters.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        where.push(`status IN (${statuses.map(() => '?').join(',')})`);
        params.push(...statuses);
    }
    if (filters.artisanId) {
        where.push('artisan_id = ?');
        params.push(filters.artisanId);
    }
    if (filters.raison) {
        where.push('raison = ?');
        params.push(filters.raison);
    }
    if (filters.fromDate) {
        where.push('created_at >= ?');
        params.push(filters.fromDate);
    }
    if (filters.toDate) {
        where.push('created_at <= ?');
        params.push(filters.toDate);
    }

    const whereSql = where.join(' AND ');
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    const countRows: any = await query(
        `SELECT COUNT(*) AS total FROM signalement_avis WHERE ${whereSql}`,
        params
    );
    const total = countRows[0]?.total ?? 0;

    const rows: any = await query(
        `SELECT * FROM signalement_avis
         WHERE ${whereSql}
         ORDER BY created_at DESC
         LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
        params
    );

    return { rows: rows.map(rowToAvis), total };
};

/**
 * Met à jour le payout par signalement d'un avis (admin only).
 * N'affecte PAS les preuves déjà soumises (snapshot dans proof.earnings_cents).
 */
export const updateAvisPayout = async (
    avisId: string,
    payoutCents: number
): Promise<void> => {
    if (payoutCents < 0) throw new Error('Payout négatif interdit');
    await query(
        `UPDATE signalement_avis SET payout_per_signalement_cents = ?
         WHERE id = ? AND deleted_at IS NULL`,
        [payoutCents, avisId]
    );
};

/**
 * Marque l'avis comme "Cible supprimée" (Google a retiré l'avis).
 * Statut : terminated_success.
 */
export const markGoogleDeleted = async (
    avisId: string,
    adminId: string
): Promise<void> => {
    await query(
        `UPDATE signalement_avis
         SET status = 'terminated_success',
             closed_at = NOW(),
             closed_by_admin_id = ?
         WHERE id = ? AND deleted_at IS NULL AND status = 'active'`,
        [adminId, avisId]
    );
};

/**
 * Annule un avis (cas exceptionnel admin).
 * Si refundSlot=true, restitue 1 slot à l'attribution liée.
 */
export const cancelAvisByAdmin = async (
    avisId: string,
    adminId: string,
    refundSlot: boolean
): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [rows]: any = await connection.execute(
            `SELECT id, attribution_id, status FROM signalement_avis
             WHERE id = ? AND deleted_at IS NULL FOR UPDATE`,
            [avisId]
        );
        const avis = rows[0];
        if (!avis) throw new Error('Avis introuvable');
        if (avis.status !== 'active') {
            throw new Error('Seul un avis actif peut être annulé');
        }

        await connection.execute(
            `UPDATE signalement_avis
             SET status = 'cancelled_by_admin',
                 closed_at = NOW(),
                 closed_by_admin_id = ?
             WHERE id = ?`,
            [adminId, avisId]
        );

        if (refundSlot) {
            await refundOneAvisSlot(avis.attribution_id, connection);
        }

        await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

/**
 * Incrémente le compteur nb_signalements_validated. Appelé par proofService
 * lors de la validation. Si le compteur atteint le target, transition vers
 * terminated_inconclusive (l'admin marquera "Google a supprimé" séparément
 * si applicable).
 *
 * NOTE : doit être appelé dans une transaction (connection fournie).
 */
export const incrementValidatedSignalementCount = async (
    avisId: string,
    connection: any
): Promise<void> => {
    await connection.execute(
        `UPDATE signalement_avis
         SET nb_signalements_validated = nb_signalements_validated + 1
         WHERE id = ?`,
        [avisId]
    );

    const [rows]: any = await connection.execute(
        `SELECT nb_signalements_target, nb_signalements_validated, status
         FROM signalement_avis WHERE id = ?`,
        [avisId]
    );
    const a = rows[0];
    if (!a) return;
    if (a.status === 'active' && a.nb_signalements_validated >= a.nb_signalements_target) {
        await connection.execute(
            `UPDATE signalement_avis
             SET status = 'terminated_inconclusive', closed_at = NOW()
             WHERE id = ? AND status = 'active'`,
            [avisId]
        );
    }
};

function rowToAvis(row: any): SignalementAvis {
    return {
        id: row.id,
        artisan_id: row.artisan_id,
        order_id: row.order_id ?? null,
        attribution_id: row.attribution_id,
        google_review_url: row.google_review_url,
        raison: row.raison,
        raison_details: row.raison_details,
        nb_signalements_target: row.nb_signalements_target,
        nb_signalements_validated: row.nb_signalements_validated,
        payout_per_signalement_cents: row.payout_per_signalement_cents,
        status: row.status,
        closed_at: row.closed_at,
        closed_by_admin_id: row.closed_by_admin_id,
        relaunched_from_avis_id: row.relaunched_from_avis_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
    };
}
