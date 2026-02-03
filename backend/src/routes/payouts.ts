import { Router } from 'express';
import * as payoutController from '../controllers/payoutController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Guide Routes
router.get(
    '/guide/earnings',
    authenticate,
    authorize('guide'),
    payoutController.getEarnings
);

router.get(
    '/guide/history',
    authenticate,
    authorize('guide'),
    payoutController.getPayoutHistory
);

router.post(
    '/guide/request',
    authenticate,
    authorize('guide'),
    payoutController.requestPayout
);

router.get(
    '/guide/payment-method',
    authenticate,
    authorize('guide'),
    payoutController.getPaymentMethod
);

router.put(
    '/guide/payment-method',
    authenticate,
    authorize('guide'),
    payoutController.updatePaymentMethod
);

// Admin Routes
router.get(
    '/admin/requests',
    authenticate,
    authorize('admin'),
    payoutController.getAllPayoutRequests
);

router.patch(
    '/admin/requests/:payoutId',
    authenticate,
    authorize('admin'),
    payoutController.updatePayoutStatus
);

export default router;
