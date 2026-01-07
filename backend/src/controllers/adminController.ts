import { Request, Response } from 'express';
import * as adminService from '../services/adminService';
import { WARNING_REASONS, SUSPENSION_REASONS } from '../constants/suspensionReasons';

/**
 * Get all artisans
 * GET /api/admin/artisans
 */
export const getArtisans = async (_req: Request, res: Response) => {
    try {
        const artisans = await adminService.getArtisans();
        res.json(artisans);
    } catch (error) {
        console.error('Get admin artisans error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get all guides
 * GET /api/admin/guides
 */
export const getGuides = async (_req: Request, res: Response) => {
    try {
        const guides = await adminService.getGuides();
        res.json(guides);
    } catch (error) {
        console.error('Get admin guides error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Update user status
 * PATCH /api/admin/users/:userId/status
 */
export const updateUserStatus = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { status, reason } = req.body;

    try {
        await adminService.updateUserStatus(userId, status, reason);
        res.json({ message: `User status updated to ${status}` });
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Delete user
 * DELETE /api/admin/users/:userId
 */
export const deleteUser = async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
        await adminService.deleteUser(userId);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get all users (simplified)
 * GET /api/admin/users
 */
export const getUsers = async (_req: Request, res: Response) => {
    try {
        const users = await adminService.getAllUsers();
        res.json(users);
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get detailed artisan info
 * GET /api/admin/artisans/:userId
 */
export const getArtisanDetail = async (req: Request, res: Response) => {
    const { userId } = req.params;
    try {
        const result = await adminService.getArtisanDetail(userId);
        res.json(result);
    } catch (error) {
        console.error('Get artisan detail error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get detailed guide info
 * GET /api/admin/guides/:userId
 */
export const getGuideDetail = async (req: Request, res: Response) => {
    const { userId } = req.params;
    try {
        const result = await adminService.getGuideDetail(userId);
        res.json(result);
    } catch (error) {
        console.error('Get guide detail error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get global stats for dashboard
 * GET /api/admin/stats
 */
export const getGlobalStats = async (_req: Request, res: Response) => {
    try {
        const stats = await adminService.getGlobalStats();
        res.json(stats);
    } catch (error) {
        console.error('Get global stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get all review submissions
 * GET /api/admin/submissions
 */
export const getAllSubmissions = async (_req: Request, res: Response) => {
    try {
        const submissions = await adminService.getAllSubmissions();
        res.json(submissions);
    } catch (error) {
        console.error('Get all submissions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Update submission status
 * PATCH /api/admin/submissions/:submissionId/status
 */
export const updateSubmissionStatus = async (req: Request, res: Response) => {
    const { submissionId } = req.params;
    const { status, rejectionReason } = req.body;

    try {
        await adminService.updateSubmissionStatus(submissionId, status, rejectionReason);
        res.json({ message: `Submission status updated to ${status}` });
    } catch (error) {
        console.error('Update submission status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get all subscriptions
 * GET /api/admin/subscriptions
 */
export const getAllSubscriptions = async (_req: Request, res: Response) => {
    try {
        const subscriptions = await adminService.getAllSubscriptions();
        res.json(subscriptions);
    } catch (error) {
        console.error('Get all subscriptions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get subscription stats
 * GET /api/admin/subscriptions/stats
 */
export const getSubscriptionStats = async (_req: Request, res: Response) => {
    try {
        const stats = await adminService.getSubscriptionStats();
        res.json(stats);
    } catch (error) {
        console.error('Get subscription stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get all packs
 * GET /api/admin/packs
 */
export const getPacks = async (_req: Request, res: Response) => {
    try {
        const packs = await adminService.getPacks();
        res.json(packs);
    } catch (error) {
        console.error('Get packs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Create a pack
 * POST /api/admin/packs
 */
export const createPack = async (req: Request, res: Response) => {
    try {
        await adminService.createPack(req.body);
        res.status(201).json({ message: 'Pack created successfully' });
    } catch (error) {
        console.error('Create pack error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Update a pack
 * PUT /api/admin/packs/:id
 */
export const updatePack = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await adminService.updatePack(id, req.body);
        res.json({ message: 'Pack updated successfully' });
    } catch (error) {
        console.error('Update pack error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Delete a pack
 * DELETE /api/admin/packs/:id
 */
export const deletePack = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await adminService.deletePack(id);
        res.json({ message: 'Pack deleted successfully' });
    } catch (error) {
        console.error('Delete pack error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get missions pending approval
 * GET /api/admin/missions/pending
 */
export const getPendingMissions = async (_req: Request, res: Response) => {
    try {
        const missions = await adminService.getPendingMissions();
        res.json(missions);
    } catch (error) {
        console.error('Get pending missions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Approve a mission
 * POST /api/admin/missions/:orderId/approve
 */
export const approveMission = async (req: Request, res: Response) => {
    const { orderId } = req.params;
    try {
        await adminService.approveMission(orderId);
        res.json({ message: 'Mission approved successfully' });
    } catch (error) {
        console.error('Approve mission error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
/**
 * Get all missions
 * GET /api/admin/missions
 */
export const getMissions = async (_req: Request, res: Response) => {
    try {
        const missions = await adminService.getAllMissions();
        return res.json(missions);
    } catch (error) {
        console.error('Get missions error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get single mission detail for admin
 * GET /api/admin/missions/:orderId
 */
export const getAdminMissionDetail = async (req: Request, res: Response) => {
    const { orderId } = req.params;
    try {
        const mission = await adminService.getAdminMissionDetail(orderId);
        if (!mission) {
            return res.status(404).json({ error: 'Mission not found' });
        }
        return res.json(mission);
    } catch (error) {
        console.error('Get mission detail error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Update mission (Admin CRUD)
 * PUT /api/admin/missions/:orderId
 */
export const updateMission = async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const updateData = req.body;
    try {
        await adminService.updateMission(orderId, updateData);
        return res.json({ message: 'Mission updated successfully' });
    } catch (error) {
        console.error('Update mission error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Delete mission (Admin CRUD)
 * DELETE /api/admin/missions/:orderId
 */
export const deleteMission = async (req: Request, res: Response) => {
    const { orderId } = req.params;
    try {
        await adminService.deleteMission(orderId);
        return res.json({ message: 'Mission deleted successfully' });
    } catch (error) {
        console.error('Delete mission error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Issue a formal warning to a user
 * POST /api/admin/users/:userId/warning
 */
export const issueWarning = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { reason, warningCount } = req.body;

    if (!reason) {
        return res.status(400).json({ error: 'Reason is required' });
    }

    try {
        const { suspensionService } = await import('../services/suspensionService');
        const result = await suspensionService.issueManualWarning(userId, reason, warningCount);
        return res.json({
            message: 'Warning issued successfully',
            warningCount: result.warningCount,
            suspended: result.suspended
        });
    } catch (error: any) {
        console.error('Issue warning error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

/**
 * Get standardized reasons for warnings and suspensions
 * GET /api/admin/suspension-reasons
 */
export const getSuspensionReasons = async (_req: Request, res: Response) => {
    console.log('--- HIT getSuspensionReasons ---');
    return res.json({
        warnings: WARNING_REASONS,
        suspensions: SUSPENSION_REASONS
    });
};
