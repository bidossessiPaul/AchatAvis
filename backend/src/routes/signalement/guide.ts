// Routes guide : éligibilité, file dispo, réservation slot, soumission preuve.

import express from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { uploadScreenshot } from '../../middleware/upload';
import * as guideController from '../../controllers/signalement/guideController';

const router = express.Router();

router.use(authenticate, authorize('guide'));

router.get('/eligibility', guideController.eligibility);
router.get('/avis-disponibles', guideController.listAvailable);
router.get('/me/active-slots', guideController.myActiveSlots);
router.get('/me/proofs', guideController.myProofs);
router.get('/me/stats', guideController.myStats);

// Réserver un slot précis (UI passe slot_id)
router.post('/slots/:slot_id/reserve', guideController.reserveSlot);

// Réserver n'importe quel slot dispo d'un avis (UI passe avis_id, plus simple)
router.post('/avis/:avis_id/reserve-any', guideController.reserveAnySlot);

// Soumettre la preuve : multipart/form-data avec champ "screenshot"
router.post(
    '/slots/:slot_id/submit-proof',
    uploadScreenshot.single('screenshot'),
    guideController.submitProof
);

export default router;
