import { Request, Response } from 'express';
import { artisanService } from '../services/artisanService';
import { aiService } from '../services/aiService';
import { query } from '../config/database';

export const artisanController = {
    async createDraft(req: Request, res: Response) {
        try {
            const user = req.user;
            const draft = await artisanService.createOrderDraft(user!.userId, req.body);
            return res.status(201).json(draft);
        } catch (error: any) {
            return res.status(500).json({ error: 'Failed to create draft', message: error.message });
        }
    },

    async updateDraft(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updated = await artisanService.updateOrderDraft(id, req.body);
            return res.json(updated);
        } catch (error: any) {
            return res.status(500).json({ error: 'Failed to update draft', message: error.message });
        }
    },

    async getMyOrders(req: Request, res: Response) {
        try {
            const user = req.user;
            const orders = await artisanService.getArtisanOrders(user!.userId);
            return res.json(orders);
        } catch (error: any) {
            return res.status(500).json({ error: 'Failed to fetch orders', message: error.message });
        }
    },

    async getOrder(req: Request, res: Response) {
        try {
            const user = req.user;
            const { id } = req.params;
            const order = await artisanService.getOrderById(id);
            if (!order || order.artisan_id !== user!.userId) {
                return res.status(404).json({ error: 'Order not found' });
            }

            console.log('🔍 DEBUG getOrder - sector fields:', {
                sector: order.sector,
                sector_id: order.sector_id,
                sector_slug: order.sector_slug,
                sector_difficulty: order.sector_difficulty,
                city: order.city,
                establishment_id: order.establishment_id
            });

            return res.json(order);
        } catch (error: any) {
            return res.status(500).json({ error: 'Failed to fetch order' });
        }
    },

    async generateProposals(req: Request, res: Response) {
        const { id } = req.params;
        console.log(`🚀 START Generation pour orderId: ${id}`);
        try {
            const { proposals, force } = req.body;

            // Manual proposals path (unchanged)
            if (proposals && Array.isArray(proposals) && proposals.length > 0) {
                console.log("📝 Utilisation de propositions manuelles");
                const order = await artisanService.getOrderById(id);
                if (!order) {
                    return res.status(404).json({ error: 'Order not found' });
                }
                const finalProposals = proposals.slice(0, order.quantity);
                const created = await artisanService.createProposals(id, finalProposals);
                return res.json({ proposals: created, generated: created.length, target: order.quantity, complete: true });
            }

            // AI generation path — generates ONE batch per request
            const order = await artisanService.getOrderById(id);
            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }

            const artisanProfile: any = await artisanService.getArtisanProfileByUserId(order.artisan_id);
            const targetQuantity = order.quantity || 1;

            // If force, soft-delete all existing proposals (historique préservé)
            if (force) {
                console.log("⚠️ Force regeneration: soft-delete des anciennes propositions.");
                await query(
                    'UPDATE review_proposals SET deleted_at = NOW() WHERE order_id = ? AND deleted_at IS NULL',
                    [id]
                );
            }

            // Count existing (non-deleted) proposals after potential deletion
            const existingProposals: any = await query(
                'SELECT COUNT(*) as count FROM review_proposals WHERE order_id = ? AND deleted_at IS NULL',
                [id]
            );
            const existingCount = existingProposals[0]?.count || 0;
            const needed = targetQuantity - existingCount;

            if (needed <= 0) {
                console.log(`✅ Déjà ${existingCount}/${targetQuantity} avis générés.`);
                const allProposals: any = await query('SELECT * FROM review_proposals WHERE order_id = ? ORDER BY created_at ASC', [id]);
                return res.json({ proposals: allProposals, generated: existingCount, target: targetQuantity, complete: true });
            }

            // Generate ONE batch (max 10 reviews)
            const batchSize = 10;
            const currentBatchSize = Math.min(needed, batchSize);
            console.log(`📊 Etat: ${existingCount}/${targetQuantity}. Génération de ${currentBatchSize} avis...`);

            const generationParams = {
                companyName: order.company_name || artisanProfile?.company_name || 'Artisan',
                ficheName: order.fiche_name,
                trade: artisanProfile?.trade || 'Artisan',
                quantity: currentBatchSize,
                context: order.company_context,
                sector: order.sector,
                sectorSlug: order.sector_slug,
                zones: order.zones,
                services: order.services,
                staffNames: order.staff_names,
                specificInstructions: order.specific_instructions
            };

            const generated = await aiService.generateReviews(generationParams);

            if (!generated || generated.length === 0) {
                console.warn("⚠️ L'IA n'a retourné aucun avis.");
                const allProposals: any = await query('SELECT * FROM review_proposals WHERE order_id = ? ORDER BY created_at ASC', [id]);
                return res.json({ proposals: allProposals, generated: existingCount, target: targetQuantity, complete: existingCount >= targetQuantity });
            }

            const finalProposals = generated.slice(0, currentBatchSize);
            console.log(`💾 Sauvegarde de ${finalProposals.length} avis...`);

            const allProposals = await artisanService.createProposals(id, finalProposals, true); // always append
            const newCount = allProposals.length;
            const isComplete = newCount >= targetQuantity;

            console.log(`✅ Batch terminé: ${newCount}/${targetQuantity}${isComplete ? ' (complet)' : ' (suite nécessaire)'}`);

            return res.json({
                proposals: allProposals,
                generated: newCount,
                target: targetQuantity,
                complete: isComplete
            });
        } catch (error: any) {
            console.error("❌ ERREUR GENERATION PROPOSALS:", error);
            const status = error.message?.includes('AI') ? 502 : 500;
            return res.status(status).json({
                error: 'Erreur de génération',
                message: error.message,
                details: error.stack
            });
        }
    },

    async getGoogleUrlHistory(req: Request, res: Response) {
        try {
            const user = req.user;
            const history = await artisanService.getUsedGoogleUrls(user!.userId);
            return res.json(history);
        } catch (error: any) {
            return res.status(500).json({ error: 'Failed to fetch URL history', message: error.message });
        }
    },


    async getProfile(req: Request, res: Response) {
        const userId = (req as any).user?.userId || (req as any).user?.id;
        console.log('📊 GET PROFILE:', userId);

        try {
            const profile = await artisanService.getArtisanProfileByUserId(userId);

            if (!profile) {
                console.log('❌ Profil introuvable pour user:', userId);
                return res.status(404).json({ error: 'Profil non trouvé' });
            }

            console.log('✅ Profil trouvé');
            return res.json(profile);

        } catch (error) {
            console.error('❌ Erreur:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
    },

    async pauseFiche(req: Request, res: Response) {
        try {
            const user = req.user;
            const { id } = req.params;
            const result = await artisanService.pauseFiche(id, user!.userId);
            return res.json(result);
        } catch (error: any) {
            return res.status(400).json({ error: 'Failed to pause fiche', message: error.message });
        }
    },

    async resumeFiche(req: Request, res: Response) {
        try {
            const user = req.user;
            const { id } = req.params;
            const result = await artisanService.resumeFiche(id, user!.userId);
            return res.json(result);
        } catch (error: any) {
            return res.status(400).json({ error: 'Failed to resume fiche', message: error.message });
        }
    },

    async deleteOrder(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const user = req.user;

            // Check ownership
            const order = await artisanService.getOrderById(id);
            if (!order || order.artisan_id !== user!.userId) {
                return res.status(404).json({ error: 'Order not found' });
            }

            await artisanService.deleteOrder(id);
            return res.json({ success: true, message: 'Order deleted successfully' });
        } catch (error: any) {
            return res.status(500).json({ error: 'Failed to delete order', message: error.message });
        }
    },

    async getSubscriptionPacks(_req: Request, res: Response) {
        try {
            const packs = await artisanService.getSubscriptionPacks();
            return res.json(packs);
        } catch (error: any) {
            return res.status(500).json({ error: 'Failed to fetch packs', message: error.message });
        }
    },

    async getMySubmissions(req: Request, res: Response) {
        try {
            const user = req.user;
            const submissions = await artisanService.getArtisanSubmissions(user!.userId);
            return res.json(submissions);
        } catch (error: any) {
            return res.status(500).json({ error: 'Failed to fetch reviews', message: error.message });
        }
    },

    async getAvailablePacks(req: Request, res: Response) {
        try {
            const user = req.user;
            const { includeId } = req.query;
            const packs = await artisanService.getAvailablePacks(user!.userId, includeId as string);
            return res.json(packs);
        } catch (error: any) {
            return res.status(500).json({ error: 'Failed to fetch available packs', message: error.message });
        }
    },

    async getStats(req: Request, res: Response) {
        try {
            const user = req.user;
            const stats = await artisanService.getArtisanStats(user!.userId);
            return res.json(stats);
        } catch (error: any) {
            return res.status(500).json({ error: 'Failed to fetch artisan stats', message: error.message });
        }
    },

    async generateReviewResponse(req: Request, res: Response) {
        try {
            const { content, author_name } = req.body;
            if (!content || !author_name) {
                return res.status(400).json({ error: 'Missing content or author_name' });
            }

            const responseText = await aiService.generateReviewResponse(content, author_name);
            return res.json({ response: responseText });
        } catch (error: any) {
            console.error("❌ Error generating review response:", error);
            return res.status(500).json({ error: 'Failed to generate review response', message: error.message });
        }
    },

    async updateProposal(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const { id } = req.params; // Changed from proposalId to id to match routes
            const { content, author_name, rating } = req.body;

            const result = await artisanService.updateProposal(user.userId, id, {
                content,
                author_name,
                rating
            });
            return res.json(result);
        } catch (error: any) {
            console.error('Error updating proposal:', error);
            return res.status(500).json({
                error: 'Failed to update proposal',
                message: error.message
            });
        }
    },

    async deleteProposal(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const { id } = req.params; // Changed from proposalId to id to match routes

            const result = await artisanService.deleteProposal(user.userId, id);
            return res.json(result);
        } catch (error: any) {
            console.error('Error deleting proposal:', error);
            return res.status(500).json({
                error: 'Failed to delete proposal',
                message: error.message
            });
        }
    },

    async uploadProposalImages(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const { id } = req.params;
            const files = (req.files as Express.Multer.File[]) || [];
            if (files.length === 0) {
                return res.status(400).json({ error: 'Aucune image fournie' });
            }

            const images = await artisanService.addProposalImages(user.userId, id, files);

            // Renvoie aussi l'usage global de la fiche pour rafraîchir le compteur côté UI
            const propRows: any = await query('SELECT order_id FROM review_proposals WHERE id = ?', [id]);
            const usage = propRows && propRows[0]
                ? await artisanService.getProposalImageUsage(propRows[0].order_id)
                : null;

            return res.json({ success: true, images, usage });
        } catch (error: any) {
            console.error('Error uploading proposal images:', error);
            const status = error.message?.includes('Quota') ? 400 : 500;
            return res.status(status).json({
                error: 'Failed to upload images',
                message: error.message
            });
        }
    },

    async deleteProposalImage(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const { id } = req.params;
            const { publicId } = req.query;
            if (!publicId || typeof publicId !== 'string') {
                return res.status(400).json({ error: 'publicId manquant' });
            }

            const images = await artisanService.deleteProposalImage(user.userId, id, publicId);

            const propRows: any = await query('SELECT order_id FROM review_proposals WHERE id = ?', [id]);
            const usage = propRows && propRows[0]
                ? await artisanService.getProposalImageUsage(propRows[0].order_id)
                : null;

            return res.json({ success: true, images, usage });
        } catch (error: any) {
            console.error('Error deleting proposal image:', error);
            return res.status(500).json({
                error: 'Failed to delete image',
                message: error.message
            });
        }
    },

    async sendReviewValidationEmail(req: Request, res: Response) {
        const { id: orderId } = req.params;
        const { emails } = req.body;
        const user = req.user;

        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return res.status(400).json({ error: 'At least one email is required' });
        }

        try {
            const order = await artisanService.getOrderById(orderId);
            if (!order || order.artisan_id !== user!.userId) {
                return res.status(404).json({ error: 'Order not found' });
            }

            const { sendReviewValidationEmail: sendEmail } = await import('../services/emailService');
            await sendEmail(emails, order, order.proposals);

            return res.json({ message: 'Validation email sent successfully' });
        } catch (error: any) {
            console.error('Send artisan validation email error:', error);
            return res.status(500).json({ error: error.message || 'Internal server error' });
        }
    }
};
