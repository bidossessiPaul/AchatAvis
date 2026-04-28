// Routes admin : configuration globale signalement (singleton).

import express from 'express';
import { authenticate, authorize, checkPermission } from '../../middleware/auth';
import * as configController from '../../controllers/signalement/configController';

const router = express.Router();

router.use(authenticate, authorize('admin'));
const PERM = checkPermission('can_manage_signalement_packs');

router.get('/', PERM, configController.get);
router.put('/', PERM, configController.update);

export default router;
