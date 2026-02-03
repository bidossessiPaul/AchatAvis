import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminService } from '../../services/adminService';
import {
    Users,
    TrendingUp,
    ShoppingBag,
    CheckCircle2,
    Clock,
    ArrowUpRight,
    DollarSign,
    RefreshCw,
    Briefcase
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend
} from 'recharts';
import { showError } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './AdminDashboard.css';

import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DashboardStats {
    revenue: any[];
    submissionStats: any[];
    sectorStats: any[];
    trustDistribution: any[];
    totalAllTimeRevenue?: number;
    growth: any[];
    pending: {
        pending_reviews: number;
        pending_users: number;
        pending_payouts: number;
    };
    totals: {
        total_artisans: number;
        total_guides: number;
        total_orders: number;
    };
    activities: any[];
}

const COLORS = {
    revenue: '#ea580c',
    payouts: '#8b5cf6',
    pie: ['#ea580c', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#64748b'],
    status: {
        validated: '#10b981',
        pending: '#f59e0b',
        rejected: '#ef4444'
    }
};

export const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setIsLoading(true);
        try {
            const data = await adminService.getGlobalStats();
            setStats(data);
        } catch (error) {
            showError('Erreur', 'Erreur lors du chargement des statistiques');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return (
        <DashboardLayout title="Administration">
            <div className="admin-loading">
                <LoadingSpinner size="lg" text="Chargement des statistiques..." />
            </div>
        </DashboardLayout>
    );

    if (!stats) return null;

    const renderActivityIcon = (type: string) => {
        switch (type) {
            case 'new_user': return <div className="notif-dot blue"></div>;
            case 'submission': return <div className="notif-dot purple"></div>;
            case 'validation': return <div className="notif-dot green"></div>;
            case 'payment': return <div className="notif-dot orange"></div>;
            default: return <div className="notif-dot gray"></div>;
        }
    };

    const formatActivityAmount = (activity: any) => {
        if (!activity.amount) return null;
        return <span style={{ fontWeight: 700, color: '#10b981', marginLeft: '4px' }}>(+{parseFloat(activity.amount).toFixed(2)}€)</span>;
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #f1f5f9',
                    backdropFilter: 'blur(4px)'
                }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{ margin: '4px 0', fontSize: '0.875rem', fontWeight: 800, color: entry.color }}>
                            {entry.name}: {Number(entry.value).toFixed(2)} €
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Calculate maximum for trend chart
    const maxVal = stats.revenue && stats.revenue.length > 0
        ? Math.max(...stats.revenue.map(d => Math.max(Number(d.total_revenue || 0), Number(d.total_payouts || 0))))
        : 0;
    const trendMax = (maxVal === 0 || isNaN(maxVal)) ? 100 : Math.ceil((maxVal * 1.5) / 50) * 50;

    // User Distribution Data
    const userDistData = [
        { name: 'Artisans', value: stats.totals.total_artisans },
        { name: 'Guides', value: stats.totals.total_guides }
    ];

    // Submission Status Data
    const submissionData = stats.submissionStats.map(s => ({
        name: s.status === 'validated' ? 'Validés' : s.status === 'pending' ? 'En attente' : 'Rejetés',
        value: s.count,
        color: s.status === 'validated' ? COLORS.status.validated : s.status === 'pending' ? COLORS.status.pending : COLORS.status.rejected
    }));

    return (
        <DashboardLayout title="Vue d'ensemble">
            <div className="admin-dashboard revamped">
                {/* Refresh Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                    <button
                        onClick={loadStats}
                        disabled={isLoading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            background: 'var(--artisan-gradient)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            opacity: isLoading ? 0.7 : 1
                        }}
                    >
                        <RefreshCw size={16} style={{
                            animation: isLoading ? 'spin 1s linear infinite' : 'none',
                            transformOrigin: 'center'
                        }} />
                        {isLoading ? 'Actualisation...' : 'Actualiser'}
                    </button>
                </div>

                {/* Main Stats Cards */}
                <div className="admin-stats-overview">
                    <div className="admin-stat-card">
                        <div className="stat-icon-wrapper blue">
                            <TrendingUp size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">Chiffre d'Affaires</span>
                            <span className="stat-value">{stats.totalAllTimeRevenue || 0}€</span>
                            <span className="stat-trend positive">
                                <ArrowUpRight size={14} /> Global
                            </span>
                        </div>
                    </div>

                    <div className="admin-stat-card">
                        <div className="stat-icon-wrapper purple">
                            <Users size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">Utilisateurs</span>
                            <span className="stat-value">{stats.totals.total_artisans + stats.totals.total_guides}</span>
                            <span className="stat-sub">{stats.totals.total_artisans} artisans, {stats.totals.total_guides} guides</span>
                        </div>
                    </div>

                    <div className="admin-stat-card">
                        <div className="stat-icon-wrapper green">
                            <ShoppingBag size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">Commandes</span>
                            <span className="stat-value">{stats.totals.total_orders}</span>
                            <span className="stat-sub">Facturées</span>
                        </div>
                    </div>

                    <div className="admin-stat-card">
                        <div className="stat-icon-wrapper yellow">
                            <Clock size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">En Attente</span>
                            <span className="stat-value">{stats.pending.pending_reviews}</span>
                            <span className="stat-sub">Actions requises</span>
                        </div>
                    </div>
                </div>

                <div className="dashboard-charts-grid">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
                        {/* Revenue vs Payouts Trend */}
                        <div className="chart-card">
                            <div className="chart-header">
                                <div className="header-titles">
                                    <h3 style={{ color: '#1e293b', fontWeight: 800 }}>Performance Financière</h3>
                                    <span className="chart-subtitle">Flux de trésorerie (30j)</span>
                                </div>
                                <div className="legend-item" style={{ gap: '15px' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#64748b' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS.revenue }}></div> Revenus
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#64748b' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS.payouts }}></div> Retraits
                                    </span>
                                </div>
                            </div>
                            <div className="chart-container" style={{ marginTop: '1.5rem', height: '320px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats.revenue} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={COLORS.revenue} stopOpacity={0.1} />
                                                <stop offset="95%" stopColor={COLORS.revenue} stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorPay" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={COLORS.payouts} stopOpacity={0.1} />
                                                <stop offset="95%" stopColor={COLORS.payouts} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="label"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
                                            tickFormatter={(value) => `${value}€`}
                                            domain={[0, trendMax]}
                                            allowDecimals={false}
                                            width={65}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area
                                            name="Revenu"
                                            type="monotone"
                                            dataKey="total_revenue"
                                            stroke={COLORS.revenue}
                                            fillOpacity={1}
                                            fill="url(#colorRev)"
                                            strokeWidth={3}
                                            dot={false}
                                            activeDot={{ r: 6, fill: COLORS.revenue, stroke: '#fff', strokeWidth: 2 }}
                                        />
                                        <Area
                                            name="Retrait"
                                            type="monotone"
                                            dataKey="total_payouts"
                                            stroke={COLORS.payouts}
                                            fillOpacity={1}
                                            fill="url(#colorPay)"
                                            strokeWidth={3}
                                            dot={false}
                                            activeDot={{ r: 6, fill: COLORS.payouts, stroke: '#fff', strokeWidth: 2 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* User Distribution - Moved here to fill space */}
                        <div className="secondary-chart-card" style={{ minHeight: 'auto' }}>
                            <div className="chart-header" style={{ marginBottom: '0.5rem' }}>
                                <div className="header-titles">
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Communauté</h3>
                                    <span className="chart-subtitle">Répartion Artisans vs Guides</span>
                                </div>
                            </div>
                            <div style={{ height: '220px', width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={userDistData}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={8}
                                            dataKey="value"
                                        >
                                            {userDistData.map((_entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS.pie[index % COLORS.pie.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="chart-legend" style={{ marginTop: '0' }}>
                                {userDistData.map((entry, index) => (
                                    <div key={entry.name} className="legend-item">
                                        <div className="legend-color" style={{ background: COLORS.pie[index % COLORS.pie.length] }} />
                                        <span>{entry.name}: <strong>{entry.value}</strong></span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar components */}
                    <div className="quick-access-panel">
                        <div className="chart-card quick-links-card">
                            <h3 style={{ color: '#1e293b', fontWeight: 800, marginBottom: '1.5rem' }}>Raccourcis</h3>
                            <div className="quick-links-grid">
                                <LinkCard icon={<Briefcase size={20} />} label="Artisans" path="/admin/artisans" />
                                <LinkCard icon={<Users size={20} />} label="Guides" path="/admin/guides" />
                                <LinkCard icon={<CheckCircle2 size={20} />} label="Avis" path="/admin/reviews-360" />
                                <LinkCard icon={<DollarSign size={20} />} label="Paiements" path="/admin/payments" />
                            </div>
                        </div>

                        <div className="chart-card recent-activity">
                            <h3 style={{ color: '#1e293b', fontWeight: 800, marginBottom: '1.5rem' }}>Dernières Activités</h3>
                            <div className="notif-list">
                                {stats.activities && stats.activities.length > 0 ? (
                                    stats.activities.map((activity, idx) => (
                                        <div key={idx} className="notif-item">
                                            {renderActivityIcon(activity.type)}
                                            <div className="notif-text">
                                                <p>
                                                    <span style={{ fontWeight: 700 }}>{activity.title}</span> - {activity.subtitle}
                                                    {formatActivityAmount(activity)}
                                                </p>
                                                <span className="notif-time">
                                                    {formatDistanceToNow(new Date(activity.date), { addSuffix: true, locale: fr })}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                                        Aucune activité récente.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Secondary Charts Tier */}
                <div className="secondary-charts-grid">
                    {/* Submission Status */}
                    <div className="secondary-chart-card">
                        <h3>Qualité Reviews</h3>
                        <span className="chart-subtitle">État des soumissions guides</span>
                        <div style={{ height: '250px', width: '100%', marginTop: '1rem' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={submissionData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {submissionData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="chart-legend">
                            {submissionData.map((d, i) => (
                                <div key={i} className="legend-item">
                                    <div className="legend-color" style={{ background: d.color }}></div>
                                    <span>{d.name}: <b>{d.value}</b></span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Sectors */}
                    <div className="secondary-chart-card">
                        <h3>Top Secteurs</h3>
                        <span className="chart-subtitle">Industries les plus représentées</span>
                        <div style={{ height: '280px', width: '100%', marginTop: '1rem' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.sectorStats} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="label"
                                        type="category"
                                        width={100}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                                    />
                                    <Tooltip cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                        {stats.sectorStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS.pie[index % COLORS.pie.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Trust Distribution */}
                    <div className="secondary-chart-card">
                        <h3>Niveaux de Confiance</h3>
                        <span className="chart-subtitle">Distribution des Trust Levels</span>
                        <div style={{ height: '280px', width: '100%', marginTop: '1rem' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.trustDistribution}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="label"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                                        {stats.trustDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS.pie[(index + 2) % COLORS.pie.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

const LinkCard = ({ icon, label, path }: { icon: React.ReactNode, label: string, path: string }) => (
    <div className="quick-link-card" onClick={() => window.location.href = path}>
        <div className="link-icon">{icon}</div>
        <span>{label}</span>
    </div>
);
