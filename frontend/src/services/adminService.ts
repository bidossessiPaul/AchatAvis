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

    getSubmissionTrend: async (period: 'day' | 'week' | 'month' | 'custom', dateFrom?: string, dateTo?: string) => {
        const params = new URLSearchParams({ period });
        if (dateFrom) params.append('dateFrom', dateFrom);
        if (dateTo) params.append('dateTo', dateTo);
        const response = await api.get(`/admin/stats/submissions-trend?${params}`);
        return response.data as { label: string; submitted: number; validated: number; rejected: number }[];
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
     * Get all submissions for a specific artisan
     */
    getArtisanSubmissions: async (userId: string) => {
        const response = await api.get(`/admin/artisans/${userId}/submissions`);
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
     * Update guide profile
     */
    updateGuide: async (userId: string, data: any) => {
        const response = await api.patch(`/admin/guides/${userId}`, data);
        return response.data;
    },

    /**
     * Déplace un guide entre les groupes Afrique / Europe (Repost uniquement)
     */
    setGuideType: async (userId: string, guideType: 'africa' | 'europe') => {
        const response = await api.patch(`/admin/guides/${userId}/guide-type`, { guideType });
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
     * Unblock a guide suspended for bad links (reactivate + unblock gmails)
     */
    unblockBadLinkGuide: async (userId: string) => {
        const response = await api.post(`/admin/guides/${userId}/unblock-bad-links`);
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
    createArtisan: async (data: any) => {
        const response = await api.post('/admin/artisans/create', data);
        return response.data;
    },

    /**
     * Create a new guide from admin panel
     */
    createGuide: async (data: any) => {
        const response = await api.post('/admin/guides/create', data);
        return response.data;
    },

    /**
     * Get all available subscription packs
     */
    getPacks: async () => {
        const response = await api.get('/admin/packs');
        return response.data;
    },

    /**
     * Get all sectors
     */
    getSectors: async () => {
        const response = await api.get('/admin/sectors');
        return response.data;
    },

    /**
     * Create a new sector
     */
    createSector: async (data: any) => {
        const response = await api.post('/admin/sectors', data);
        return response.data;
    },

    /**
     * Update an existing sector
     */
    updateSector: async (slug: string, data: any) => {
        const response = await api.put(`/admin/sectors/${slug}`, data);
        return response.data;
    },

    /**
     * Delete a sector
     */
    deleteSector: async (slug: string) => {
        const response = await api.delete(`/admin/sectors/${slug}`);
        return response.data;
    },

    cancelPayment: async (paymentId: string) => {
        const response = await api.post(`/admin/payments/${paymentId}/cancel`);
        return response.data;
    },

    reactivatePayment: async (paymentId: string) => {
        const response = await api.post(`/admin/payments/${paymentId}/reactivate`);
        return response.data;
    },

    blockPayment: async (paymentId: string) => {
        const response = await api.post(`/admin/payments/${paymentId}/block`);
        return response.data;
    },

    deletePaymentStatus: async (paymentId: string) => {
        const response = await api.delete(`/admin/payments/${paymentId}/status`);
        return response.data;
    },

    /**
     * Get all guides with their balance (at least 1 validated review)
     */
    getGuidesBalances: async () => {
        const response = await api.get('/admin/guides-balances');
        return response.data;
    },

    /**
     * Force pay a guide (encouragement payment)
     */
    forcePayGuide: async (guideId: string, amount: number, adminNote?: string) => {
        const response = await api.post('/admin/force-pay-guide', { guideId, amount, adminNote });
        return response.data;
    },

    sendPaymentMethodReminders: async () => {
        const response = await api.post('/admin/guides-balances/send-payment-reminders');
        return response.data;
    },

    // --- Sessions de paiement (vagues de virements aux guides) ---

    /** Référentiel des raisons d'échec, pour construire le select du modal */
    getPaiementRaisons: async () => {
        const response = await api.get('/admin/payment-sessions/raisons');
        return response.data;
    },

    /** Session actuellement ouverte avec ses lignes, ou null */
    getCurrentPaymentSession: async () => {
        const response = await api.get('/admin/payment-sessions/current');
        return response.data;
    },

    listPaymentSessions: async () => {
        const response = await api.get('/admin/payment-sessions');
        return response.data;
    },

    getPaymentSession: async (sessionId: string) => {
        const response = await api.get(`/admin/payment-sessions/${sessionId}`);
        return response.data;
    },

    /** Ouvre une session : fige la liste des guides ayant un net à payer > 0 */
    openPaymentSession: async (label?: string) => {
        const response = await api.post('/admin/payment-sessions', { label });
        return response.data;
    },

    /** Enregistre le résultat du virement pour un guide de la session */
    recordPaymentLine: async (
        sessionId: string,
        lineId: string,
        payload: {
            status: 'paid' | 'partial' | 'failed';
            amountPaid?: number;
            failureReason?: string;
            failureNote?: string;
        }
    ) => {
        const response = await api.patch(
            `/admin/payment-sessions/${sessionId}/lines/${lineId}`,
            payload
        );
        return response.data;
    },

    /** Ferme la session et fige ses statistiques */
    closePaymentSession: async (sessionId: string, adminNote?: string) => {
        const response = await api.post(`/admin/payment-sessions/${sessionId}/close`, { adminNote });
        return response.data;
    },

    /** Annule une session sur laquelle aucun virement n'a encore été enregistré */
    cancelPaymentSession: async (sessionId: string) => {
        const response = await api.delete(`/admin/payment-sessions/${sessionId}`);
        return response.data;
    },

    getGmailAccounts: async () => {
        const response = await api.get('/admin/gmail-accounts');
        return response.data;
    },

    toggleGmailBlock: async (accountId: number, block: boolean, reason?: string) => {
        const response = await api.patch(`/admin/gmail-accounts/${accountId}/block`, { block, reason });
        return response.data;
    },

    impersonateUser: async (userId: string) => {
        const response = await api.post(`/admin/impersonate/${userId}`);
        return response.data;
    }
};
