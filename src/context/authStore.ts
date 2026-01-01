import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { authApi } from '../services/api';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    mfaToken: string | null;
    twoFactorRequired: boolean;

    // Actions
    setUser: (user: User | null) => void;
    login: (email: string, password: string) => Promise<any>;
    verify2FA: (token: string) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    silentRefresh: () => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
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
                        });
                        return response;
                    }
                    set({
                        user: response.user as User,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                    });
                    return response;
                } catch (error: any) {
                    set({
                        error: error.response?.data?.error || 'Login failed',
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

            checkAuth: async () => {
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    set({ user: null, isAuthenticated: false });
                    return;
                }

                set({ isLoading: true });
                try {
                    const response = await authApi.getMe();
                    set({
                        user: response.user,
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
                    set({
                        user: response.user,
                        isAuthenticated: true,
                    });
                } catch (error) {
                    // Silent refresh failed, don't clear anything yet to avoid flash
                    // The next regular checkAuth or API call will handle it
                }
            },

            clearError: () => set({ error: null }),
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
