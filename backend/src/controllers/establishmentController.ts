import { Request, Response } from 'express';
import { establishmentService } from '../services/establishmentService';

export const establishmentController = {
    /**
     * Rechercher et créer depuis Google
     */
    async searchAndCreateFromGoogle(req: Request, res: Response) {
        try {
            const { search_query, city } = req.body;
            const userId = (req as any).user.userId;

            if (!search_query || !city) {
                return res.status(400).json({
                    success: false,
                    message: 'Le nom de l\'établissement et la ville sont obligatoires.'
                });
            }

            const result = await establishmentService.createFromGoogleSearch(userId, search_query, city);

            return res.json({
                success: true,
                message: 'Établissement créé avec succès à partir de Google Maps.',
                data: result
            });
        } catch (error: any) {
            console.error('Controller Search Error:', error);
            const status = error.message.includes('déjà existe') || error.message.includes('trouvé') ? 400 : 500;
            return res.status(status).json({
                success: false,
                message: error.message || 'Une erreur est survenue lors de la recherche.'
            });
        }
    },

    /**
     * Créer depuis un lien Google Maps
     */
    async createFromLink(req: Request, res: Response) {
        try {
            const { google_maps_url } = req.body;
            const userId = (req as any).user.userId;

            if (!google_maps_url) {
                return res.status(400).json({
                    success: false,
                    message: 'Le lien Google Maps est obligatoire.'
                });
            }

            const result = await establishmentService.createFromGoogleLink(userId, google_maps_url);

            return res.json({
                success: true,
                message: 'Établissement extrait et créé avec succès.',
                data: result
            });
        } catch (error: any) {
            console.error('Controller Link Error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Impossible d\'extraire les données du lien fourni.'
            });
        }
    },

    /**
     * Création manuelle
     */
    async createManual(req: Request, res: Response) {
        try {
            const manualData = req.body;
            const userId = (req as any).user.userId;

            const result = await establishmentService.createManually(userId, manualData);

            return res.json({
                success: true,
                message: 'Établissement créé manuellement avec succès.',
                data: result
            });
        } catch (error: any) {
            console.error('Controller Manual Error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Données de création invalides.'
            });
        }
    },

    /**
     * Liste des établissements de l'artisan
     */
    async getMyEstablishments(req: Request, res: Response) {
        try {
            const userId = (req as any).user.userId;
            const establishments = await establishmentService.getUserEstablishments(userId);

            return res.json({
                success: true,
                data: establishments
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération de vos établissements.'
            });
        }
    },

    /**
     * Détails établissement
     */
    async getEstablishmentDetails(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const userId = (req as any).user.userId;
            const establishment = await establishmentService.getEstablishmentById(id) as any;

            if (!establishment) {
                return res.status(404).json({ success: false, message: 'Établissement non trouvé.' });
            }

            // Simple security check: person requesting should be owner OR admin
            if (establishment.user_id !== userId && (req as any).user.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Non autorisé.' });
            }

            return res.json({
                success: true,
                data: establishment
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des détails.'
            });
        }
    },

    /**
     * Vérifier un établissement (Admin)
     */
    async verifyEstablishment(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { status, notes } = req.body;
            const adminId = (req as any).user.userId;

            if (!['verified', 'rejected'].includes(status)) {
                return res.status(400).json({ success: false, message: 'Statut invalide.' });
            }

            await establishmentService.verifyEstablishment(id, adminId, status, notes);

            return res.json({
                success: true,
                message: `Établissement ${status === 'verified' ? 'validé' : 'rejeté'} avec succès.`
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || 'Erreur lors de la validation.'
            });
        }
    },

    /**
     * Liste des établissements en attente (Admin)
     */
    async getPendingEstablishments(_req: Request, res: Response) {
        try {
            const establishments = await establishmentService.getPendingEstablishments();
            return res.json({
                success: true,
                data: establishments
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des établissements en attente.'
            });
        }
    },

    /**
     * Get establishment by ID with ownership check and missions count
     */
    async getEstablishmentByIdWithOwnership(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const userId = (req as any).user.userId;

            const establishment = await establishmentService.getEstablishmentByIdWithOwnership(id, userId);

            return res.json({
                success: true,
                data: establishment
            });
        } catch (error: any) {
            const status = error.message.includes('introuvable') ? 404 : error.message.includes('non autorisé') ? 403 : 500;
            return res.status(status).json({
                success: false,
                message: error.message || 'Erreur lors de la récupération des détails.'
            });
        }
    },

    /**
     * Update establishment
     */
    async updateEstablishment(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const userId = (req as any).user.userId;
            const updateData = req.body;

            const updated = await establishmentService.updateEstablishment(id, userId, updateData);

            return res.json({
                success: true,
                message: 'Établissement mis à jour avec succès.',
                data: updated
            });
        } catch (error: any) {
            const status = error.message.includes('autorisé') ? 403 : error.message.includes('introuvable') ? 404 : 400;
            return res.status(status).json({
                success: false,
                message: error.message || 'Erreur lors de la mise à jour.'
            });
        }
    },

    /**
     * Delete establishment
     */
    async deleteEstablishment(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const userId = (req as any).user.userId;

            const result = await establishmentService.deleteEstablishment(id, userId);

            return res.json({
                success: true,
                message: result.message
            });
        } catch (error: any) {
            const status = error.message.includes('autorisé') ? 403 : error.message.includes('introuvable') ? 404 : 400;
            return res.status(status).json({
                success: false,
                message: error.message || 'Erreur lors de la suppression.'
            });
        }
    }
};
