// Routes admin : validation des déclarations de vues des guides.
// Permission requise : can_validate_reposts.

import express from 'express';
import { authenticate, authorize, checkPermission } from '../../middleware/auth';
import * as adminController from '../../controllers/repost/adminController';

const router = express.Router();

router.use(authenticate, authorize('admin'));
const PERM = checkPermission('can_validate_reposts');

router.get('/', PERM, adminController.listViewUpdates);
router.patch('/:id/approve', PERM, adminController.approveViewUpdate);
router.patch('/:id/reject', PERM, adminController.rejectViewUpdate);

export default router;
