import express from 'express';
import { paymentController } from '../controllers/paymentController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Protected route for creating checkout sessions (Artisans only)
router.post('/create-checkout-session', authenticate, authorize('artisan'), paymentController.createCheckoutSession);

// Public route for Stripe webhooks (raw body handled in app.ts)
router.post('/webhook', paymentController.webhook);

// Manual activation after success
router.post('/manual-activate', authenticate, paymentController.manualActivate);

// Manual verification for dev/localhost
router.get('/verify-session/:sessionId', authenticate, paymentController.verifySession);

// Get payment history
router.get('/history', authenticate, authorize('artisan'), paymentController.getMyPayments);

export default router;
