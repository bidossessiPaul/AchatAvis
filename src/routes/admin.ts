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

router.get('/artisans', adminController.getArtisans);
router.get('/artisans/:userId', adminController.getArtisanDetail);
router.get('/guides', adminController.getGuides);
router.get('/guides/:userId', adminController.getGuideDetail);
router.get('/subscriptions', adminController.getAllSubscriptions);
router.get('/subscriptions/stats', adminController.getSubscriptionStats);
router.get('/submissions', adminController.getAllSubmissions);
router.patch('/submissions/:submissionId/status', adminController.updateSubmissionStatus);
router.patch('/users/:userId/status', adminController.updateUserStatus);
router.delete('/users/:userId', adminController.deleteUser);

// Mission management
router.get('/missions', adminController.getMissions);
router.get('/missions/pending', adminController.getPendingMissions);
router.get('/missions/:orderId', adminController.getAdminMissionDetail);
router.post('/missions/:orderId/approve', adminController.approveMission);
router.put('/missions/:orderId', adminController.updateMission);
router.delete('/missions/:orderId', adminController.deleteMission);

// Pack management
router.get('/packs', adminController.getPacks);
router.post('/packs', adminController.createPack);
router.put('/packs/:id', adminController.updatePack);
router.delete('/packs/:id', adminController.deletePack);

export default router;
