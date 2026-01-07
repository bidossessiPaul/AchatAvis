import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { authApi } from '../services/api';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    errorCode?: string | null;
    detectedCountry?: string | null;
    suspendedUserName?: string | null;
    suspension?: any | null;
    mfaToken: string | null;
    twoFactorRequired: boolean;

    // Actions
    setUser: (user: User | null) => void;
    login: (email: string, password: string) => Promise<any>;
    verify2FA: (token: string) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: (silent?: boolean) => Promise<void>;
    silentRefresh: () => Promise<void>;
    clearError: () => void;
    fetchDetectedRegion: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            errorCode: null,
            detectedCountry: null,
            suspendedUserName: null,
            suspension: null,
            mfaToken: null,
            twoFactorRequired: false,

            setUser: (user) =>
                set({ user, isAuthenticated: !!user }),

            login: async (email, password) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authApi.login({ email, password });
                    if (response.twoFactorRequired) {
                        set({
                            twoFactorRequired: true,
                            mfaToken: response.mfaToken as string,
                            isLoading: false,
                            error: null,
                            errorCode: null,
                        });
                        return response;
                    }

                    const userData = response.user as User;
                    // Defensive parsing for permissions
                    if (userData && userData.permissions && typeof userData.permissions === 'string') {
                        try {
                            userData.permissions = JSON.parse(userData.permissions);
                        } catch (e) {
                            console.error('Failed to parse permissions in store:', e);
                            userData.permissions = {};
                        }
                    }

                    set({
                        user: userData,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                        errorCode: null,
                    });
                    return response;
                } catch (error: any) {
                    set({
                        error: error.response?.data?.error || 'Login failed',
                        errorCode: error.response?.data?.code || null,
                        detectedCountry: error.response?.data?.country || null,
                        suspendedUserName: error.response?.data?.user_name || null,
                        suspension: error.response?.data?.suspension || null,
                        isLoading: false,
                    });
                    throw error;
                }
            },

            verify2FA: async (token: string) => {
                const { mfaToken } = get();
                if (!mfaToken) throw new Error('MFA Token missing');

                set({ isLoading: true, error: null });
                try {
                    const response = await authApi.verify2FA({ token, mfaToken });
                    set({
                        user: response.user as User,
                        isAuthenticated: true,
                        isLoading: false,
                        twoFactorRequired: false,
                        mfaToken: null,
                    });
                } catch (error: any) {
                    set({
                        error: error.response?.data?.error || 'Verification failed',
                        isLoading: false,
                    });
                    throw error;
                }
            },

            logout: async () => {
                set({ isLoading: true });
                try {
                    await authApi.logout();
                    set({
                        user: null,
                        isAuthenticated: false,
                        isLoading: false,
                        error: null,
                    });
                } catch (error) {
                    // Logout locally even if API fails
                    set({
                        user: null,
                        isAuthenticated: false,
                        isLoading: false,
                    });
                }
            },

            checkAuth: async (silent = false) => {
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    set({ user: null, isAuthenticated: false });
                    return;
                }

                if (!silent) set({ isLoading: true });
                try {
                    const response = await authApi.getMe();
                    const userData = response.user;
                    if (userData && userData.permissions && typeof userData.permissions === 'string') {
                        try {
                            userData.permissions = JSON.parse(userData.permissions);
                        } catch (e) {
                            userData.permissions = {};
                        }
                    }
                    set({
                        user: userData,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch (error) {
                    // Token invalid, clear it
                    localStorage.removeItem('accessToken');
                    set({
                        user: null,
                        isAuthenticated: false,
                        isLoading: false,
                    });
                }
            },

            silentRefresh: async () => {
                const token = localStorage.getItem('accessToken');
                if (!token) return;

                try {
                    const response = await authApi.getMe();
                    const userData = response.user;
                    if (userData && userData.permissions && typeof userData.permissions === 'string') {
                        try {
                            userData.permissions = JSON.parse(userData.permissions);
                        } catch (e) {
                            userData.permissions = {};
                        }
                    }
                    set({
                        user: userData,
                        isAuthenticated: true,
                    });
                } catch (error) {
                    // Silent refresh failed, don't clear anything yet to avoid flash
                    // The next regular checkAuth or API call will handle it
                }
            },

            clearError: () => set({ error: null, errorCode: null, detectedCountry: null, suspendedUserName: null, suspension: null }),

            fetchDetectedRegion: async () => {
                try {
                    const data = await authApi.detectRegion();
                    set({ detectedCountry: data.country || null });
                } catch (error) {
                    console.error('Failed to fetch detected region', error);
                }
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
