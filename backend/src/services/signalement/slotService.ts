// Gestion des slots de signalement (1 slot = 1 signalement à faire).
// Cycle : available → reserved (timer) → submitted → validated.
// Si admin reject → slot redevient available.
// Si timer expire en reserved sans submit → reset à available (lazy-check).

import { query, pool } from '../../config/database';
import { SignalementSlot } from '../../types/signalement';
import { checkCooldownForAvis } from './cooldownService';

/**
 * Réserve un slot pour un guide.
 * Vérifie : éligibilité (côté caller), pas déjà 1 slot sur cet avis, cooldown OK,
 * slot toujours available (race-safe via FOR UPDATE).
 */
export const reserveSlotForGuide = async (
    slotId: string,
    guideId: string
): Promise<SignalementSlot> => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Lock le slot ciblé
        const [slotRows]: any = await connection.execute(
            `SELECT * FROM signalement_slots WHERE id = ? FOR UPDATE`,
            [slotId]
        );
        const slot = slotRows[0];
        if (!slot) throw new Error('Slot introuvable');

        // Lazy-check expiration : si reserved et expiré, on libère.
        if (
            slot.status === 'reserved' &&
            slot.reservation_expires_at &&
            new Date(slot.reservation_expires_at) < new Date()
        ) {
            await connection.execute(
                `UPDATE signalement_slots
                 SET status = 'available',
                     reserved_by_guide_id = NULL,
                     reserved_at = NULL,
                     reservation_expires_at = NULL
                 WHERE id = ?`,
                [slotId]
            );
            slot.status = 'available';
            slot.reserved_by_guide_id = null;
        }

        if (slot.status !== 'available') {
            throw new Error('Slot non disponible');
        }

        // 2. Le guide a-t-il déjà 1 slot sur ce même avis ?
        const [existingRows]: any = await connection.execute(
            `SELECT COUNT(*) AS n FROM signalement_slots
             WHERE avis_id = ? AND reserved_by_guide_id = ?
               AND status IN ('reserved', 'submitted', 'validated')`,
            [slot.avis_id, guideId]
        );
        if ((existingRows[0]?.n ?? 0) > 0) {
            throw new Error('Vous avez déjà un slot sur cet avis');
        }

        // 3. L'avis est-il toujours actif ?
        const [avisRows]: any = await connection.execute(
            `SELECT status FROM signalement_avis WHERE id = ? AND deleted_at IS NULL`,
            [slot.avis_id]
        );
        if (!avisRows[0] || avisRows[0].status !== 'active') {
            throw new Error('Avis non disponible');
        }

        // 4. Cooldown sur l'avis ?
        const cooldown = await checkCooldownForAvis(slot.avis_id);
        if (!cooldown.can_take) {
            const next = cooldown.next_available_at!;
            throw new Error(
                `Cooldown actif. Prochain signalement possible à ${next.toISOString()}`
            );
        }

        // 5. Lit le timer depuis config
        const [configRows]: any = await connection.execute(
            `SELECT reservation_timer_minutes FROM signalement_config WHERE id = 'global'`
        );
        const timerMin = configRows[0]?.reservation_timer_minutes ?? 30;

        const expiresAt = new Date(Date.now() + timerMin * 60 * 1000);

        await connection.execute(
            `UPDATE signalement_slots
             SET status = 'reserved',
                 reserved_by_guide_id = ?,
                 reserved_at = NOW(),
                 reservation_expires_at = ?
             WHERE id = ?`,
            [guideId, expiresAt, slotId]
        );

        await connection.commit();

        return getSlotById(slotId) as Promise<SignalementSlot>;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

export const getSlotById = async (id: string): Promise<SignalementSlot | null> => {
    const rows: any = await query(`SELECT * FROM signalement_slots WHERE id = ?`, [id]);
    return rows[0] ? rowToSlot(rows[0]) : null;
};

/**
 * Liste les avis qui ont des slots disponibles (filtre cooldown global).
 * Retourne aussi le compteur slots restants par avis.
 *
 * Lazy-check expiration : avant d'agréger, on remet à available les slots
 * dont la réservation a expiré. Évite de devoir tourner un cron.
 */
export const listAvailableAvisForGuide = async (
    guideId: string
): Promise<Array<{
    avis_id: string;
    google_review_url: string;
    raison: string;
    raison_details: string | null;
    payout_per_signalement_cents: number;
    nb_slots_remaining: number;
    nb_signalements_target: number;
    nb_signalements_validated: number;
    can_take: boolean;
    blocked_reason?: string;
    cooldown_next_at?: Date;
}>> => {
    // 1. Lazy-check : libère les slots dont le timer a expiré
    await query(
        `UPDATE signalement_slots
         SET status = 'available',
             reserved_by_guide_id = NULL,
             reserved_at = NULL,
             reservation_expires_at = NULL
         WHERE status = 'reserved' AND reservation_expires_at < NOW()`
    );

    // 2. Liste les avis actifs avec au moins 1 slot available
    const rows: any = await query(
        `SELECT
            a.id AS avis_id,
            a.google_review_url,
            a.raison,
            a.raison_details,
            a.payout_per_signalement_cents,
            a.nb_signalements_target,
            a.nb_signalements_validated,
            (SELECT COUNT(*) FROM signalement_slots s
              WHERE s.avis_id = a.id AND s.status = 'available') AS nb_slots_remaining,
            (SELECT COUNT(*) FROM signalement_slots s2
              WHERE s2.avis_id = a.id
                AND s2.reserved_by_guide_id = ?
                AND s2.status IN ('reserved', 'submitted', 'validated')) AS guide_has_slot
         FROM signalement_avis a
         WHERE a.status = 'active' AND a.deleted_at IS NULL
         HAVING nb_slots_remaining > 0
         ORDER BY a.created_at ASC`,
        [guideId]
    );

    if (rows.length === 0) return [];

    // 3. Cooldown batch sur tous les avis listés
    const { getAvisInCooldown } = await import('./cooldownService');
    const inCooldown = await getAvisInCooldown(rows.map((r: any) => r.avis_id));

    return rows.map((r: any) => {
        const guideHasSlot = (r.guide_has_slot ?? 0) > 0;
        const cooldownEnd = inCooldown.get(r.avis_id);

        let canTake = true;
        let blockedReason: string | undefined;

        if (guideHasSlot) {
            canTake = false;
            blockedReason = 'Vous avez déjà un slot sur cet avis';
        } else if (cooldownEnd) {
            canTake = false;
            blockedReason = 'Cooldown actif';
        }

        return {
            avis_id: r.avis_id,
            google_review_url: r.google_review_url,
            raison: r.raison,
            raison_details: r.raison_details,
            payout_per_signalement_cents: r.payout_per_signalement_cents,
            nb_slots_remaining: Number(r.nb_slots_remaining),
            nb_signalements_target: r.nb_signalements_target,
            nb_signalements_validated: r.nb_signalements_validated,
            can_take: canTake,
            blocked_reason: blockedReason,
            cooldown_next_at: cooldownEnd,
        };
    });
};

/**
 * Liste des slots actifs (reserved) du guide pour qu'il voie ses signalements
 * en cours et puisse uploader la preuve.
 */
export const listActiveSlotsForGuide = async (
    guideId: string
): Promise<Array<{
    slot_id: string;
    avis_id: string;
    google_review_url: string;
    raison: string;
    payout_per_signalement_cents: number;
    reserved_at: Date;
    reservation_expires_at: Date;
}>> => {
    // Lazy-check expiration
    await query(
        `UPDATE signalement_slots
         SET status = 'available',
             reserved_by_guide_id = NULL,
             reserved_at = NULL,
             reservation_expires_at = NULL
         WHERE status = 'reserved' AND reservation_expires_at < NOW()`
    );

    const rows: any = await query(
        `SELECT s.id AS slot_id, s.avis_id, s.reserved_at, s.reservation_expires_at,
                a.google_review_url, a.raison, a.payout_per_signalement_cents
         FROM signalement_slots s
         JOIN signalement_avis a ON a.id = s.avis_id
         WHERE s.reserved_by_guide_id = ? AND s.status = 'reserved'
           AND a.deleted_at IS NULL
         ORDER BY s.reserved_at ASC`,
        [guideId]
    );

    return rows.map((r: any) => ({
        slot_id: r.slot_id,
        avis_id: r.avis_id,
        google_review_url: r.google_review_url,
        raison: r.raison,
        payout_per_signalement_cents: r.payout_per_signalement_cents,
        reserved_at: r.reserved_at,
        reservation_expires_at: r.reservation_expires_at,
    }));
};

/**
 * Marque un slot comme submitted (preuve uploadée).
 * Doit être appelé dans une transaction (connection fournie) depuis proofService.
 */
export const markSlotSubmitted = async (
    slotId: string,
    connection: any
): Promise<void> => {
    await connection.execute(
        `UPDATE signalement_slots
         SET status = 'submitted', submitted_at = NOW()
         WHERE id = ? AND status = 'reserved'`,
        [slotId]
    );
};

/**
 * Marque un slot comme validated (admin a validé la preuve).
 * Idempotent.
 */
export const markSlotValidated = async (
    slotId: string,
    connection: any
): Promise<void> => {
    await connection.execute(
        `UPDATE signalement_slots SET status = 'validated' WHERE id = ?`,
        [slotId]
    );
};

/**
 * Reset un slot à available (admin a rejeté la preuve, le slot redevient pris-able).
 */
export const resetSlotToAvailable = async (
    slotId: string,
    connection: any
): Promise<void> => {
    await connection.execute(
        `UPDATE signalement_slots
         SET status = 'available',
             reserved_by_guide_id = NULL,
             reserved_at = NULL,
             reservation_expires_at = NULL,
             submitted_at = NULL
         WHERE id = ?`,
        [slotId]
    );
};

function rowToSlot(row: any): SignalementSlot {
    return {
        id: row.id,
        avis_id: row.avis_id,
        slot_index: row.slot_index,
        status: row.status,
        reserved_by_guide_id: row.reserved_by_guide_id,
        reserved_at: row.reserved_at,
        reservation_expires_at: row.reservation_expires_at,
        submitted_at: row.submitted_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}
