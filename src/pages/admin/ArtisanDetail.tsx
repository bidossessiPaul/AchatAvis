import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminService } from '../../services/adminService';
import {
    Briefcase,
    Mail,
    Phone,
    MapPin,
    Calendar,
    ArrowLeft,
    ShieldAlert,
    Trash2,
    CheckCircle,
    XCircle,
    Globe,
    ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './AdminDetail.css';

interface Order {
    id: string;
    status: string;
    amount: number;
    credits_purchased: number;
    created_at: string;
    validated_reviews_count: number;
}

interface ArtisanDetailData {
    profile: {
        id: string;
        email: string;
        full_name: string;
        avatar_url: string | null;
        status: string;
        created_at: string;
        last_login: string;
        company_name: string;
        siret: string;
        trade: string;
        phone: string;
        address: string;
        city: string;
        postal_code: string;
        google_business_url: string;
        subscription_status: string;
        subscription_end_date: string;
    };
    orders: Order[];
}

export const ArtisanDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<ArtisanDetailData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (id) loadDetail();
    }, [id]);

    const loadDetail = async () => {
        setIsLoading(true);
        try {
            const result = await adminService.getArtisanDetail(id!);
            setData(result);
        } catch (error) {
            toast.error('Erreur lors du chargement des détails');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (!confirm(`Changer le statut en ${newStatus} ?`)) return;
        try {
            await adminService.updateUserStatus(id!, newStatus);
            toast.success('Statut mis à jour');
            loadDetail();
        } catch (error) {
            toast.error('Erreur lors de la mise à jour');
        }
    };

    if (isLoading) return (
        <DashboardLayout title="Détails Artisan">
            <div className="admin-loading">
                <LoadingSpinner size="lg" text="Chargement du profil artisan..." />
            </div>
        </DashboardLayout>
    );

    if (!data) return (
        <DashboardLayout title="Détails Artisan">
            <div className="admin-error">Artisan non trouvé</div>
        </DashboardLayout>
    );

    const { profile, orders } = data;

    return (
        <DashboardLayout title={`Détails : ${profile.company_name}`}>
            <div className="admin-dashboard detail-page revamped">
                <button onClick={() => navigate('/admin/artisans')} className="back-btn">
                    <ArrowLeft size={18} />
                    Retour à la liste
                </button>

                {/* New Premium Header Section */}
                <header className="detail-header-section">
                    <div className="header-content-flex">
                        <div className="header-main-info">
                            <div className="header-icon-badge">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt={profile.full_name} className="header-avatar" />
                                ) : (
                                    <div className="header-avatar-placeholder">
                                        <Briefcase size={32} />
                                    </div>
                                )}
                            </div>
                            <div className="header-titles">
                                <span className="header-subtitle">{profile.full_name}</span>
                                <h2>{profile.company_name}</h2>

                                <div className="status-row">
                                    <span className={`premium-status-badge ${profile.status}`}>
                                        {profile.status}
                                    </span>
                                    {profile.subscription_status && (
                                        <span className={`premium-status-badge active`}>
                                            {profile.subscription_status}
                                        </span>
                                    )}
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
                                <h3><Mail size={20} /> Contact & Localisation</h3>
                                <div className="premium-info-list">
                                    <div className="premium-info-item">
                                        <div className="info-icon-box"><Mail size={16} /></div>
                                        <div className="info-content">
                                            <span className="info-label">Email</span>
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
                                            <span className="info-label">Adresse</span>
                                            <span className="info-value">{`${profile.address || ''} ${profile.city || ''} (${profile.postal_code || ''})`}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="premium-card">
                                <h3><ShieldAlert size={20} /> Informations Légales</h3>
                                <div className="premium-info-list">
                                    <div className="premium-info-item">
                                        <div className="info-icon-box"><ShieldAlert size={16} /></div>
                                        <div className="info-content">
                                            <span className="info-label">SIRET</span>
                                            <span className="info-value">{profile.siret}</span>
                                        </div>
                                    </div>
                                    <div className="premium-info-item">
                                        <div className="info-icon-box"><Calendar size={16} /></div>
                                        <div className="info-content">
                                            <span className="info-label">Inscrit le</span>
                                            <span className="info-value">{new Date(profile.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="premium-info-item">
                                        <div className="info-icon-box"><Globe size={16} /></div>
                                        <div className="info-content">
                                            <span className="info-label">Lien Google</span>
                                            <a href={profile.google_business_url} target="_blank" rel="noopener noreferrer" className="info-value link">
                                                Voir la fiche <ExternalLink size={12} />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity / Orders */}
                        <div className="premium-card table-card">
                            <h3><Briefcase size={20} /> Historique des Commandes</h3>
                            <div className="admin-table-wrapper">
                                <table className="premium-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Crédits</th>
                                            <th>Montant</th>
                                            <th>Statut</th>
                                            <th>Avis Validés</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.length > 0 ? orders.map(order => (
                                            <tr key={order.id}>
                                                <td>{new Date(order.created_at).toLocaleDateString()}</td>
                                                <td>{order.credits_purchased}</td>
                                                <td>{order.amount}€</td>
                                                <td>
                                                    <span className={`premium-status-badge ${order.status}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td>{order.validated_reviews_count || 0}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="text-center">Aucune commande</td>
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
                            <h3>Statistiques</h3>
                            <div className="stats-premium-grid">
                                <div className="stat-premium-item">
                                    <span className="stat-p-value">{orders.length}</span>
                                    <span className="stat-p-label">Commandes</span>
                                </div>
                                <div className="stat-premium-item">
                                    <span className="stat-p-value">{orders.reduce((acc, curr) => acc + Number(curr.amount), 0)}€</span>
                                    <span className="stat-p-label">Total Dépensé</span>
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
                                    <ShieldAlert size={18} />
                                    Envoyer un avertissement
                                </button>
                                <button onClick={() => toast('Fonctionnalité de suppression non implémentée')} className="premium-action-btn delete">
                                    <Trash2 size={18} />
                                    Supprimer l'artisan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};
