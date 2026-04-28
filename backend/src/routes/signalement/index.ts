// Router central du module signalement.
// Mount dans app.ts via : app.use('/api/signalement', signalementRoutes)

import express from 'express';
import adminPacks from './adminPacks';
import adminAttribution from './adminAttribution';
import adminAvis from './adminAvis';
import adminValidations from './adminValidations';
import adminConfig from './adminConfig';
import artisan from './artisan';
import guide from './guide';

const router = express.Router();

router.use('/admin/packs', adminPacks);
router.use('/admin/attributions', adminAttribution);
router.use('/admin/avis', adminAvis);
router.use('/admin/validations', adminValidations);
router.use('/admin/config', adminConfig);

router.use('/artisan', artisan);
router.use('/guide', guide);

export default router;
