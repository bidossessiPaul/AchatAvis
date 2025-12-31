import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { artisanService } from '../../services/artisanService';
import { ReviewOrder } from '../../types';
import { Clock, ArrowRight, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PremiumBlurOverlay } from '../../components/layout/PremiumBlurOverlay';
import { useAuthStore } from '../../context/authStore';

type FilterStatus = 'all' | 'pending' | 'in_progress' | 'completed';

export const OrdersList: React.FC = () => {
    const [orders, setOrders] = useState<ReviewOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
    const navigate = useNavigate();
    const { user } = useAuthStore();

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        setIsLoading(true);
        try {
            const data = await artisanService.getMyOrders();
            setOrders(data);
        } catch (error) {
            console.error("Failed to load orders", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getFilteredOrders = () => {
        if (activeFilter === 'all') return orders.filter(o => o.status !== 'draft');
        if (activeFilter === 'pending') return orders.filter(o => o.status === 'submitted' || o.status === 'pending');
        if (activeFilter === 'in_progress') return orders.filter(o => o.status === 'in_progress');
        if (activeFilter === 'completed') return orders.filter(o => o.status === 'completed');
        return orders;
    };

    const filteredOrders = getFilteredOrders();

    const stats = {
        pending: orders.filter(o => o.status === 'submitted' || o.status === 'pending').length,
        inProgress: orders.filter(o => o.status === 'in_progress').length,
        completed: orders.filter(o => o.status === 'completed').length,
    };

    const TabButton: React.FC<{ status: FilterStatus; label: string; count: number }> = ({ status, label, count }) => (
        <button
            onClick={() => setActiveFilter(status)}
            style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                background: 'none',
                borderBottom: activeFilter === status ? '3px solid #ff3b6a' : '3px solid transparent',
                color: activeFilter === status ? '#ff3b6a' : '#6b7280',
                fontWeight: activeFilter === status ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
            }}
        >
            {label}
            <span style={{
                background: activeFilter === status ? '#ff3b6a' : '#f3f4f6',
                color: activeFilter === status ? 'white' : '#6b7280',
                padding: '0.1rem 0.5rem',
                borderRadius: '9999px',
                fontSize: '0.75rem'
            }}>
                {count}
            </span>
        </button>
    );

    return (
        <DashboardLayout title="Suivi des commandes">
            <PremiumBlurOverlay isActive={(user?.missions_allowed || 0) > 0}>
                <div style={{ marginBottom: '2rem' }}>
                    <p style={{ color: '#6b7280' }}>Visualisez ici l'état de vos commandes d'avis et leur progression.</p>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    borderBottom: '1px solid #e5e7eb',
                    marginBottom: '2rem',
                    overflowX: 'auto'
                }}>
                    <TabButton status="all" label="Tous" count={stats.pending + stats.inProgress + stats.completed} />
                    <TabButton status="pending" label="En attente" count={stats.pending} />
                    <TabButton status="in_progress" label="En cours" count={stats.inProgress} />
                    <TabButton status="completed" label="Terminés" count={stats.completed} />
                </div>

                {/* List */}
                <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid #f3f4f6', overflow: 'hidden' }}>
                    {isLoading ? (
                        <div style={{ padding: '4rem', textAlign: 'center' }}>
                            <div className="animate-spin" style={{ margin: '0 auto 1rem' }}>
                                <Clock size={32} color="#ff3b6a" />
                            </div>
                            <p>Chargement de vos commandes...</p>
                        </div>
                    ) : filteredOrders.length > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                                    <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Entreprise</th>
                                    <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
                                    <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                                    <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Progression</th>
                                    <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map((order) => (
                                    <tr key={order.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '1.25rem 1rem' }}>
                                            <div style={{ fontWeight: 600, color: '#111827' }}>{order.company_name || 'Sans nom'}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>ID: {order.id.substring(0, 8)}</div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                                            {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                        </td>
                                        <td style={{ padding: '1.25rem 1rem' }}>
                                            <span style={{
                                                padding: '0.4rem 0.8rem',
                                                borderRadius: '9999px',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                backgroundColor:
                                                    order.status === 'completed' ? '#ecfdf5' :
                                                        order.status === 'in_progress' ? '#ebf5ff' :
                                                            '#fff7ed',
                                                color:
                                                    order.status === 'completed' ? '#047857' :
                                                        order.status === 'in_progress' ? '#1e40af' :
                                                            '#c2410c'
                                            }}>
                                                {order.status === 'submitted' ? 'En attente' :
                                                    order.status === 'pending' ? 'En attente' :
                                                        order.status === 'in_progress' ? 'En cours' :
                                                            order.status === 'completed' ? 'Terminé' : order.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1.25rem 1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ flex: 1, height: '6px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{
                                                        width: `${(order.reviews_received / order.quantity) * 100}%`,
                                                        height: '100%',
                                                        background: '#ff3b6a',
                                                        transition: 'width 0.5s ease'
                                                    }} />
                                                </div>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', minWidth: '40px' }}>
                                                    {order.reviews_received}/{order.quantity}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>
                                            <button
                                                onClick={() => navigate(`/artisan/orders/${order.id}`)}
                                                style={{
                                                    background: '#f9fafb',
                                                    border: '1px solid #e5e7eb',
                                                    color: '#111827',
                                                    padding: '0.5rem',
                                                    borderRadius: '0.5rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <ArrowRight size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ padding: '5rem 2rem', textAlign: 'center' }}>
                            <div style={{ background: '#f9fafb', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                <Filter size={32} color="#9ca3af" />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>Aucune commande trouvée</h3>
                            <p style={{ color: '#6b7280', maxWidth: '400px', margin: '0 auto 2rem' }}>
                                Il n'y a aucune commande correspondant à ce filtre pour le moment.
                            </p>
                            {activeFilter !== 'all' && (
                                <button onClick={() => setActiveFilter('all')} className="btn-back">
                                    Voir toutes mes commandes
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </PremiumBlurOverlay>
        </DashboardLayout>
    );
};
