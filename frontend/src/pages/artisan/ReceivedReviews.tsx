import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { artisanService } from '../../services/artisanService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
    Star,
    ExternalLink,
    MessageCircle,
    User,
    CheckCircle2,
    XCircle,
    Clock,
    Sparkles,
    Copy,
    Check,
    X
} from 'lucide-react';
import { showError, showSuccess } from '../../utils/Swal';
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
    mission_name: string;
    mission_id: string;
    company_name: string;
    guide_name: string;
}

interface Mission {
    id: string;
    mission_name: string;
}

export const ReceivedReviews: React.FC = () => {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [missions, setMissions] = useState<Mission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'validated'>('all');
    const [selectedMissionId, setSelectedMissionId] = useState<string>('all');

    // AI Response Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [generatedResponse, setGeneratedResponse] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasCopied, setHasCopied] = useState(false);

    const { user } = useAuthStore();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [submissionsData, ordersData] = await Promise.all([
                artisanService.getMySubmissions(),
                artisanService.getMyOrders()
            ]);
            setSubmissions(submissionsData);

            // Extract unique missions from submissions or from orders
            const uniqueMissions = ordersData.map((o: any) => ({
                id: o.id,
                mission_name: o.mission_name
            }));
            setMissions(uniqueMissions);
        } catch (error) {
            console.error('Error loading data:', error);
            showError('Erreur', 'Erreur lors du chargement des données');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (submission: Submission) => {
        setSelectedSubmission(submission);
        setGeneratedResponse('');
        setHasCopied(false);
        setIsModalOpen(true);
    };

    const handleGenerateAIResponse = async () => {
        if (!selectedSubmission) return;
        setIsGenerating(true);
        try {
            const { response } = await artisanService.generateReviewResponse(
                selectedSubmission.proposal_content,
                selectedSubmission.proposal_author
            );
            setGeneratedResponse(response);
        } catch (error) {
            showError('Erreur', 'Impossible de générer la réponse IA');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyResponse = () => {
        navigator.clipboard.writeText(generatedResponse);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
        showSuccess('Copié !', 'La réponse a été copiée dans le presse-papier.');
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
        const matchesStatus = activeFilter === 'all' || s.status === activeFilter;
        const matchesMission = selectedMissionId === 'all' || s.mission_id === selectedMissionId;
        return matchesStatus && matchesMission;
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

                    <div className="filters-container">
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

                        <div className="mission-filter">
                            <label htmlFor="mission-select">Mission :</label>
                            <select
                                id="mission-select"
                                value={selectedMissionId}
                                onChange={(e) => setSelectedMissionId(e.target.value)}
                                className="mission-select"
                            >
                                <option value="all">Toutes les missions</option>
                                {missions.map(m => (
                                    <option key={m.id} value={m.id}>{m.mission_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="loading-centered">
                            <LoadingSpinner size="lg" text="Chargement de vos avis..." />
                        </div>
                    ) : filteredSubmissions.length > 0 ? (
                        <div className="reviews-table-wrapper">
                            <table className="reviews-table">
                                <thead>
                                    <tr>
                                        <th>Guide</th>
                                        <th>Mission</th>
                                        <th>Avis</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSubmissions.map((review) => (
                                        <tr key={review.id} className={`review-row ${review.status}`}>
                                            <td>
                                                <div className="guide-cell">
                                                    <div className="avatar">
                                                        <User size={14} />
                                                    </div>
                                                    <span>{review.guide_name || 'Local Guide'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="mission-name-badge">{review.mission_name}</span>
                                            </td>
                                            <td className="content-cell">
                                                <div className="review-content-summary">
                                                    <div className="rating-stars">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                size={12}
                                                                fill={i < review.rating ? "var(--primary-brand)" : "none"}
                                                                color={i < review.rating ? "var(--primary-brand)" : "var(--gray-300)"}
                                                            />
                                                        ))}
                                                    </div>
                                                    <p className="summary-text truncate">{review.proposal_content}</p>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="date-cell">
                                                    {new Date(review.submitted_at).toLocaleDateString('fr-FR')}
                                                </div>
                                            </td>
                                            <td>
                                                <div className={`status-badge-mini ${review.status}`}>
                                                    {getStatusIcon(review.status)}
                                                    <span>{getStatusLabel(review.status)}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="actions-cell">
                                                    <button
                                                        className="action-btn ai-btn"
                                                        onClick={() => handleOpenModal(review)}
                                                        title="Générer une réponse IA"
                                                    >
                                                        <Sparkles size={16} />
                                                    </button>
                                                    <a
                                                        href={review.review_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="action-btn-link"
                                                        title="Voir sur Google Maps"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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

            {/* AI Response Modal */}
            {isModalOpen && selectedSubmission && (
                <div className="ai-modal-overlay">
                    <div className="ai-modal-card">
                        <div className="modal-header">
                            <div className="header-title">
                                <Sparkles className="sparkle-icon" size={20} />
                                <h3>Répondre à l'avis client</h3>
                            </div>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="original-review">
                                <div className="author-info">
                                    <User size={14} />
                                    <span>{selectedSubmission.proposal_author}</span>
                                    <div className="modal-stars">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                size={10}
                                                fill={i < selectedSubmission.rating ? "#f59e0b" : "none"}
                                                color={i < selectedSubmission.rating ? "#f59e0b" : "#d1d5db"}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <p className="review-content">"{selectedSubmission.proposal_content}"</p>
                            </div>

                            <div className="ai-generation-section">
                                <div className="section-label">
                                    <span>Votre réponse personnalisée</span>
                                    {!generatedResponse && (
                                        <button
                                            className="generate-btn"
                                            onClick={handleGenerateAIResponse}
                                            disabled={isGenerating}
                                        >
                                            {isGenerating ? 'Génération...' : 'Générer avec l\'IA'}
                                            {!isGenerating && <Sparkles size={14} />}
                                        </button>
                                    )}
                                </div>

                                <textarea
                                    className="response-textarea"
                                    placeholder="La réponse générée par l'IA apparaîtra ici..."
                                    value={generatedResponse}
                                    onChange={(e) => setGeneratedResponse(e.target.value)}
                                    rows={5}
                                ></textarea>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <div className="footer-info">
                                <p>Une fois copiée, collez cette réponse sur l'avis Google Maps.</p>
                            </div>
                            <div className="footer-actions">
                                <a
                                    href={selectedSubmission.review_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="google-link-btn"
                                >
                                    Ouvrir sur Google Maps <ExternalLink size={14} />
                                </a>
                                <button
                                    className={`copy-btn ${hasCopied ? 'success' : ''}`}
                                    onClick={handleCopyResponse}
                                    disabled={!generatedResponse}
                                >
                                    {hasCopied ? <Check size={16} /> : <Copy size={16} />}
                                    {hasCopied ? 'Copié !' : 'Copier'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};
