import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { uploadToCloudinary, deleteFromCloudinary } from './cloudinaryService';
import { invalidateAuthCache } from '../middleware/auth';

export interface IdentityVerification {
    id: string;
    user_id: string;
    document_url: string;
    document_public_id: string | null;
    status: 'pending' | 'approved' | 'rejected';
    submitted_at: string;
    reviewed_by: string | null;
    reviewed_at: string | null;
    rejection_reason: string | null;
}

/**
 * Get the most recent verification for a user (any status).
 */
export const getLatestForUser = async (userId: string): Promise<IdentityVerification | null> => {
    const rows: any = await query(
        `SELECT * FROM identity_verifications
         WHERE user_id = ?
         ORDER BY submitted_at DESC
         LIMIT 1`,
        [userId]
    );
    return rows[0] || null;
};

/**
 * Submit a new identity document. Replaces any previous PENDING verification
 * for this user (keeps historical approved/rejected records).
 */
export const submitVerification = async (
    userId: string,
    buffer: Buffer,
    mimetype?: string
): Promise<IdentityVerification> => {
    // Verify the user is currently suspended for identity verification
    const userRows: any = await query(
        `SELECT status, suspension_reason FROM users WHERE id = ?`,
        [userId]
    );
    const user = userRows[0];
    if (!user) throw new Error('User not found');
    if (user.suspension_reason !== 'identity_verification_required') {
        throw new Error('No identity verification required for this account');
    }

    // Upload document to Cloudinary.
    // PDFs are stored as resource_type='raw' (no image transform).
    // Images use the default flow.
    const isPdf = mimetype === 'application/pdf';
    const uploaded = await uploadToCloudinary(
        buffer,
        'identity-documents',
        isPdf ? { resourceType: 'raw', skipTransform: true } : undefined
    );

    // Replace any existing pending verification
    const existingPending: any = await query(
        `SELECT id, document_public_id FROM identity_verifications
         WHERE user_id = ? AND status = 'pending'`,
        [userId]
    );
    for (const row of existingPending) {
        if (row.document_public_id) {
            deleteFromCloudinary(row.document_public_id).catch(() => { /* silent */ });
        }
        await query(`DELETE FROM identity_verifications WHERE id = ?`, [row.id]);
    }

    const id = uuidv4();
    await query(
        `INSERT INTO identity_verifications
         (id, user_id, document_url, document_public_id, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [id, userId, uploaded.secure_url, uploaded.public_id]
    );

    return (await getLatestForUser(userId))!;
};

/**
 * Admin: list all verifications (optionally filtered by status).
 */
export const listVerifications = async (status?: string) => {
    let sql = `
        SELECT iv.*,
               u.email, u.full_name, u.avatar_url, u.role, u.created_at as user_created_at,
               u.detected_city, u.detected_country, u.detected_country_code, u.detected_is_vpn,
               gp.google_email, gp.city as declared_city, gp.phone,
               admin_u.full_name as reviewed_by_name
        FROM identity_verifications iv
        JOIN users u ON iv.user_id = u.id
        LEFT JOIN guides_profiles gp ON u.id = gp.user_id AND u.role = 'guide'
        LEFT JOIN users admin_u ON iv.reviewed_by = admin_u.id
    `;
    const params: any[] = [];
    if (status) {
        sql += ` WHERE iv.status = ?`;
        params.push(status);
    }
    sql += ` ORDER BY iv.submitted_at DESC`;
    return await query(sql, params);
};

/**
 * Admin: approve a verification — reactivates the user's account.
 */
export const approveVerification = async (verificationId: string, adminId: string) => {
    const rows: any = await query(
        `SELECT * FROM identity_verifications WHERE id = ?`,
        [verificationId]
    );
    const verif = rows[0];
    if (!verif) throw new Error('Verification not found');
    if (verif.status !== 'pending') throw new Error('Verification already processed');

    await query(
        `UPDATE identity_verifications
         SET status = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [adminId, verificationId]
    );

    // Reactivate user account
    await query(
        `UPDATE users
         SET status = 'active', suspension_reason = NULL
         WHERE id = ?`,
        [verif.user_id]
    );

    invalidateAuthCache(verif.user_id);

    return { user_id: verif.user_id };
};

/**
 * Admin: re-open a previously rejected verification so the guide can submit
 * a new document. Keeps the old rejected record as history (its
 * rejection_reason stays visible to the guide on the upload page).
 */
export const relaunchVerification = async (verificationId: string) => {
    const rows: any = await query(
        `SELECT * FROM identity_verifications WHERE id = ?`,
        [verificationId]
    );
    const verif = rows[0];
    if (!verif) throw new Error('Verification not found');
    if (verif.status !== 'rejected') {
        throw new Error('Seules les vérifications refusées peuvent être relancées');
    }

    // Reset user to identity-verification-required so they can log in and re-upload
    await query(
        `UPDATE users
         SET status = 'suspended', suspension_reason = 'identity_verification_required'
         WHERE id = ?`,
        [verif.user_id]
    );

    invalidateAuthCache(verif.user_id);

    return { user_id: verif.user_id };
};

/**
 * Admin: reject a verification — permanently blocks the user.
 */
export const rejectVerification = async (
    verificationId: string,
    adminId: string,
    reason: string
) => {
    const rows: any = await query(
        `SELECT * FROM identity_verifications WHERE id = ?`,
        [verificationId]
    );
    const verif = rows[0];
    if (!verif) throw new Error('Verification not found');
    if (verif.status !== 'pending') throw new Error('Verification already processed');

    await query(
        `UPDATE identity_verifications
         SET status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = ?
         WHERE id = ?`,
        [adminId, reason || null, verificationId]
    );

    // Permanent block: keep suspended but change reason so they can't re-upload
    await query(
        `UPDATE users
         SET status = 'suspended', suspension_reason = 'identity_rejected'
         WHERE id = ?`,
        [verif.user_id]
    );

    invalidateAuthCache(verif.user_id);

    return { user_id: verif.user_id };
};
