// Routes artisan : soumettre, lister, relancer.

import express from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import * as artisanController from '../../controllers/signalement/artisanController';

const router = express.Router();

router.use(authenticate, authorize('artisan'));

router.get('/me/summary', artisanController.summary);
router.get('/me/avis', artisanController.listMyAvis);
router.post('/me/avis', artisanController.submitAvis);
router.post('/me/avis/:id/relaunch', artisanController.relaunch);

export default router;
