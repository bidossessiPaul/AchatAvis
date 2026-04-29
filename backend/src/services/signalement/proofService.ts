// Gestion des preuves uploadées par les guides.
// Submit : guide upload screenshot → proof créée + slot passe submitted.
// Validate : admin OK → proof validated + slot validated + compteur avis +1
//            + paiement guide (snapshot earnings_cents).
// Reject : admin refuse → proof rejected + slot redevient available.

import { v4 as uuidv4 } from 'uuid';
import { query, pool } from '../../config/database';
import { uploadToCloudinary } from '../cloudinaryService';
import { SignalementProof } from '../../types/signalement';
import { markSlotSubmitted, markSlotValidated, resetSlotToAvailable } from './slotService';
import { incrementValidatedSignalementCount } from './avisService';

interface SubmitProofData {
    slotId: string;
    guideId: string;
    screenshotBuffer: Buffer;
    screenshotMimetype?: string;
    reportLink?: string;
    noteGuide?: string;
}

/**
 * Soumet une preuve pour un slot reserved.
 * Upload screenshot Cloudinary, crée signalement_proofs (status pending),
 * passe le slot en submitted.
 */
export const submitProof = async (data: SubmitProofData): Promise<SignalementProof> => {
    // 1. Vérifs hors transaction (lecture)
    const slotRows: any = await query(
        `SELECT s.*, a.payout_per_signalement_cents
         FROM signalement_slots s
         JOIN signalement_avis a ON a.id = s.avis_id
         WHERE s.id = ?`,
        [data.slotId]
    );
    const slot = slotRows[0];
    if (!slot) throw new Error('Slot introuvable');
    if (slot.reserved_by_guide_id !== data.guideId) {
        throw new Error("Ce slot n'est pas réservé par vous");
    }
    if (slot.status !== 'reserved') {
        throw new Error('Slot pas dans l\'état reserved');
    }
    if (
        slot.reservation_expires_at &&
        new Date(slot.reservation_expires_at) < new Date()
    ) {
        throw new Error('Réservation expirée');
    }

    // 2. Upload Cloudinary (avant transaction pour éviter de tenir une connection)
    const uploaded = await uploadToCloudinary(
        data.screenshotBuffer,
        'signalement-proofs',
        { resourceType: 'image' }
    );

    // 3. Transaction : INSERT proof + UPDATE slot
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const proofId = uuidv4();
        await connection.execute(
            `INSERT INTO signalement_proofs
             (id, slot_id, avis_id, guide_id, screenshot_url, report_link, note_guide,
              earnings_cents)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                proofId,
                data.slotId,
                slot.avis_id,
                data.guideId,
                uploaded.secure_url,
                data.reportLink ?? null,
                data.noteGuide ?? null,
                slot.payout_per_signalement_cents, // snapshot du payout au submit
            ]
        );

        await markSlotSubmitted(data.slotId, connection);

        await connection.commit();

        const created = await getProofById(proofId);
        if (!created) throw new Error('Proof créée mais introuvable');
        return created;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

export const getProofById = async (id: string): Promise<SignalementProof | null> => {
    const rows: any = await query(
        `SELECT * FROM signalement_proofs WHERE id = ? AND deleted_at IS NULL`,
        [id]
    );
    return rows[0] ? rowToProof(rows[0]) : null;
};

/**
 * Liste les preuves pour la queue admin.
 * Si statusFilter est précisé : pending / validated / rejected / all.
 */
export const listPendingProofs = async (
    limit = 50,
    offset = 0,
    statusFilter: 'pending' | 'validated' | 'rejected' | 'all' = 'pending'
): Promise<Array<SignalementProof & {
    google_review_url: string;
    raison: string;
    raison_details: string | null;
    artisan_id: string;
    guide_email: string;
}>> => {
    // Pour les pending : tri du plus ancien (FIFO) ; sinon, plus récemment traité d'abord.
    const where = statusFilter === 'all'
        ? `p.deleted_at IS NULL`
        : `p.status = '${statusFilter}' AND p.deleted_at IS NULL`;
    const orderBy = statusFilter === 'pending'
        ? 'p.submitted_at ASC'
        : 'COALESCE(p.validated_at, p.submitted_at) DESC';

    const rows: any = await query(
        `SELECT p.*, a.google_review_url, a.raison, a.raison_details, a.artisan_id,
                u.email AS guide_email
         FROM signalement_proofs p
         JOIN signalement_avis a ON a.id = p.avis_id
         JOIN users u ON u.id = p.guide_id
         WHERE ${where}
         ORDER BY ${orderBy}
         LIMIT ${Number(limit)} OFFSET ${Number(offset)}`
    );
    return rows.map((r: any) => ({
        ...rowToProof(r),
        google_review_url: r.google_review_url,
        raison: r.raison,
        raison_details: r.raison_details,
        artisan_id: r.artisan_id,
        guide_email: r.guide_email,
    }));
};

/**
 * Liste les preuves d'un guide (historique).
 */
export const listProofsForGuide = async (
    guideId: string,
    limit = 50,
    offset = 0
): Promise<SignalementProof[]> => {
    const rows: any = await query(
        `SELECT * FROM signalement_proofs
         WHERE guide_id = ? AND deleted_at IS NULL
         ORDER BY submitted_at DESC
         LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
        [guideId]
    );
    return rows.map(rowToProof);
};

/**
 * Valide une preuve (admin).
 * - proof.status → validated
 * - slot → validated
 * - avis.nb_signalements_validated +1 (avec transition vers terminated_inconclusive si target atteint)
 * - paiement guide enregistré (la table guide_earnings/payments existe ailleurs ;
 *   on insère via payoutService — voir payoutService.recordSignalementEarning).
 */
export const validateProof = async (
    proofId: string,
    adminId: string
): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Lock la proof
        const [proofRows]: any = await connection.execute(
            `SELECT * FROM signalement_proofs WHERE id = ? AND deleted_at IS NULL FOR UPDATE`,
            [proofId]
        );
        const proof = proofRows[0];
        if (!proof) throw new Error('Preuve introuvable');
        if (proof.status !== 'pending') throw new Error('Preuve déjà traitée');

        // Update proof
        await connection.execute(
            `UPDATE signalement_proofs
             SET status = 'validated', validated_at = NOW(), validated_by = ?
             WHERE id = ?`,
            [adminId, proofId]
        );

        // Update slot
        await markSlotValidated(proof.slot_id, connection);

        // Incrémente compteur avis (+ transition si target atteint)
        await incrementValidatedSignalementCount(proof.avis_id, connection);

        // Enregistre paiement guide
        const { recordSignalementEarning } = await import('./payoutService');
        await recordSignalementEarning(
            {
                guideId: proof.guide_id,
                proofId: proof.id,
                avisId: proof.avis_id,
                amountCents: proof.earnings_cents,
            },
            connection
        );

        await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

/**
 * Rejette une preuve (admin).
 * - proof.status → rejected (gardée pour audit)
 * - slot → redevient available (un autre guide peut le reprendre)
 * - guide non payé
 */
export const rejectProof = async (
    proofId: string,
    adminId: string,
    rejectionReason: string
): Promise<void> => {
    if (!rejectionReason || rejectionReason.trim().length < 3) {
        throw new Error('Raison du rejet requise (min 3 caractères)');
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [proofRows]: any = await connection.execute(
            `SELECT * FROM signalement_proofs WHERE id = ? AND deleted_at IS NULL FOR UPDATE`,
            [proofId]
        );
        const proof = proofRows[0];
        if (!proof) throw new Error('Preuve introuvable');
        if (proof.status !== 'pending') throw new Error('Preuve déjà traitée');

        await connection.execute(
            `UPDATE signalement_proofs
             SET status = 'rejected', validated_at = NOW(),
                 validated_by = ?, rejection_reason = ?
             WHERE id = ?`,
            [adminId, rejectionReason, proofId]
        );

        await resetSlotToAvailable(proof.slot_id, connection);

        await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

function rowToProof(row: any): SignalementProof {
    return {
        id: row.id,
        slot_id: row.slot_id,
        avis_id: row.avis_id,
        guide_id: row.guide_id,
        screenshot_url: row.screenshot_url,
        report_link: row.report_link,
        note_guide: row.note_guide,
        status: row.status,
        rejection_reason: row.rejection_reason,
        earnings_cents: row.earnings_cents,
        submitted_at: row.submitted_at,
        validated_at: row.validated_at,
        validated_by: row.validated_by,
        deleted_at: row.deleted_at,
    };
}
