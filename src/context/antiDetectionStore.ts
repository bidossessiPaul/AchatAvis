import { create } from 'zustand';
import api from '../services/api';

interface Rule {
    id: number;
    rule_key: string;
    rule_name: string;
    description_short: string;
    description_long: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    icon_emoji: string;
    impact_stats: any;
    examples_do: string[];
    examples_dont: string[];
    tips: string[];
}

interface Sector {
    id: number;
    sector_name: string;
    sector_slug: string;
    difficulty: 'easy' | 'medium' | 'hard';
    icon_emoji: string;
    validation_rate_avg: number;
    required_gmail_level: string;
    warning_message?: string;
}

interface ComplianceData {
    compliance_score: number;
    score_color: string;
    score_label: string;
    rules_followed_count: number;
    rules_violated_count: number;
    violations_log: any[];
    recommendations: string[];
    certification_passed: boolean;
    certification_score: number | null;
    last_30_days: {
        validated: number;
        rejected: number;
        success_rate: number;
        total: number;
    };
}

interface AntiDetectionState {
    rules: Rule[];
    sectors: { easy: Sector[]; medium: Sector[]; hard: Sector[] };
    complianceData: ComplianceData | null;
    gmailAccounts: any[];
    guideRecap: {
        sectors: Record<string, any>;
        global_accounts: any[];
    } | null;
    gmailHistory: Record<string, any[]>;
    loading: boolean;
    error: string | null;

    fetchAntiDetectionRules: () => Promise<void>;
    fetchSectors: () => Promise<void>;
    fetchComplianceData: (userId: string) => Promise<void>;
    fetchGmailAccounts: (userId: string) => Promise<void>;
    fetchGuideRecap: () => Promise<void>;
    fetchGmailHistory: (accountId: number, sectorId?: number) => Promise<void>;
    verifyGmailPreview: (email: string, mapsProfileUrl?: string) => Promise<any>;
    updateGmailActivity: (accountId: number, sectorSlug: string) => Promise<void>;
    addGmailAccount: (data: any) => Promise<any>;
    updateGmailAccount: (accountId: number, data: any) => Promise<any>;
    deleteGmailAccount: (accountId: number, userId: string) => Promise<any>;
    checkficheCompatibility: (campaignId: string, gmailId: number) => Promise<any>;
    submitQuiz: (userId: string, score: number) => Promise<any>;
}

export const useAntiDetectionStore = create<AntiDetectionState>((set) => ({
    rules: [],
    sectors: { easy: [], medium: [], hard: [] },
    complianceData: null,
    gmailAccounts: [],
    guideRecap: null,
    gmailHistory: {},
    loading: false,
    error: null,

    fetchGuideRecap: async () => {
        set({ loading: true });
        try {
            const response = await api.get('/anti-detection/guide-recap');
            set({ guideRecap: response.data.data, loading: false });
        } catch (error: any) {
            console.error('Failed to fetch guide recap:', error);
            set({ loading: false });
        }
    },

    fetchAntiDetectionRules: async () => {
        set({ loading: true });
        try {
            const response = await api.get('/anti-detection/rules');
            set({ rules: response.data.data.rules, loading: false });
        } catch (error: any) {
            set({ error: error.message, loading: false });
        }
    },

    fetchSectors: async () => {
        set({ loading: true });
        try {
            const response = await api.get('/anti-detection/sectors');
            set({ sectors: response.data.data, loading: false });
        } catch (error: any) {
            set({ error: error.message, loading: false });
        }
    },

    fetchComplianceData: async (userId: string) => {
        set({ loading: true });
        try {
            const response = await api.get(`/anti-detection/compliance-score/${userId}`);
            set({ complianceData: response.data.data, loading: false });
        } catch (error: any) {
            set({ error: error.message, loading: false });
        }
    },

    fetchGmailAccounts: async (userId: string) => {
        set({ loading: true });
        try {
            const response = await api.get(`/anti-detection/gmail-accounts/${userId}`);
            set({ gmailAccounts: response.data.data, loading: false });
        } catch (error: any) {
            set({ error: error.message, loading: false });
        }
    },

    fetchGmailHistory: async (accountId: number, sectorId?: number) => {
        try {
            const url = `/anti-detection/gmail-history/${accountId}${sectorId ? `?sectorId=${sectorId}` : ''}`;
            const response = await api.get(url);
            const key = `${accountId}_${sectorId || 'all'}`;
            set(state => ({
                gmailHistory: {
                    ...state.gmailHistory,
                    [key]: response.data.data
                }
            }));
        } catch (error: any) {
            console.error('Failed to fetch gmail history:', error);
        }
    },

    updateGmailActivity: async (accountId: number, sectorSlug: string) => {
        try {
            await api.post('/anti-detection/update-activity', {
                gmail_account_id: accountId,
                sector_slug: sectorSlug
            });
            // Refresh recap after activity update
            const response = await api.get('/anti-detection/guide-recap');
            set({ guideRecap: response.data.data });
        } catch (error: any) {
            console.error('Failed to update activity:', error);
        }
    },

    verifyGmailPreview: async (email: string, mapsProfileUrl?: string) => {
        const response = await api.post('/anti-detection/gmail-accounts/verify-preview', {
            email,
            mapsProfileUrl
        });
        return response.data.data;
    },

    addGmailAccount: async (data: any) => {
        const response = await api.post('/anti-detection/gmail-accounts/add', data);
        return response.data;
    },

    updateGmailAccount: async (accountId: number, data: any) => {
        const response = await api.put(`/anti-detection/gmail-accounts/${accountId}`, data);
        return response.data;
    },

    deleteGmailAccount: async (accountId: number, userId: string) => {
        const response = await api.delete(`/anti-detection/gmail-accounts/${accountId}`, {
            data: { userId }
        });
        return response.data;
    },

    checkficheCompatibility: async (campaignId: string, gmailId: number) => {
        const response = await api.post('/anti-detection/can-take-fiche', {
            campaign_id: campaignId,
            gmail_account_id: gmailId
        });
        return response.data.data;
    },

    submitQuiz: async (userId: string, score: number) => {
        const response = await api.post('/anti-detection/quiz/submit', {
            user_id: userId,
            score
        });
        return response.data.data;
    }
}));
