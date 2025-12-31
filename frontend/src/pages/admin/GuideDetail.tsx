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
    BarChart3
} from 'lucide-react';
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

    useEffect(() => {
        if (id) loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await adminService.getGuideDetail(id!);
            setProfile(data.profile);
            setSubmissions(data.submissions);
            setStats(data.stats);
        } catch (error) {
            toast.error('Erreur lors du chargement des données');
        } finally {
            setIsLoading(false);
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
