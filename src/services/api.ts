import axios from 'axios';
import type {
    LoginCredentials,
    ArtisanRegistration,
    GuideRegistration,
    AuthResponse,
    User,
} from '../types';

// Get base URL from environment
const getBaseURL = (): string => {
    const envBaseURL = import.meta.env.VITE_API_BASE_URL || '/api';

    // Remove any whitespace/invisible characters
    const cleanURL = envBaseURL.trim();

    // If it's a relative path, use it directly (likely development or local proxy)
    if (cleanURL === '/api') {
        return '/api';
    }

    // Ensure it starts with http:// or https:// if it looks like a domain
    if (!cleanURL.startsWith('http://') && !cleanURL.startsWith('https://')) {
        console.warn(`⚠️ Adding https:// to ${cleanURL}`);
        return `https://${cleanURL}`;
    }

    // Remove trailing slash
    return cleanURL.replace(/\/$/, '');
};

const API_BASE = getBaseURL();

// Log in development
if (import.meta.env.DEV) {
    console.log('🔗 API Base URL:', API_BASE);
}

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true, // For cookies
});

// Add request interceptor for debugging and auth
api.interceptors.request.use((config) => {
    if (import.meta.env.DEV) {
        console.log('📤 Request:', config.method?.toUpperCase(), config.url);
    }

    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Handle 401/403 errors globally
api.interceptors.response.use(
    (response) => {
        if (import.meta.env.DEV) {
            console.log('📥 Response:', response.status, response.config.url);
        }
        return response;
    },
    async (error) => {
        if (import.meta.env.DEV) {
            console.error('❌ API Error:', {
                url: error.config?.url,
                method: error.config?.method,
                status: error.response?.status,
                data: error.response?.data,
            });
        }

        const originalRequest = error.config;

        // Skip token refresh for auth endpoints where 401 is expected (login, register, etc.)
        const skipRefreshPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/team/accept-invite'];
        const shouldSkipRefresh = skipRefreshPaths.some(path => originalRequest?.url?.includes(path));

        if (error.response && error.response.status === 401 && !originalRequest._retry && !shouldSkipRefresh) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return api(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const response = await axios.post(`${API_BASE}/auth/refresh-token`, {}, { withCredentials: true });
                const { accessToken } = response.data;

                localStorage.setItem('accessToken', accessToken);
                api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;

                processQueue(null, accessToken);
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                localStorage.removeItem('accessToken');
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // Handle 403 Forbidden - Redirect to /suspended only if account is actually suspended
        if (error.response && error.response.status === 403 && error.response.data?.code === 'ACCOUNT_SUSPENDED') {
            // Check if we're already on the suspended page to avoid infinite loops
            if (!window.location.pathname.includes('/suspended')) {
                // Pass optional state if available in response data
                const userData = error.response.data;
                const params = new URLSearchParams();
                if (userData?.user_name) params.set('userName', userData.user_name);
                if (userData?.country) params.set('country', userData.country);

                window.location.href = '/suspended?' + params.toString();
            }
        }

        return Promise.reject(error);
    }
);

// Auth API
export const authApi = {
    // Register artisan
    registerArtisan: async (data: ArtisanRegistration): Promise<AuthResponse> => {
        const response = await api.post('/auth/register/artisan', data);
        return response.data;
    },

    // Register guide
    registerGuide: async (data: GuideRegistration): Promise<AuthResponse> => {
        const response = await api.post('/auth/register/guide', data);
        return response.data;
    },

    // Login
    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        const response = await api.post('/auth/login', credentials);
        if (response.data.accessToken) {
            localStorage.setItem('accessToken', response.data.accessToken);
        }
        return response.data;
    },

    // Logout
    logout: async (): Promise<void> => {
        await api.post('/auth/logout');
        localStorage.removeItem('accessToken');
    },

    // Get current user
    getMe: async (): Promise<{ user: User }> => {
        const response = await api.get('/auth/me');
        return response.data;
    },

    // Change password
    changePassword: async (data: { currentPassword: string, newPassword: string }): Promise<void> => {
        await api.put('/auth/change-password', data);
    },

    // Update profile
    updateProfile: async (data: any): Promise<{ user: User }> => {
        const response = await api.put('/auth/profile', data);
        return response.data;
    },

    // Upload avatar
    uploadAvatar: async (file: File): Promise<{ avatarUrl: string }> => {
        const formData = new FormData();
        formData.append('avatar', file);
        const response = await api.post('/auth/profile/avatar', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Delete account
    deleteAccount: async (): Promise<void> => {
        await api.delete('/auth/delete-account');
        localStorage.removeItem('accessToken');
    },

    // 2FA Methods
    generate2FA: async (): Promise<{ secret: string, qrCode: string }> => {
        const response = await api.post('/auth/2fa/generate');
        return response.data;
    },

    enable2FA: async (data: { secret: string, token: string }): Promise<void> => {
        await api.post('/auth/2fa/enable', data);
    },

    disable2FA: async (): Promise<void> => {
        await api.post('/auth/2fa/disable');
    },

    verify2FA: async (data: { token: string, mfaToken: string }): Promise<AuthResponse> => {
        const response = await api.post('/auth/2fa/verify', data);
        if (response.data.accessToken) {
            localStorage.setItem('accessToken', response.data.accessToken);
        }
        return response.data;
    },

    // Forgot password
    forgotPassword: async (email: string): Promise<{ message: string }> => {
        const response = await api.post('/auth/forgot-password', { email });
        return response.data;
    },

    resetPassword: async (data: { token: string | null, newPassword: string }): Promise<{ message: string }> => {
        const response = await api.post('/auth/reset-password', data);
        return response.data;
    },

    detectRegion: async (): Promise<{ country: string, ip: string }> => {
        const response = await api.get('/auth/detect-region');
        return response.data;
    },
};

// Payout API
export const payoutApi = {
    // Guide: Get earnings stats
    getEarnings: async (): Promise<{ totalEarned: number, totalPaid: number, totalPending: number, balance: number }> => {
        const response = await api.get('/payouts/guide/earnings');
        return response.data;
    },

    // Guide: Get payout history
    getPayoutHistory: async (): Promise<any[]> => {
        const response = await api.get('/payouts/guide/history');
        return response.data;
    },

    // Guide: Request payout
    requestPayout: async (): Promise<{ id: string, amount: number }> => {
        const response = await api.post('/payouts/guide/request');
        return response.data;
    },

    // Admin: Get all payout requests
    getAllRequests: async (): Promise<any[]> => {
        const response = await api.get('/payouts/admin/requests');
        return response.data;
    },

    // Admin: Update payout status
    updateStatus: async (payoutId: string, data: { status: string, adminNote?: string }): Promise<void> => {
        await api.patch(`/payouts/admin/requests/${payoutId}`, data);
    },
};

// Admin API
export const adminApi = {
    // Stats
    getGlobalStats: async () => {
        const response = await api.get('/admin/stats');
        return response.data;
    },

    async getLogs(page = 1) {
        const response = await api.get(`/admin/logs?page=${page}`);
        return response.data;
    },

    async getArtisans() {
        const response = await api.get('/admin/artisans');
        return response.data;
    },

    getArtisanDetail: async (id: string): Promise<any> => {
        const response = await api.get(`/admin/artisans/${id}`);
        return response.data;
    },

    getGuides: async (): Promise<any[]> => {
        const response = await api.get('/admin/guides');
        return response.data;
    },

    getGuideDetail: async (id: string): Promise<any> => {
        const response = await api.get(`/admin/guides/${id}`);
        return response.data;
    },

    updateUserStatus: async (userId: string, status: string): Promise<void> => {
        await api.patch(`/admin/users/${userId}/status`, { status });
    },

    deleteUser: async (userId: string): Promise<void> => {
        await api.delete(`/admin/users/${userId}`);
    },

    getUsers: async (): Promise<any[]> => {
        const response = await api.get('/admin/users');
        return response.data;
    },

    // Review Submissions
    getAllSubmissions: async (): Promise<any[]> => {
        const response = await api.get('/admin/submissions');
        return response.data;
    },

    updateSubmissionStatus: async (submissionId: string, data: { status: string, rejectionReason?: string }): Promise<void> => {
        await api.patch(`/admin/submissions/${submissionId}/status`, data);
    },

    // Mission Approval
    getPendingMissions: async (): Promise<any[]> => {
        const response = await api.get('/admin/missions/pending');
        return response.data;
    },

    approveMission: async (orderId: string): Promise<void> => {
        await api.post(`/admin/missions/${orderId}/approve`);
    },

    getMissions: async (): Promise<any[]> => {
        const response = await api.get('/admin/missions');
        return response.data;
    },

    getAdminMissionDetail: async (orderId: string): Promise<any> => {
        const response = await api.get(`/admin/missions/${orderId}`);
        return response.data;
    },

    updateMission: async (orderId: string, data: any): Promise<void> => {
        await api.put(`/admin/missions/${orderId}`, data);
    },

    deleteMission: async (orderId: string): Promise<void> => {
        await api.delete(`/admin/missions/${orderId}`);
    },

    // Subscriptions
    getSubscriptions: async (): Promise<any[]> => {
        const response = await api.get('/admin/subscriptions');
        return response.data;
    },

    getSubscriptionStats: async (): Promise<any> => {
        const response = await api.get('/admin/subscriptions/stats');
        return response.data;
    },

    // Packs
    getPacks: async (): Promise<any[]> => {
        const response = await api.get('/admin/packs');
        return response.data;
    },

    createPack: async (data: any): Promise<void> => {
        await api.post('/admin/packs', data);
    },

    updatePack: async (id: string, data: any): Promise<void> => {
        await api.put(`/admin/packs/${id}`, data);
    },

    deletePack: async (id: string): Promise<void> => {
        await api.delete(`/admin/packs/${id}`);
    },
};

// Suspension API
export const suspensionApi = {
    getActiveSuspensions: async (): Promise<{ success: boolean, data: any[] }> => {
        const response = await api.get('/suspensions/active');
        return response.data;
    },

    approveSuspension: async (suspensionId: number): Promise<{ message: string }> => {
        const response = await api.post(`/suspensions/${suspensionId}/approve`);
        return response.data;
    },

    createManualSuspension: async (data: { user_id: string, reason_details: string, suspension_level_id: number, admin_notes?: string }): Promise<{ message: string }> => {
        const response = await api.post('/suspensions/manual', data);
        return response.data;
    },
};

// Team API
export const teamApi = {
    inviteMember: async (email: string, permissions: any): Promise<{ message: string }> => {
        const response = await api.post('/team/invite', { email, permissions });
        return response.data;
    },

    getTeamMembers: async (): Promise<any[]> => {
        const response = await api.get('/team');
        return response.data;
    },

    acceptInvite: async (data: { token: string, password: string, fullName: string }): Promise<{ message: string }> => {
        const response = await api.post('/team/accept-invite', data);
        return response.data;
    },

    updatePermissions: async (userId: string, permissions: any): Promise<{ message: string }> => {
        const response = await api.put(`/team/${userId}/permissions`, { permissions });
        return response.data;
    },

    deleteMember: async (id: string, type: 'active' | 'pending'): Promise<{ message: string }> => {
        const response = await api.delete(`/team/${id}?type=${type}`);
        return response.data;
    },
};

export default api;
