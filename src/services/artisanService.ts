import { query } from '../config/database';
import { ReviewOrder, ReviewProposal } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

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
                estimated_duration_days, client_cities, zones, initial_review_count
            ) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            'estimated_duration_days', 'client_cities', 'initial_review_count'
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
        SELECT ro.*, p.description as payment_description, p.amount as payment_amount
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
            WHERE p.order_id = ?
            ORDER BY p.created_at ASC
        `, [orderId]);

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
            SELECT ro.*, p.description as payment_description, p.amount as payment_amount, p.review_credits
            FROM reviews_orders ro
            LEFT JOIN payments p ON ro.payment_id = p.id
            WHERE ro.artisan_id = ? 
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

        // Clear existing proposals (draft or approved) ONLY if not appending
        if (!append) {
            await query('DELETE FROM review_proposals WHERE order_id = ?', [orderId]);
        }

        if (proposals.length === 0) {
            return query('SELECT * FROM review_proposals WHERE order_id = ?', [orderId]);
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

        return query('SELECT * FROM review_proposals WHERE order_id = ?', [orderId]);
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

        // 2. Delete the proposal
        await query('DELETE FROM review_proposals WHERE id = ?', [proposalId]);

        return { success: true, message: 'Proposition supprimée avec succès' };
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

    async deleteOrder(orderId: string) {
        // Find if it was linked to a pack and restore fiches_used?
        // Usually, deleting a draft should restore the fiche slot.
        const order: any = await query('SELECT payment_id FROM reviews_orders WHERE id = ?', [orderId]);
        if (order.length > 0 && order[0].payment_id) {
            await query('UPDATE payments SET fiches_used = GREATEST(0, fiches_used - 1) WHERE id = ?', [order[0].payment_id]);
        }

        await query('DELETE FROM review_proposals WHERE order_id = ?', [orderId]);
        return query('DELETE FROM reviews_orders WHERE id = ?', [orderId]);
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


