import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
// @ts-ignore
import bcrypt from 'bcryptjs';
import { sendTeamInvitationEmail } from './emailService';

export const teamService = {
    /**
     * Invite a new team member
     */
    async inviteMember(email: string, permissions: any) {
        // 1. Check if user already exists
        const existingUsers: any = await query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            throw new Error("Cet email est déjà utilisé par un compte existant.");
        }

        // 2. Check if invitation already exists
        const existingInvites: any = await query('SELECT id FROM admin_invitations WHERE email = ?', [email]);
        if (existingInvites.length > 0) {
            // Update existing invite
            const token = uuidv4();
            const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

            await query(
                `UPDATE admin_invitations 
                 SET token = ?, permissions = ?, expires_at = ? 
                 WHERE email = ?`,
                [token, JSON.stringify(permissions), expiresAt, email]
            );

            await sendTeamInvitationEmail(email, token, permissions);
            return { message: "Invitation renvoyée avec succès." };
        }

        // 3. Create new invitation
        const id = uuidv4();
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

        await query(
            `INSERT INTO admin_invitations (id, email, token, permissions, expires_at)
             VALUES (?, ?, ?, ?, ?)`,
            [id, email, token, JSON.stringify(permissions), expiresAt]
        );

        // 4. Send email
        await sendTeamInvitationEmail(email, token, permissions);

        return { message: "Invitation envoyée avec succès." };
    },

    /**
     * Get pending invitations and active team members
     */
    async getTeamMembers(currentUserId: string) {
        // Get active admins (excluding self)
        const members: any = await query(`
            SELECT id, full_name, email, role, permissions, created_at, 'active' as status
            FROM users 
            WHERE role = 'admin' AND id != ?
        `, [currentUserId]);

        // Get pending invitations
        const invitations: any = await query(`
            SELECT id, email, permissions, created_at, 'pending' as status, expires_at
            FROM admin_invitations
            ORDER BY created_at DESC
        `);

        // Parse permissions JSON for both
        const parsedMembers = members.map((m: any) => ({
            ...m,
            permissions: typeof m.permissions === 'string' ? JSON.parse(m.permissions) : m.permissions
        }));

        const parsedInvites = invitations.map((i: any) => ({
            ...i,
            permissions: typeof i.permissions === 'string' ? JSON.parse(i.permissions) : i.permissions,
            full_name: 'En attente...'
        }));

        return [...parsedMembers, ...parsedInvites];
    },

    /**
     * Accept an invitation
     */
    async acceptInvite(token: string, password: string, fullName: string) {
        // 1. Find valid invitation
        const invites: any = await query(
            'SELECT * FROM admin_invitations WHERE token = ? AND expires_at > NOW()',
            [token]
        );

        if (invites.length === 0) {
            throw new Error("Invitation invalide ou expirée.");
        }

        const invite = invites[0];

        // 2. Create User
        const userId = uuidv4();
        const hashedPassword = await bcrypt.hash(password, 10);

        // Transaction manually to ensure atomicity
        // (Simplified here as we don't have explicit transaction wrapper in this simplified service, 
        // but sequential execution is usually fine for this low-concurrency op)

        await query(
            `INSERT INTO users (id, email, password_hash, full_name, role, permissions, status, created_at)
             VALUES (?, ?, ?, ?, 'admin', ?, 'active', NOW())`,
            [userId, invite.email, hashedPassword, fullName, invite.permissions] // permissions is already JSON string in DB, but query wrapper might need string
        );

        // 3. Delete invitation
        await query('DELETE FROM admin_invitations WHERE id = ?', [invite.id]);

        return { message: "Compte créé avec succès." };
    },

    /**
     * Update permissions for an existing member
     */
    async updatePermissions(userId: string, permissions: any) {
        await query(
            'UPDATE users SET permissions = ? WHERE id = ? AND role = "admin"',
            [JSON.stringify(permissions), userId]
        );
        return { message: "Permissions mises à jour." };
    },

    /**
     * Remove a team member or revoke invitation
     */
    async deleteMember(id: string, type: 'active' | 'pending') {
        if (type === 'active') {
            await query('DELETE FROM users WHERE id = ? AND role = "admin"', [id]);
        } else {
            // Delete by ID (invitation id)
            await query('DELETE FROM admin_invitations WHERE id = ?', [id]);
        }
        return { message: "Accès révoqué." };
    }
};
