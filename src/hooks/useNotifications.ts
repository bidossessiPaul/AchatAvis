import { useEffect, useRef } from 'react';
import { useAuthStore } from '../context/authStore';
import { useNotificationStore } from '../store/useNotificationStore';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const MAX_RETRIES = 5;
const RETRY_DELAY = 10000; // 10 seconds between retries

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
            return;
        }

        closedByUserRef.current = false;

        const connect = () => {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            // Guard against multiple concurrent connections for the same user
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }

            const url = `${API_BASE_URL}/notifications/stream?token=${token}`;
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

                if (retriesRef.current < MAX_RETRIES) {
                    retriesRef.current++;
                    retryTimeoutRef.current = setTimeout(connect, RETRY_DELAY);
                }
            };
        };

        connect();

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
