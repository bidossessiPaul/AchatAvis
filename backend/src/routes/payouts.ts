import { Router } from 'express';
import * as payoutController from '../controllers/payoutController';
import * as paymentSessionController from '../controllers/paymentSessionController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Guide Routes
router.get(
    '/guide/bonus-details',
    authenticate,
    authorize('guide'),
    payoutController.getBonusDetails
);

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

// Récap des vagues de paiement fermées concernant ce guide : payé ou non, et
// la raison en cas d'échec.
router.get(
    '/guide/payment-sessions',
    authenticate,
    authorize('guide'),
    paymentSessionController.getGuidePaymentSessions
);

// Tableau collectif : tous les guides d'une vague, sans donnée de contact.
router.get(
    '/guide/payment-board',
    authenticate,
    authorize('guide'),
    paymentSessionController.getPaymentBoard
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
