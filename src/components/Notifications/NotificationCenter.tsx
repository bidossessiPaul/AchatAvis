import React, { useState, useRef, useEffect } from 'react';
import { Bell, Info, ShoppingBag, Target, CreditCard } from 'lucide-react';
import { useNotificationStore, AppNotification } from '../../store/useNotificationStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export const NotificationCenter: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotificationStore();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getIcon = (type: AppNotification['type']) => {
        switch (type) {
            case 'order_update': return <ShoppingBag size={18} color="#3b82f6" />;
            case 'new_mission': return <Target size={18} color="#f97316" />;
            case 'payment_success': return <CreditCard size={18} color="#10b981" />;
            case 'system': return <Info size={18} color="#6b7280" />;
            default: return <Bell size={18} color="#6b7280" />;
        }
    };

    const handleNotificationClick = (notification: AppNotification) => {
        markAsRead(notification.id);
        if (notification.link) {
            navigate(notification.link);
        }
        setIsOpen(false);
    };

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    padding: '0.625rem',
                    borderRadius: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
                <Bell size={20} color="#4b5563" />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: '#ff3b6a',
                        color: 'white',
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        padding: '0.125rem 0.375rem',
                        borderRadius: '9999px',
                        border: '2px solid white',
                        minWidth: '1.25rem',
                        textAlign: 'center'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: '0.75rem',
                            width: '320px',
                            background: 'white',
                            borderRadius: '1rem',
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                            border: '1px solid #e5e7eb',
                            zIndex: 1000,
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{ padding: '1rem', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#111827' }}>Notifications</h4>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={markAllAsRead}
                                    style={{ background: 'none', border: 'none', color: '#ff3b6a', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Tout lu
                                </button>
                                <button
                                    onClick={clearAll}
                                    style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '0.75rem', cursor: 'pointer' }}
                                >
                                    Effacer
                                </button>
                            </div>
                        </div>

                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {notifications.length === 0 ? (
                                <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
                                    <div style={{ background: '#f3f4f6', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                        <Bell size={20} color="#9ca3af" />
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Aucune notification pour le moment.</p>
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        onClick={() => handleNotificationClick(n)}
                                        style={{
                                            padding: '1rem',
                                            borderBottom: '1px solid #f9fafb',
                                            cursor: 'pointer',
                                            background: n.read ? 'white' : '#fef2f4',
                                            display: 'flex',
                                            gap: '0.875rem',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = n.read ? '#f9fafb' : '#fce7eb'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = n.read ? 'white' : '#fef2f4'}
                                    >
                                        <div style={{ flexShrink: 0, marginTop: '0.125rem' }}>
                                            {getIcon(n.type)}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: n.read ? 500 : 700, color: '#111827', lineHeight: 1.4 }}>
                                                {n.title}
                                            </p>
                                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.4 }}>
                                                {n.message}
                                            </p>
                                            <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.625rem', color: '#9ca3af' }}>
                                                {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        {!n.read && (
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff3b6a', marginTop: '0.5rem' }}></div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
