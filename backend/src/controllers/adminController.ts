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
        console.log(`[ADMIN] Attempting to update status for user ${userId} to ${status}`);
        await adminService.updateUserStatus(userId, status, reason);
        res.json({ message: `User status updated to ${status}` });
    } catch (error: any) {
        console.error(`[ADMIN] Update user status error for ${userId}:`, error);
        res.status(500).json({
            error: 'Erreur lors de la mise à jour du statut',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Delete user
 * DELETE /api/admin/users/:userId
 */
export const deleteUser = async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
        console.log(`[ADMIN] Request to delete user ${userId}`);
        await adminService.deleteUser(userId);
        res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
        console.error(`[ADMIN] Delete user error for ${userId}:`, error);
        res.status(500).json({
            error: 'Erreur lors de la suppression du compte',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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
        if (!result) {
            return res.status(404).json({ error: 'Artisan non trouvé' });
        }
        return res.json(result);
    } catch (error) {
        console.error('Get artisan detail error:', error);
        return res.status(500).json({ error: 'Internal server error' });
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
        if (!result) {
            return res.status(404).json({ error: 'Guide non trouvé' });
        }
        return res.json(result);
    } catch (error) {
        console.error('Get guide detail error:', error);
        return res.status(500).json({ error: 'Internal server error' });
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
 * Cancel a payment
 * POST /api/admin/payments/:paymentId/cancel
 */
export const cancelPayment = async (req: Request, res: Response) => {
    const { paymentId } = req.params;

    try {
        const result = await adminService.cancelPayment(paymentId);
        res.json(result);
    } catch (error: any) {
        console.error('Cancel payment error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

/**
 * Block a payment
 * POST /api/admin/payments/:paymentId/block
 */
export const blockPayment = async (req: Request, res: Response) => {
    const { paymentId } = req.params;

    try {
        const result = await adminService.blockPayment(paymentId);
        res.json(result);
    } catch (error: any) {
        console.error('Block payment error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

/**
 * Delete a payment (mark as deleted)
 * DELETE /api/admin/payments/:paymentId/status
 */
export const deletePaymentStatus = async (req: Request, res: Response) => {
    const { paymentId } = req.params;

    try {
        const result = await adminService.deletePaymentStatus(paymentId);
        res.json(result);
    } catch (error: any) {
        console.error('Delete payment status error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

/**
 * Reactivate a payment
 * POST /api/admin/payments/:paymentId/reactivate
 */
export const reactivatePayment = async (req: Request, res: Response) => {
    const { paymentId } = req.params;

    try {
        const result = await adminService.reactivatePayment(paymentId);
        res.json(result);
    } catch (error: any) {
        console.error('Reactivate payment error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
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
 * Get fiches pending approval
 * GET /api/admin/fiches/pending
 */
export const getPendingfiches = async (_req: Request, res: Response) => {
    try {
        const fiches = await adminService.getPendingfiches();
        res.json(fiches);
    } catch (error) {
        console.error('Get pending fiches error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Approve a fiche
 * POST /api/admin/fiches/:orderId/approve
 */
export const approvefiche = async (req: Request, res: Response) => {
    const { orderId } = req.params;
    try {
        const origin = req.get('origin') || req.get('referer');
        const baseUrl = origin ? new URL(origin).origin : undefined;
        await adminService.approvefiche(orderId, baseUrl);
        res.json({ message: 'fiche approved successfully' });
    } catch (error) {
        console.error('Approve fiche error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
/**
 * Get all fiches
 * GET /api/admin/fiches
 */
export const getfiches = async (_req: Request, res: Response) => {
    try {
        const fiches = await adminService.getAllfiches();
        return res.json(fiches);
    } catch (error) {
        console.error('Get fiches error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get single fiche detail for admin
 * GET /api/admin/fiches/:orderId
 */
export const getAdminficheDetail = async (req: Request, res: Response) => {
    const { orderId } = req.params;
    try {
        const fiche = await adminService.getAdminficheDetail(orderId);
        if (!fiche) {
            return res.status(404).json({ error: 'fiche not found' });
        }
        return res.json(fiche);
    } catch (error) {
        console.error('Get fiche detail error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Update fiche (Admin CRUD)
 * PUT /api/admin/fiches/:orderId
 */
export const updatefiche = async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const updateData = req.body;
    try {
        await adminService.updatefiche(orderId, updateData);
        return res.json({ message: 'fiche updated successfully' });
    } catch (error) {
        console.error('Update fiche error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Delete fiche (Admin CRUD)
 * DELETE /api/admin/fiches/:orderId
 */
export const deletefiche = async (req: Request, res: Response) => {
    const { orderId } = req.params;
    try {
        await adminService.deletefiche(orderId);
        return res.json({ message: 'fiche deleted successfully' });
    } catch (error) {
        console.error('Delete fiche error:', error);
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

/**
 * Manually activate a pack for an artisan
 * POST /api/admin/artisans/:userId/activate-pack
 */
export const activateArtisanPack = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { packId } = req.body;

    if (!packId) {
        return res.status(400).json({ error: 'Pack ID is required' });
    }

    try {
        const origin = req.get('origin') || req.get('referer');
        const baseUrl = origin ? new URL(origin).origin : undefined;
        const result = await adminService.activateArtisanPack(userId, packId, baseUrl);
        return res.json(result);
    } catch (error: any) {
        console.error('Activate artisan pack error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

/**
 * Create a new artisan from admin panel
 * POST /api/admin/artisans/create
 */
export const createArtisan = async (req: Request, res: Response) => {
    try {
        const origin = req.get('origin') || req.get('referer');
        const baseUrl = origin ? new URL(origin).origin : undefined;
        const result = await adminService.createArtisan({
            ...req.body,
            baseUrl
        });
        return res.status(201).json(result);
    } catch (error: any) {
        console.error('Create artisan error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

/**
 * Create a new guide from admin panel
 * POST /api/admin/guides/create
 */
export const createGuide = async (req: Request, res: Response) => {
    try {
        const origin = req.get('origin') || req.get('referer');
        const baseUrl = origin ? new URL(origin).origin : undefined;
        const result = await adminService.createGuide({
            ...req.body,
            baseUrl
        });
        return res.status(201).json(result);
    } catch (error: any) {
        console.error('Create guide error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

/**
 * Update artisan profile
 */
export const updateArtisan = async (req: Request, res: Response) => {
    const { userId } = req.params;
    try {
        const result = await adminService.updateArtisanProfile(userId, req.body);
        return res.json(result);
    } catch (error: any) {
        console.error('Update artisan error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

/**
 * Update guide profile
 */
export const updateGuide = async (req: Request, res: Response) => {
    const { userId } = req.params;
    try {
        const result = await adminService.updateGuideProfile(userId, req.body);
        return res.json(result);
    } catch (error: any) {
        console.error('Update guide error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

/**
 * Get all sectors
 * GET /api/admin/sectors
 */
export const getAllSectors = async (_req: Request, res: Response) => {
    try {
        const sectors = await adminService.getSectors();
        res.json(sectors);
    } catch (error) {
        console.error('Get admin sectors error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Create a sector
 * POST /api/admin/sectors
 */
export const createSector = async (req: Request, res: Response) => {
    try {
        await adminService.createSector(req.body);
        res.status(201).json({ message: 'Sector created successfully' });
    } catch (error: any) {
        console.error('Create sector error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

/**
 * Update a sector
 * PUT /api/admin/sectors/:slug
 */
export const updateSector = async (req: Request, res: Response) => {
    const { slug } = req.params;
    try {
        await adminService.updateSector(slug, req.body);
        res.json({ message: 'Sector updated successfully' });
    } catch (error: any) {
        console.error('Update sector error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

/**
 * Delete a sector
 * DELETE /api/admin/sectors/:slug
 */
export const deleteSector = async (req: Request, res: Response) => {
    const { slug } = req.params;
    try {
        await adminService.deleteSector(slug);
        res.json({ message: 'Sector deleted successfully' });
    } catch (error: any) {
        console.error('Delete sector error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
