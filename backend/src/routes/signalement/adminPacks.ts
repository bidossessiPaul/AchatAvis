// Routes admin : CRUD packs signalement.
// Permission requise : can_manage_signalement_packs (bypass owner/super-admin).

import express from 'express';
import { authenticate, authorize, checkPermission } from '../../middleware/auth';
import * as packController from '../../controllers/signalement/packController';

const router = express.Router();

router.use(authenticate, authorize('admin'));
const PERM = checkPermission('can_manage_signalement_packs');

router.get('/', PERM, packController.list);
router.get('/:id', PERM, packController.getOne);
router.post('/', PERM, packController.create);
router.put('/:id', PERM, packController.update);
router.delete('/:id', PERM, packController.remove);

export default router;
