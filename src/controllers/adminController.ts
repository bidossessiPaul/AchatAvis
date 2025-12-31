import { Request, Response } from 'express';
import * as adminService from '../services/adminService';

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
    const { status } = req.body;

    try {
        await adminService.updateUserStatus(userId, status);
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
