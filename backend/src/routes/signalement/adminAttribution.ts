// Routes admin : attribution de packs signalement à un artisan.

import express from 'express';
import { authenticate, authorize, checkPermission } from '../../middleware/auth';
import * as attributionController from '../../controllers/signalement/attributionController';

const router = express.Router();

router.use(authenticate, authorize('admin'));
const PERM = checkPermission('can_manage_signalement_packs');

router.post('/', PERM, attributionController.create);
router.get('/artisan/:artisan_id', PERM, attributionController.listForArtisan);
router.delete('/:id', PERM, attributionController.remove);

export default router;
