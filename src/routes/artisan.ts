import { Router } from 'express';
import { artisanController } from '../controllers/artisanController';
import { authenticate, authorize } from '../middleware/auth';
import { requireActiveSubscription } from '../middleware/checkSubscription';

const router = Router();

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

// Toutes les routes suivantes demandent un abonnement actif (actions d'écriture)
router.use(requireActiveSubscription);

// Orders Creation & Management
router.post('/orders/draft', artisanController.createDraft);
router.put('/orders/:id', artisanController.updateDraft);
router.delete('/orders/:id', artisanController.deleteOrder);

// Proposals
router.post('/orders/:id/proposals/generate', artisanController.generateProposals);
router.put('/proposals/:proposalId', artisanController.updateProposal);
router.post('/orders/:id/proposals', artisanController.generateProposals);

export default router;
