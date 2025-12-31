import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { artisanService } from '../../services/artisanService';
import { ReviewOrder } from '../../types';
import { PlusCircle, Clock, CheckCircle2, AlertCircle, ArrowRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import { PremiumBlurOverlay } from '../../components/layout/PremiumBlurOverlay';

export const ArtisanOverview: React.FC = () => {
    const { user } = useAuthStore();
    const [orders, setOrders] = useState<ReviewOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const [paymentStatus, setPaymentStatus] = useState<'loading' | 'success' | 'error' | null>(null);

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const sessionId = queryParams.get('session_id');

        if (sessionId) {
            handlePaymentReturn(sessionId);
        } else {
            loadOrders();
        }
    }, []);

    const handlePaymentReturn = async (sessionId: string) => {
        setPaymentStatus('loading');
        try {
            const result = await artisanService.verifyPaymentSession(sessionId);
            if (result.success) {
                // IMPORTANT: Update the access token if provided to clear stale 'pending' status
                if (result.accessToken) {
                    localStorage.setItem('accessToken', result.accessToken);
                }

                setPaymentStatus('success');

                // CRITICAL: Refresh auth state to update store with DB content
                const { checkAuth } = useAuthStore.getState();
                await checkAuth();

                // Clean URL ONLY after state is refreshed to prevent SubscriptionGate race condition
                window.history.replaceState({}, '', '/artisan');

                await loadOrders();
            } else {
                setPaymentStatus('error');
            }
        } catch (error) {
            console.error("Payment verification failed", error);
            setPaymentStatus('error');
        }
    };

    const loadOrders = async () => {
        try {
            const data = await artisanService.getMyOrders();
            setOrders(data);
        } catch (error) {
            console.error("Failed to load orders", error);
        } finally {
            setIsLoading(false);
        }
    };

    const stats = {
        total: orders.length,
        submitted: orders.filter(o => o.status === 'submitted' || o.status === 'pending').length,
        completed: orders.filter(o => o.status === 'completed').length,
        drafts: orders.filter(o => o.status === 'draft').length
    };

    return (
        <DashboardLayout title="Vue d'ensemble">
            <PremiumBlurOverlay isActive={(user?.missions_allowed || 0) > 0}>
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
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #f3f4f6', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 500 }}>Total Soumissions</span>
                            <div style={{ background: '#f3f4f6', padding: '0.5rem', borderRadius: '0.5rem' }}><Clock size={20} color="#6b7280" /></div>
                        </div>
                        <span style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827' }}>{stats.total}</span>
                    </div>

                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #f3f4f6', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 500 }}>En cours</span>
                            <div style={{ background: '#fff7ed', padding: '0.5rem', borderRadius: '0.5rem' }}><Clock size={20} color="#f97316" /></div>
                        </div>
                        <span style={{ fontSize: '1.875rem', fontWeight: 700, color: '#f97316' }}>{stats.submitted}</span>
                    </div>

                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #f3f4f6', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 500 }}>Avis Validés</span>
                            <div style={{ background: '#ecfdf5', padding: '0.5rem', borderRadius: '0.5rem' }}><CheckCircle2 size={20} color="#10b981" /></div>
                        </div>
                        <span style={{ fontSize: '1.875rem', fontWeight: 700, color: '#10b981' }}>{stats.completed}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>Soumissions Récentes</h2>
                    <button
                        onClick={() => navigate('/artisan/submit')}
                        style={{
                            background: '#ff3b6a',
                            color: 'white',
                            border: 'none',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '0.75rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer',
                            boxShadow: '0 6px 20px rgba(255, 59, 106, 0.3)',
                            transition: 'all 0.3s ease',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            fontSize: '0.875rem'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#c4ed1a';
                            e.currentTarget.style.color = '#000';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#ff3b6a';
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
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
                                        <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>{new Date(order.created_at).toLocaleDateString()}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '9999px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                backgroundColor: order.status === 'completed' ? '#ecfdf5' : order.status === 'draft' ? '#f3f4f6' : '#fff7ed',
                                                color: order.status === 'completed' ? '#047857' : order.status === 'draft' ? '#4b5563' : '#c2410c'
                                            }}>
                                                {order.status === 'draft' ? 'Brouillon' : order.status === 'submitted' ? 'Soumis' : order.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>{order.reviews_received} / {order.quantity}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <button
                                                onClick={() => navigate(order.status === 'draft' ? `/artisan/submit/${order.id}` : `/artisan/orders/${order.id}`)}
                                                style={{ background: 'none', border: 'none', color: '#ff3b6a', cursor: 'pointer', fontWeight: 600 }}
                                            >
                                                {order.status === 'draft' ? 'Continuer' : <ArrowRight size={18} />}
                                            </button>
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
