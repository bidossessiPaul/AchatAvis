import { Router } from 'express';
import { TrustScoreController } from '../controllers/trustScoreController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * 🎯 TRUST SCORE ROUTES - AchatAvis
 * Endpoints pour le système de Trust Score
 */

// Public routes (ou avec authentification légère)
router.post('/calculate', authenticate, TrustScoreController.calculateTrustScore);
router.post('/validate-email', authenticate, TrustScoreController.validateEmail);
router.post('/scrape-profile', authenticate, TrustScoreController.scrapeProfile);

// Guide/Artisan routes
router.post('/recalculate/:accountId', authenticate, TrustScoreController.recalculateAccount);

// Admin routes
router.get('/accounts', authenticate, TrustScoreController.listAllAccounts);
router.patch('/accounts/:id/toggle-active', authenticate, TrustScoreController.toggleAccountActivation);
router.get('/statistics', authenticate, TrustScoreController.getStatistics);
router.get('/suspicious-accounts', authenticate, TrustScoreController.getSuspiciousAccounts);
router.get('/top-performers', authenticate, TrustScoreController.getTopPerformers);

// Admin override (nécessite permissions admin - à adapter selon votre middleware)
router.put('/override/:accountId', authenticate, TrustScoreController.overrideTrustScore);

export default router;
