import { query } from '../config/database';
import { ReviewOrder, ReviewProposal } from '../models/types';
import { v4 as uuidv4 } from 'uuid';
import { uploadToCloudinary, deleteFromCloudinary } from './cloudinaryService';

// Quota d'images selon la taille du pack (avis commandés sur la fiche).
// 30 avis → 5 images, 60 → 10, 90 → 25 (par défaut 5).
export function getImageQuotaForQuantity(quantity: number): number {
    if (!quantity || quantity < 30) return 5;
    if (quantity >= 90) return 25;
    if (quantity >= 60) return 10;
    return 5;
}

export type ProposalImage = { url: string; publicId: string };

export function parseImages(raw: any): ProposalImage[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try { return JSON.parse(raw) || []; } catch { return []; }
    }
    return [];
}

export const artisanService = {
    /**
     * Create a new review order draft
     */
    async createOrderDraft(artisanId: string, data: Partial<ReviewOrder>) {
        // 1. Check if artisan has fiche slots available
        const profile: any = await this.getArtisanProfileByUserId(artisanId);
        if (!profile) throw new Error("Profile not found");

        const { payment_id } = data;
        console.log(`🛠️ CREATE DRAFT: user=${artisanId}, payment_id=${payment_id}, data=`, JSON.stringify(data));

        if (!payment_id) {
            console.warn("❌ Missing payment_id");
            throw new Error("Veuillez sélectionner un pack pour cette fiche.");
        }

        const packs: any = await query(
            'SELECT fiches_quota, fiches_used, amount, review_credits FROM payments WHERE id = ? AND user_id = ? AND type = "subscription" AND status = "completed"',
            [payment_id, artisanId]
        );

        if (packs.length === 0) throw new Error("Pack non trouvé ou invalide.");
        const pack = packs[0];

        if (pack.fiches_used >= pack.fiches_quota) {
            throw new Error("Ce pack est déjà entièrement utilisé. Veuillez en sélectionner un nouveau.");
        }

        const {
            fiche_name = '',
            quantity = 1,
            company_name = '',
            company_context = '',
            google_business_url = '',
            services = '',
            staff_names = '',
            specific_instructions = '',
            sector = '',
            sector_id = null,
            sector_slug = '',
            sector_difficulty = 'easy',
            city = '',
            reviews_per_day = 3,
            rhythme_mode = 'modere',
            estimated_duration_days = 0,
            client_cities = [],
            initial_review_count = 0
        } = data;

        const finalClientCities = Array.isArray(client_cities) ? JSON.stringify(client_cities) : client_cities;

        // Use the actual price paid for the pack (1 Pack = 1 fiche logic)
        const price = parseFloat(pack.amount);

        const orderId = uuidv4();
        const orderQuantity = pack.review_credits || quantity;

        await query(
            `INSERT INTO reviews_orders (
                id, fiche_name, artisan_id, quantity, price, status, company_name, company_context, 
                google_business_url, services, staff_names, specific_instructions, payment_id,
                sector, sector_id, sector_slug, sector_difficulty, city, reviews_per_day, rhythme_mode,
                estimated_duration_days, client_cities, zones, initial_review_count, payout_per_review
            ) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1.00)`,
            [
                orderId, fiche_name, artisanId, orderQuantity, price, company_name, company_context,
                google_business_url, services, staff_names, specific_instructions, payment_id,
                sector, sector_id, sector_slug, sector_difficulty, city, reviews_per_day, rhythme_mode,
                estimated_duration_days, finalClientCities, data.zones || '', initial_review_count
            ]
        );

        // Update fiches_used in payments table (Mark pack as used)
        await query(
            'UPDATE payments SET fiches_used = fiches_used + 1 WHERE id = ?',
            [payment_id]
        );

        return this.getOrderById(orderId);
    },

    /**
     * Update an existing draft with enriched info
     */
    async updateOrderDraft(orderId: string, data: Partial<ReviewOrder>) {
        const fields = [];
        const values = [];

        // Check if status is transitioning to 'submitted'
        let shouldSendNotifications = false;
        let artisanInfo: any = null;

        if (data.status === 'submitted') {
            const currentOrder: any = await this.getOrderById(orderId);
            if (currentOrder && currentOrder.status === 'draft') {
                shouldSendNotifications = true;
                // Fetch artisan details for email
                const [rows]: any = await query(`
                    SELECT u.email, u.full_name 
                    FROM users u 
                    WHERE u.id = ?
                `, [currentOrder.artisan_id]);
                if (rows && rows.length > 0) {
                    artisanInfo = rows[0];
                }
            }
        }

        const updateableFields = [
            'fiche_name', 'company_name', 'company_context', 'sector', 'zones',
            'services', 'positioning', 'client_types', 'desired_tone', 'quantity', 'status', 'google_business_url',
            'staff_names', 'specific_instructions', 'city',
            // Anti-Detection Fields
            'sector_id', 'sector_slug', 'sector_difficulty', 'reviews_per_day', 'rhythme_mode',
            'estimated_duration_days', 'client_cities', 'initial_review_count',
            // Plage horaire de disponibilité de la fiche pour les guides
            'available_from', 'available_to'
        ];

        for (const field of updateableFields) {
            if (data[field as keyof ReviewOrder] !== undefined) {
                fields.push(`${field} = ?`);

                // Handle JSON fields
                let value = data[field as keyof ReviewOrder];
                if (field === 'client_cities' && typeof value === 'object') {
                    value = JSON.stringify(value);
                }

                values.push(value);
            }
        }

        if (fields.length > 0) {
            values.push(orderId);
            await query(
                `UPDATE reviews_orders SET ${fields.join(', ')} WHERE id = ?`,
                values as any
            );
        }

        const updatedOrder = await this.getOrderById(orderId);

        // Send notifications if transitioning to 'submitted'
        if (shouldSendNotifications && artisanInfo && updatedOrder) {
            const { sendficheSubmittedArtisanEmail, sendficheSubmittedAdminEmail } = await import('./emailService');
            sendficheSubmittedArtisanEmail(
                artisanInfo.email,
                artisanInfo.full_name,
                updatedOrder.company_name,
                orderId
            ).catch(err => console.error('Failed to send fiche submission email to artisan:', err));

            sendficheSubmittedAdminEmail(
                artisanInfo.full_name,
                updatedOrder.company_name,
                orderId
            ).catch(err => console.error('Failed to send fiche submission email to admin:', err));
        }

        return updatedOrder;
    },

    /**
     * Get order by ID with proposals
     */
    async getOrderById(orderId: string) {
        const orders: any = await query(`
        SELECT ro.*, p.description as payment_description, p.amount as payment_amount,
               (SELECT COUNT(*) FROM reviews_submissions s
                WHERE s.order_id = ro.id AND s.status = 'validated') as reviews_validated
        FROM reviews_orders ro
        LEFT JOIN payments p ON ro.payment_id = p.id
        WHERE ro.id = ?
    `, [orderId]);
        if (orders.length === 0) return null;

        let order = orders[0];

        // DYNAMIC: Override quantity based on pack credits if available
        if (order.payment_id) {
            const [p]: any = await query('SELECT review_credits, description FROM payments WHERE id = ?', [order.payment_id]);
            if (p) {
                if (p.review_credits) {
                    order.quantity = p.review_credits;
                }

                // Set human readable pack name for UI
                const desc = p.description ? p.description.toLowerCase() : '';
                if (desc.includes('expert')) order.pack_name = 'Pack Expert';
                else if (desc.includes('croissance') || desc.includes('growth')) order.pack_name = 'Pack Croissance';
                else if (desc.includes('découverte') || desc.includes('discovery')) order.pack_name = 'Pack Découverte';
                else order.pack_name = p.description;
            }
        }

        // Use active pack price if available
        if (order.payment_amount) {
            order.price = parseFloat(order.payment_amount);
        }

        // Parse client_cities if it's a string
        if (order.client_cities && typeof order.client_cities === 'string') {
            try {
                order.client_cities = JSON.parse(order.client_cities);
            } catch (e) {
                console.error("Failed to parse client_cities", e);
                order.client_cities = [];
            }
        }
        const proposals: any = await query(`
            SELECT
                p.*,
                s.id as submission_id,
                s.review_url,
                s.submitted_at,
                s.status as submission_status
            FROM review_proposals p
            LEFT JOIN reviews_submissions s ON p.id = s.proposal_id
            WHERE p.order_id = ? AND p.deleted_at IS NULL
            ORDER BY p.created_at ASC
        `, [orderId]);

        // Parse les images JSON pour chaque proposition (toujours un tableau)
        for (const p of proposals) {
            p.images = parseImages(p.images);
        }

        return {
            ...order,
            proposals
        };
    },

    /**
     * Get all orders for an artisan
     */
    async getArtisanOrders(artisanId: string) {
        const orders: any[] = await query(`
            SELECT ro.*, p.description as payment_description, p.amount as payment_amount, p.review_credits,
                   (SELECT COUNT(*) FROM reviews_submissions s
                    WHERE s.order_id = ro.id AND s.status = 'validated') as reviews_validated
            FROM reviews_orders ro
            LEFT JOIN payments p ON ro.payment_id = p.id
            WHERE ro.artisan_id = ? AND ro.deleted_at IS NULL
            ORDER BY ro.created_at DESC
        `, [artisanId]);

        // Enrich with pack name and fix quantity
        const packs = await this.getSubscriptionPacks();

        return orders.map(order => {
            let packName = 'Pack Inconnu';
            let realQuantity = order.quantity;

            if (order.payment_description) {
                const desc = order.payment_description.toLowerCase();
                const matchedPack = packs.find((p: any) => desc.includes(p.id));

                if (matchedPack) {
                    packName = matchedPack.name;
                    // Use credits from payment record preferentially
                    realQuantity = order.review_credits || matchedPack.quantity;
                } else if (desc.includes('expert')) {
                    packName = 'Pack Expert';
                    realQuantity = order.review_credits || 20;
                }
                else if (desc.includes('croissance') || desc.includes('growth')) {
                    packName = 'Pack Croissance';
                    realQuantity = order.review_credits || 10;
                }
                else if (desc.includes('découverte') || desc.includes('discovery')) {
                    packName = 'Pack Découverte';
                    realQuantity = order.review_credits || 5;
                }
                else packName = order.payment_description;

                // Final fallback/override to specific credits if they exist and are different
                if (order.review_credits && order.review_credits !== realQuantity) {
                    realQuantity = order.review_credits;
                }
            }

            return {
                ...order,
                pack_name: packName,
                quantity: realQuantity,
                price: order.payment_amount ? parseFloat(order.payment_amount) : order.price
            };
        });
    },

    /**
     * Create AI generated proposals for an order
     */
    async createProposals(orderId: string, proposals: Partial<ReviewProposal>[], append: boolean = false) {
        if (!Array.isArray(proposals)) {
            console.error("❌ createProposals: proposals n'est pas un tableau", proposals);
            throw new Error("Proposals must be an array");
        }

        // Clear existing proposals (draft or approved) ONLY if not appending.
        // Soft delete : on préserve l'historique (les submissions qui pointent
        // sur un proposal gardent la référence intacte).
        if (!append) {
            await query(
                'UPDATE review_proposals SET deleted_at = NOW() WHERE order_id = ? AND deleted_at IS NULL',
                [orderId]
            );
        }

        if (proposals.length === 0) {
            return query('SELECT * FROM review_proposals WHERE order_id = ? AND deleted_at IS NULL ORDER BY created_at ASC', [orderId]);
        }

        const values: any[] = [];
        const placeholders: string[] = [];

        for (const p of proposals) {
            const id = uuidv4();
            placeholders.push('(?, ?, ?, ?, ?, "draft")');
            values.push(id, orderId, p.content || '', p.rating || 5, p.author_name || 'Anonyme');
        }

        await query(
            `INSERT INTO review_proposals (id, order_id, content, rating, author_name, status)
             VALUES ${placeholders.join(', ')}`,
            values
        );

        return query('SELECT * FROM review_proposals WHERE order_id = ? AND deleted_at IS NULL ORDER BY created_at ASC', [orderId]);
    },

    async getUsedGoogleUrls(artisanId: string) {
        const results: any = await query(
            'SELECT DISTINCT google_business_url FROM reviews_orders WHERE artisan_id = ? AND google_business_url IS NOT NULL AND google_business_url != "" ORDER BY created_at DESC LIMIT 10',
            [artisanId]
        );
        return results.map((r: any) => r.google_business_url);
    },

    /**
     * Update a proposal content/rating (SECURE VERSION with ownership checks)
     * Artisans can modify proposals at ANY TIME
     */
    async updateProposal(artisanId: string, proposalId: string, data: { content?: string, author_name?: string, rating?: number }) {
        if (!proposalId) {
            throw new Error('ID de proposition manquant');
        }
        // 1. Verify that the proposal exists and belongs to the artisan
        const existing: any = await query(`
            SELECT rp.id, ro.artisan_id
            FROM review_proposals rp
            JOIN reviews_orders ro ON rp.order_id = ro.id
            WHERE rp.id = ?
        `, [proposalId]);

        if (!existing || existing.length === 0) {
            throw new Error('Proposition non trouvée');
        }

        if (existing[0].artisan_id !== artisanId) {
            throw new Error('Non autorisé à modifier cette proposition');
        }

        // Artisan can modify at ANY TIME (removed submission_id check per user request)

        // 2. Prepare update fields (ensure no undefined values)
        const updates: string[] = [];
        const params: any[] = [];

        if (data.content !== undefined && data.content !== null) {
            updates.push('content = ?');
            params.push(data.content);
        }

        if (data.author_name !== undefined && data.author_name !== null) {
            updates.push('author_name = ?');
            params.push(data.author_name);
        }

        if (data.rating !== undefined && data.rating !== null) {
            updates.push('rating = ?');
            params.push(data.rating);
        }

        if (updates.length === 0) {
            return { success: true, message: 'Aucune modification' };
        }

        params.push(proposalId);

        // 3. Perform update
        await query(`
            UPDATE review_proposals 
            SET ${updates.join(', ')} 
            WHERE id = ?
        `, params);

        return { success: true, message: 'Proposition mise à jour avec succès' };
    },

    /**
     * Delete a proposal (SECURE VERSION with ownership checks)
     * Artisans can delete proposals at ANY TIME
     */
    async deleteProposal(artisanId: string, proposalId: string) {
        if (!proposalId) {
            throw new Error('ID de proposition manquant');
        }
        // 1. Verify that the proposal exists and belongs to the artisan
        const existing: any = await query(`
            SELECT rp.id, ro.artisan_id
            FROM review_proposals rp
            JOIN reviews_orders ro ON rp.order_id = ro.id
            WHERE rp.id = ?
        `, [proposalId]);

        if (!existing || existing.length === 0) {
            throw new Error('Proposition non trouvée');
        }

        if (existing[0].artisan_id !== artisanId) {
            throw new Error('Non autorisé à supprimer cette proposition');
        }

        // Artisan can delete at ANY TIME (removed submission_id check per user request)

        // 2. Soft delete the proposal (historique préservé, référence intacte pour les submissions existantes)
        await query(
            'UPDATE review_proposals SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
            [proposalId]
        );

        return { success: true, message: 'Proposition supprimée avec succès' };
    },

    /**
     * Récupère le quota d'images de la fiche + nombre déjà utilisé
     * (somme sur toutes les propositions non supprimées de la fiche).
     */
    async getProposalImageUsage(orderId: string): Promise<{ used: number; quota: number; quantity: number }> {
        const orderRows: any = await query(
            'SELECT quantity, payment_id FROM reviews_orders WHERE id = ?',
            [orderId]
        );
        if (!orderRows || orderRows.length === 0) {
            throw new Error('Fiche introuvable');
        }
        let quantity = orderRows[0].quantity || 0;

        // La quantité réelle peut être surchargée par le pack (review_credits)
        if (orderRows[0].payment_id) {
            const [p]: any = await query(
                'SELECT review_credits FROM payments WHERE id = ?',
                [orderRows[0].payment_id]
            );
            if (p && p.review_credits) quantity = p.review_credits;
        }

        const rows: any = await query(
            'SELECT images FROM review_proposals WHERE order_id = ? AND deleted_at IS NULL',
            [orderId]
        );
        let used = 0;
        for (const r of rows) used += parseImages(r.images).length;

        return { used, quota: getImageQuotaForQuantity(quantity), quantity };
    },

    /**
     * Ajoute des images à une proposition après vérification d'ownership et de quota.
     * Renvoie la liste finale d'images de la proposition.
     */
    async addProposalImages(artisanId: string, proposalId: string, files: Express.Multer.File[]): Promise<ProposalImage[]> {
        if (!files || files.length === 0) {
            throw new Error('Aucune image fournie');
        }

        // 1. Ownership + récupération orderId / images existantes
        const existing: any = await query(`
            SELECT rp.id, rp.images, rp.order_id, ro.artisan_id
            FROM review_proposals rp
            JOIN reviews_orders ro ON rp.order_id = ro.id
            WHERE rp.id = ? AND rp.deleted_at IS NULL
        `, [proposalId]);

        if (!existing || existing.length === 0) {
            throw new Error('Proposition non trouvée');
        }
        if (existing[0].artisan_id !== artisanId) {
            throw new Error('Non autorisé à modifier cette proposition');
        }

        const orderId = existing[0].order_id;
        const currentImages = parseImages(existing[0].images);

        // 2. Vérifie le quota global de la fiche
        const usage = await this.getProposalImageUsage(orderId);
        if (usage.used + files.length > usage.quota) {
            const remaining = Math.max(0, usage.quota - usage.used);
            throw new Error(
                `Quota d'images dépassé pour cette fiche. Quota: ${usage.quota}, déjà utilisé: ${usage.used}, restant: ${remaining}.`
            );
        }

        // 3. Upload Cloudinary séquentiel (pour ne pas saturer)
        const uploaded: ProposalImage[] = [];
        for (const file of files) {
            const result = await uploadToCloudinary(file.buffer, 'review-images', { skipTransform: true });
            uploaded.push({ url: result.secure_url, publicId: result.public_id });
        }

        const finalImages = [...currentImages, ...uploaded];

        // 4. Persiste
        await query(
            'UPDATE review_proposals SET images = ? WHERE id = ?',
            [JSON.stringify(finalImages), proposalId]
        );

        return finalImages;
    },

    /**
     * Supprime une image d'une proposition (suppression Cloudinary + JSON).
     */
    async deleteProposalImage(artisanId: string, proposalId: string, publicId: string): Promise<ProposalImage[]> {
        if (!publicId) throw new Error('publicId manquant');

        const existing: any = await query(`
            SELECT rp.id, rp.images, ro.artisan_id
            FROM review_proposals rp
            JOIN reviews_orders ro ON rp.order_id = ro.id
            WHERE rp.id = ? AND rp.deleted_at IS NULL
        `, [proposalId]);

        if (!existing || existing.length === 0) {
            throw new Error('Proposition non trouvée');
        }
        if (existing[0].artisan_id !== artisanId) {
            throw new Error('Non autorisé à modifier cette proposition');
        }

        const currentImages = parseImages(existing[0].images);
        const target = currentImages.find(img => img.publicId === publicId);
        if (!target) throw new Error('Image non trouvée');

        const finalImages = currentImages.filter(img => img.publicId !== publicId);

        await query(
            'UPDATE review_proposals SET images = ? WHERE id = ?',
            [JSON.stringify(finalImages), proposalId]
        );

        // Best-effort sur Cloudinary (pas bloquant si erreur réseau)
        try { await deleteFromCloudinary(publicId); } catch (e) { console.error('Cloudinary delete failed:', e); }

        return finalImages;
    },

    /**
     * Get artisan profile by user ID
     */
    async getArtisanProfileByUserId(userId: string) {
        const profiles: any = await query(`
            SELECT 
                ap.*,
                u.email,
                u.status as user_status
            FROM artisans_profiles ap
            JOIN users u ON u.id = ap.user_id
            WHERE ap.user_id = ?
        `, [userId]);
        return profiles.length > 0 ? profiles[0] : null;
    },

    /**
     * Get all available subscription packs
     */
    async getSubscriptionPacks() {
        const packs: any = await query('SELECT * FROM subscription_packs ORDER BY price_cents ASC');
        return packs.map((p: any) => ({
            ...p,
            features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features,
            is_popular: !!p.is_popular
        }));
    },

    /**
     * Get all submissions (received reviews) for an artisan
     */
    async getArtisanSubmissions(artisanId: string) {
        return query(`
            SELECT 
                p.id as proposal_id,
                p.content as proposal_content,
                p.author_name as proposal_author,
                p.rating,
                p.status as proposal_status,
                s.id as submission_id,
                s.status as submission_status,
                s.review_url,
                s.submitted_at,
                s.earnings,
                s.rejection_reason,
                o.fiche_name,
                o.id as fiche_id,
                o.company_name,
                u.full_name as guide_name,
                p.created_at as proposal_date
            FROM review_proposals p
            JOIN reviews_orders o ON p.order_id = o.id
            LEFT JOIN reviews_submissions s ON p.id = s.proposal_id
            LEFT JOIN users u ON s.guide_id = u.id
            WHERE o.artisan_id = ?
            ORDER BY COALESCE(s.submitted_at, p.created_at) DESC
        `, [artisanId]);
    },

    /**
     * Pause a fiche (hide from guides temporarily)
     */
    async pauseFiche(orderId: string, artisanId: string) {
        const orders: any = await query(
            'SELECT id, status, artisan_id FROM reviews_orders WHERE id = ?',
            [orderId]
        );

        if (orders.length === 0) throw new Error('Fiche non trouvée');
        const order = orders[0];

        if (order.artisan_id !== artisanId) {
            throw new Error('Non autorisé à modifier cette fiche');
        }

        const pausableStatuses = ['submitted', 'pending', 'in_progress'];
        if (!pausableStatuses.includes(order.status)) {
            throw new Error(`Impossible de mettre en pause une fiche avec le statut "${order.status}"`);
        }

        await query(
            `UPDATE reviews_orders
             SET status = 'paused', status_before_pause = ?, paused_at = NOW()
             WHERE id = ?`,
            [order.status, orderId]
        );

        return this.getOrderById(orderId);
    },

    /**
     * Resume a paused fiche (restore previous status)
     */
    async resumeFiche(orderId: string, artisanId: string) {
        const orders: any = await query(
            'SELECT id, status, artisan_id, status_before_pause FROM reviews_orders WHERE id = ?',
            [orderId]
        );

        if (orders.length === 0) throw new Error('Fiche non trouvée');
        const order = orders[0];

        if (order.artisan_id !== artisanId) {
            throw new Error('Non autorisé à modifier cette fiche');
        }

        if (order.status !== 'paused') {
            throw new Error('Cette fiche n\'est pas en pause');
        }

        const restoreStatus = order.status_before_pause || 'submitted';

        await query(
            `UPDATE reviews_orders
             SET status = ?, status_before_pause = NULL, paused_at = NULL
             WHERE id = ?`,
            [restoreStatus, orderId]
        );

        return this.getOrderById(orderId);
    },

    async deleteOrder(orderId: string) {
        // Find if it was linked to a pack and restore fiches_used?
        // Usually, deleting a draft should restore the fiche slot.
        const order: any = await query('SELECT payment_id FROM reviews_orders WHERE id = ?', [orderId]);
        if (order.length > 0 && order[0].payment_id) {
            await query('UPDATE payments SET fiches_used = GREATEST(0, fiches_used - 1) WHERE id = ?', [order[0].payment_id]);
        }

        // Soft delete : historique préservé (les submissions restent, les liens proposals/orders aussi).
        await query(
            'UPDATE review_proposals SET deleted_at = NOW() WHERE order_id = ? AND deleted_at IS NULL',
            [orderId]
        );
        return query(
            'UPDATE reviews_orders SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
            [orderId]
        );
    },

    /**
     * Get available fiche packs (payments with remaining quota)
     */
    async getAvailablePacks(artisanId: string, includeId?: string) {
        const results = await query(
            'SELECT id, description, fiches_quota, fiches_used, review_credits, created_at, type, status, amount FROM payments WHERE user_id = ? ORDER BY created_at ASC',
            [artisanId]
        );
        console.log(`📦 PAYMENTS FOUND for ${artisanId}:`, JSON.stringify(results, null, 2));

        // A pack is available if it's a completed subscription and has NOT exceeded its quota
        const packs = (results as any[]).filter(p =>
            p.type === "subscription" &&
            p.status === "completed" &&
            (p.fiches_used < p.fiches_quota || p.id === includeId)
        );

        // Fetch subscription definitions to map identities
        const definitions: any = await query('SELECT * FROM subscription_packs');

        return packs.map(p => {
            const desc = p.description ? p.description.toLowerCase() : '';

            // 1. Try to find by direct ID match OR French keyword match
            let def = definitions.find((d: any) => {
                if (desc.includes(d.id.toLowerCase())) return true;
                if (d.id === 'growth' && desc.includes('croissance')) return true;
                if (d.id === 'discovery' && (desc.includes('decouverte') || desc.includes('découverte'))) return true;
                return false;
            });

            // If no definition match, use description as name
            let finalName = p.description || 'Pack Booster';
            if (def) {
                finalName = `Pack ${def.name}`;
            }

            // The core fix: use review_credits from the payment record
            const finalQuantity = p.review_credits || (def ? def.quantity : 10);

            return {
                ...p,
                review_quantity: finalQuantity,
                pack_name: finalName,
                pack_features: def ? def.features : null
            };
        });
    },

    /**
     * Get statistics for artisan dashboard
     */
    async getArtisanStats(artisanId: string) {
        // 1. Status Breakdown
        const statusBreakdown: any = await query(`
            SELECT status, COUNT(*) as count 
            FROM reviews_orders 
            WHERE artisan_id = ? 
            GROUP BY status
        `, [artisanId]);

        // 2. Weekly Growth (published reviews over the last 4 weeks)
        const weeklyGrowth: any = await query(`
            SELECT 
                DATE_FORMAT(submitted_at, '%Y-%u') as week_code,
                YEAR(submitted_at) as year,
                WEEK(submitted_at, 1) as week,
                COUNT(*) as count
            FROM reviews_submissions
            WHERE artisan_id = ? 
            AND status = 'validated'
            AND submitted_at >= DATE_SUB(NOW(), INTERVAL 8 WEEK)
            GROUP BY week_code, year, week
            ORDER BY year ASC, week ASC
        `, [artisanId]);

        // 3. Sector Distribution
        const sectorDist: any = await query(`
            SELECT 
                COALESCE(sd.sector_name, 'Autre') as name, 
                COUNT(*) as value
            FROM reviews_orders ro
            LEFT JOIN sector_difficulty sd ON ro.sector_id = sd.id
            WHERE ro.artisan_id = ?
            GROUP BY name
        `, [artisanId]);

        // 4. Global KPIs (fiches & Reviews)
        const ficheKpis: any = await query(`
            SELECT 
                COUNT(DISTINCT id) as total_fiches,
                SUM(quantity) as total_reviews_ordered,
                SUM(reviews_received) as total_reviews_received
            FROM reviews_orders
            WHERE artisan_id = ?
        `, [artisanId]);

        // 5. Financial KPIs (Actual money spent)
        const financialKpis: any = await query(`
            SELECT 
                SUM(amount) as total_investment
            FROM payments
            WHERE user_id = ? AND status = 'completed'
        `, [artisanId]);

        return {
            statusBreakdown,
            weeklyGrowth: weeklyGrowth.map((w: any) => ({
                label: `Semaine ${w.week}`,
                count: w.count
            })),
            sectorDistribution: sectorDist,
            kpis: {
                ...(ficheKpis[0] || { total_fiches: 0, total_reviews_ordered: 0, total_reviews_received: 0 }),
                total_investment: financialKpis[0]?.total_investment || 0
            }
        };
    }
};


