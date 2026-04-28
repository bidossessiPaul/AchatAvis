// Clients API du module signalement.
// Tous les appels passent par l'instance axios centrale (services/api).

import api from '../api';
import type {
    SignalementPack,
    SignalementAttribution,
    SignalementAvis,
    SignalementConfig,
    SignalementProofWithContext,
    ArtisanSignalementSummary,
    GuideEligibility,
    AvailableAvisForGuide,
    ActiveSlotForGuide,
    GuideSignalementStats,
    GlobalSignalementStats,
    SignalementSlot,
    SignalementProof,
} from '../../types/signalement';

// ========== ADMIN — PACKS ==========
export const adminPacksApi = {
    list: async (includeInactive = false): Promise<SignalementPack[]> => {
        const r = await api.get(`/signalement/admin/packs?includeInactive=${includeInactive ? 1 : 0}`);
        return r.data.packs;
    },
    create: async (input: {
        name: string;
        nb_avis: number;
        nb_signalements_par_avis: number;
        price_cents: number;
    }): Promise<SignalementPack> => {
        const r = await api.post('/signalement/admin/packs', input);
        return r.data.pack;
    },
    update: async (id: string, input: Partial<{
        name: string;
        nb_avis: number;
        nb_signalements_par_avis: number;
        price_cents: number;
        is_active: boolean;
    }>): Promise<SignalementPack> => {
        const r = await api.put(`/signalement/admin/packs/${id}`, input);
        return r.data.pack;
    },
    remove: async (id: string): Promise<void> => {
        await api.delete(`/signalement/admin/packs/${id}`);
    },
};

// ========== ADMIN — ATTRIBUTIONS ==========
export const adminAttributionApi = {
    create: async (input: {
        artisan_id: string;
        pack_id: string;
        note?: string;
    }): Promise<SignalementAttribution> => {
        const r = await api.post('/signalement/admin/attributions', input);
        return r.data.attribution;
    },
    listForArtisan: async (artisanId: string): Promise<{
        attributions: SignalementAttribution[];
        avis_remaining: number;
    }> => {
        const r = await api.get(`/signalement/admin/attributions/artisan/${artisanId}`);
        return r.data;
    },
    updateNote: async (id: string, note: string): Promise<SignalementAttribution> => {
        const r = await api.patch(`/signalement/admin/attributions/${id}/note`, { note });
        return r.data.attribution;
    },
    togglePause: async (id: string): Promise<SignalementAttribution> => {
        const r = await api.patch(`/signalement/admin/attributions/${id}/pause`);
        return r.data.attribution;
    },
    remove: async (id: string): Promise<void> => {
        await api.delete(`/signalement/admin/attributions/${id}`);
    },
};

// ========== ADMIN — AVIS ==========
export const adminAvisApi = {
    list: async (filters: {
        status?: string;
        artisan_id?: string;
        raison?: string;
        page?: number;
        limit?: number;
    } = {}): Promise<{
        avis: SignalementAvis[];
        pagination: { page: number; limit: number; total: number; total_pages: number };
    }> => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
        });
        const r = await api.get(`/signalement/admin/avis?${params}`);
        return r.data;
    },
    getOne: async (id: string): Promise<{
        avis: SignalementAvis;
        slots: SignalementSlot[];
        proofs: SignalementProof[];
    }> => {
        const r = await api.get(`/signalement/admin/avis/${id}`);
        return r.data;
    },
    updatePayout: async (id: string, payout_per_signalement_cents: number): Promise<void> => {
        await api.put(`/signalement/admin/avis/${id}/payout`, { payout_per_signalement_cents });
    },
    markGoogleDeleted: async (id: string): Promise<void> => {
        await api.post(`/signalement/admin/avis/${id}/mark-google-deleted`);
    },
    cancel: async (id: string, refund_slot: boolean): Promise<void> => {
        await api.post(`/signalement/admin/avis/${id}/cancel`, { refund_slot });
    },
};

// ========== ADMIN — VALIDATIONS ==========
export const adminValidationsApi = {
    listPending: async (page = 1, limit = 50): Promise<{
        proofs: SignalementProofWithContext[];
        page: number;
        limit: number;
    }> => {
        const r = await api.get(`/signalement/admin/validations/pending?page=${page}&limit=${limit}`);
        return r.data;
    },
    stats: async (): Promise<GlobalSignalementStats> => {
        const r = await api.get('/signalement/admin/validations/stats');
        return r.data;
    },
    approve: async (proofId: string): Promise<void> => {
        await api.post(`/signalement/admin/validations/${proofId}/approve`);
    },
    reject: async (proofId: string, rejection_reason: string): Promise<void> => {
        await api.post(`/signalement/admin/validations/${proofId}/reject`, { rejection_reason });
    },
};

// ========== ADMIN — CONFIG ==========
export const adminConfigApi = {
    get: async (): Promise<SignalementConfig> => {
        const r = await api.get('/signalement/admin/config');
        return r.data.config;
    },
    update: async (input: Partial<{
        cooldown_hours_between_signalements: number;
        default_payout_cents: number;
        reservation_timer_minutes: number;
        min_validated_reviews_for_eligibility: number;
    }>): Promise<SignalementConfig> => {
        const r = await api.put('/signalement/admin/config', input);
        return r.data.config;
    },
};

// ========== ARTISAN ==========
export const artisanSignalementApi = {
    summary: async (): Promise<ArtisanSignalementSummary> => {
        const r = await api.get('/signalement/artisan/me/summary');
        return r.data;
    },
    listMyAvis: async (): Promise<SignalementAvis[]> => {
        const r = await api.get('/signalement/artisan/me/avis');
        return r.data.avis;
    },
    submit: async (input: {
        google_review_url: string;
        raison: string;
        raison_details?: string;
    }): Promise<SignalementAvis> => {
        const r = await api.post('/signalement/artisan/me/avis', input);
        return r.data.avis;
    },
    relaunch: async (avisId: string): Promise<SignalementAvis> => {
        const r = await api.post(`/signalement/artisan/me/avis/${avisId}/relaunch`);
        return r.data.avis;
    },
};

// ========== GUIDE ==========
export const guideSignalementApi = {
    eligibility: async (): Promise<GuideEligibility> => {
        const r = await api.get('/signalement/guide/eligibility');
        return r.data;
    },
    listAvailable: async (): Promise<{
        avis: AvailableAvisForGuide[];
        eligibility: GuideEligibility;
    }> => {
        const r = await api.get('/signalement/guide/avis-disponibles');
        return r.data;
    },
    myActiveSlots: async (): Promise<ActiveSlotForGuide[]> => {
        const r = await api.get('/signalement/guide/me/active-slots');
        return r.data.slots;
    },
    myProofs: async (page = 1, limit = 50): Promise<SignalementProof[]> => {
        const r = await api.get(`/signalement/guide/me/proofs?page=${page}&limit=${limit}`);
        return r.data.proofs;
    },
    myStats: async (): Promise<GuideSignalementStats> => {
        const r = await api.get('/signalement/guide/me/stats');
        return r.data;
    },
    reserveAnySlot: async (avisId: string): Promise<SignalementSlot> => {
        const r = await api.post(`/signalement/guide/avis/${avisId}/reserve-any`);
        return r.data.slot;
    },
    submitProof: async (
        slotId: string,
        screenshot: File,
        reportLink?: string,
        noteGuide?: string
    ): Promise<SignalementProof> => {
        const fd = new FormData();
        fd.append('screenshot', screenshot);
        if (reportLink) fd.append('report_link', reportLink);
        if (noteGuide) fd.append('note_guide', noteGuide);
        const r = await api.post(
            `/signalement/guide/slots/${slotId}/submit-proof`,
            fd,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return r.data.proof;
    },
};
