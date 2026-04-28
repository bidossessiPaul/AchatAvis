// Routes admin : file de validation des preuves guide.

import express from 'express';
import { authenticate, authorize, checkPermission } from '../../middleware/auth';
import * as validationController from '../../controllers/signalement/validationController';

const router = express.Router();

router.use(authenticate, authorize('admin'));
const PERM = checkPermission('can_validate_signalements');

router.get('/pending', PERM, validationController.listPending);
router.get('/stats', PERM, validationController.stats);
router.post('/:proof_id/approve', PERM, validationController.approve);
router.post('/:proof_id/reject', PERM, validationController.reject);

export default router;
