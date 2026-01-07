import { Router } from 'express';
import { suspensionService } from '../services/suspensionService';
import { query } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
const router = Router();

console.log('--- Loading Suspension Routes ---');

/**
 * GET /api/suspensions/check-my-ip-status
 * Get caller's IP and country info (Debug)
 */
router.get('/check-my-ip-status', async (req: any, res) => {
    try {
        const ip = req.ip || '';
        const country = await suspensionService.detectCountryFromIP(ip);
        return res.json({
            success: true,
            data: {
                ip,
                country,
                is_local: ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.')
            }
        });
    } catch (error: any) {
        console.error('Error in /check-my-ip-status:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/suspensions/config
 * Get global suspension configuration (Admin)
 */
router.get('/config', authenticate, authorize('admin'), async (_req: any, res) => {
    try {
        const config = await suspensionService.getConfig();
        return res.json({ success: true, data: config });
    } catch (error: any) {
        console.error('Error in /config:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * PUT /api/suspensions/config
 * Update global suspension configuration (Admin)
 */
router.put('/config', authenticate, authorize('admin'), async (req: any, res) => {
    try {
        const { is_enabled, auto_suspend_enabled, manual_suspend_only, max_warnings_before_suspend, exempted_countries, exempted_user_ids, blocked_countries } = req.body;
        console.log('Updating suspension config with:', { is_enabled, blocked_countries });

        const result: any = await query(
            `UPDATE suspension_config SET 
        is_enabled = ?, 
        auto_suspend_enabled = ?, 
        manual_suspend_only = ?, 
        max_warnings_before_suspend = ?, 
        exempted_countries = ?, 
        exempted_user_ids = ?,
        blocked_countries = ?,
        updated_at = NOW()
        WHERE id = 1`,
            [
                is_enabled ? 1 : 0,
                auto_suspend_enabled ? 1 : 0,
                manual_suspend_only ? 1 : 0,
                max_warnings_before_suspend,
                JSON.stringify(exempted_countries || []),
                JSON.stringify(exempted_user_ids || []),
                JSON.stringify(blocked_countries || [])
            ]
        );

        console.log('Update result:', result.affectedRows, 'rows affected');

        return res.json({ success: true, message: 'Configuration mise à jour' });
    } catch (error: any) {
        console.error('Error in PUT /config:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/suspensions/user/:userId
 * Get suspension status for a user
 */
router.get('/user/:userId', async (req: any, res) => {
    try {
        const { userId } = req.params;
        const activeSuspension = await suspensionService.getActiveSuspension(userId);
        const user: any = await query('SELECT status, is_banned, ban_reason, suspension_count, warning_count FROM users WHERE id = ?', [userId]);

        if (!user || user.length === 0) {
            return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
        }

        const history = await query(
            'SELECT * FROM suspension_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
            [userId]
        );

        return res.json({
            success: true,
            data: {
                is_suspended: user[0].status === 'suspended',
                is_banned: !!user[0].is_banned,
                ban_reason: user[0].ban_reason,
                suspension_count: user[0].suspension_count,
                warning_count: user[0].warning_count,
                active_suspension: activeSuspension,
                history: history
            }
        });
    } catch (error: any) {
        console.error('Error in /user/:userId:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/suspensions/manual
 * Create a manual suspension (Admin)
 */
router.post('/manual', authenticate, authorize('admin'), async (req: any, res) => {
    try {
        const { user_id, suspension_level_id, reason_details, admin_notes } = req.body;

        const suspensionId = await suspensionService.createSuspension(
            user_id,
            suspension_level_id,
            'manual_admin',
            reason_details || 'Suspension manuelle',
            undefined, // proofId
            admin_notes
        );

        return res.json({ success: true, message: 'Suspension créée manuellement', suspension_id: suspensionId });
    } catch (error: any) {
        console.error('Error in /manual:', error);
        return res.status(500).json({ success: false, message: error.message, stack: error.stack });
    }
});

/**
 * POST /api/suspensions/:suspensionId/lift
 * Lift a suspension manually (Admin)
 */
router.post('/:suspensionId/lift', authenticate, authorize('admin'), async (req: any, res) => {
    try {
        const { suspensionId } = req.params;
        if (!req.user?.userId) {
            return res.status(401).json({ success: false, message: 'Administrateur non authentifié' });
        }
        const adminId = req.user.userId;
        const { reason } = req.body;

        await suspensionService.liftSuspension(parseInt(suspensionId), adminId, reason || "Levée manuelle");
        return res.json({ success: true, message: 'Suspension levée' });
    } catch (error: any) {
        console.error('Error in /lift:', error);
        return res.status(500).json({ success: false, message: error.message, stack: error.stack });
    }
});

/**
 * GET /api/suspensions/active
 * Get all active suspensions with user details
 */
router.get('/active', authenticate, authorize('admin'), async (_req: any, res) => {
    try {
        const results = await query(
            `SELECT us.*, u.email, u.full_name, u.role, u.last_detected_country 
             FROM user_suspensions us
             JOIN users u ON us.user_id = u.id
             WHERE us.is_active = true
             ORDER BY us.started_at DESC`
        );
        return res.json({ success: true, data: results });
    } catch (error: any) {
        console.error('Error in /active:', error);
        return res.status(500).json({ success: false, message: error.message, stack: error.stack });
    }
});

/**
 * POST /api/suspensions/:suspensionId/approve
 * Approve/Lift a suspension (Admin)
 * Synonym for lifting, but implies approval of account
 */
router.post('/:suspensionId/approve', authenticate, authorize('admin'), async (req: any, res) => {
    try {
        const { suspensionId } = req.params;
        const adminId = req.user?.userId;

        if (!adminId) {
            console.error('Debug: No adminId found in req.user');
            return res.status(401).json({ success: false, message: 'Administrateur non authentifié.' });
        }

        console.log(`Debug Approving: pid=${process.pid} id=${suspensionId} admin=${adminId}`);

        await suspensionService.liftSuspension(parseInt(suspensionId), adminId, "Approuvé manuellement par l'admin");

        console.log(`Debug Success: id=${suspensionId} lifted`);
        return res.json({ success: true, message: 'Suspension levée avec succès (Compte Approuvé)' });
    } catch (error: any) {
        console.error('Detailed Error in /approve:', {
            message: error.message,
            stack: error.stack,
            params: req.params,
            adminId: req.user?.userId
        });
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal Server Error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

export default router;
