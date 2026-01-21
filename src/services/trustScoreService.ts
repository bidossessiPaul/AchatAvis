/**
 * 🎯 Trust Score API Service
 * Frontend API calls for Trust Score system
 */

import api from './api';

export interface TrustScoreResult {
    email: string;
    finalScore: number;
    trustLevel: 'BLOCKED' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
    badge: string;
    restrictions: string[];
    breakdown: {
        emailScore: number;
        mapsProfileScore: number;
        verificationBonus: number;
        penalties: number;
    };
    details: any;
    isBlocked: boolean;
    maxReviewsPerMonth: number;
    recommendations: string[];
}

export const trustScoreService = {
    /**
     * Calculate Trust Score for current user or specific email
     */
    async calculateTrustScore(data: {
        email: string;
        googleMapsProfileUrl?: string;
        phoneVerified?: boolean;
    }): Promise<TrustScoreResult> {
        const response = await api.post('/trust-score/calculate', data);
        return response.data.data;
    },

    /**
     * Validate email only
     */
    async validateEmail(email: string) {
        const response = await api.post('/trust-score/validate-email', { email });
        return response.data.data;
    },

    /**
     * Scrape Google Maps profile
     */
    async scrapeProfile(profileUrl: string) {
        const response = await api.post('/trust-score/scrape-profile', { profileUrl });
        return response.data.data;
    },

    /**
     * Get Trust Score statistics (admin)
     */
    async getStatistics() {
        const response = await api.get('/trust-score/statistics');
        return response.data.data;
    },

    /**
     * Recalculate Trust Score for an account
     */
    async recalculateAccount(accountId: number) {
        const response = await api.post(`/trust-score/recalculate/${accountId}`);
        return response.data.data;
    },

    /**
     * Get suspicious accounts (admin)
     */
    async getSuspiciousAccounts() {
        const response = await api.get('/trust-score/suspicious-accounts');
        return response.data.data;
    },

    /**
     * Get top performers (admin)
     */
    async getTopPerformers() {
        const response = await api.get('/trust-score/top-performers');
        return response.data.data;
    },

    /**
     * Get all accounts (admin)
     */
    async getAccounts(filters: { level?: string; search?: string } = {}) {
        const response = await api.get('/trust-score/accounts', { params: filters });
        return response.data.data;
    },

    async toggleAccountActivation(accountId: number, isActive: boolean) {
        const response = await api.patch(`/trust-score/accounts/${accountId}/toggle-active`, { is_active: isActive });
        return response.data;
    },

    /**
     * Admin override Trust Score
     */
    async overrideTrustScore(accountId: number, data: {
        trustScore?: number;
        trustLevel?: string;
        adminNotes?: string;
        manualVerificationStatus?: string;
    }) {
        const response = await api.put(`/trust-score/override/${accountId}`, data);
        return response.data.data;
    }
};

export default trustScoreService;
