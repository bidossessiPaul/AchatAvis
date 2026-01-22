import { useEffect, useRef } from 'react';
import { useAuthStore } from '../context/authStore';
import { useNotificationStore } from '../store/useNotificationStore';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const useNotifications = () => {
    const { user, isAuthenticated } = useAuthStore();
    const { addNotification } = useNotificationStore();
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (!isAuthenticated || !user) {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            return;
        }

        const token = localStorage.getItem('accessToken');
        if (!token) return;

        //SSE connection with auth token
        const url = `${API_BASE_URL}/notifications/stream?token=${token}`;

        // Note: Standard EventSource doesn't support headers easily.
        // We pass the token in query param and verify in middleware.
        // OR we'd need a polyfill/custom implementation. 
        // For now, let's use the query param approach as it's simplest for native EventSource.

        console.log("🔗 Connecting to SSE...");
        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("📩 SSE Message Received:", data);

                if (data.type === 'connected') return;

                // Add to store
                addNotification({
                    type: data.type || 'system',
                    title: data.title || 'Notification',
                    message: data.message || '',
                    link: data.link,
                    data: data.data
                });

                // Trigger toast
                toast.success(data.message, {
                    duration: 5000,
                    position: 'top-right',
                    icon: '🔔'
                });

            } catch (err) {
                console.error("❌ Error parsing SSE data:", err);
            }
        };

        es.onerror = (err) => {
            console.error("❌ SSE Connection Error:", err);
            // Browser automatically tries to reconnect SSE
        };

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, [isAuthenticated, user, addNotification]);
};
