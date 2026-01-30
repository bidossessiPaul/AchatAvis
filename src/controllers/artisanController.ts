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
            const { proposals } = req.body;

            if (proposals && Array.isArray(proposals) && proposals.length > 0) {
                console.log("📝 Utilisation de propositions manuelles");
                const order = await artisanService.getOrderById(id);
                if (!order) {
                    return res.status(404).json({ error: 'Order not found' });
                }
                const finalProposals = proposals.slice(0, order.quantity);
                const created = await artisanService.createProposals(id, finalProposals);
                return res.json(created);
            }

            console.log("🤖 Récupération de l'ordre pour OpenAI...");
            const order = await artisanService.getOrderById(id);
            if (!order) {
                console.error(`❌ Commande ${id} non trouvée`);
                return res.status(404).json({ error: 'Order not found' });
            }

            console.log("👤 Récupération du profil artisan pour contexte...");
            const artisanProfile: any = await artisanService.getArtisanProfileByUserId(order.artisan_id);

            // Count existing proposals to determine how many more are needed
            const existingProposals: any = await query('SELECT COUNT(*) as count FROM review_proposals WHERE order_id = ?', [id]);
            const existingCount = existingProposals[0]?.count || 0;
            const targetQuantity = order.quantity || 1;

            const { force } = req.body;
            let needed = targetQuantity - existingCount;
            let append = true;

            if (force) {
                console.log("⚠️ Force regeneration requested. Resetting all reviews.");
                needed = targetQuantity;
                append = false;
            } else {
                if (needed <= 0) {
                    console.log(`✅ Déjà ${existingCount}/${targetQuantity} avis générés. Pas d'action requise.`);
                    // Fetch and return existing
                    const current = await artisanService.createProposals(id, [], true); // effectively just gets
                    return res.json(current);
                }
            }

            // If we are forcing regeneration (e.g. user clicked "Regenerate All"), we might handle that via a query param in future, 
            // but for now, the user requested "Generate Remaining" logic.
            // However, the standard behavior of "Generate" button usually implies "Do the work".
            // If we have 0, needed = target. If we have 5/10, needed = 5.
            // If needed <= 0, we might just return existing.

            // To support "Regenerate all", the frontend should probably delete first or we add a flag.
            // For this specific request: "default generate all, if fail, button to generate rest".
            // So if I call this and I have 5/10, I expect 5 more.



            console.log(`📊 Etat actuel: ${existingCount}/${targetQuantity}. Reste à générer: ${needed}`);

            // Update params to request only needed
            const generationParams = {
                companyName: order.company_name || artisanProfile?.company_name || 'Artisan',
                ficheName: order.fiche_name,
                trade: artisanProfile?.trade || 'Artisan',
                quantity: needed, // REQUEST ONLY NEEDED
                context: order.company_context,
                sector: order.sector,
                zones: order.zones,
                services: order.services,
                staffNames: order.staff_names,
                specificInstructions: order.specific_instructions
            };
            console.log("🧠 Paramètres envoyés à l'IA:", JSON.stringify(generationParams, null, 2));

            const generated = await aiService.generateReviews(generationParams);

            // On s'assure de ne pas dépasser la quantité demandée (par rapport à ce qu'on a demandé)
            const finalProposals = generated.slice(0, needed);

            console.log(`💾 Sauvegarde de ${finalProposals.length} nouvelles propositions (Append=${append})...`);
            // Pass append mode based on force flag
            const created = await artisanService.createProposals(id, finalProposals, append);

            console.log("✅ Generation terminée avec succès !");
            return res.json(created);
        } catch (error: any) {
            console.error("❌ ERREUR FATALE GENERATION:", error);
            return res.status(500).json({ error: 'Failed to generate proposals', message: error.message });
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

    async updateProposal(req: Request, res: Response) {
        try {
            const { proposalId } = req.params;
            await artisanService.updateProposal(proposalId, req.body);
            return res.json({ success: true });
        } catch (error: any) {
            return res.status(500).json({ error: 'Failed to update proposal', message: error.message });
        }
    },

    async deleteProposal(req: Request, res: Response) {
        try {
            const { proposalId } = req.params;
            await artisanService.deleteProposal(proposalId);
            return res.json({ success: true });
        } catch (error: any) {
            return res.status(500).json({ error: 'Failed to delete proposal', message: error.message });
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
    }
};
