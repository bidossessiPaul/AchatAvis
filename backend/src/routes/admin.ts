import express from 'express';
import * as adminController from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// All admin routes are protected
router.use(authenticate);
router.use(authorize('admin'));
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

// Pack management
router.get('/packs', adminController.getPacks);
router.post('/packs', adminController.createPack);
router.put('/packs/:id', adminController.updatePack);
router.delete('/packs/:id', adminController.deletePack);

export default router;
