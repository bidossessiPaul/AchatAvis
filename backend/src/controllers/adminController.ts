import { Request, Response } from 'express';
import * as adminService from '../services/adminService';
import { LogService } from '../services/logService';

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
        await LogService.logAction(req.user!.userId, `UPDATE_USER_STATUS`, 'user', userId, { status, reason }, req.ip);
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
 * Unblock a guide suspended for bad links
 * POST /api/admin/guides/:userId/unblock-bad-links
 */
export const unblockBadLinkGuide = async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
        console.log(`[ADMIN] Unblocking bad-link-suspended guide ${userId}`);
        await adminService.unblockBadLinkGuide(userId);
        await LogService.logAction(req.user!.userId, 'UNBLOCK_GUIDE', 'user', userId, {}, req.ip);
        res.json({ message: 'Guide unblocked successfully' });
    } catch (error: any) {
        console.error(`[ADMIN] Unblock guide error for ${userId}:`, error);
        res.status(500).json({
            error: 'Erreur lors du déblocage du guide',
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
        await LogService.logAction(req.user!.userId, 'DELETE_USER', 'user', userId, {}, req.ip);
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
 * Get all submissions for a specific artisan
 * GET /api/admin/artisans/:userId/submissions
 */
export const getArtisanSubmissions = async (req: Request, res: Response) => {
    const { userId } = req.params;
    try {
        const submissions = await adminService.getArtisanSubmissions(userId);
        return res.json(submissions);
    } catch (error) {
        console.error('Get artisan submissions error:', error);
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
    const { status, rejectionReason, allowResubmit, allowAppeal } = req.body;

    try {
        await adminService.updateSubmissionStatus(submissionId, status, rejectionReason, allowResubmit, allowAppeal, req.user!.userId);
        const logAction = status === 'validated' ? 'VALIDATE_SUBMISSION' : 'REJECT_SUBMISSION';
        await LogService.logAction(req.user!.userId, logAction, 'submission', submissionId, { status, rejectionReason }, req.ip);
        res.json({ message: `Submission status updated to ${status}` });
    } catch (error) {
        console.error('Update submission status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * List rejected submissions with filters (dedicated admin page)
 * GET /api/admin/rejected-submissions
 */
export const listRejectedSubmissions = async (req: Request, res: Response) => {
    try {
        const result = await adminService.getRejectedSubmissions({
            orderId: req.query.orderId as string | undefined,
            artisanId: req.query.artisanId as string | undefined,
            guideId: req.query.guideId as string | undefined,
            reasonSearch: req.query.q as string | undefined,
            page: Number(req.query.page) || 1,
            limit: Number(req.query.limit) || 20,
        });
        res.json(result);
    } catch (error) {
        console.error('listRejectedSubmissions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Bulk-revalidate rejected submissions
 * POST /api/admin/submissions/bulk-revalidate
 * Body: { ids: string[] } OR { all: true, q?: string, orderId?, artisanId?, guideId? }
 */
export const bulkRevalidateSubmissions = async (req: Request, res: Response) => {
    try {
        const { ids, all, q, orderId, artisanId, guideId } = req.body as {
            ids?: string[];
            all?: boolean;
            q?: string;
            orderId?: string;
            artisanId?: string;
            guideId?: string;
        };

        let targetIds: string[];
        if (all === true) {
            targetIds = await adminService.getRejectedSubmissionIds({
                orderId,
                artisanId,
                guideId,
                reasonSearch: q,
            });
        } else if (Array.isArray(ids) && ids.length > 0) {
            targetIds = ids;
        } else {
            res.status(400).json({ error: 'Provide ids[] or all=true' });
            return;
        }

        if (targetIds.length === 0) {
            res.json({ success: 0, failed: 0, errors: [] });
            return;
        }
        if (targetIds.length > 500) {
            res.status(400).json({
                error: 'Too many submissions in a single batch (max 500)',
                count: targetIds.length,
            });
            return;
        }

        const result = await adminService.bulkRevalidateSubmissions(targetIds);
        await LogService.logAction(req.user!.userId, 'BULK_REVALIDATE', 'submission', undefined, { count: targetIds.length }, req.ip);
        res.json(result);
    } catch (error) {
        console.error('bulkRevalidateSubmissions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Bulk reset rejected submissions to pending
 * POST /api/admin/submissions/bulk-reset-pending
 */
export const bulkResetToPending = async (req: Request, res: Response) => {
    try {
        const { ids } = req.body as { ids?: string[] };

        if (!Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({ error: 'Provide ids[]' });
            return;
        }
        if (ids.length > 500) {
            res.status(400).json({ error: 'Too many submissions in a single batch (max 500)', count: ids.length });
            return;
        }

        const result = await adminService.bulkResetToPending(ids);
        res.json(result);
    } catch (error) {
        console.error('bulkResetToPending error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Recycle rejected submissions: delete submission + free slot for new guide
 * POST /api/admin/submissions/recycle
 */
export const recycleRejectedSubmissions = async (req: Request, res: Response) => {
    try {
        const { ids } = req.body as { ids?: string[] };

        if (!Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({ error: 'Provide ids[]' });
            return;
        }
        if (ids.length > 500) {
            res.status(400).json({ error: 'Too many submissions in a single batch (max 500)', count: ids.length });
            return;
        }

        const result = await adminService.recycleRejectedSubmissions(ids);
        await LogService.logAction(req.user!.userId, 'RECYCLE_SUBMISSIONS', 'submission', undefined, { count: ids.length }, req.ip);
        res.json(result);
    } catch (error) {
        console.error('recycleRejectedSubmissions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Force-relist a fiche (set back to in_progress)
 * POST /api/admin/orders/:id/force-relist
 */
export const forceRelistOrder = async (req: Request, res: Response) => {
    try {
        await adminService.forceRelistOrder(req.params.id);
        res.json({ message: 'Fiche remise en ligne' });
    } catch (error) {
        console.error('forceRelistOrder error:', error);
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
 * Get standardized reasons for warnings and suspensions
 * GET /api/admin/suspension-reasons
 */
export const getSuspensionReasons = async (_req: Request, res: Response) => {
    console.log('--- HIT getSuspensionReasons ---');
    return res.json({
        warnings: [],
        suspensions: []
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
/**
 * Get all reviews 360 view
 * GET /api/admin/reviews/360
 */
export const getReview360 = async (_req: Request, res: Response) => {
    try {
        const data = await adminService.getReview360Data();
        res.json(data);
    } catch (error) {
        console.error('Get review 360 error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Update a review proposal
 * PUT /api/admin/proposals/:proposalId
 */
export const updateProposal = async (req: Request, res: Response) => {
    const { proposalId } = req.params;
    const { content } = req.body;

    try {
        await adminService.updateProposal(proposalId, { content });
        res.json({ message: 'Proposal updated successfully' });
    } catch (error: any) {
        console.error('Update proposal error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

/**
 * Regenerate a proposal's content using AI
 * POST /api/admin/proposals/:proposalId/regenerate
 */
export const regenerateProposal = async (req: Request, res: Response) => {
    const { proposalId } = req.params;

    try {
        const result = await adminService.regenerateProposal(proposalId);
        await LogService.logAction(req.user!.userId, 'REGENERATE_PROPOSAL', 'proposal', proposalId, {}, req.ip);
        res.json(result);
    } catch (error: any) {
        console.error('Regenerate proposal error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

/**
 * Get all level verification requests
 * GET /api/admin/level-verifications
 */
export const getLevelVerifications = async (_req: Request, res: Response) => {
    try {
        const verifications = await adminService.getLevelVerifications();
        res.json(verifications);
    } catch (error) {
        console.error('Get level verifications error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Review a level verification request (approve/reject)
 * PATCH /api/admin/level-verifications/:verificationId
 */
export const reviewLevelVerification = async (req: Request, res: Response) => {
    const { verificationId } = req.params;
    const { status, admin_notes } = req.body;
    const adminId = req.user?.userId;

    try {
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Statut invalide' });
        }
        const result = await adminService.reviewLevelVerification(
            parseInt(verificationId), status, admin_notes, adminId!
        );
        const lvlAction = status === 'approved' ? 'APPROVE_LEVEL' : 'REJECT_LEVEL';
        await LogService.logAction(adminId!, lvlAction, 'level_verification', verificationId, { status, admin_notes }, req.ip);
        return res.json(result);
    } catch (error: any) {
        console.error('Review level verification error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

/**
 * Send review validation email to artisan
 * POST /api/admin/fiches/:orderId/send-validation
 */
export const sendReviewValidationEmail = async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ error: 'At least one email is required' });
    }

    try {
        const fiche = await adminService.getAdminficheDetail(orderId);
        if (!fiche) {
            return res.status(404).json({ error: 'fiche not found' });
        }

        const { sendReviewValidationEmail: sendEmail } = await import('../services/emailService');
        await sendEmail(emails, fiche, fiche.proposals);

        return res.json({ message: 'Validation email sent successfully' });
    } catch (error: any) {
        console.error('Send validation email error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

/**
 * Get all guides with their calculated balance (at least 1 validated review)
 * GET /api/admin/guides-balances
 */
export const getGuidesWithBalance = async (_req: Request, res: Response) => {
    try {
        const guides = await adminService.getGuidesWithBalance();
        res.json(guides);
    } catch (error) {
        console.error('Get guides balances error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Force pay a guide (encouragement payment, bypasses minimum)
 * POST /api/admin/force-pay-guide
 */
export const forcePayGuide = async (req: Request, res: Response) => {
    const { guideId, amount, adminNote } = req.body;

    if (!guideId || !amount || amount <= 0) {
        return res.status(400).json({ error: 'guideId et amount (> 0) sont requis' });
    }

    try {
        const result = await adminService.forcePayGuide(guideId, amount, adminNote);
        return res.json(result);
    } catch (error: any) {
        console.error('Force pay guide error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

export const getGmailAccounts = async (_req: Request, res: Response) => {
    try {
        const accounts = await adminService.getAllGmailAccounts();
        res.json(accounts);
    } catch (error) {
        console.error('Get gmail accounts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Impersonate a user (login as them)
 * POST /api/admin/impersonate/:userId
 */
export const impersonateUser = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const adminId = req.user?.userId;

    try {
        console.log(`[ADMIN] Impersonate request: admin ${adminId} → user ${userId}`);
        const result = await adminService.impersonateUser(adminId!, userId);
        res.json(result);
    } catch (error: any) {
        console.error('Impersonate user error:', error);
        res.status(error.message === 'Utilisateur non trouvé' ? 404 : 500).json({
            error: error.message || 'Internal server error'
        });
    }
};

export const toggleGmailBlock = async (req: Request, res: Response) => {
    const { accountId } = req.params;
    const { block, reason } = req.body;

    if (typeof block !== 'boolean') {
        return res.status(400).json({ error: 'Le champ "block" (boolean) est requis' });
    }

    if (block && !reason) {
        return res.status(400).json({ error: 'La raison du blocage est requise' });
    }

    try {
        const result = await adminService.toggleGmailAccountBlock(parseInt(accountId), block, reason);
        return res.json(result);
    } catch (error: any) {
        console.error('Toggle gmail block error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
