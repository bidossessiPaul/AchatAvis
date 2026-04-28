import { Router } from 'express';
import { antiDetectionController } from '../controllers/antiDetectionController';
import { authenticate } from '../middleware/auth';
import { uploadScreenshot } from '../middleware/upload';
import * as gmailVerificationController from '../controllers/gmailVerificationController';

const router = Router();

// Public routes (no authentication required)
router.get('/sectors', antiDetectionController.getAllSectors);

// Protected routes (authentication required)
router.get('/rules', authenticate, antiDetectionController.getAllRules);
router.get('/sectors', antiDetectionController.getAllSectors);

// User specific compliance and accounts
router.get('/compliance-score/:userId', authenticate, antiDetectionController.getComplianceScore);
router.get('/gmail-accounts/:userId', authenticate, antiDetectionController.getUserGmailAccounts);
router.get('/guide-recap', authenticate, antiDetectionController.getGuideRecap);
router.get('/gmail-history/:accountId', authenticate, antiDetectionController.getGmailHistory);

// Gmail Management
router.post('/gmail-accounts/verify-preview', authenticate, antiDetectionController.verifyGmailAccountPreview);
router.post('/gmail-accounts/add', authenticate, antiDetectionController.addGmailAccount);
router.put('/gmail-accounts/:accountId', authenticate, antiDetectionController.updateGmailAccount);
router.delete('/gmail-accounts/:accountId', authenticate, antiDetectionController.deleteGmailAccount);

// Checks
router.post('/can-take-fiche', authenticate, antiDetectionController.checkficheCompatibility);

// Certification
router.post('/quiz/submit', authenticate, antiDetectionController.submitQuiz);

// Tools
router.post('/generate-cities', authenticate, antiDetectionController.generateCities);

// Level Verification
router.post('/level-verification/submit', authenticate, uploadScreenshot.single('screenshot'), antiDetectionController.submitLevelVerification);
router.get('/level-verifications/mine', authenticate, antiDetectionController.getMyLevelVerifications);

// Vérification manuelle des comptes Gmail (screenshot + lien Maps)
router.post('/gmail-accounts/:accountId/verify', authenticate, uploadScreenshot.single('screenshot'), gmailVerificationController.submit);
router.get('/gmail-accounts/:accountId/verification-status', authenticate, gmailVerificationController.getStatus);

export default router;
