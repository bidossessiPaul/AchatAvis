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
    proposal_id: string;
    proposal_content: string;
    proposal_author: string;
    rating: number;
    proposal_status: string;
    submission_id?: string;
    submission_status?: 'pending' | 'validated' | 'rejected';
    review_url?: string;
    submitted_at?: string;
    earnings?: number;
    rejection_reason?: string;
    fiche_name: string;
    fiche_id: string;
    company_name: string;
    guide_name?: string;
    proposal_date?: string;
}

interface fiche {
    id: string;
    fiche_name: string;
}

export const ReceivedReviews: React.FC = () => {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [fiches, setfiches] = useState<fiche[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'scheduled' | 'validated'>('all');
    const [selectedficheId, setSelectedficheId] = useState<string>('all');

    // AI Response Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [generatedResponse, setGeneratedResponse] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasCopied, setHasCopied] = useState(false);

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

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

            // Extract unique fiches from submissions or from orders
            const uniquefiches = ordersData.map((o: any) => ({
                id: o.id,
                fiche_name: o.fiche_name
            }));
            setfiches(uniquefiches);
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

    const getStatusIcon = (review: Submission) => {
        const status = review.submission_status || 'not_submitted';
        switch (status) {
            case 'validated': return <span>✓</span>;
            case 'pending': return <span>●</span>;
            default: return <Clock size={12} />;
        }
    };

    const getStatusLabel = (review: Submission) => {
        const status = review.submission_status || 'not_submitted';
        switch (status) {
            case 'validated': return 'Publié Google';
            case 'pending': return 'Vérification AchatAvis';
            case 'rejected': return 'Rejeté';
            default: return 'Programmé';
        }
    };

    const filteredSubmissions = submissions.filter(s => {
        const status = s.submission_status || 'not_submitted';
        const matchesStatus =
            activeFilter === 'all' ||
            (activeFilter === 'pending' && status === 'pending') ||
            (activeFilter === 'scheduled' && status === 'not_submitted') ||
            (activeFilter === 'validated' && status === 'validated');
        const matchesfiche = selectedficheId === 'all' || s.fiche_id === selectedficheId;
        return matchesStatus && matchesfiche;
    });

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeFilter, selectedficheId]);

    const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
    const paginatedSubmissions = filteredSubmissions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <DashboardLayout title="Avis Reçus">
            <PremiumBlurOverlay isActive={(user?.fiches_allowed || 0) > 0}>
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
                                <span className="count">{submissions.filter(s => s.submission_status === 'validated').length}</span>
                                <span className="label">Publiés</span>
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
                                <Clock size={16} /> Vérification
                            </button>
                            <button
                                className={`filter-btn ${activeFilter === 'scheduled' ? 'active' : ''}`}
                                onClick={() => setActiveFilter('scheduled')}
                            >
                                <Clock size={16} /> Programmé
                            </button>
                            <button
                                className={`filter-btn ${activeFilter === 'validated' ? 'active' : ''}`}
                                onClick={() => setActiveFilter('validated')}
                            >
                                <CheckCircle2 size={16} /> Publiés
                            </button>
                        </div>

                        <div className="fiche-filter">
                            <label htmlFor="fiche-select">fiche :</label>
                            <select
                                id="fiche-select"
                                value={selectedficheId}
                                onChange={(e) => setSelectedficheId(e.target.value)}
                                className="fiche-select"
                            >
                                <option value="all">Toutes les fiches</option>
                                {fiches.map(m => (
                                    <option key={m.id} value={m.id}>{m.fiche_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="loading-centered">
                            <LoadingSpinner size="lg" text="Chargement de vos avis..." />
                        </div>
                    ) : filteredSubmissions.length > 0 ? (
                        <>
                            <div className="reviews-table-wrapper">
                                <table className="reviews-table">
                                    <thead>
                                        <tr>
                                            <th>fiche</th>
                                            <th>NOTE & AVIS</th>
                                            <th>STATUT</th>
                                            <th>SOUMIS LE</th>
                                            <th>PUBLICATION PRÉVUE</th>
                                            <th>ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedSubmissions.map((review) => (
                                            <tr key={review.proposal_id} className={`review-row ${review.submission_status || 'pending'}`}>
                                                <td>
                                                    <span className="fiche-name-badge">{review.fiche_name}</span>
                                                </td>
                                                <td className="content-cell">
                                                    <div className="rating-stars">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                size={14}
                                                                fill={i < review.rating ? "#facc15" : "none"}
                                                                color={i < review.rating ? "#facc15" : "#d1d5db"}
                                                            />
                                                        ))}
                                                    </div>
                                                    <p className="summary-text truncate" title={review.proposal_content}>
                                                        {review.proposal_content}
                                                    </p>
                                                </td>
                                                <td>
                                                    <div className={`status-pill-premium ${review.submission_status || 'not_submitted'}`}>
                                                        {getStatusIcon(review)}
                                                        <span>{getStatusLabel(review)}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="date-cell">
                                                        {review.submitted_at ? new Date(review.submitted_at).toLocaleDateString('fr-FR') : '—'}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="date-cell">
                                                        {review.submitted_at || review.proposal_date ?
                                                            new Date(new Date(review.submitted_at || review.proposal_date!).getTime() + 86400000).toLocaleDateString('fr-FR') :
                                                            '—'}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="actions-cell">
                                                        <button
                                                            className="action-btn ai-btn"
                                                            onClick={() => handleOpenModal(review)}
                                                            title="Générer une réponse IA"
                                                            disabled={review.submission_status !== 'validated'}
                                                            style={review.submission_status !== 'validated' ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                                                        >
                                                            <Sparkles size={16} />
                                                        </button>
                                                        {review.review_url ? (
                                                            <a
                                                                href={review.review_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="action-btn-link"
                                                                title="Voir sur Google Maps"
                                                            >
                                                                <ExternalLink size={16} />
                                                            </a>
                                                        ) : (
                                                            <span className="action-btn-link disabled" title="Avis non publié" style={{ opacity: 0.4, cursor: 'not-allowed' }}>
                                                                <ExternalLink size={16} />
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {filteredSubmissions.length > 0 && (
                                <div className="pagination-container">
                                    <button
                                        className="pagination-btn"
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        Précédent
                                    </button>
                                    <div className="pagination-info">
                                        Page <span>{currentPage}</span> sur {Math.max(1, totalPages)}
                                    </div>
                                    <button
                                        className="pagination-btn"
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                    >
                                        Suivant
                                    </button>
                                </div>
                            )}
                        </>
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
