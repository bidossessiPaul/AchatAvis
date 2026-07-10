// Routes admin : validation des preuves de repost soumises par les guides.
// Permission requise : can_validate_reposts.

import express from 'express';
import { authenticate, authorize, checkPermission } from '../../middleware/auth';
import * as adminController from '../../controllers/repost/adminController';

const router = express.Router();

router.use(authenticate, authorize('admin'));
const PERM = checkPermission('can_validate_reposts');

router.get('/', PERM, adminController.listSubmissions);
router.get('/stats', PERM, adminController.stats);
router.patch('/:id/approve', PERM, adminController.approveSubmission);
router.patch('/:id/reject', PERM, adminController.rejectSubmission);

export default router;
