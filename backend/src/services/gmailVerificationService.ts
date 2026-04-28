import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { uploadToCloudinary } from './cloudinaryService';

/**
 * Soumet une nouvelle vérification pour un compte Gmail.
 * Remplace toute vérification pending existante (soft-delete) pour ce gmail.
 */
export const submitVerification = async (
    gmailAccountId: number,
    guideId: string,
    buffer: Buffer,
    _mimetype: string,
    mapsProfileUrl: string
): Promise<any> => {
    // Upload du screenshot sur Cloudinary
    const uploaded = await uploadToCloudinary(buffer, 'gmail-verifications');

    // Soft-delete des vérifications pending existantes pour ce compte Gmail
    const existingPending: any = await query(
        `SELECT id FROM gmail_verifications
         WHERE gmail_account_id = ? AND status = 'pending' AND deleted_at IS NULL`,
        [gmailAccountId]
    );
    for (const row of existingPending) {
        await query(
            `UPDATE gmail_verifications SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
            [row.id]
        );
    }

    const id = uuidv4();
    await query(
        `INSERT INTO gmail_verifications
         (id, gmail_account_id, guide_id, screenshot_url, screenshot_public_id, maps_profile_url, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [id, gmailAccountId, guideId, uploaded.secure_url, uploaded.public_id, mapsProfileUrl]
    );

    return await getLatestForGmail(gmailAccountId);
};

/**
 * Retourne la dernière vérification non-supprimée pour un compte Gmail donné.
 */
export const getLatestForGmail = async (gmailAccountId: number): Promise<any | null> => {
    const rows: any = await query(
        `SELECT * FROM gmail_verifications
         WHERE gmail_account_id = ? AND deleted_at IS NULL
         ORDER BY submitted_at DESC
         LIMIT 1`,
        [gmailAccountId]
    );
    return rows[0] || null;
};

/**
 * Liste les vérifications pour l'admin, avec les infos du guide et du compte Gmail.
 * Filtre optionnel par statut (pending / approved / rejected).
 */
export const listPending = async (status?: string): Promise<any[]> => {
    let sql = `
        SELECT
            gv.id,
            gv.gmail_account_id,
            gv.guide_id,
            gv.screenshot_url,
            gv.maps_profile_url,
            gv.status,
            gv.rejection_reason,
            gv.submitted_at,
            gv.reviewed_at,
            ga.email AS gmail_email,
            u.full_name AS guide_name,
            u.email AS guide_email
        FROM gmail_verifications gv
        JOIN guide_gmail_accounts ga ON gv.gmail_account_id = ga.id
        JOIN users u ON gv.guide_id = u.id
        WHERE gv.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (status) {
        sql += ` AND gv.status = ?`;
        params.push(status);
    }

    sql += ` ORDER BY gv.submitted_at DESC`;
    return await query(sql, params) as any[];
};

/**
 * Approuve une vérification et débloque le compte Gmail associé.
 */
export const approveVerification = async (verificationId: string, adminId: string): Promise<void> => {
    const rows: any = await query(
        `SELECT * FROM gmail_verifications WHERE id = ? AND deleted_at IS NULL`,
        [verificationId]
    );
    const verif = rows[0];
    if (!verif) throw new Error('Vérification introuvable');
    if (verif.status !== 'pending') throw new Error('Vérification déjà traitée');

    await query(
        `UPDATE gmail_verifications
         SET status = 'approved', reviewed_by = ?, reviewed_at = NOW()
         WHERE id = ?`,
        [adminId, verificationId]
    );

    // Débloque le compte Gmail et marque comme vérifié
    await query(
        `UPDATE guide_gmail_accounts
         SET manual_verification_status = 'verified', is_blocked = 0
         WHERE id = ?`,
        [verif.gmail_account_id]
    );
};

/**
 * Rejette une vérification. Le compte Gmail reste bloqué.
 */
export const rejectVerification = async (
    verificationId: string,
    adminId: string,
    reason: string
): Promise<void> => {
    const rows: any = await query(
        `SELECT * FROM gmail_verifications WHERE id = ? AND deleted_at IS NULL`,
        [verificationId]
    );
    const verif = rows[0];
    if (!verif) throw new Error('Vérification introuvable');
    if (verif.status !== 'pending') throw new Error('Vérification déjà traitée');

    await query(
        `UPDATE gmail_verifications
         SET status = 'rejected', rejection_reason = ?, reviewed_by = ?, reviewed_at = NOW()
         WHERE id = ?`,
        [reason || null, adminId, verificationId]
    );
    // Le compte reste bloqué (is_blocked = 1, manual_verification_status = 'pending')
};
