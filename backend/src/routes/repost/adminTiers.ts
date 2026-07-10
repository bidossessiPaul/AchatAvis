// Routes admin : CRUD paliers repost social.
// Permission requise : can_manage_repost.

import express from 'express';
import { authenticate, authorize, checkPermission } from '../../middleware/auth';
import * as adminController from '../../controllers/repost/adminController';

const router = express.Router();

router.use(authenticate, authorize('admin'));
const PERM = checkPermission('can_manage_repost');

router.get('/', PERM, adminController.listTiers);
router.post('/', PERM, adminController.createTier);
router.put('/:id', PERM, adminController.updateTier);
router.delete('/:id', PERM, adminController.removeTier);

export default router;
