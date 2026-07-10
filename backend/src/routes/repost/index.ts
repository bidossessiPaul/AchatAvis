// Router central du module repost social.
// Mount dans app.ts via : app.use('/api/repost', repostRoutes)

import express from 'express';
import adminTiers from './adminTiers';
import adminViewTiers from './adminViewTiers';
import adminVideos from './adminVideos';
import adminAccounts from './adminAccounts';
import adminSubmissions from './adminSubmissions';
import adminViewUpdates from './adminViewUpdates';
import guide from './guide';

const router = express.Router();

router.use('/admin/tiers', adminTiers);
router.use('/admin/view-tiers', adminViewTiers);
router.use('/admin/videos', adminVideos);
router.use('/admin/accounts', adminAccounts);
router.use('/admin/submissions', adminSubmissions);
router.use('/admin/view-updates', adminViewUpdates);

router.use('/guide', guide);

export default router;
