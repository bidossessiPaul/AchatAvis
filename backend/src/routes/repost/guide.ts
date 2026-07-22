// Routes guide : mes comptes RS, vidéothèque par compte, soumission de
// preuve de repost, déclarations de vues.

import express from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { uploadScreenshot } from '../../middleware/upload';
import * as guideController from '../../controllers/repost/guideController';

const router = express.Router();

router.use(authenticate, authorize('guide'));

// Mes comptes
router.get('/accounts/mine', guideController.myAccounts);
router.post(
    '/accounts',
    uploadScreenshot.single('screenshot'),
    guideController.submitAccount
);

// Vidéothèque (?account_id=...)
router.get('/videos', guideController.listAvailableVideos);
// Modal auto dashboard : dernière vidéo active non repostée par ce guide
router.get('/videos/new-alert', guideController.newVideoAlert);

// Soumission de preuve de repost
router.post(
    '/submissions',
    uploadScreenshot.single('screenshot'),
    guideController.submitProof
);
router.get('/submissions/mine', guideController.mySubmissions);

// Déclarations de vues
router.post(
    '/view-updates',
    uploadScreenshot.single('screenshot'),
    guideController.submitViewUpdate
);
router.get('/submissions/:submissionId/view-updates', guideController.listViewUpdatesForSubmission);

router.get('/me/stats', guideController.myStats);

export default router;
