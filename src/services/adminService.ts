import api from './api';

export const adminService = {
    /**
     * Get all artisans
     */
    getArtisans: async () => {
        const response = await api.get('/admin/artisans');
        return response.data;
    },

    getGlobalStats: async () => {
        const response = await api.get('/admin/stats');
        return response.data;
    },

    /**
     * Get all local guides
     */
    getGuides: async () => {
        const response = await api.get('/admin/guides');
        return response.data;
    },

    /**
     * Get detailed artisan info
     */
    getArtisanDetail: async (userId: string) => {
        const response = await api.get(`/admin/artisans/${userId}`);
        return response.data;
    },

    /**
     * Update artisan profile
     */
    updateArtisan: async (userId: string, data: any) => {
        const response = await api.patch(`/admin/artisans/${userId}`, data);
        return response.data;
    },

    /**
     * Get detailed guide info
     */
    getGuideDetail: async (userId: string) => {
        const response = await api.get(`/admin/guides/${userId}`);
        return response.data;
    },

    /**
     * Update user status (block/unblock)
     */
    updateUserStatus: async (userId: string, status: string, reason?: string) => {
        const response = await api.patch(`/admin/users/${userId}/status`, { status, reason });
        return response.data;
    },

    /**
     * Delete user
     */
    deleteUser: async (userId: string) => {
        const response = await api.delete(`/admin/users/${userId}`);
        return response.data;
    },

    /**
     * Get history for a specific Gmail account (Admin auditing)
     */
    getGmailAccountHistory: async (accountId: number) => {
        const response = await api.get(`/anti-detection/gmail-history/${accountId}`);
        return response.data.data;
    },

    /**
     * Issue a formal warning to a user
     */
    issueWarning: async (userId: string, reason: string, warningCount?: number) => {
        const response = await api.post(`/admin/users/${userId}/warning`, { reason, warningCount });
        return response.data;
    },

    /**
     * Get standardized reasons for warnings and suspensions
     */
    getSuspensionReasons: async () => {
        const response = await api.get('/admin/reasons');
        return response.data;
    },

    /**
     * Manually activate a pack for an artisan
     */
    activateArtisanPack: async (userId: string, packId: string) => {
        const response = await api.post(`/admin/artisans/${userId}/activate-pack`, { packId });
        return response.data;
    },

    /**
     * Create a new artisan from admin panel
     */
    createArtisan: async (data: {
        email: string;
        fullName: string;
        companyName: string;
        siret: string;
        trade: string;
        phone: string;
        address?: string;
        city: string;
        postalCode?: string;
        googleBusinessUrl?: string;
        packId?: string;
        password?: string;
    }) => {
        const response = await api.post('/admin/artisans/create', data);
        return response.data;
    },

    /**
     * Get all available subscription packs
     */
    getPacks: async () => {
        const response = await api.get('/admin/packs');
        return response.data;
    }
};
