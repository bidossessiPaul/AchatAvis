import express from 'express';
import {
    registerArtisan,
    registerGuide,
    login,
    logout,
    getMe,
    changePassword,
    deleteAccount,
    updateProfile,
    uploadAvatar,
    generate2FA,
    enable2FA,
    disable2FA,
    verify2FA,
    refreshToken,
    forgotPassword,
    resetPassword,
    detectRegion,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { uploadAvatar as uploadMiddleware } from '../middleware/upload';

const router = express.Router();

// Public routes
router.post('/register/artisan', registerArtisan);
router.post('/register/guide', registerGuide);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);
router.post('/2fa/verify', verify2FA);
router.get('/detect-region', detectRegion);

// Protected routes (require authentication)
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.post('/profile/avatar', authenticate, uploadMiddleware.single('avatar'), uploadAvatar);
router.put('/change-password', authenticate, changePassword);
router.delete('/delete-account', authenticate, deleteAccount);

// 2FA routes (protected)
router.post('/2fa/generate', authenticate, generate2FA);
router.post('/2fa/enable', authenticate, enable2FA);
router.post('/2fa/disable', authenticate, disable2FA);

// Forgot password routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
