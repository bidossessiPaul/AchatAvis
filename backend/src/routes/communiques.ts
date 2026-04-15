import express from 'express';
import * as controller from '../controllers/communiqueController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.get('/', authenticate, controller.listPublished);

export default router;
