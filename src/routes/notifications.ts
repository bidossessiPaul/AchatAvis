import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// SSE Stream endpoint
router.get('/stream', authenticate, notificationController.stream);

export default router;
