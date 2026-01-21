import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppNotification {
    id: string;
    type: 'order_update' | 'new_fiche' | 'payment_success' | 'system' | 'connected';
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    link?: string;
    data?: any;
}

interface NotificationState {
    notifications: AppNotification[];
    unreadCount: number;
    addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set) => ({
            notifications: [],
            unreadCount: 0,
            addNotification: (notification) => set((state) => {
                const newNotification: AppNotification = {
                    ...notification,
                    id: Math.random().toString(36).substring(7),
                    timestamp: Date.now(),
                    read: false,
                };
                const updatedNotifications = [newNotification, ...state.notifications].slice(0, 50); // Keep last 50
                return {
                    notifications: updatedNotifications,
                    unreadCount: updatedNotifications.filter(n => !n.read).length
                };
            }),
            markAsRead: (id) => set((state) => {
                const updated = state.notifications.map(n =>
                    n.id === id ? { ...n, read: true } : n
                );
                return {
                    notifications: updated,
                    unreadCount: updated.filter(n => !n.read).length
                };
            }),
            markAllAsRead: () => set((state) => ({
                notifications: state.notifications.map(n => ({ ...n, read: true })),
                unreadCount: 0
            })),
            clearAll: () => set({ notifications: [], unreadCount: 0 })
        }),
        {
            name: 'app-notifications', // persist in localStorage
        }
    )
);
