import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { artisanService } from '../../services/artisanService';
import { ReviewOrder } from '../../types';
import { PlusCircle, CheckCircle2, AlertCircle, ArrowRight, Star, TrendingUp, DollarSign, Target, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import { PremiumBlurOverlay } from '../../components/layout/PremiumBlurOverlay';
import { GrowthChart, DistributionChart } from '../../components/Dashboard/DashboardCharts';
import { motion } from 'framer-motion';
import './ArtisanOverview.css';

export const ArtisanOverview: React.FC = () => {
    const { user } = useAuthStore();
    const [orders, setOrders] = useState<ReviewOrder[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const [paymentStatus, setPaymentStatus] = useState<'loading' | 'success' | 'error' | null>(null);

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const sessionId = queryParams.get('session_id');

        if (sessionId) {
            handlePaymentReturn(sessionId);
        } else {
            loadDashboardData();
        }
    }, []);

    const handlePaymentReturn = async (sessionId: string) => {
        setPaymentStatus('loading');
        try {
            const result = await artisanService.verifyPaymentSession(sessionId);
            if (result.success) {
                if (result.accessToken) {
                    localStorage.setItem('accessToken', result.accessToken);
                }
                setPaymentStatus('success');
                const { checkAuth } = useAuthStore.getState();
                await checkAuth();
                window.history.replaceState({}, '', '/artisan');
                await loadDashboardData();
            } else {
                setPaymentStatus('error');
            }
        } catch (error) {
            console.error("Payment verification failed", error);
            setPaymentStatus('error');
        }
    };

    const [hasActivePacks, setHasActivePacks] = useState<boolean>(true);

    const loadDashboardData = async () => {
        setIsLoading(true);
        try {
            const [ordersData, statsData, packs] = await Promise.all([
                artisanService.getMyOrders(),
                artisanService.getStats(),
                artisanService.getAvailablePacks()
            ]);
            setOrders(ordersData);
            setStats(statsData);
            setHasActivePacks(packs.length > 0);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteOrder = async (orderId: string, companyName: string = 'Sans nom') => {
        const Swal = (await import('sweetalert2')).default;
        const result = await Swal.fire({
            title: 'Supprimer cette mission ?',
            html: `Êtes-vous sûr de vouloir supprimer la mission <strong>${companyName}</strong> ?<br/><small>Le crédit de votre pack sera restauré.</small>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff3b6a',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Oui, supprimer',
            cancelButtonText: 'Annuler'
        });

        if (result.isConfirmed) {
            try {
                await artisanService.deleteOrder(orderId);
                await Swal.fire('Supprimé !', 'La mission a été supprimée.', 'success');
                loadDashboardData();
            } catch (error) {
                console.error('Delete error:', error);
                await Swal.fire('Erreur', 'Impossible de supprimer cette mission.', 'error');
            }
        }
    };

    return (
        <DashboardLayout title="Vue d'ensemble">
            <PremiumBlurOverlay isActive={isLoading || hasActivePacks || orders.length > 0}>
                {/* Hero Section with Blue-White Gradient */}
                <div className="artisan-dashboard-hero">
                    <div className="artisan-dashboard-hero-content">
                        <div className="artisan-dashboard-hero-text">
                            <h2 className="artisan-dashboard-hero-title">Boostez votre visibilité sur Google !</h2>
                            <p className="artisan-dashboard-hero-subtitle">
                                Gérez vos missions, suivez vos avis et développez votre présence en ligne.
                            </p>
                        </div>
                        <Star className="artisan-dashboard-hero-icon" />
                    </div>
                </div>

                {paymentStatus === 'success' && (
                    <div style={{
                        background: '#ecfdf5',
                        border: '1px solid #10b981',
                        color: '#065f46',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        marginBottom: '2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                    }}>
                        <div style={{ background: '#10b981', borderRadius: '50%', padding: '0.25rem' }}>
                            <CheckCircle2 color="white" size={20} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0, fontWeight: 600 }}>Paiement confirmé !</h4>
                            <p style={{ margin: 0, fontSize: '0.875rem' }}>Votre abonnement est maintenant actif. Vous pouvez commencer à récolter des avis.</p>
                        </div>
                        <button
                            onClick={() => setPaymentStatus(null)}
                            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#065f46', cursor: 'pointer' }}
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Subscription CTA Banner for Pending/Non-active users */}
                {(!user?.subscription_status || user.subscription_status !== 'active') && paymentStatus !== 'success' && (
                    <div style={{
                        background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                        border: '1px solid #f59e0b',
                        color: '#92400e',
                        padding: '1.25rem',
                        borderRadius: '1rem',
                        marginBottom: '2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1.5rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ background: '#f59e0b', borderRadius: '50%', padding: '0.5rem', display: 'flex' }}>
                                <Star size={24} color="white" fill="white" />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', color: '#78350f' }}>Activez votre compte pour obtenir des avis</h4>
                                <p style={{ margin: '0.25rem 0 0', fontSize: '1rem', opacity: 0.9 }}>
                                    Choisissez un pack d'avis pour commencer à booster votre visibilité sur Google Maps.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/artisan/plan')}
                            style={{
                                background: '#ff3b6a',
                                color: 'white',
                                border: 'none',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '0.75rem',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(255, 59, 106, 0.2)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            Voir les Packs
                        </button>
                    </div>
                )}

                {paymentStatus === 'loading' && (
                    <div style={{ textAlign: 'center', padding: '2rem', background: 'white', borderRadius: '1rem', marginBottom: '2rem' }}>
                        <p>Vérification du paiement en cours...</p>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Investissement Total</span>
                            <div style={{ background: '#fff1f2', padding: '0.5rem', borderRadius: '0.75rem' }}><DollarSign size={20} color="#ff3b6a" /></div>
                        </div>
                        <span style={{ fontSize: '1.875rem', fontWeight: 800, color: '#111827' }}>{Number(stats?.kpis?.total_investment || 0).toFixed(2)}€</span>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <TrendingUp size={14} />
                            <span>Visibilité en hausse</span>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avis Récoltés</span>
                            <div style={{ background: '#ecfdf5', padding: '0.5rem', borderRadius: '0.75rem' }}><CheckCircle2 size={20} color="#10b981" /></div>
                        </div>
                        <span style={{ fontSize: '1.875rem', fontWeight: 800, color: '#111827' }}>{stats?.kpis?.total_reviews_received || 0}</span>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                            Sur {stats?.kpis?.total_reviews_ordered || 0} commandés
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Taux de Succès</span>
                            <div style={{ background: '#eff6ff', padding: '0.5rem', borderRadius: '0.75rem' }}><Target size={20} color="#3b82f6" /></div>
                        </div>
                        <span style={{ fontSize: '1.875rem', fontWeight: 800, color: '#111827' }}>
                            {stats?.kpis?.total_reviews_ordered > 0
                                ? Math.round((stats.kpis.total_reviews_received / stats.kpis.total_reviews_ordered) * 100)
                                : 0}%
                        </span>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                            Missions en cours : {stats?.statusBreakdown?.find((s: any) => s.status === 'in_progress')?.count || 0}
                        </div>
                    </motion.div>
                </div>

                {/* Charts Section */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', color: '#111827' }}>Évolution de votre Réputation</h3>
                        <GrowthChart data={stats?.weeklyGrowth || []} />
                    </div>
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', color: '#111827' }}>Distribution par Secteur</h3>
                        <DistributionChart data={stats?.sectorDistribution || []} />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>Soumissions Récentes</h2>
                    <button
                        onClick={() => navigate('/artisan/submit')}
                        className="artisan-submit-btn"
                    >
                        <PlusCircle size={18} />
                        Soumettre une fiche
                    </button>
                </div>

                <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid #f3f4f6', overflow: 'hidden' }}>
                    {isLoading ? (
                        <div style={{ padding: '2rem', textAlign: 'center' }}>Chargement...</div>
                    ) : orders.length > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                                    <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Entreprise</th>
                                    <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Pack</th>
                                    <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
                                    <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                                    <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Avis</th>
                                    <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => (
                                    <tr key={order.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '1rem', fontWeight: 500 }}>{order.company_name || 'Sans nom'}</td>
                                        <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                                            <span style={{
                                                background: '#f3f4f6',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '0.375rem',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                color: '#374151'
                                            }}>
                                                {(order as any).pack_name || '-'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>{new Date(order.created_at).toLocaleDateString()}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '9999px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                backgroundColor: order.status === 'completed' ? '#ecfdf5' : order.status === 'draft' ? '#f3f4f6' : order.status === 'submitted' ? '#eff6ff' : '#fff7ed',
                                                color: order.status === 'completed' ? '#047857' : order.status === 'draft' ? '#4b5563' : order.status === 'submitted' ? '#2563eb' : '#c2410c'
                                            }}>
                                                {order.status === 'draft' ? 'Brouillon' : order.status === 'submitted' ? 'En révision' : order.status === 'in_progress' ? 'En cours' : order.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>{order.reviews_received} / {order.quantity}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                {(order.status === 'draft' || order.status === 'submitted') && (
                                                    <button
                                                        onClick={() => handleDeleteOrder(order.id, order.company_name)}
                                                        style={{
                                                            background: 'none',
                                                            border: '1px solid #ef4444',
                                                            color: '#ef4444',
                                                            padding: '0.5rem',
                                                            borderRadius: '0.5rem',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = '#ef4444';
                                                            e.currentTarget.style.color = 'white';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'none';
                                                            e.currentTarget.style.color = '#ef4444';
                                                        }}
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => navigate((order.status === 'draft' || order.status === 'submitted') ? `/artisan/submit/${order.id}` : `/artisan/orders/${order.id}`)}
                                                    style={{ background: 'none', border: 'none', color: '#ff3b6a', cursor: 'pointer', fontWeight: 600 }}
                                                >
                                                    {(order.status === 'draft' || order.status === 'submitted') ? 'Modifier' : <ArrowRight size={18} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                            <div style={{ background: '#f3f4f6', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                <AlertCircle size={32} color="#9ca3af" />
                            </div>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>Aucune soumission</h3>
                            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Vous n'avez pas encore soumis de fiche pour récolter des avis.</p>
                            <button
                                onClick={() => navigate('/artisan/submit')}
                                className="btn-next"
                                style={{ margin: '0 auto' }}
                            >
                                Soumettre ma première fiche
                            </button>
                        </div>
                    )}
                </div>
            </PremiumBlurOverlay>
        </DashboardLayout>
    );
};
