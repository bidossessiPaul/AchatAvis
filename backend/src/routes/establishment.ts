import express from 'express';
import { establishmentController } from '../controllers/establishmentController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Artisan routes (protected)
router.post('/search-google', authenticate, authorize('artisan'), establishmentController.searchAndCreateFromGoogle);
router.post('/from-link', authenticate, authorize('artisan'), establishmentController.createFromLink);
router.post('/manual', authenticate, authorize('artisan'), establishmentController.createManual);
router.get('/my', authenticate, authorize('artisan'), establishmentController.getMyEstablishments);
router.get('/details/:id', establishmentController.getEstablishmentDetails);

// CRUD Operations
router.get('/:id', authenticate, authorize('artisan'), establishmentController.getEstablishmentByIdWithOwnership);
router.put('/:id', authenticate, authorize('artisan'), establishmentController.updateEstablishment);
router.delete('/:id', authenticate, authorize('artisan'), establishmentController.deleteEstablishment);

// Admin Routes
router.get('/admin/pending', authenticate, authorize('admin'), establishmentController.getPendingEstablishments);
router.post('/admin/verify/:id', authenticate, authorize('admin'), establishmentController.verifyEstablishment);

export default router;
