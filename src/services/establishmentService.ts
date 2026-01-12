import api from './api';

export const establishmentService = {
    /**
     * Get all my establishments
     */
    async getMyEstablishments(): Promise<any[]> {
        const response = await api.get('/establishments/my');
        return response.data.data;
    },

    /**
     * Get establishment by ID with ownership check
     */
    async getEstablishmentById(id: string): Promise<any> {
        const response = await api.get(`/establishments/${id}`);
        return response.data.data;
    },

    /**
     * Update establishment
     */
    async updateEstablishment(id: string, data: any): Promise<any> {
        const response = await api.put(`/establishments/${id}`, data);
        return response.data.data;
    },

    /**
     * Delete establishment
     */
    async deleteEstablishment(id: string): Promise<void> {
        await api.delete(`/establishments/${id}`);
    },

    /**
     * Create from Google search
     */
    async createFromGoogle(searchQuery: string, city: string): Promise<any> {
        const response = await api.post('/establishments/search-google', {
            search_query: searchQuery,
            city
        });
        return response.data.data;
    },

    /**
     * Create from Google Maps link
     */
    async createFromLink(googleMapsUrl: string): Promise<any> {
        const response = await api.post('/establishments/from-link', {
            google_maps_url: googleMapsUrl
        });
        return response.data.data;
    },

    /**
     * Create manually
     */
    async createManually(data: any): Promise<any> {
        const response = await api.post('/establishments/manual', data);
        return response.data.data;
    }
};
