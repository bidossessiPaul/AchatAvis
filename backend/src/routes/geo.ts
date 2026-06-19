import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as geoController from '../controllers/geoController';

const router = Router();

// ─── Routes guide ─────────────────────────────────────────────────────────────
// Toutes ces routes nécessitent d'être connecté en tant que guide.

router.get('/missions',
    authenticate,
    authorize('guide'),
    geoController.getMissions
);

router.get('/missions/:missionId/platforms',
    authenticate,
    authorize('guide'),
    geoController.getMissionPlatforms
);

router.post('/submissions',
    authenticate,
    authorize('guide'),
    geoController.submitCitation
);

router.get('/my-submissions',
    authenticate,
    authorize('guide'),
    geoController.getMyGeoSubmissions
);

// ─── Routes admin ─────────────────────────────────────────────────────────────
// Accès réservé owner pour l'instant — pas de checkPermission granulaire.

router.get('/admin/platforms',
    authenticate,
    authorize('admin'),
    geoController.adminGetPlatforms
);

router.post('/admin/platforms',
    authenticate,
    authorize('admin'),
    geoController.adminCreatePlatform
);

router.put('/admin/platforms/:id',
    authenticate,
    authorize('admin'),
    geoController.adminUpdatePlatform
);

router.get('/admin/missions',
    authenticate,
    authorize('admin'),
    geoController.adminGetMissions
);

router.post('/admin/missions',
    authenticate,
    authorize('admin'),
    geoController.adminCreateMission
);

router.put('/admin/missions/:id',
    authenticate,
    authorize('admin'),
    geoController.adminUpdateMission
);

router.get('/admin/submissions',
    authenticate,
    authorize('admin'),
    geoController.adminGetSubmissions
);

router.put('/admin/submissions/:id',
    authenticate,
    authorize('admin'),
    geoController.adminValidateSubmission
);

export default router;
