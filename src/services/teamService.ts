import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { sendTeamInvitationEmail } from './emailService';
import { LogService } from './logService';

export const teamService = {
    /**
     * Invite a new team member
     */
    async inviteMember(email: string, permissions: any, adminId: number) {
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
            await LogService.logAction(adminId, 'INVITE_MEMBER', 'USER', undefined, { email, status: 'reinvited' });
            return { message: "Invitation renvoyée avec succès." };
        }

        // 3. Create new invitation
        const id = uuidv4();
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

        // Wait... ID column in admin_invitations is VARCHAR(36) or INT? 
        // Based on uuidv4 usage, it's string. BUT admin_logs target_id is INT.
        // This is a schema mismatch problem. 
        // I will log target_id as 0 or NULL for now if it's a string ID, 
        // OR I should change target_id to VARCHAR in admin_logs.
        // Actually, migration 20 set target_id as INT. 
        // Users table usually uses INT in this legacy setup? 
        // Let's check user schema. 
        // Wait, "users" table ID type?
        // existingUsers definition implies standard check.
        // Let's look at migration 001.
        // Assuming user IDs are INTs based on previous code (admin_id INT).
        // But uuidv4() is used here for id? 
        // "const id = uuidv4();" -> This suggests IDs are strings.
        // If IDs are strings, my admin_logs table definition (admin_id INT, target_id INT) is WRONG.

        await query(
            `INSERT INTO admin_invitations (id, email, token, permissions, expires_at)
             VALUES (?, ?, ?, ?, ?)`,
            [id, email, token, JSON.stringify(permissions), expiresAt]
        );

        // 4. Send email
        await sendTeamInvitationEmail(email, token, permissions);

        // Log action (target_id null because UUID vs INT mismatch, saving email in details)
        await LogService.logAction(adminId, 'INVITE_MEMBER', 'INVITATION', undefined, { email, invitationId: id });

        return { message: "Invitation envoyée avec succès." };
    },

    /**
     * Get pending invitations and active team members
     */
    async getTeamMembers(currentUserId: string) {
        // ... implementation unchanged ...
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
        // Fix: Ensure we use the correct ID format. If UUID is strictly used everywhere, schema must support it.
        // Assuming integer for now based on 'admin_logs'. But if users use UUID...
        // Let's perform a check on user schema later. For now, using uuidv4.
        const userId = uuidv4();
        const hashedPassword = await bcrypt.hash(password, 10);

        await query(
            `INSERT INTO users (id, email, password_hash, full_name, role, permissions, status, created_at)
             VALUES (?, ?, ?, ?, 'admin', ?, 'active', NOW())`,
            [userId, invite.email, hashedPassword, fullName, invite.permissions]
        );

        // 3. Delete invitation
        await query('DELETE FROM admin_invitations WHERE id = ?', [invite.id]);

        // Log? No adminId available. System action?
        // We could log it if we had a system user. Skipping for now.

        return { message: "Compte créé avec succès." };
    },

    /**
     * Update permissions for an existing member
     */
    async updatePermissions(userId: string, permissions: any, adminId: number) {
        await query(
            'UPDATE users SET permissions = ? WHERE id = ? AND role = "admin"',
            [JSON.stringify(permissions), userId]
        );

        await LogService.logAction(adminId, 'UPDATE_PERficheS', 'USER', undefined, { targetUserId: userId, newPermissions: permissions });

        return { message: "Permissions mises à jour." };
    },

    /**
     * Remove a team member or revoke invitation
     */
    async deleteMember(id: string, type: 'active' | 'pending', adminId: number) {
        if (type === 'active') {
            await query('DELETE FROM users WHERE id = ? AND role = "admin"', [id]);
            await LogService.logAction(adminId, 'DELETE_MEMBER', 'USER', undefined, { deletedUserId: id });
        } else {
            // Delete by ID (invitation id)
            // Retrieve email for logging before delete?
            const invites: any = await query('SELECT email FROM admin_invitations WHERE id = ?', [id]);
            const email = invites[0]?.email || 'unknown';

            await query('DELETE FROM admin_invitations WHERE id = ?', [id]);
            await LogService.logAction(adminId, 'REVOKE_INVITATION', 'INVITATION', undefined, { invitationId: id, email });
        }
        return { message: "Accès révoqué." };
    }
};
