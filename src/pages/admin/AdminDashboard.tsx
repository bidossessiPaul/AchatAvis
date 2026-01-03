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
    RefreshCw
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './AdminDashboard.css';

interface DashboardStats {
    revenue: any[];
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
}

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
            toast.error('Erreur lors du chargement des statistiques');
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

    return (
        <DashboardLayout
            title="Vue d'ensemble"
            action={
                <button
                    onClick={loadStats}
                    disabled={isLoading}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: 'var(--primary-brand)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                    }}
                >
                    <RefreshCw size={16} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
                    Actualiser
                </button>
            }
        >
            <div className="admin-dashboard revamped">
                {/* Notification Banner for Pending Items */}
                {/* Custom Alert REMOVED as per user request */}

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
                    {/* Revenue Chart */}
                    <div className="chart-card">
                        <div className="chart-header">
                            <div className="header-titles">
                                <h3>Évolution des Revenus</h3>
                                <span className="chart-subtitle">Performance mensuelle</span>
                            </div>
                        </div>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={[...stats.revenue].reverse()}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="total_revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Quick Access & Recent Actions */}
                    <div className="quick-access-panel">
                        <div className="chart-card quick-links-card">
                            <h3>Raccourcis</h3>
                            <div className="quick-links-grid">
                                <LinkCard icon={<Briefcase size={20} />} label="Artisans" path="/admin/artisans" />
                                <LinkCard icon={<Users size={20} />} label="Guides" path="/admin/guides" />
                                <LinkCard icon={<CheckCircle2 size={20} />} label="Avis" path="/admin/reviews" />
                                <LinkCard icon={<DollarSign size={20} />} label="Paiements" path="/admin/payments" />
                            </div>
                        </div>

                        <div className="chart-card recent-activity">
                            <h3>Dernières Activités</h3>
                            <div className="notif-list">
                                <div className="notif-item">
                                    <div className="notif-dot blue"></div>
                                    <div className="notif-text">
                                        <p>Nouvelle inscription artisan</p>
                                        <span className="notif-time">Il y a 10 min</span>
                                    </div>
                                </div>
                                <div className="notif-item">
                                    <div className="notif-dot green"></div>
                                    <div className="notif-text">
                                        <p>Avis validé (+5.00€)</p>
                                        <span className="notif-time">Il y a 1h</span>
                                    </div>
                                </div>
                                <div className="notif-item">
                                    <div className="notif-dot purple"></div>
                                    <div className="notif-text">
                                        <p>Nouveau guide inscrit</p>
                                        <span className="notif-time">Aujourd'hui, 09:45</span>
                                    </div>
                                </div>
                            </div>
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

const Briefcase = ({ size }: { size: number }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <rect width="20" height="14" x="2" y="7" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
);
