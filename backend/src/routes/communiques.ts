import express from 'express';
import * as controller from '../controllers/communiqueController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.get('/', authenticate, controller.listPublished);
router.get('/unread', authenticate, controller.unread);
router.post('/seen', authenticate, controller.markSeen);

export default router;
