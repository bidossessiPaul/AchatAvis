// Routes admin : CRUD paliers de vues repost social.
// Permission requise : can_manage_repost.

import express from 'express';
import { authenticate, authorize, checkPermission } from '../../middleware/auth';
import * as adminController from '../../controllers/repost/adminController';

const router = express.Router();

router.use(authenticate, authorize('admin'));
const PERM = checkPermission('can_manage_repost');

router.get('/', PERM, adminController.listViewTiers);
router.post('/', PERM, adminController.createViewTier);
router.put('/:id', PERM, adminController.updateViewTier);
router.delete('/:id', PERM, adminController.removeViewTier);

export default router;
