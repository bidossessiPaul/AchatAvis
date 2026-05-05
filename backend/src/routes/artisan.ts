import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { artisanController } from '../controllers/artisanController';
import { authenticate, authorize } from '../middleware/auth';
import { requireActiveSubscription } from '../middleware/checkSubscription';
import { uploadReviewImages } from '../middleware/upload';

// Wrapper qui catche les erreurs Multer (taille / format) pour renvoyer
// un message FR propre au lieu d'une 500 cryptique
const handleReviewImagesUpload = (req: Request, res: Response, next: NextFunction) => {
    uploadReviewImages.array('images', 25)(req, res, (err: any) => {
        if (!err) return next();
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({
                    error: 'File too large',
                    message: 'Image trop volumineuse (10 Mo max par image).'
                });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    error: 'Too many files',
                    message: 'Trop d\'images envoyées en une seule fois (25 max).'
                });
            }
            return res.status(400).json({ error: 'Upload error', message: err.message });
        }
        // Erreur fileFilter (format)
        return res.status(400).json({ error: 'Invalid file', message: err.message || 'Format de fichier invalide.' });
    });
};

const router = Router();

// Route publique — pas besoin d'être connecté pour voir les packs
router.get('/packs', artisanController.getSubscriptionPacks);

// Routes protected by authentication and artisan role
router.use(authenticate);
router.use(authorize('artisan'));

// Route SANS vérification abonnement
router.get('/profile', artisanController.getProfile);
router.get('/orders', artisanController.getMyOrders);
router.get('/orders/:id', artisanController.getOrder);
router.get('/orders/history/urls', artisanController.getGoogleUrlHistory);
router.get('/packs', artisanController.getSubscriptionPacks);
router.get('/submissions', artisanController.getMySubmissions);
router.get('/available-packs', artisanController.getAvailablePacks);
router.get('/stats', artisanController.getStats);

// Modification des propositions existantes — pas besoin d'abonnement actif
router.put('/proposals/:id', artisanController.updateProposal);
router.delete('/proposals/:id', artisanController.deleteProposal);

// Images attachées aux propositions (quota global par fiche : 5/10/25 selon pack 30/60/90)
router.post('/proposals/:id/images', handleReviewImagesUpload, artisanController.uploadProposalImages);
router.delete('/proposals/:id/images', artisanController.deleteProposalImage);

// Pause/Resume fiches — pas besoin d'abonnement actif
router.patch('/orders/:id/pause', artisanController.pauseFiche);
router.patch('/orders/:id/resume', artisanController.resumeFiche);

// Toutes les routes suivantes demandent un abonnement actif (actions d'écriture)
router.use(requireActiveSubscription);

// Orders Creation & Management
router.post('/orders/draft', artisanController.createDraft);
router.put('/orders/:id', artisanController.updateDraft);
router.delete('/orders/:id', artisanController.deleteOrder);

// Proposals
router.post('/orders/:id/proposals/generate', artisanController.generateProposals);
router.post('/orders/:id/proposals', artisanController.generateProposals);
router.post('/orders/:id/send-validation', artisanController.sendReviewValidationEmail);

// AI Response Generation
router.post('/submissions/generate-response', artisanController.generateReviewResponse);

export default router;

