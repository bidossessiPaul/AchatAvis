import { Router } from 'express';
import { antiDetectionController } from '../controllers/antiDetectionController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public (authenticated) rules and sectors
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
router.delete('/gmail-accounts/:accountId', authenticate, antiDetectionController.deleteGmailAccount);

// Checks
router.post('/can-take-mission', authenticate, antiDetectionController.checkMissionCompatibility);

// Certification
router.post('/quiz/submit', authenticate, antiDetectionController.submitQuiz);

// Tools
router.post('/generate-cities', authenticate, antiDetectionController.generateCities);

export default router;
