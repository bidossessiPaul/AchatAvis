import express from 'express';
import { teamController } from '../controllers/teamController';
import { authenticate, authorize, checkPermission } from '../middleware/auth';

const router = express.Router();

// PUBLIC ROUTE - Must be BEFORE authenticate middleware
// Accept invitation (no auth required, user doesn't have account yet)
router.post('/accept-invite', teamController.acceptInvite);

// All other routes require admin authentication
router.use(authenticate, authorize('admin'));

// Invite new member (requires user management permission)
router.post('/invite', checkPermission('can_manage_users'), teamController.inviteMember);

// Get list of team members (requires user management permission)
router.get('/', checkPermission('can_manage_users'), teamController.getTeamMembers);

// Update permissions (requires user management permission)
router.put('/:userId/permissions', checkPermission('can_manage_users'), teamController.updatePermissions);

// Delete member or revoke invite (requires user management permission)
router.delete('/:id', checkPermission('can_manage_users'), teamController.deleteMember);

export default router;
