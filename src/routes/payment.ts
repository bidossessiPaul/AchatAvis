import express from 'express';
import { paymentController } from '../controllers/paymentController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// --- Stripe routes disabled (using payment links instead) ---
// router.post('/create-checkout-session', authenticate, authorize('artisan'), paymentController.createCheckoutSession);
// router.post('/webhook', paymentController.webhook);
// router.get('/verify-session/:sessionId', authenticate, paymentController.verifySession);

// Manual activation (still active for payment link flow)
router.post('/manual-activate', authenticate, paymentController.manualActivate);

// Get payment history
router.get('/history', authenticate, authorize('artisan'), paymentController.getMyPayments);

export default router;
