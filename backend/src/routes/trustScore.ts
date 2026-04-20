import { Router } from 'express';
import { TrustScoreController } from '../controllers/trustScoreController';
import { authenticate, checkPermission } from '../middleware/auth';
const TRUST = checkPermission('can_manage_trust_scores');

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

// Admin routes (permission requise)
router.get('/accounts', authenticate, TRUST, TrustScoreController.listAllAccounts);
router.patch('/accounts/:id/toggle-active', authenticate, TRUST, TrustScoreController.toggleAccountActivation);
router.get('/statistics', authenticate, TRUST, TrustScoreController.getStatistics);
router.get('/suspicious-accounts', authenticate, TRUST, TrustScoreController.getSuspiciousAccounts);
router.get('/top-performers', authenticate, TRUST, TrustScoreController.getTopPerformers);
router.put('/override/:accountId', authenticate, TRUST, TrustScoreController.overrideTrustScore);

export default router;
