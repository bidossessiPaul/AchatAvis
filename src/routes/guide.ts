import { Router } from 'express';
import { guideController } from '../controllers/guideController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All guide routes are protected and require guide role
router.use(authenticate);
router.use(authorize('guide'));

router.get('/missions/available', guideController.getAvailableMissions);
router.get('/missions/:id', guideController.getMissionDetails);
router.post('/missions/:id/release-lock', guideController.releaseLock);
router.get('/submissions', guideController.getMySubmissions);
router.post('/submissions', guideController.submitReviewProof);
router.get('/stats', guideController.getStats);

export default router;
