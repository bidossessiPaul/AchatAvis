import express from 'express';
import * as adminController from '../controllers/adminController';
import { authenticate, authorize, checkPermission } from '../middleware/auth';

import { LogService } from '../services/logService';

const router = express.Router();

// Middleware to ensure admin access
router.use(authenticate, authorize('admin'));

// Audit Logs
router.get('/logs', checkPermission(['can_view_stats']), async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = 50;
        const offset = (page - 1) * limit;

        const result = await LogService.getLogs(limit, offset);
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
router.patch('/submissions/:submissionId/status', adminController.updateSubmissionStatus);
router.patch('/users/:userId/status', adminController.updateUserStatus);
router.post('/users/:userId/warning', adminController.issueWarning);
router.delete('/users/:userId', adminController.deleteUser);
router.get('/users', adminController.getUsers);
router.post('/payments/:paymentId/cancel', adminController.cancelPayment);
router.post('/payments/:paymentId/reactivate', adminController.reactivatePayment);

// fiche management
router.get('/fiches', adminController.getfiches);
router.get('/fiches/pending', adminController.getPendingfiches);
router.get('/fiches/:orderId', adminController.getAdminficheDetail);
router.post('/fiches/:orderId/approve', adminController.approvefiche);
router.put('/fiches/:orderId', adminController.updatefiche);
router.delete('/fiches/:orderId', adminController.deletefiche);

// Pack management
router.get('/packs', adminController.getPacks);
router.post('/packs', adminController.createPack);
router.put('/packs/:id', adminController.updatePack);
router.delete('/packs/:id', adminController.deletePack);

// Sector management
router.get('/sectors', adminController.getAllSectors);
router.post('/sectors', adminController.createSector);
router.put('/sectors/:slug', adminController.updateSector);
router.delete('/sectors/:slug', adminController.deleteSector);

export default router;
