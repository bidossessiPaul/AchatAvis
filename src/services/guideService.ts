import api from './api';

export const guideService = {
    /**
     * Get missions available for the current guide
     */
    async getAvailableMissions(): Promise<any[]> {
        const response = await api.get('/guide/missions/available');
        return response.data;
    },

    async getMissionDetails(orderId: string): Promise<any> {
        const response = await api.get(`/guide/missions/${orderId}`);
        return response.data;
    },

    async releaseLock(orderId: string): Promise<void> {
        await api.post(`/guide/missions/${orderId}/release-lock`);
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
    }
};
