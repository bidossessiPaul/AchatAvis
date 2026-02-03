import { Router } from 'express';
import { guideController } from '../controllers/guideController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All guide routes are protected and require guide role
router.use(authenticate);
router.use(authorize('guide'));

router.get('/fiches/available', guideController.getAvailablefiches);
router.get('/fiches/:id', guideController.getficheDetails);
router.post('/fiches/:id/release-lock', guideController.releaseLock);
router.get('/submissions', guideController.getMySubmissions);
router.post('/submissions', guideController.submitReviewProof);
router.put('/submissions/:id', guideController.updateSubmission);
router.get('/stats', guideController.getStats);
router.get('/fiches/:ficheId/gmail-quotas', guideController.getGmailQuotasForFiche);

export default router;
