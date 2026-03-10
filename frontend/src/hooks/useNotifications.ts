import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../context/authStore';
import { useNotificationStore } from '../store/useNotificationStore';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const MAX_RETRIES = 3;
const RETRY_DELAY = 10000; // 10 seconds between retries

export const useNotifications = () => {
    const { user, isAuthenticated } = useAuthStore();
    const { addNotification } = useNotificationStore();
    const eventSourceRef = useRef<EventSource | null>(null);
    const retriesRef = useRef(0);
    const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const connect = useCallback(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const url = `${API_BASE_URL}/notifications/stream?token=${token}`;
        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.onopen = () => {
            retriesRef.current = 0; // Reset retries on successful connection
        };

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'connected') return;

                addNotification({
                    type: data.type || 'system',
                    title: data.title || 'Notification',
                    message: data.message || '',
                    link: data.link,
                    data: data.data
                });

                toast.success(data.message, {
                    duration: 5000,
                    position: 'top-right',
                    icon: '\uD83D\uDD14'
                });
            } catch (err) {
                // Ignore parse errors silently
            }
        };

        es.onerror = () => {
            es.close();
            eventSourceRef.current = null;

            // Only retry up to MAX_RETRIES times
            if (retriesRef.current < MAX_RETRIES) {
                retriesRef.current++;
                retryTimeoutRef.current = setTimeout(() => {
                    connect();
                }, RETRY_DELAY);
            }
        };
    }, [addNotification]);

    useEffect(() => {
        if (!isAuthenticated || !user) {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
            retriesRef.current = 0;
            return;
        }

        connect();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
    }, [isAuthenticated, user, connect]);
};
