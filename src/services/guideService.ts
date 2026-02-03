import api from './api';

export const guideService = {
    /**
     * Get fiches available for the current guide
     */
    async getAvailablefiches(): Promise<any[]> {
        const response = await api.get('/guide/fiches/available');
        return response.data;
    },

    async getficheDetails(orderId: string): Promise<any> {
        const response = await api.get(`/guide/fiches/${orderId}`);
        return response.data;
    },

    async releaseLock(orderId: string): Promise<void> {
        await api.post(`/guide/fiches/${orderId}/release-lock`);
    },

    async submitProof(data: {
        orderId: string,
        proposalId: string,
        reviewUrl: string,
        googleEmail: string,
        artisanId: string,
        gmailAccountId?: number
    }): Promise<any> {
        const response = await api.post('/guide/submissions', data);
        return response.data;
    },

    async getSubmissions(): Promise<any[]> {
        const response = await api.get('/guide/submissions');
        return response.data;
    },

    async getStats(): Promise<any> {
        const response = await api.get('/guide/stats');
        return response.data;
    },

    async updateSubmission(id: string, data: { reviewUrl?: string, googleEmail?: string }): Promise<any> {
        const response = await api.put(`/guide/submissions/${id}`, data);
        return response.data;
    }
};
