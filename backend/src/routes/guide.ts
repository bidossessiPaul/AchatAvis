import { Router } from 'express';
import { guideController } from '../controllers/guideController';
import { trainingController } from '../controllers/trainingController';
import { authenticate, authorize } from '../middleware/auth';
import { uploadScreenshot } from '../middleware/upload';

const router = Router();

// All guide routes are protected and require guide role
router.use(authenticate);
router.use(authorize('guide'));

// Formation obligatoire post-inscription (vidéos + QCM >= 80%).
// Whitelistée dans middleware/auth.ts pour les guides suspendus
// en attente de vérification d'identité.
router.get('/training', trainingController.getContent);
router.get('/training/status', trainingController.getStatus);
router.post('/training/submit', trainingController.submit);
router.post('/training/submit-video', trainingController.submitVideo);

router.get('/fiches/available', guideController.getAvailablefiches);
router.get('/fiches/:id', guideController.getficheDetails);
router.post('/fiches/:id/release-lock', guideController.releaseLock);
router.post('/fiches/:id/refresh-slot', guideController.refreshSlot);
router.get('/submissions/correctable', guideController.getCorrectableSubmissions);
router.get('/submissions', guideController.getMySubmissions);
router.post('/submissions', uploadScreenshot.single('screenshot'), guideController.submitReviewProof);
router.put('/submissions/:id', guideController.updateSubmission);
router.get('/stats', guideController.getStats);
router.get('/leaderboard', guideController.getLeaderboard);
router.get('/fiches/:ficheId/gmail-quotas', guideController.getGmailQuotasForFiche);
router.get('/monthly-bonus/status', guideController.getMonthlyBonusStatus);
router.post('/monthly-bonus/claim', guideController.claimMonthlyBonus);

export default router;
