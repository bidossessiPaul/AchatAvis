import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminApi } from '../../services/api';
import {
    Search,
    Filter,
    CreditCard,
    TrendingUp,
    Users,
    AlertCircle,
    CheckCircle2,
    Zap,
    PieChart as PieChartIcon,
    BarChart3,
    // ExternalLink,
    Clock,
    ArrowUpRight,
    FolderOpen,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    AreaChart,
    Area
} from 'recharts';
import { showError } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './SubscriptionsList.css';

interface Subscription {
    user_id: string;
    payment_id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    company_name: string;
    subscription_status: string;
    subscription_start_date: string;
    subscription_end_date: string;
    pack_name: string;
    price_cents: number;
    pack_color: string;
    total_quota: number;
    total_used: number;
    is_pack_used: number;
    order_id?: string | null;
}

interface Stats {
    totalActive: number;
    mrr: number;
    distribution: { name: string; value: number; color: string }[];
    statusDistribution: { status: string; count: number }[];
    packTrends: { month: string; pack_name: string; count: number }[];
}

const PACK_COLORS: Record<string, string> = {
    'Découverte': '#FF991F',
    'Croissance': '#FF6B35',
    'Expert': '#d97706'
};

export const SubscriptionsList: React.FC = () => {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [subsData, statsData] = await Promise.all([
                adminApi.getSubscriptions(),
                adminApi.getSubscriptionStats()
            ]);
            setSubscriptions(subsData);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading subscriptions:', error);
            showError('Erreur', 'Erreur lors du chargement des abonnements');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredSubs = subscriptions.filter(sub => {
        const matchesSearch =
            sub.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sub.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sub.company_name?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || sub.subscription_status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredSubs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedSubs = filteredSubs.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);



    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
    };

    return (
        <DashboardLayout title="Abonnements">
            <div className="admin-dashboard revamped full-width">
                {isLoading ? (
                    <div className="admin-loading" style={{ minHeight: '600px' }}>
                        <LoadingSpinner size="lg" text="Chargement des abonnements et statistiques..." />
                    </div>
                ) : (
                    <>

                        {stats && (
                            <div className="admin-glass-stats-container">
                                <div className="subs-stat-card-premium">
                                    <div className="stat-icon-wrapper blue" style={{ background: '#fff8e1', color: '#FF991F' }}>
                                        <Users size={20} />
                                    </div>
                                    <div className="stat-info">
                                        <div className="subs-stat-title">Abonnements Actifs</div>
                                        <div className="subs-stat-value">{stats.totalActive}</div>
                                        <div className="stat-trend positive">
                                            <CheckCircle2 size={12} /> Utilisateurs Premium
                                        </div>
                                    </div>
                                </div>

                                <div className="subs-stat-card-premium">
                                    <div className="stat-icon-wrapper green" style={{ background: '#fff8e1', color: '#FF6B35' }}>
                                        <TrendingUp size={20} />
                                    </div>
                                    <div className="stat-info">
                                        <div className="subs-stat-title">Revenu Mensuel (MRR)</div>
                                        <div className="subs-stat-value">{formatCurrency(stats.mrr)}</div>
                                        <div className="stat-trend info">
                                            <CreditCard size={12} /> Estimation récurrente
                                        </div>
                                    </div>
                                </div>

                                <div className="subs-stat-card-premium">
                                    <div className="stat-icon-wrapper purple">
                                        <Zap size={20} />
                                    </div>
                                    <div className="stat-info">
                                        <div className="subs-stat-title">Plan Populaire</div>
                                        <div className="subs-stat-value" style={{ fontSize: '20px' }}>
                                            {stats.distribution[0]?.name || 'N/A'}
                                        </div>
                                        <div className="stat-trend neutral">
                                            {stats.distribution[0]?.value || 0} utilisateurs
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="charts-grid-premium">
                            <div className="admin-glass-card chart-container-premium">
                                <div className="card-header-simple">
                                    <PieChartIcon size={18} className="text-primary" />
                                    <h3 className="chart-title" style={{ color: '#666' }}>Répartition des Packs</h3>
                                </div>
                                <div className="chart-wrapper">
                                    {stats && (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={stats.distribution}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={90}
                                                    paddingAngle={8}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {stats.distribution.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PACK_COLORS[entry.name] || '#94a3b8'} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{
                                                        background: 'rgba(255, 255, 255, 0.9)',
                                                        borderRadius: '12px',
                                                        border: 'none',
                                                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                                                    }}
                                                />
                                                <Legend iconType="circle" />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                            <div className="admin-glass-card chart-container-premium">
                                <div className="card-header-simple">
                                    <BarChart3 size={18} className="text-primary" />
                                    <h3 className="chart-title" style={{ color: '#666' }}>Tendances des Packs</h3>
                                </div>
                                <div className="chart-wrapper">
                                    {stats && stats.packTrends && (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart
                                                data={(() => {
                                                    const map = new Map<string, any>();
                                                    stats.packTrends.forEach(item => {
                                                        if (!map.has(item.month)) {
                                                            map.set(item.month, { name: item.month });
                                                        }
                                                        const entry = map.get(item.month);
                                                        entry[item.pack_name] = item.count;
                                                    });
                                                    return Array.from(map.values());
                                                })()}
                                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                            >
                                                <defs>
                                                    <linearGradient id="colorDecouverte" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={PACK_COLORS['Découverte']} stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor={PACK_COLORS['Découverte']} stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="colorCroissance" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={PACK_COLORS['Croissance']} stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor={PACK_COLORS['Croissance']} stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="colorExpert" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={PACK_COLORS['Expert']} stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor={PACK_COLORS['Expert']} stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                                <Tooltip
                                                    contentStyle={{
                                                        background: 'rgba(255, 255, 255, 0.9)',
                                                        borderRadius: '12px',
                                                        border: 'none',
                                                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                                                    }}
                                                />
                                                <Area type="monotone" dataKey="Découverte" stroke={PACK_COLORS['Découverte']} strokeWidth={3} fillOpacity={1} fill="url(#colorDecouverte)" />
                                                <Area type="monotone" dataKey="Croissance" stroke={PACK_COLORS['Croissance']} strokeWidth={3} fillOpacity={1} fill="url(#colorCroissance)" />
                                                <Area type="monotone" dataKey="Expert" stroke={PACK_COLORS['Expert']} strokeWidth={3} fillOpacity={1} fill="url(#colorExpert)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>
                        </div>

                        {!isLoading && filteredSubs.length > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--gray-50)', borderRadius: '12px', flexWrap: 'wrap', gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)', fontWeight: 500 }}>Afficher :</span>
                                    <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--gray-300)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', backgroundColor: 'white' }}>
                                        <option value={20}>20 abonnements</option>
                                        <option value={50}>50 abonnements</option>
                                        <option value={100}>100 abonnements</option>
                                        <option value={200}>200 abonnements</option>
                                    </select>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>{startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredSubs.length)} sur {filteredSubs.length}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--gray-300)', backgroundColor: currentPage === 1 ? 'var(--gray-100)' : 'white', color: currentPage === 1 ? 'var(--gray-400)' : 'var(--gray-700)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s' }}><ChevronLeft size={16} />Précédent</button>
                                    <span style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)' }}>Page {currentPage} / {totalPages}</span>
                                    <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--gray-300)', backgroundColor: currentPage === totalPages ? 'var(--gray-100)' : 'white', color: currentPage === totalPages ? 'var(--gray-400)' : 'var(--gray-700)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s' }}>Suivant<ChevronRight size={16} /></button>
                                </div>
                            </div>
                        )}
                        <div className="admin-main-card glass">
                            <div className="admin-card-header" style={{ padding: '0.5rem 0 1.5rem 0' }}>
                                <div>
                                    <h2 className="card-title">Liste des Abonnés</h2>
                                    <p className="admin-p-subtitle">Gérez les accès et surveillez les dates de renouvellement.</p>
                                </div>
                                <div className="admin-controls-premium" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div className="search-box-premium" style={{ position: 'relative' }}>
                                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                        <input
                                            type="text"
                                            placeholder="Rechercher un abonné..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{
                                                padding: '0.75rem 1rem 0.75rem 2.5rem',
                                                borderRadius: '12px',
                                                border: '1px solid var(--gray-200)',
                                                width: '280px',
                                                fontSize: '0.875rem'
                                            }}
                                        />
                                    </div>
                                    <div className="filter-group-premium" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--gray-50)', padding: '4px', borderRadius: '14px', border: '1px solid var(--gray-200)' }}>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <Filter size={16} style={{ position: 'absolute', left: '12px', color: 'var(--gray-500)' }} />
                                            <select
                                                className="admin-select-premium"
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                                style={{
                                                    padding: '0.6rem 2rem 0.6rem 2.25rem',
                                                    borderRadius: '10px',
                                                    border: 'none',
                                                    background: 'white',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 600,
                                                    color: 'var(--gray-700)',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                }}
                                            >
                                                <option value="all">Tous les Statuts</option>
                                                <option value="active">Actifs</option>
                                                <option value="cancelled">Annulés</option>
                                                <option value="past_due">Impayés</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="admin-table-container">
                                <table className="admin-modern-table">
                                    <thead>
                                        <tr>
                                            <th>Utilisateur / Société</th>
                                            <th>Pack</th>
                                            <th>État Pack</th>
                                            <th>Usage Avis</th>
                                            <th>Prix</th>
                                            <th>Statut</th>
                                            <th>Date Achat</th>
                                            <th className="text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedSubs.length > 0 ? (paginatedSubs.map((sub, index) => (
                                            <tr key={sub.payment_id || sub.user_id + index} style={{ animationDelay: `${index * 50}ms` }}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                                        {sub.avatar_url ? (
                                                            <img src={sub.avatar_url} alt="" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                                                        ) : (
                                                            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>
                                                                <div style={{ fontSize: '12px', fontWeight: 700 }}>{sub.full_name?.charAt(0).toUpperCase()}</div>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div style={{ fontWeight: 600, color: 'var(--gray-900)', fontSize: '13px', lineHeight: '1' }}>{sub.full_name}</div>
                                                            <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '2px' }}>{sub.company_name}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`pack-badge ${(sub.pack_name || '').includes('Découverte') ? 'discovery' : (sub.pack_name || '').includes('Croissance') ? 'growth' : 'expert'}`}>
                                                        {sub.pack_name || 'Inconnu'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`sub-status ${sub.is_pack_used > 0 ? 'active' : 'pending'}`} style={{ background: sub.is_pack_used > 0 ? '#fff8e1' : '#F1F5F9', color: sub.is_pack_used > 0 ? '#FF991F' : '#64748B' }}>
                                                        {sub.is_pack_used > 0 ? (
                                                            <>
                                                                <CheckCircle2 size={12} style={{ marginRight: '4px' }} />
                                                                Utilisé
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Clock size={12} style={{ marginRight: '4px' }} />
                                                                Disponible
                                                            </>
                                                        )}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="usage-container">
                                                        <div className="usage-text" style={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                                            <span>{sub.total_used || 0} / {sub.total_quota || 0}</span>
                                                            <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>{Math.round(((sub.total_used || 0) / (sub.total_quota || 1)) * 100)}%</span>
                                                        </div>
                                                        <div className="usage-bar-bg" style={{ width: '100px', height: '6px', background: 'var(--gray-100)', borderRadius: '10px', overflow: 'hidden' }}>
                                                            <div
                                                                className="usage-bar-fill"
                                                                style={{
                                                                    height: '100%',
                                                                    width: `${Math.min(100, ((sub.total_used || 0) / (sub.total_quota || 1)) * 100)}%`,
                                                                    background: (sub.total_used || 0) >= (sub.total_quota || 0) && (sub.total_quota || 0) > 0 ? '#ef4444' : 'var(--artisan-gradient)',
                                                                    borderRadius: '10px'
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ fontWeight: 600 }}>
                                                    {formatCurrency((sub.price_cents || 0) / 100)}
                                                </td>
                                                <td>
                                                    <span className={`sub-status ${sub.subscription_status}`}>
                                                        {sub.subscription_status === 'active' || sub.subscription_status === 'completed' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                                        {sub.subscription_status === 'active' || sub.subscription_status === 'completed' ? 'Actif' : sub.subscription_status === 'cancelled' ? 'Annulé' : sub.subscription_status}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '12px', color: '#475569' }}>
                                                    {new Date(sub.subscription_start_date).toLocaleDateString()}
                                                </td>
                                                <td className="actions-cell">
                                                    <div className="action-buttons-group">
                                                        <button
                                                            className="premium-icon-btn"
                                                            title="Voir profil artisan"
                                                            onClick={() => window.location.href = `/admin/artisans/${sub.user_id}`}
                                                        >
                                                            <ArrowUpRight size={16} />
                                                        </button>

                                                        {sub.is_pack_used > 0 && sub.order_id ? (
                                                            <button
                                                                className="premium-icon-btn"
                                                                title="Voir la fiche liée"
                                                                style={{ color: '#FF991F', borderColor: '#FFE6A5', background: '#fff8e1' }}
                                                                onClick={() => window.location.href = `/admin/fiches/${sub.order_id}`}
                                                            >
                                                                <FolderOpen size={16} />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className="premium-icon-btn disabled"
                                                                title="Aucune fiche liée"
                                                                style={{ opacity: 0.5, cursor: 'not-allowed', background: '#f8fafc' }}
                                                                disabled
                                                            >
                                                                <FolderOpen size={16} className="text-gray-400" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))) : (
                                            <tr>
                                                <td colSpan={7} className="text-center" style={{ padding: '60px' }}>
                                                    <div className="empty-state">
                                                        <Users size={48} className="empty-icon" />
                                                        <p className="empty-text">Aucun abonnement trouvé.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
};
