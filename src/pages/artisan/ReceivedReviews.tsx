import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { artisanService } from '../../services/artisanService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
    Star,
    ExternalLink,
    MessageCircle,
    User,
    Calendar,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle
} from 'lucide-react';
import { showError } from '../../utils/Swal';
import { PremiumBlurOverlay } from '../../components/layout/PremiumBlurOverlay';
import { useAuthStore } from '../../context/authStore';
import './ReceivedReviews.css';

interface Submission {
    id: string;
    status: 'pending' | 'validated' | 'rejected';
    review_url: string;
    submitted_at: string;
    earnings: number;
    rejection_reason?: string;
    proposal_content: string;
    proposal_author: string;
    rating: number;
    company_name: string;
    guide_name: string;
}

export const ReceivedReviews: React.FC = () => {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'validated'>('all');
    const { user } = useAuthStore();

    useEffect(() => {
        loadSubmissions();
    }, []);

    const loadSubmissions = async () => {
        setIsLoading(true);
        try {
            const data = await artisanService.getMySubmissions();
            setSubmissions(data);
        } catch (error) {
            console.error('Error loading submissions:', error);
            showError('Erreur', 'Erreur lors du chargement des avis');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'validated': return <CheckCircle2 size={16} className="status-success" />;
            case 'rejected': return <XCircle size={16} className="status-error" />;
            default: return <Clock size={16} className="status-warning" />;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'validated': return 'Validé';
            case 'rejected': return 'Rejeté';
            default: return 'En attente';
        }
    };

    const filteredSubmissions = submissions.filter(s => {
        if (activeFilter === 'all') return true;
        return s.status === activeFilter;
    });

    return (
        <DashboardLayout title="Avis Reçus">
            <PremiumBlurOverlay isActive={(user?.missions_allowed || 0) > 0}>
                <div className="artisan-reviews-container revamped">
                    <div className="reviews-header-card">
                        <div className="header-info">
                            <h2>Vos Avis Client</h2>
                            <p>Consultez les avis soumis par les Local Guides pour votre établissement.</p>
                        </div>
                        <div className="header-stats">
                            <div className="stat-pill">
                                <span className="count">{submissions.length}</span>
                                <span className="label">Total</span>
                            </div>
                            <div className="stat-pill success">
                                <span className="count">{submissions.filter(s => s.status === 'validated').length}</span>
                                <span className="label">Validés</span>
                            </div>
                        </div>
                    </div>

                    <div className="filters-bar">
                        <button
                            className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setActiveFilter('all')}
                        >
                            Tous les avis
                        </button>
                        <button
                            className={`filter-btn ${activeFilter === 'pending' ? 'active' : ''}`}
                            onClick={() => setActiveFilter('pending')}
                        >
                            <Clock size={16} /> En attente
                        </button>
                        <button
                            className={`filter-btn ${activeFilter === 'validated' ? 'active' : ''}`}
                            onClick={() => setActiveFilter('validated')}
                        >
                            <CheckCircle2 size={16} /> Validés
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="loading-centered">
                            <LoadingSpinner size="lg" text="Chargement de vos avis..." />
                        </div>
                    ) : filteredSubmissions.length > 0 ? (
                        <div className="reviews-grid">
                            {filteredSubmissions.map((review) => (
                                <div key={review.id} className={`review-card ${review.status}`}>
                                    <div className="card-top">
                                        <div className="guide-info">
                                            <div className="avatar">
                                                <User size={18} />
                                            </div>
                                            <div>
                                                <span className="guide-name">{review.guide_name || 'Local Guide'}</span>
                                                <div className="review-date">
                                                    <Calendar size={12} />
                                                    {new Date(review.submitted_at).toLocaleDateString('fr-FR')}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`status-badge ${review.status}`}>
                                            {getStatusIcon(review.status)}
                                            <span>{getStatusLabel(review.status)}</span>
                                        </div>
                                    </div>

                                    <div className="review-content-box">
                                        <div className="rating-stars">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    size={14}
                                                    fill={i < review.rating ? "var(--primary-brand)" : "none"}
                                                    color={i < review.rating ? "var(--primary-brand)" : "var(--gray-300)"}
                                                />
                                            ))}
                                        </div>
                                        <p className="review-text">"{review.proposal_content}"</p>
                                    </div>

                                    {review.status === 'rejected' && review.rejection_reason && (
                                        <div className="rejection-note">
                                            <AlertCircle size={14} />
                                            <span>Motif du rejet : {review.rejection_reason}</span>
                                        </div>
                                    )}

                                    <div className="card-footer">
                                        <a
                                            href={review.review_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="view-link"
                                        >
                                            Voir sur Google <ExternalLink size={14} />
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-reviews">
                            <MessageCircle size={48} className="empty-icon" />
                            <h3>Aucun avis pour le moment</h3>
                            <p>Dès qu'un Local Guide aura soumis un avis pour l'une de vos commandes, il apparaîtra ici.</p>
                        </div>
                    )}
                </div>
            </PremiumBlurOverlay>
        </DashboardLayout>
    );
};
