import api from './api';
import { ReviewOrder, ReviewProposal } from '../types';

export const artisanService = {
    /**
     * Create a new order draft
     */
    async createDraft(data: Partial<ReviewOrder>): Promise<ReviewOrder & { proposals: ReviewProposal[] }> {
        const response = await api.post('/artisan/orders/draft', data);
        return response.data;
    },

    /**
     * Update an existing draft
     */
    async updateDraft(orderId: string, data: Partial<ReviewOrder>): Promise<ReviewOrder & { proposals: ReviewProposal[] }> {
        const response = await api.put(`/artisan/orders/${orderId}`, data);
        return response.data;
    },

    /**
     * Get all orders for the logged-in artisan
     */
    async getMyOrders(): Promise<ReviewOrder[]> {
        const response = await api.get('/artisan/orders');
        return response.data;
    },

    /**
     * Get a single order with its proposals
     */
    async getOrder(orderId: string): Promise<ReviewOrder & { proposals: ReviewProposal[] }> {
        const response = await api.get(`/artisan/orders/${orderId}`);
        return response.data;
    },

    /**
     * Generate AI review proposals for an order
     */
    async generateProposals(orderId: string, proposals?: Partial<ReviewProposal>[]): Promise<ReviewProposal[]> {
        const response = await api.post(`/artisan/orders/${orderId}/proposals/generate`, { proposals });
        return response.data;
    },

    /**
     * Update a specific proposal
     */
    async updateProposal(proposalId: string, data: Partial<ReviewProposal>): Promise<void> {
        await api.put(`/artisan/proposals/${proposalId}`, data);
    },

    /**
     * Delete a specific proposal
     */
    async deleteProposal(proposalId: string): Promise<void> {
        await api.delete(`/artisan/proposals/${proposalId}`);
    },

    /**
     * Delete a specific proposal
     */
    async toggleProposalStatus(proposalId: string, status: string): Promise<void> {
        await api.put(`/artisan/proposals/${proposalId}`, { status });
    },

    async createCheckoutSession(planId: string): Promise<{ url: string }> {
        const response = await api.post('/payment/create-checkout-session', { planId });
        return response.data;
    },

    async verifyPaymentSession(sessionId: string): Promise<{ success: boolean, status: string, accessToken?: string }> {
        const response = await api.get(`/payment/verify-session/${sessionId}`);
        return response.data;
    },

    async getGoogleUrlHistory(): Promise<string[]> {
        const response = await api.get('/artisan/orders/history/urls');
        return response.data;
    },

    async deleteOrder(orderId: string): Promise<void> {
        await api.delete(`/artisan/orders/${orderId}`);
    },

    async getSubscriptionPacks(): Promise<any[]> {
        const response = await api.get('/artisan/packs');
        return response.data;
    },

    async getMySubmissions(): Promise<any[]> {
        const response = await api.get('/artisan/submissions');
        return response.data;
    },

    async getPaymentHistory(): Promise<any[]> {
        const response = await api.get('/payment/history');
        return response.data;
    },

    async getAvailablePacks(includeId?: string): Promise<any[]> {
        const response = await api.get('/artisan/available-packs', { params: { includeId } });
        return response.data;
    }
};
