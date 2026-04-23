import express from 'express';
import * as adminController from '../controllers/adminController';
import * as identityVerif from '../controllers/identityVerificationController';
import * as communique from '../controllers/communiqueController';
import { authenticate, authorize, checkPermission } from '../middleware/auth';

import { LogService } from '../services/logService';

const router = express.Router();

const USERS = checkPermission(['can_validate_profiles', 'can_manage_users']);
const REVIEWS = checkPermission(['can_validate_reviews', 'can_manage_reviews']);
const FICHES = checkPermission(['can_validate_fiches', 'can_manage_fiches']);
const PAYMENTS = checkPermission('can_view_payments');
const PACKS = checkPermission('can_manage_packs');
const SECTORS = checkPermission('can_manage_sectors');
const STATS = checkPermission('can_view_stats');

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
router.get('/stats', STATS, adminController.getGlobalStats);
router.get('/suspension-reasons', STATS, adminController.getSuspensionReasons);
router.get('/reasons', STATS, adminController.getSuspensionReasons);

// Artisans & Guides (can_validate_profiles OR can_manage_users)
router.get('/artisans', USERS, adminController.getArtisans);
router.get('/artisans/:userId', USERS, adminController.getArtisanDetail);
router.get('/artisans/:userId/submissions', USERS, adminController.getArtisanSubmissions);
router.patch('/artisans/:userId', USERS, adminController.updateArtisan);
router.post('/artisans/create', USERS, adminController.createArtisan);
router.post('/artisans/:userId/activate-pack', USERS, adminController.activateArtisanPack);
router.get('/guides', USERS, adminController.getGuides);
router.post('/guides/create', USERS, adminController.createGuide);
router.get('/guides/:userId', USERS, adminController.getGuideDetail);
router.patch('/guides/:userId', USERS, adminController.updateGuide);
router.post('/guides/:userId/unblock-bad-links', USERS, adminController.unblockBadLinkGuide);

// Users management
router.get('/users', USERS, adminController.getUsers);
router.patch('/users/:userId/status', USERS, adminController.updateUserStatus);
router.delete('/users/:userId', USERS, adminController.deleteUser);

// Level & Identity Verifications
router.get('/level-verifications', USERS, adminController.getLevelVerifications);
router.patch('/level-verifications/:verificationId', USERS, adminController.reviewLevelVerification);
router.get('/identity-verifications', USERS, identityVerif.adminList);
router.post('/identity-verifications/:id/approve', USERS, identityVerif.adminApprove);
router.post('/identity-verifications/:id/reject', USERS, identityVerif.adminReject);
router.post('/identity-verifications/:id/relaunch', USERS, identityVerif.adminRelaunch);

// Gmail accounts
router.get('/gmail-accounts', USERS, adminController.getGmailAccounts);
router.patch('/gmail-accounts/:accountId/block', USERS, adminController.toggleGmailBlock);

// Submissions & Reviews
router.get('/subscriptions', PAYMENTS, adminController.getAllSubscriptions);
router.get('/subscriptions/stats', PAYMENTS, adminController.getSubscriptionStats);
router.get('/submissions', REVIEWS, adminController.getAllSubmissions);
router.get('/reviews/360', REVIEWS, adminController.getReview360);
router.patch('/submissions/:submissionId/status', REVIEWS, adminController.updateSubmissionStatus);
router.post('/submissions/bulk-revalidate', REVIEWS, adminController.bulkRevalidateSubmissions);
router.post('/submissions/bulk-reset-pending', REVIEWS, adminController.bulkResetToPending);
router.post('/submissions/recycle', REVIEWS, adminController.recycleRejectedSubmissions);
router.get('/rejected-submissions', REVIEWS, adminController.listRejectedSubmissions);
router.post('/orders/:id/force-relist', REVIEWS, adminController.forceRelistOrder);

// Fiches
router.get('/fiches', FICHES, adminController.getfiches);
router.get('/fiches/pending', FICHES, adminController.getPendingfiches);
router.get('/fiches/:orderId', FICHES, adminController.getAdminficheDetail);
router.post('/fiches/:orderId/approve', FICHES, adminController.approvefiche);
router.post('/fiches/:orderId/send-validation', FICHES, adminController.sendReviewValidationEmail);
router.put('/fiches/:orderId', FICHES, adminController.updatefiche);
router.delete('/fiches/:orderId', FICHES, adminController.deletefiche);
router.put('/proposals/:proposalId', FICHES, adminController.updateProposal);
router.post('/proposals/:proposalId/regenerate', FICHES, adminController.regenerateProposal);

// Payments & Finance
router.post('/payments/:paymentId/cancel', PAYMENTS, adminController.cancelPayment);
router.post('/payments/:paymentId/reactivate', PAYMENTS, adminController.reactivatePayment);
router.post('/payments/:paymentId/block', PAYMENTS, adminController.blockPayment);
router.delete('/payments/:paymentId/status', PAYMENTS, adminController.deletePaymentStatus);
router.get('/guides-balances', PAYMENTS, adminController.getGuidesWithBalance);
router.post('/force-pay-guide', PAYMENTS, adminController.forcePayGuide);

// Packs
// Lecture libre pour tous les admins (nécessaire pour créer/modifier un artisan
// avec un pack). Seules les mutations restent protégées par can_manage_packs.
router.get('/packs', adminController.getPacks);
router.post('/packs', PACKS, adminController.createPack);
router.put('/packs/:id', PACKS, adminController.updatePack);
router.delete('/packs/:id', PACKS, adminController.deletePack);

// Sectors
router.get('/sectors', SECTORS, adminController.getAllSectors);
router.post('/sectors', SECTORS, adminController.createSector);
router.put('/sectors/:slug', SECTORS, adminController.updateSector);
router.delete('/sectors/:slug', SECTORS, adminController.deleteSector);

// Communiqués
router.get('/communiques', SECTORS, communique.adminList);
router.post('/communiques', SECTORS, communique.adminCreate);
router.put('/communiques/:id', SECTORS, communique.adminUpdate);
router.delete('/communiques/:id', SECTORS, communique.adminDelete);
router.post('/communiques/:id/notify', SECTORS, communique.adminResendNotification);

// Impersonation — owner + admins ayant la permission can_impersonate
router.post('/impersonate/:userId', checkPermission('can_impersonate'), adminController.impersonateUser);

export default router;
