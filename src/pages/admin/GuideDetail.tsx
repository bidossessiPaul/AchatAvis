import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminService } from '../../services/adminService';
import {
    Users,
    Mail,
    Phone,
    MapPin,
    Calendar,
    ArrowLeft,
    Award,
    Trash2,
    CheckCircle,
    XCircle,
    Star,
    ExternalLink,
    TrendingUp,
    BarChart3,
    Shield,
    ChevronDown,
    ChevronUp,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './AdminDetail.css';

interface Submission {
    id: string;
    created_at: string;
    artisan_name: string;
    earnings: number;
    status: string;
    proof_url: string;
}

interface GuideProfile {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    google_email: string;
    status: string;
    created_at: string;
    local_guide_level: number;
    total_reviews_count: number;
    phone: string;
    city: string;
}

interface GmailAccount {
    id: number;
    email: string;
    trust_score: number;
    account_level: string;
    total_reviews_posted: number;
    successful_reviews: number;
    last_review_posted_at: string | null;
}

interface GuideStats {
    total_submissions: number;
    validated_count: number;
    total_earnings: number;
}

export const GuideDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<GuideProfile | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [stats, setStats] = useState<GuideStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([]);
    const [expandedHistory, setExpandedHistory] = useState<number | null>(null);
    const [gmailHistory, setGmailHistory] = useState<Record<number, any[]>>({});


    useEffect(() => {
        if (id) loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await adminService.getGuideDetail(id!);
            setProfile(data.profile);
            setSubmissions(data.submissions);
            setGmailAccounts(data.gmail_accounts || []);
            setStats(data.stats);
        } catch (error) {
            toast.error('Erreur lors du chargement des données');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchGmailHistory = async (accountId: number) => {
        try {
            // Set a loading state for this specific account's history
            setGmailHistory(prev => ({ ...prev, [accountId]: [] })); // Clear previous history or set a loading indicator
            const historyData = await adminService.getGmailAccountHistory(accountId);
            setGmailHistory(prev => ({ ...prev, [accountId]: historyData }));
        } catch (error) {
            toast.error('Erreur lors du chargement de l\'historique Gmail');
            setGmailHistory(prev => ({ ...prev, [accountId]: [] })); // Clear or show error
        }
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (!confirm(`Changer le statut en ${newStatus} ?`)) return;
        try {
            await adminService.updateUserStatus(id!, newStatus);
            toast.success('Statut mis à jour');
            loadData();
        } catch (error) {
            toast.error('Erreur lors de la mise à jour');
        }
    };

    if (isLoading) return (
        <DashboardLayout title="Détails Guide">
            <div className="admin-loading">
                <LoadingSpinner size="lg" text="Chargement du profil guide..." />
            </div>
        </DashboardLayout>
    );

    if (!profile || !stats) return (
        <DashboardLayout title="Détails Guide">
            <div className="admin-error">Guide non trouvé</div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout title={`Guide : ${profile.google_email}`}>
            <div className="admin-dashboard detail-page revamped">
                <button onClick={() => navigate('/admin/guides')} className="back-btn">
                    <ArrowLeft size={18} />
                    Retour à la liste
                </button>

                {/* New Premium Header Section */}
                <header className="detail-header-section">
                    <div className="header-content-flex">
                        <div className="header-main-info">
                            <div className="header-icon-badge purple">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt={profile.full_name} className="header-avatar" />
                                ) : (
                                    <div className="header-avatar-placeholder">
                                        <Users size={32} />
                                    </div>
                                )}
                            </div>
                            <div className="header-titles">
                                <span className="header-subtitle">{profile.full_name}</span>
                                <h2>{profile.google_email}</h2>

                                <div className="status-row">
                                    <span className={`premium-status-badge ${profile.status}`}>
                                        {profile.status}
                                    </span>
                                    <span className="premium-status-badge active">
                                        Niveau {profile.local_guide_level}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="detail-content-layout">
                    {/* Main Content Area */}
                    <div className="detail-main-columns">

                        {/* Info Cards Grid */}
                        <div className="info-cards-masonry">
                            <div className="premium-card">
                                <h3><Users size={20} /> Profil Local Guide</h3>
                                <div className="premium-info-list">
                                    <div className="premium-info-item">
                                        <div className="info-icon-box"><Mail size={16} /></div>
                                        <div className="info-content">
                                            <span className="info-label">Compte Principal</span>
                                            <span className="info-value">{profile.email}</span>
                                        </div>
                                    </div>
                                    <div className="premium-info-item">
                                        <div className="info-icon-box"><Phone size={16} /></div>
                                        <div className="info-content">
                                            <span className="info-label">Téléphone</span>
                                            <span className="info-value">{profile.phone || 'Non renseigné'}</span>
                                        </div>
                                    </div>
                                    <div className="premium-info-item">
                                        <div className="info-icon-box"><MapPin size={16} /></div>
                                        <div className="info-content">
                                            <span className="info-label">Ville</span>
                                            <span className="info-value">{profile.city || 'Inconnue'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="premium-card">
                                <h3><Award size={20} /> Performances Google</h3>
                                <div className="premium-info-list">
                                    <div className="premium-info-item">
                                        <div className="info-icon-box"><Star size={16} /></div>
                                        <div className="info-content">
                                            <span className="info-label">Avis Google Totaux</span>
                                            <span className="info-value">{profile.total_reviews_count}</span>
                                        </div>
                                    </div>
                                    <div className="premium-info-item">
                                        <div className="info-icon-box"><Calendar size={16} /></div>
                                        <div className="info-content">
                                            <span className="info-label">Inscription plateforme</span>
                                            <span className="info-value">{new Date(profile.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="premium-info-item">
                                        <div className="info-icon-box"><TrendingUp size={16} /></div>
                                        <div className="info-content">
                                            <span className="info-label">Total Contributions</span>
                                            <span className="info-value">{stats.total_submissions}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Contributions */}
                        <div className="premium-card table-card">
                            <h3><BarChart3 size={20} /> Dernières Contributions</h3>
                            <div className="admin-table-wrapper">
                                <table className="premium-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Artisan</th>
                                            <th>Gains</th>
                                            <th>Statut</th>
                                            <th>Preuve</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {submissions.length > 0 ? submissions.map(sub => (
                                            <tr key={sub.id}>
                                                <td>{new Date(sub.created_at).toLocaleDateString()}</td>
                                                <td>{sub.artisan_name}</td>
                                                <td>{Number(sub.earnings).toFixed(2)}€</td>
                                                <td>
                                                    <span className={`premium-status-badge ${sub.status}`}>
                                                        {sub.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <a href={sub.proof_url} target="_blank" rel="noopener noreferrer" className="proof-link">
                                                        <ExternalLink size={14} /> Voir
                                                    </a>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="text-center">Aucune contribution</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Gmail Accounts & History (Admin View) */}
                        <div className="premium-card" style={{ marginTop: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <Shield size={20} color="#a855f7" />
                                <h3 style={{ margin: 0 }}>Comptes Gmail Dédiés</h3>
                            </div>

                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {gmailAccounts.length > 0 ? gmailAccounts.map(account => (
                                    <div key={account.id} className="gmail-admin-card" style={{
                                        padding: '1rem',
                                        borderRadius: '1rem',
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div className="info-icon-box"><Mail size={16} /></div>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{account.email}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                        Score: {account.trust_score} | Niveau: {account.account_level}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    if (expandedHistory === account.id) {
                                                        setExpandedHistory(null);
                                                    } else {
                                                        setExpandedHistory(account.id);
                                                        if (!gmailHistory[account.id]) {
                                                            await fetchGmailHistory(account.id);
                                                        }
                                                    }
                                                }}
                                                style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    padding: '0.4rem 0.8rem',
                                                    borderRadius: '0.5rem',
                                                    background: 'white',
                                                    border: '1px solid #e2e8f0',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.4rem'
                                                }}
                                            >
                                                Auditer l'historique
                                                {expandedHistory === account.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>
                                        </div>

                                        <AnimatePresence>
                                            {expandedHistory === account.id && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    style={{ overflow: 'hidden' }}
                                                >
                                                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                                                        <table className="premium-table mini">
                                                            <thead>
                                                                <tr>
                                                                    <th>Date</th>
                                                                    <th>Artisan</th>
                                                                    <th>Gains</th>
                                                                    <th>Statut</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {!gmailHistory[account.id] ? (
                                                                    <tr><td colSpan={4} className="text-center">Chargement...</td></tr>
                                                                ) : gmailHistory[account.id].length === 0 ? (
                                                                    <tr><td colSpan={4} className="text-center">Aucune mission pour ce compte</td></tr>
                                                                ) : gmailHistory[account.id].map((h: any) => (
                                                                    <tr key={h.id}>
                                                                        <td>{new Date(h.submitted_at).toLocaleDateString()}</td>
                                                                        <td>{h.artisan_company}</td>
                                                                        <td>{h.earnings}€</td>
                                                                        <td>
                                                                            <span className={`premium-status-badge ${h.status}`}>
                                                                                {h.status}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )) : (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                        Aucun compte Gmail enregistré pour ce guide.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Stats & Actions */}
                    <div className="detail-sidebar-sticky">
                        <div className="premium-card">
                            <h3>Activité plateforme</h3>
                            <div className="stats-premium-grid">
                                <div className="stat-premium-item">
                                    <span className="stat-p-value">{stats.validated_count}</span>
                                    <span className="stat-p-label">Avis Validés</span>
                                </div>
                                <div className="stat-premium-item">
                                    <span className="stat-p-value">{Number(stats.total_earnings || 0).toFixed(2)}€</span>
                                    <span className="stat-p-label">Gains Totaux</span>
                                </div>
                            </div>
                        </div>

                        <div className="premium-card">
                            <h3>Actions Admin</h3>
                            <div className="action-premium-stack">
                                {profile.status === 'active' ? (
                                    <button onClick={() => handleStatusUpdate('suspended')} className="premium-action-btn suspend">
                                        <XCircle size={18} />
                                        Suspendre le compte
                                    </button>
                                ) : (
                                    <button onClick={() => handleStatusUpdate('active')} className="premium-action-btn activate">
                                        <CheckCircle size={18} />
                                        Activer le compte
                                    </button>
                                )}
                                <button onClick={() => toast('Avertissement envoyé')} className="premium-action-btn warn">
                                    <Award size={18} />
                                    Envoyer un avertissement
                                </button>
                                <button onClick={() => toast('Fonctionnalité de suppression non implémentée')} className="premium-action-btn delete">
                                    <Trash2 size={18} />
                                    Supprimer le guide
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};
