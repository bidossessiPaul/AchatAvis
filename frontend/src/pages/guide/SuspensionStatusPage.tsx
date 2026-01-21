import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useAuthStore } from '../../context/authStore';
import { motion } from 'framer-motion';
import {
    AlertOctagon,
    Clock,
    ShieldAlert,
    FileText,
    ExternalLink,
    ChevronRight,
    RefreshCcw,
    Ban
} from 'lucide-react';
import axios from 'axios';

interface SuspensionData {
    is_suspended: boolean;
    is_banned: boolean;
    ban_reason: string;
    active_suspension: {
        level_number: number;
        level_name: string;
        reason_details: string;
        icon_emoji: string;
        badge_color: string;
        ends_at: string;
        consequences: any;
        requirements_to_lift: any;
    } | null;
}

export const SuspensionStatusPage: React.FC = () => {
    const { user } = useAuthStore();
    const [data, setData] = useState<SuspensionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState<string>('');

    const fetchStatus = async () => {
        if (!user) return;
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/suspensions/user/${user.id}`);
            setData(response.data.data);
        } catch (error) {
            console.error('Error fetching suspension status:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, [user]);

    useEffect(() => {
        if (!data?.active_suspension?.ends_at) return;

        const timer = setInterval(() => {
            const end = new Date(data.active_suspension!.ends_at).getTime();
            const now = new Date().getTime();
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft('Prêt pour la réactivation');
                clearInterval(timer);
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${days}j ${hours}v ${mins}m ${secs}s`);
        }, 1000);

        return () => clearInterval(timer);
    }, [data]);

    if (loading) {
        return (
            <DashboardLayout title="État du Compte">
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <RefreshCcw className="animate-spin" size={32} color="#64748b" />
                </div>
            </DashboardLayout>
        );
    }

    const isBanned = data?.is_banned;
    const suspension = data?.active_suspension;

    return (
        <DashboardLayout title="État de Conformité">
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                {isBanned ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            background: '#0f172a',
                            borderRadius: '1.5rem',
                            padding: '3rem',
                            color: 'white',
                            textAlign: 'center',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                        }}
                    >
                        <div style={{
                            width: '80px', height: '80px', background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '50%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', margin: '0 auto 2rem', border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}>
                            <Ban size={40} color="#ef4444" />
                        </div>
                        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '1rem' }}>Bannissement Définitif</h1>
                        <p style={{ color: '#94a3b8', fontSize: '1.125rem', lineHeight: 1.6, marginBottom: '2rem' }}>
                            Votre accès à la plateforme AchatAvis a été révoqué de manière permanente suite à des violations graves ou répétées de nos conditions d'utilisation.
                        </p>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '1rem', textAlign: 'left', marginBottom: '2rem' }}>
                            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase' }}>Raison officielle :</span>
                            <p style={{ marginTop: '0.5rem', margin: 0 }}>{data?.ban_reason || 'Voiolation des protocoles de sécurité non remédiée.'}</p>
                        </div>
                        <button
                            onClick={() => window.location.href = 'mailto:contact@achatavis.com'}
                            style={{ background: 'white', color: '#0f172a', padding: '1rem 2rem', borderRadius: '0.75rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                        >
                            Contacter le Support
                        </button>
                    </motion.div>
                ) : suspension ? (
                    <div style={{ display: 'grid', gap: '2rem' }}>
                        {/* Main Alert Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{
                                background: 'white',
                                borderRadius: '1.5rem',
                                border: `1px solid ${suspension.badge_color === 'red' ? '#fee2e2' : '#ffedd5'}`,
                                overflow: 'hidden',
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)'
                            }}
                        >
                            <div style={{
                                background: suspension.badge_color === 'red' ? '#ef4444' : '#f59e0b',
                                padding: '2rem', color: 'white', display: 'flex', alignItems: 'center', gap: '1.5rem'
                            }}>
                                <div style={{
                                    width: '64px', height: '64px', background: 'rgba(0,0,0,0.1)',
                                    borderRadius: '1rem', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: '2rem'
                                }}>
                                    {suspension.icon_emoji}
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Compte Suspendu - Niv. {suspension.level_number}</h2>
                                    <p style={{ margin: 0, opacity: 0.9, fontWeight: 600 }}>{suspension.level_name}</p>
                                </div>
                            </div>

                            <div style={{ padding: '2rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                                    <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                            <Clock size={14} /> Temps Restant
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{timeLeft}</div>
                                    </div>
                                    <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                            <ShieldAlert size={14} /> Gravité
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: suspension.badge_color === 'red' ? '#ef4444' : '#f59e0b' }}>
                                            {suspension.level_number === 1 ? 'Avertissement' : 'Interdiction'}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '2rem' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>Détails de l'incident</h3>
                                    <div style={{ padding: '1rem', background: '#f1f5f9', borderRadius: '0.75rem', borderLeft: `4px solid ${suspension.badge_color === 'red' ? '#ef4444' : '#f59e0b'}` }}>
                                        {suspension.reason_details}
                                    </div>
                                </div>

                                <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '1rem', padding: '1.5rem' }}>
                                    <h4 style={{ color: '#92400e', fontWeight: 800, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                        <AlertOctagon size={16} /> CONSÉQUENCES ACTIVES
                                    </h4>
                                    <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'grid', gap: '0.75rem' }}>
                                        <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#92400e', fontSize: '0.875rem' }}>
                                            <ChevronRight size={14} /> Participation aux fiches bloquée
                                        </li>
                                        {suspension.consequences.earnings_frozen && (
                                            <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#92400e', fontSize: '0.875rem' }}>
                                                <ChevronRight size={14} /> Fonds gelés (temporairement)
                                            </li>
                                        )}
                                        {suspension.consequences.withdrawals_blocked && (
                                            <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#92400e', fontSize: '0.875rem' }}>
                                                <ChevronRight size={14} /> Demandes de retrait désactivées
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </motion.div>

                        {/* Educational Section */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid #e2e8f0' }}>
                                <div style={{ width: '40px', height: '40px', background: '#f0f9ff', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                                    <FileText size={20} color="#0369a1" />
                                </div>
                                <h4 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Ressources Éducatives</h4>
                                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>Consultez nos guides pour comprendre comment améliorer votre profil.</p>
                                <button
                                    onClick={() => window.location.href = '/guide/anti-detection'}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', background: 'transparent', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                >
                                    Guide Anti-Détection <ExternalLink size={14} />
                                </button>
                            </div>

                            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid #e2e8f0' }}>
                                <div style={{ width: '40px', height: '40px', background: '#f0fdf4', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                                    <ShieldAlert size={20} color="#166534" />
                                </div>
                                <h4 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Conditions de Levée</h4>
                                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>Ce qu'il vous reste à faire pour retrouver l'accès aux fiches.</p>
                                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#166534', background: '#f0fdf4', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', display: 'inline-block' }}>
                                    {suspension.requirements_to_lift.wait_duration ? 'Attendre la fin du délai' : 'Action requise'}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '4rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Compte en règle ✅</h2>
                        <p style={{ color: '#64748b' }}>Vous n'avez aucune suspension active sur votre compte.</p>
                        <button
                            onClick={() => window.location.href = '/guide/dashboard'}
                            style={{ marginTop: '2rem', padding: '0.875rem 2rem', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 700 }}
                        >
                            Retour au Dashboard
                        </button>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};
