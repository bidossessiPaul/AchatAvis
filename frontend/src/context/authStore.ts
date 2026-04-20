import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { authApi } from '../services/api';

/**
 * Compares the fields of `user` that actually matter to downstream consumers.
 * If nothing changed, we return the previous reference so React/zustand
 * subscribers don't re-render on every /auth/me revalidation.
 *
 * We intentionally only compare identity + access-control fields. Transient
 * fields (last_login, last_seen, updated_at...) are ignored on purpose.
 */
const isSameUser = (a: User | null, b: User | null): boolean => {
    if (a === b) return true;
    if (!a || !b) return false;
    // Fields that actually matter to the UI. We deliberately ignore transient
    // server-side fields (updated_at, last_login, last_seen...) which would
    // otherwise force a re-render on every /auth/me call.
    const keys: (keyof User)[] = [
        'id',
        'email',
        'role',
        'status',
        'suspension_reason',
        'full_name',
        'avatar_url',
        'email_verified',
        'two_factor_enabled',
        'subscription_status',
        'subscription_end_date',
        'subscription_tier',
        'monthly_reviews_quota',
        'current_month_reviews',
        'fiches_allowed',
        'fiches_used',
    ];
    for (const k of keys) {
        if (a[k] !== b[k]) return false;
    }
    try {
        if (JSON.stringify(a.permissions ?? null) !== JSON.stringify(b.permissions ?? null)) {
            return false;
        }
    } catch {
        return false;
    }
    return true;
};

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
    requiresEmailOtp: boolean;
    emailOtpTempToken: string | null;
    emailOtpMaskedEmail: string | null;

    // Actions
    setUser: (user: User | null) => void;
    login: (email: string, password: string) => Promise<any>;
    verify2FA: (token: string) => Promise<void>;
    verifyEmailOtp: (otp: string) => Promise<void>;
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
            requiresEmailOtp: false,
            emailOtpTempToken: null,
            emailOtpMaskedEmail: null,

            setUser: (user) =>
                set({ user, isAuthenticated: !!user }),

            login: async (email, password) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authApi.login({ email, password });

                    // Admin email OTP — mandatory step
                    if ((response as any).requiresEmailOtp) {
                        set({
                            requiresEmailOtp: true,
                            emailOtpTempToken: (response as any).tempToken,
                            emailOtpMaskedEmail: (response as any).maskedEmail,
                            isLoading: false,
                            error: null,
                            errorCode: null,
                        });
                        return response;
                    }

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

            verifyEmailOtp: async (otp: string) => {
                const { emailOtpTempToken } = get();
                if (!emailOtpTempToken) throw new Error('Session expirée, veuillez vous reconnecter');
                set({ isLoading: true, error: null });
                try {
                    const response = await authApi.verifyAdminEmailOtp({ tempToken: emailOtpTempToken, otp });
                    const userData = response.user as User;
                    if (userData?.permissions && typeof userData.permissions === 'string') {
                        try { userData.permissions = JSON.parse(userData.permissions); } catch { userData.permissions = {}; }
                    }
                    set({
                        user: userData,
                        isAuthenticated: true,
                        isLoading: false,
                        requiresEmailOtp: false,
                        emailOtpTempToken: null,
                        emailOtpMaskedEmail: null,
                        error: null,
                    });
                } catch (error: any) {
                    set({
                        error: error.response?.data?.error || 'Code incorrect',
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

                    // Preserve the previous user reference if nothing meaningful changed.
                    // This is critical: if we always set a new object, every consumer
                    // subscribed to `user` re-renders on every navigation, which cascades
                    // into SSE reconnects and request storms.
                    const prev = get().user;
                    const nextUser = isSameUser(prev, userData as User) ? prev : (userData as User);

                    set({
                        user: nextUser,
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

                    const prev = get().user;
                    const nextUser = isSameUser(prev, userData as User) ? prev : (userData as User);

                    set({
                        user: nextUser,
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
