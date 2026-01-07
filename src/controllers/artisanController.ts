import { Request, Response } from 'express';
import { artisanService } from '../services/artisanService';
import { openAiService } from '../services/openAiService';

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

            const generationParams = {
                companyName: order.company_name || artisanProfile?.company_name || 'Artisan',
                trade: artisanProfile?.trade || 'Artisan',
                quantity: order.quantity || 1,
                context: order.company_context,
                sector: order.sector,
                zones: order.zones,
                tone: order.desired_tone,
                clientTypes: order.client_types,
                staffNames: order.staff_names,
                specificInstructions: order.specific_instructions
            };
            console.log("🧠 Paramètres envoyés à l'IA:", JSON.stringify(generationParams, null, 2));

            const generated = await openAiService.generateReviews(generationParams);

            // On s'assure de ne pas dépasser la quantité demandée
            const finalProposals = generated.slice(0, order.quantity);

            console.log(`💾 Sauvegarde de ${finalProposals.length} propositions...`);
            const created = await artisanService.createProposals(id, finalProposals);

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
    }
};
