import express from 'express';
import * as adminController from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/auth';

import { LogService } from '../services/logService';

const router = express.Router();

// Middleware to ensure admin access
router.use(authenticate, authorize('admin'));

// Audit Logs (owner-only: dossoumaxime888@gmail.com)
router.get('/logs', (req, res, next): void => {
    if (req.user?.email !== 'dossoumaxime888@gmail.com') {
        res.status(403).json({ error: 'Accès réservé' });
        return;
    }
    next();
}, async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = 50;
        const offset = (page - 1) * limit;
        const action = req.query.action as string | undefined;
        const adminId = req.query.adminId as string | undefined;

        const result = await LogService.getLogs(limit, offset, { action, adminId });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching logs' });
    }
});

// Dashboard Stats
router.get('/stats', adminController.getGlobalStats);
router.get('/suspension-reasons', adminController.getSuspensionReasons);
router.get('/reasons', adminController.getSuspensionReasons); // Alias for testing

router.get('/artisans', adminController.getArtisans);
router.get('/artisans/:userId', adminController.getArtisanDetail);
router.get('/artisans/:userId/submissions', adminController.getArtisanSubmissions);
router.patch('/artisans/:userId', adminController.updateArtisan);
router.post('/artisans/create', adminController.createArtisan);
router.post('/artisans/:userId/activate-pack', adminController.activateArtisanPack);
router.get('/guides', adminController.getGuides);
router.post('/guides/create', adminController.createGuide);
router.get('/guides/:userId', adminController.getGuideDetail);
router.patch('/guides/:userId', adminController.updateGuide);
router.get('/subscriptions', adminController.getAllSubscriptions);
router.get('/subscriptions/stats', adminController.getSubscriptionStats);
router.get('/submissions', adminController.getAllSubmissions);
router.get('/reviews/360', adminController.getReview360);
router.patch('/submissions/:submissionId/status', adminController.updateSubmissionStatus);
router.post('/submissions/bulk-revalidate', adminController.bulkRevalidateSubmissions);
router.post('/submissions/bulk-reset-pending', adminController.bulkResetToPending);
router.post('/submissions/recycle', adminController.recycleRejectedSubmissions);
router.get('/rejected-submissions', adminController.listRejectedSubmissions);
router.post('/orders/:id/force-relist', adminController.forceRelistOrder);

// Level Verifications
router.get('/level-verifications', adminController.getLevelVerifications);
router.patch('/level-verifications/:verificationId', adminController.reviewLevelVerification);

router.patch('/users/:userId/status', adminController.updateUserStatus);
// Warning system removed - route disabled
// router.post('/users/:userId/warning', adminController.issueWarning);
router.post('/guides/:userId/unblock-bad-links', adminController.unblockBadLinkGuide);
router.delete('/users/:userId', adminController.deleteUser);
router.get('/users', adminController.getUsers);
router.post('/payments/:paymentId/cancel', adminController.cancelPayment);
router.post('/payments/:paymentId/reactivate', adminController.reactivatePayment);
router.post('/payments/:paymentId/block', adminController.blockPayment);
router.delete('/payments/:paymentId/status', adminController.deletePaymentStatus);

// fiche management
router.get('/fiches', adminController.getfiches);
router.get('/fiches/pending', adminController.getPendingfiches);
router.get('/fiches/:orderId', adminController.getAdminficheDetail);
router.post('/fiches/:orderId/approve', adminController.approvefiche);
router.post('/fiches/:orderId/send-validation', adminController.sendReviewValidationEmail);
router.put('/fiches/:orderId', adminController.updatefiche);
router.delete('/fiches/:orderId', adminController.deletefiche);
router.put('/proposals/:proposalId', adminController.updateProposal);
router.post('/proposals/:proposalId/regenerate', adminController.regenerateProposal);

// Pack management
router.get('/packs', adminController.getPacks);
router.post('/packs', adminController.createPack);
router.put('/packs/:id', adminController.updatePack);
router.delete('/packs/:id', adminController.deletePack);

// Guides balances & encouragement payments
router.get('/guides-balances', adminController.getGuidesWithBalance);
router.post('/force-pay-guide', adminController.forcePayGuide);

// Impersonation
router.post('/impersonate/:userId', adminController.impersonateUser);

// Gmail accounts management
router.get('/gmail-accounts', adminController.getGmailAccounts);
router.patch('/gmail-accounts/:accountId/block', adminController.toggleGmailBlock);

// Sector management
router.get('/sectors', adminController.getAllSectors);
router.post('/sectors', adminController.createSector);
router.put('/sectors/:slug', adminController.updateSector);
router.delete('/sectors/:slug', adminController.deleteSector);

export default router;
