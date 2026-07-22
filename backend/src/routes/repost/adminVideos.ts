// Routes admin : CRUD vidéothèque repost social.
// Permission requise : can_manage_repost.

import express from 'express';
import { authenticate, authorize, checkPermission } from '../../middleware/auth';
import * as adminController from '../../controllers/repost/adminController';

const router = express.Router();

router.use(authenticate, authorize('admin'));
const PERM = checkPermission('can_manage_repost');

router.get('/', PERM, adminController.listVideos);
router.post('/', PERM, adminController.createVideo);
router.put('/:id', PERM, adminController.updateVideo);
router.delete('/:id', PERM, adminController.removeVideo);
// Campagne email : max 100 guides actifs par appel, jamais deux fois le même guide
router.post('/:id/notify', PERM, adminController.notifyGuidesForVideo);

export default router;
