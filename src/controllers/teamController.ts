import { Request, Response } from 'express';
import { teamService } from '../services/teamService';

export const teamController = {
    inviteMember: async (req: Request, res: Response) => {
        try {
            // @ts-ignore
            const adminId = Number(req.user.userId);
            const { email, permissions } = req.body;
            if (!email) {
                return res.status(400).json({ error: "Email requis" });
            }
            const result = await teamService.inviteMember(email, permissions || {}, adminId);
            return res.json(result);
        } catch (error: any) {
            console.error('Invite Member Error:', error);
            return res.status(500).json({ error: error.message });
        }
    },

    getTeamMembers: async (req: Request, res: Response) => {
        try {
            // @ts-ignore - userId added by auth middleware
            const currentUserId = req.user.userId;
            const members = await teamService.getTeamMembers(currentUserId);
            return res.json(members);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    },

    acceptInvite: async (req: Request, res: Response) => {
        try {
            const { token, password, fullName } = req.body;
            if (!token || !password || !fullName) {
                return res.status(400).json({ error: "Tous les champs sont requis" });
            }
            const result = await teamService.acceptInvite(token, password, fullName);
            return res.json(result);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    },

    updatePermissions: async (req: Request, res: Response) => {
        try {
            // @ts-ignore
            // @ts-ignore
            const adminId = Number(req.user.userId);
            const { userId } = req.params;
            const { permissions } = req.body;
            const result = await teamService.updatePermissions(userId, permissions, adminId);
            return res.json(result);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    },

    deleteMember: async (req: Request, res: Response) => {
        try {
            // @ts-ignore
            // @ts-ignore
            const adminId = Number(req.user.userId);
            const { id } = req.params;
            const { type } = req.query; // 'active' or 'pending'
            if (!type || (type !== 'active' && type !== 'pending')) {
                return res.status(400).json({ error: "Type invalide" });
            }
            const result = await teamService.deleteMember(id, type as 'active' | 'pending', adminId);
            return res.json(result);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
};
