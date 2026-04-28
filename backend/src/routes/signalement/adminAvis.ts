// Routes admin : vue globale des avis à signaler + édition payout + transitions.

import express from 'express';
import { authenticate, authorize, checkPermission } from '../../middleware/auth';
import * as avisController from '../../controllers/signalement/avisController';

const router = express.Router();

router.use(authenticate, authorize('admin'));
const PERM = checkPermission('can_manage_signalements');

router.get('/', PERM, avisController.list);
router.get('/:id', PERM, avisController.getOne);
router.put('/:id/payout', PERM, avisController.updatePayout);
router.post('/:id/mark-google-deleted', PERM, avisController.markGoogleDeleted);
router.post('/:id/cancel', PERM, avisController.cancel);

export default router;
