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
     * Get detailed guide info
     */
    getGuideDetail: async (userId: string) => {
        const response = await api.get(`/admin/guides/${userId}`);
        return response.data;
    },

    /**
     * Update user status (block/unblock)
     */
    updateUserStatus: async (userId: string, status: string) => {
        const response = await api.patch(`/admin/users/${userId}/status`, { status });
        return response.data;
    },

    /**
     * Delete user
     */
    deleteUser: async (userId: string) => {
        const response = await api.delete(`/admin/users/${userId}`);
        return response.data;
    }
};
