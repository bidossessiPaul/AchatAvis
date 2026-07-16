// Routes admin : validation des comptes réseaux sociaux des guides.
// Permission requise : can_validate_reposts.

import express from 'express';
import { authenticate, authorize, checkPermission } from '../../middleware/auth';
import * as adminController from '../../controllers/repost/adminController';

const router = express.Router();

router.use(authenticate, authorize('admin'));
const PERM = checkPermission('can_validate_reposts');

router.get('/', PERM, adminController.listAccounts);
router.patch('/:id', PERM, adminController.reviewAccount);
router.patch('/:id/tier', PERM, adminController.updateAccountTier);
router.patch('/:id/block', PERM, adminController.setAccountBlock);
router.delete('/:id', PERM, adminController.deleteAccount);

export default router;
