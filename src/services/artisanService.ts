import { query } from '../config/database';
import { ReviewOrder, ReviewProposal } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

export const artisanService = {
    /**
     * Create a new review order draft
     */
    async createOrderDraft(artisanId: string, data: Partial<ReviewOrder>) {
        // 1. Check if artisan has mission slots available
        const profile: any = await this.getArtisanProfileByUserId(artisanId);
        if (!profile) throw new Error("Profile not found");

        const { payment_id } = data;
        console.log(`🛠️ CREATE DRAFT: user=${artisanId}, payment_id=${payment_id}, data=`, JSON.stringify(data));

        if (!payment_id) {
            console.warn("❌ Missing payment_id");
            throw new Error("Veuillez sélectionner un pack pour cette mission.");
        }

        const packs: any = await query(
            'SELECT missions_quota, missions_used FROM payments WHERE id = ? AND user_id = ? AND type = "subscription" AND status = "completed"',
            [payment_id, artisanId]
        );

        if (packs.length === 0) throw new Error("Pack non trouvé ou invalide.");
        const pack = packs[0];

        if (pack.missions_used >= pack.missions_quota) {
            throw new Error("Ce pack est déjà entièrement utilisé. Veuillez en sélectionner un autre.");
        }

        const orderId = uuidv4();
        const { quantity = 1, company_name = '', company_context = '', google_business_url = '', staff_names = '', specific_instructions = '' } = data;

        // Calculate price based on quantity (simulation)
        const price = quantity * 2; // 2€ per review for example

        await query(
            `INSERT INTO reviews_orders (id, artisan_id, quantity, price, status, company_name, company_context, google_business_url, staff_names, specific_instructions, payment_id)
             VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)`,
            [orderId, artisanId, quantity, price, company_name, company_context, google_business_url, staff_names, specific_instructions, payment_id]
        );

        // Update missions_used in payments table (Mark pack as used)
        await query(
            'UPDATE payments SET missions_used = missions_used + 1 WHERE id = ?',
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

        const updateableFields = [
            'company_name', 'company_context', 'sector', 'zones',
            'positioning', 'client_types', 'desired_tone', 'quantity', 'status', 'google_business_url',
            'staff_names', 'specific_instructions'
        ];

        for (const field of updateableFields) {
            if (data[field as keyof ReviewOrder] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field as keyof ReviewOrder]);
            }
        }

        // Note: Automatic published_at and proposal approval removed.
        // This is now handled by Admin approval.

        // Quantity change doesn't affect pack usage status, as a pack is marked used upon order creation.
        // No need to adjust missions_used here based on quantity changes.

        if (fields.length === 0) return this.getOrderById(orderId);

        values.push(orderId);
        await query(
            `UPDATE reviews_orders SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        return this.getOrderById(orderId);
    },

    /**
     * Get order by ID with proposals
     */
    async getOrderById(orderId: string) {
        const orders: any = await query('SELECT * FROM reviews_orders WHERE id = ?', [orderId]);
        if (orders.length === 0) return null;

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
            ...orders[0],
            proposals
        };
    },

    /**
     * Get all orders for an artisan
     */
    async getArtisanOrders(artisanId: string) {
        return query('SELECT * FROM reviews_orders WHERE artisan_id = ? ORDER BY created_at DESC', [artisanId]);
    },

    /**
     * Create AI generated proposals for an order
     */
    async createProposals(orderId: string, proposals: Partial<ReviewProposal>[]) {
        if (!Array.isArray(proposals)) {
            console.error("❌ createProposals: proposals n'est pas un tableau", proposals);
            throw new Error("Proposals must be an array");
        }

        // Clear existing proposals (draft or approved) to allow full regeneration
        await query('DELETE FROM review_proposals WHERE order_id = ?', [orderId]);

        for (const p of proposals) {
            const id = uuidv4();
            await query(
                `INSERT INTO review_proposals (id, order_id, content, rating, author_name, status)
                 VALUES (?, ?, ?, ?, ?, 'draft')`,
                [id, orderId, p.content || '', p.rating || 5, p.author_name || 'Anonyme']
            );
        }

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
     * Delete a proposal
     */
    async deleteProposal(proposalId: string) {
        return query('DELETE FROM review_proposals WHERE id = ?', [proposalId]);
    },

    /**
     * Update a proposal content/rating
     */
    async updateProposal(proposalId: string, data: Partial<ReviewProposal>) {
        const fields = [];
        const values = [];

        if (data.content !== undefined) { fields.push('content = ?'); values.push(data.content); }
        if (data.rating !== undefined) { fields.push('rating = ?'); values.push(data.rating); }
        if (data.author_name !== undefined) { fields.push('author_name = ?'); values.push(data.author_name); }
        if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

        if (fields.length === 0) return;

        values.push(proposalId);
        await query(`UPDATE review_proposals SET ${fields.join(', ')} WHERE id = ?`, values);
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
                s.id,
                s.status,
                s.review_url,
                s.submitted_at,
                s.earnings,
                s.rejection_reason,
                p.content as proposal_content,
                p.author_name as proposal_author,
                p.rating,
                o.company_name,
                u.full_name as guide_name
            FROM reviews_submissions s
            JOIN review_proposals p ON s.proposal_id = p.id
            JOIN reviews_orders o ON p.order_id = o.id
            JOIN users u ON s.guide_id = u.id
            WHERE s.artisan_id = ?
            ORDER BY s.submitted_at DESC
        `, [artisanId]);
    },

    async deleteOrder(orderId: string) {
        // Find if it was linked to a pack and restore missions_used?
        // Usually, deleting a draft should restore the mission slot.
        const order: any = await query('SELECT payment_id FROM reviews_orders WHERE id = ?', [orderId]);
        if (order.length > 0 && order[0].payment_id) {
            await query('UPDATE payments SET missions_used = GREATEST(0, missions_used - 1) WHERE id = ?', [order[0].payment_id]);
        }

        await query('DELETE FROM review_proposals WHERE order_id = ?', [orderId]);
        return query('DELETE FROM reviews_orders WHERE id = ?', [orderId]);
    },

    /**
     * Get available mission packs (payments with remaining quota)
     */
    async getAvailablePacks(artisanId: string) {
        const results = await query(
            'SELECT id, description, missions_quota, missions_used, created_at, type, status FROM payments WHERE user_id = ? ORDER BY created_at ASC',
            [artisanId]
        );
        console.log(`📦 PAYMENTS FOUND for ${artisanId}:`, JSON.stringify(results, null, 2));

        // A pack is available if it's a completed subscription and has NOT been used for a mission yet
        return (results as any[]).filter(p =>
            p.type === "subscription" &&
            p.status === "completed" &&
            p.missions_used === 0
        );
    }
};
