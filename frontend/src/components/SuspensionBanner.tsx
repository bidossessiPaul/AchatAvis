import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../context/authStore';
import { AlertTriangle, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

export const SuspensionBanner: React.FC = () => {
    const { user } = useAuthStore();
    const [suspension, setSuspension] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const checkSuspension = async () => {
            if (!user) return;
            try {
                const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
                const response = await axios.get(`${baseURL}/suspensions/user/${user.id}`);
                if (response.data && response.data.data && response.data.data.is_suspended) {
                    setSuspension(response.data.data.active_suspension);
                } else {
                    setSuspension(null);
                }
            } catch (error) {
                // Silently fail - user might not be authenticated yet or endpoint might not be available
                setSuspension(null);
            }
        };

        checkSuspension();

        // Check every minute
        const interval = setInterval(checkSuspension, 60000);
        return () => clearInterval(interval);
    }, [user]);

    if (!user || !suspension || !isVisible) return null;

    const isCritical = suspension.badge_color === 'red';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{
                    background: isCritical ? '#ef4444' : '#f59e0b',
                    color: 'white',
                    position: 'relative',
                    zIndex: 100
                }}
            >
                <div style={{
                    maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1.5rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <AlertTriangle size={20} />
                        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                            <span style={{ opacity: 0.8 }}>Compte Suspendu : </span>
                            {suspension.level_name}
                            <span style={{ marginLeft: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.125rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem' }}>
                                Accès limité
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <a
                            href="/guide/status"
                            style={{
                                color: 'white', textDecoration: 'none', fontSize: '0.8125rem',
                                fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem'
                            }}
                        >
                            Voir les détails <ChevronRight size={14} />
                        </a>
                        <button
                            onClick={() => setIsVisible(false)}
                            style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
