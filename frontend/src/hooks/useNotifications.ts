import { useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuthStore } from '../context/authStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { API_BASE } from '../services/api';
import toast from 'react-hot-toast';

const RELATIVE_API_FALLBACK = '/api';
const API_BASE_CANDIDATES = API_BASE === RELATIVE_API_FALLBACK
    ? [RELATIVE_API_FALLBACK]
    : [API_BASE, RELATIVE_API_FALLBACK];
const MAX_RETRIES = 5;
const RETRY_DELAY = 10000; // 10 seconds between retries

/**
 * Try to obtain a fresh access token using the httpOnly refresh-token cookie.
 * Returns the new token, or null if refresh failed (user is no longer logged in).
 *
 * Used by the SSE connect routine so it never reconnects with an expired token,
 * which would otherwise burn all 5 retry attempts in 50s and silently kill
 * notifications until the user reloads the page.
 */
const refreshAccessToken = async (baseUrl: string): Promise<string | null> => {
    try {
        const response = await axios.post(
            `${baseUrl}/auth/refresh-token`,
            {},
            { withCredentials: true }
        );
        const newToken = response.data?.accessToken;
        if (newToken) {
            localStorage.setItem('accessToken', newToken);
            return newToken;
        }
        return null;
    } catch {
        return null;
    }
};

/**
 * Establishes a single SSE connection for the current user.
 *
 * IMPORTANT: the effect must ONLY re-run when the user identity (userId) or
 * authentication state actually changes. Depending on the full `user` object or
 * on store functions like `addNotification` caused the EventSource to be closed
 * and reopened on every re-render, which in turn caused a reconnect storm on
 * the server (visible in logs as rapid "SSE Client connected/disconnected").
 */
export const useNotifications = () => {
    // Select stable primitives — avoid returning objects that change identity.
    const userId = useAuthStore(state => state.user?.id ?? null);
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);

    const eventSourceRef = useRef<EventSource | null>(null);
    const retriesRef = useRef(0);
    const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const closedByUserRef = useRef(false);
    const baseCandidateIndexRef = useRef(0);

    useEffect(() => {
        if (!isAuthenticated || !userId) {
            // Teardown if the user logs out
            closedByUserRef.current = true;
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
            }
            retriesRef.current = 0;
            baseCandidateIndexRef.current = 0;
            return;
        }

        closedByUserRef.current = false;
        baseCandidateIndexRef.current = 0;

        const connect = async () => {
            let token = localStorage.getItem('accessToken');
            if (!token) return;
            const currentBase = API_BASE_CANDIDATES[baseCandidateIndexRef.current] || RELATIVE_API_FALLBACK;

            // Guard against multiple concurrent connections for the same user
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }

            // After at least one error, try to refresh the access token before
            // reconnecting. Without this, retries hit the backend with the same
            // expired token over and over, killing notifications until reload.
            if (retriesRef.current > 0) {
                const fresh = await refreshAccessToken(currentBase);
                if (fresh) {
                    token = fresh;
                } else {
                    // Refresh failed → the user really is logged out. Stop trying.
                    return;
                }
            }

            const url = `${currentBase}/notifications/stream?token=${token}`;
            const es = new EventSource(url);
            eventSourceRef.current = es;

            es.onopen = () => {
                retriesRef.current = 0;
            };

            es.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'connected') return;

                    // Pull the latest addNotification at dispatch time so we
                    // never capture a stale reference in the effect closure.
                    useNotificationStore.getState().addNotification({
                        type: data.type || 'system',
                        title: data.title || 'Notification',
                        message: data.message || '',
                        link: data.link,
                        data: data.data,
                    });

                    toast.success(data.message, {
                        duration: 5000,
                        position: 'top-right',
                        icon: '\uD83D\uDD14',
                    });
                } catch {
                    // Ignore parse errors silently
                }
            };

            es.onerror = () => {
                es.close();
                eventSourceRef.current = null;

                if (closedByUserRef.current) return;

                // One immediate switch to /api if primary base is broken (CORS / DNS / host down)
                if (baseCandidateIndexRef.current < API_BASE_CANDIDATES.length - 1) {
                    baseCandidateIndexRef.current += 1;
                    retriesRef.current = 0;
                    retryTimeoutRef.current = setTimeout(() => {
                        void connect();
                    }, 500);
                    return;
                }

                if (retriesRef.current < MAX_RETRIES) {
                    retriesRef.current++;
                    retryTimeoutRef.current = setTimeout(() => {
                        // connect() is async; we don't need to await here.
                        void connect();
                    }, RETRY_DELAY);
                }
            };
        };

        void connect();

        return () => {
            closedByUserRef.current = true;
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
            }
        };
    }, [userId, isAuthenticated]);
};
