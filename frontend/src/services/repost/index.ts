// Clients API du module repost social.
// Tous les appels passent par l'instance axios centrale (services/api).

import api from '../api';
import type {
    RepostTier,
    RepostViewTier,
    RepostAccount,
    RepostVideo,
    RepostSubmission,
    RepostViewUpdate,
    RepostGuideStats,
} from '../../types/repost';

// ========== ADMIN — PALIERS D'ABONNÉS ==========
export const adminTiersApi = {
    list: async (includeInactive = false): Promise<RepostTier[]> => {
        const r = await api.get(`/repost/admin/tiers?includeInactive=${includeInactive ? 1 : 0}`);
        return r.data.tiers;
    },
    create: async (input: {
        label: string;
        min_followers: number;
        max_followers?: number | null;
        amount_cents: number;
        sort_order?: number;
    }): Promise<RepostTier> => {
        const r = await api.post('/repost/admin/tiers', input);
        return r.data.tier;
    },
    update: async (id: string, input: Partial<{
        label: string;
        min_followers: number;
        max_followers: number | null;
        amount_cents: number;
        sort_order: number;
        is_active: boolean;
    }>): Promise<RepostTier> => {
        const r = await api.put(`/repost/admin/tiers/${id}`, input);
        return r.data.tier;
    },
    remove: async (id: string): Promise<void> => {
        await api.delete(`/repost/admin/tiers/${id}`);
    },
};

// ========== ADMIN — PALIERS DE VUES ==========
export const adminViewTiersApi = {
    list: async (subscriberTierId?: string, includeInactive = false): Promise<RepostViewTier[]> => {
        const params = new URLSearchParams();
        if (subscriberTierId) params.set('subscriber_tier_id', subscriberTierId);
        if (includeInactive) params.set('includeInactive', '1');
        const r = await api.get(`/repost/admin/view-tiers?${params}`);
        return r.data.viewTiers;
    },
    create: async (input: {
        subscriber_tier_id: string;
        label: string;
        min_views: number;
        max_views?: number | null;
        amount_cents: number;
        sort_order?: number;
    }): Promise<RepostViewTier> => {
        const r = await api.post('/repost/admin/view-tiers', input);
        return r.data.viewTier;
    },
    update: async (id: string, input: Partial<{
        label: string;
        min_views: number;
        max_views: number | null;
        amount_cents: number;
        sort_order: number;
        is_active: boolean;
    }>): Promise<RepostViewTier> => {
        const r = await api.put(`/repost/admin/view-tiers/${id}`, input);
        return r.data.viewTier;
    },
    remove: async (id: string): Promise<void> => {
        await api.delete(`/repost/admin/view-tiers/${id}`);
    },
};

// ========== ADMIN — VIDÉOTHÈQUE ==========
export const adminVideosApi = {
    list: async (includeInactive = true): Promise<RepostVideo[]> => {
        const r = await api.get(`/repost/admin/videos?includeInactive=${includeInactive ? 1 : 0}`);
        return r.data.videos;
    },
    create: async (input: {
        title: string;
        description?: string;
        video_url: string;
        thumbnail_url?: string;
        platforms?: string;
        min_tier_id?: string | null;
    }): Promise<RepostVideo> => {
        const r = await api.post('/repost/admin/videos', input);
        return r.data.video;
    },
    update: async (id: string, input: Partial<{
        title: string;
        description: string;
        video_url: string;
        thumbnail_url: string;
        platforms: string;
        min_tier_id: string | null;
        is_active: boolean;
    }>): Promise<RepostVideo> => {
        const r = await api.put(`/repost/admin/videos/${id}`, input);
        return r.data.video;
    },
    remove: async (id: string): Promise<void> => {
        await api.delete(`/repost/admin/videos/${id}`);
    },
};

// ========== ADMIN — COMPTES RÉSEAUX SOCIAUX ==========
export const adminAccountsApi = {
    list: async (
        status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending',
        page = 1,
        limit = 50
    ): Promise<{ accounts: RepostAccount[]; page: number; limit: number }> => {
        const r = await api.get(`/repost/admin/accounts?status=${status}&page=${page}&limit=${limit}`);
        return r.data;
    },
    review: async (
        id: string,
        status: 'approved' | 'rejected',
        tier_id?: string | null,
        admin_notes?: string
    ): Promise<void> => {
        await api.patch(`/repost/admin/accounts/${id}`, { status, tier_id, admin_notes });
    },
    // Change le palier d'un compte déjà approuvé
    updateTier: async (id: string, tier_id: string): Promise<void> => {
        await api.patch(`/repost/admin/accounts/${id}/tier`, { tier_id });
    },
    // Bloque / débloque un compte approuvé (coupe / rétablit l'accès vidéothèque)
    setBlocked: async (id: string, blocked: boolean): Promise<void> => {
        await api.patch(`/repost/admin/accounts/${id}/block`, { blocked });
    },
    // Soft-delete
    remove: async (id: string): Promise<void> => {
        await api.delete(`/repost/admin/accounts/${id}`);
    },
};

// ========== ADMIN — SOUMISSIONS DE REPOST ==========
export const adminSubmissionsApi = {
    list: async (
        status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending',
        page = 1,
        limit = 50
    ): Promise<{ submissions: RepostSubmission[]; page: number; limit: number }> => {
        const r = await api.get(`/repost/admin/submissions?status=${status}&page=${page}&limit=${limit}`);
        return r.data;
    },
    approve: async (id: string): Promise<void> => {
        await api.patch(`/repost/admin/submissions/${id}/approve`);
    },
    reject: async (id: string, rejection_reason: string): Promise<void> => {
        await api.patch(`/repost/admin/submissions/${id}/reject`, { rejection_reason });
    },
};

// ========== ADMIN — DÉCLARATIONS DE VUES ==========
export const adminViewUpdatesApi = {
    list: async (
        status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending',
        page = 1,
        limit = 50
    ): Promise<{ updates: RepostViewUpdate[]; page: number; limit: number }> => {
        const r = await api.get(`/repost/admin/view-updates?status=${status}&page=${page}&limit=${limit}`);
        return r.data;
    },
    approve: async (id: string): Promise<void> => {
        await api.patch(`/repost/admin/view-updates/${id}/approve`);
    },
    reject: async (id: string, rejection_reason: string): Promise<void> => {
        await api.patch(`/repost/admin/view-updates/${id}/reject`, { rejection_reason });
    },
    stats: async (): Promise<{
        pending_accounts_count: number;
        pending_submissions_count: number;
        pending_view_updates_count: number;
    }> => {
        const r = await api.get('/repost/admin/submissions/stats');
        return r.data;
    },
};

// ========== GUIDE ==========
export const guideRepostApi = {
    // Mes comptes
    myAccounts: async (): Promise<RepostAccount[]> => {
        const r = await api.get('/repost/guide/accounts/mine');
        return r.data.accounts;
    },
    submitAccount: async (
        platform: string,
        profileLink: string,
        claimedFollowersCount: number,
        screenshot: File
    ): Promise<RepostAccount> => {
        const fd = new FormData();
        fd.append('platform', platform);
        fd.append('profile_link', profileLink);
        fd.append('claimed_followers_count', String(claimedFollowersCount));
        fd.append('screenshot', screenshot);
        const r = await api.post('/repost/guide/accounts', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return r.data.account;
    },

    // Vidéothèque (par compte)
    listAvailableVideos: async (accountId: string): Promise<RepostVideo[]> => {
        const r = await api.get(`/repost/guide/videos?account_id=${accountId}`);
        return r.data.videos;
    },

    // Soumission de preuve de repost
    submitProof: async (
        accountId: string,
        videoId: string,
        postLink: string,
        screenshot: File
    ): Promise<RepostSubmission> => {
        const fd = new FormData();
        fd.append('account_id', accountId);
        fd.append('video_id', videoId);
        fd.append('post_link', postLink);
        fd.append('screenshot', screenshot);
        const r = await api.post('/repost/guide/submissions', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return r.data.submission;
    },
    mySubmissions: async (): Promise<RepostSubmission[]> => {
        const r = await api.get('/repost/guide/submissions/mine');
        return r.data.submissions;
    },

    // Déclarations de vues
    submitViewUpdate: async (
        submissionId: string,
        declaredViews: number,
        screenshot: File
    ): Promise<RepostViewUpdate> => {
        const fd = new FormData();
        fd.append('submission_id', submissionId);
        fd.append('declared_views', String(declaredViews));
        fd.append('screenshot', screenshot);
        const r = await api.post('/repost/guide/view-updates', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return r.data.update;
    },
    listViewUpdatesForSubmission: async (submissionId: string): Promise<RepostViewUpdate[]> => {
        const r = await api.get(`/repost/guide/submissions/${submissionId}/view-updates`);
        return r.data.updates;
    },

    myStats: async (): Promise<RepostGuideStats> => {
        const r = await api.get('/repost/guide/me/stats');
        return r.data;
    },
};
