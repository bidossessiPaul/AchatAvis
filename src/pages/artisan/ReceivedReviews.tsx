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
    X,
    Edit2,
    Trash2
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
    const [isSaving, setIsSaving] = useState(false);

    // Editing State
    const [editingProposal, setEditingProposal] = useState<Submission | null>(null);
    const [editForm, setEditForm] = useState({
        content: '',
        author_name: '',
        rating: 5
    });

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

    const handleEdit = (submission: Submission) => {
        setEditingProposal(submission);
        setEditForm({
            content: submission.proposal_content,
            author_name: submission.proposal_author,
            rating: submission.rating
        });
    };

    const handleSaveProposal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProposal) return;

        setIsSaving(true);
        try {
            await artisanService.updateProposal(editingProposal.proposal_id, {
                content: editForm.content,
                author_name: editForm.author_name,
                rating: editForm.rating
            });

            // Update local state
            setSubmissions(prev => prev.map(s =>
                s.proposal_id === editingProposal.proposal_id
                    ? {
                        ...s,
                        proposal_content: editForm.content,
                        proposal_author: editForm.author_name,
                        rating: editForm.rating
                    }
                    : s
            ));

            showSuccess('Succès', 'Avis mis à jour avec succès');
            setEditingProposal(null);
        } catch (error) {
            showError('Erreur', 'Impossible de mettre à jour l\'avis');
        } finally {
            setIsSaving(false);
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
                                                            onClick={() => handleEdit(review)}
                                                            title="Modifier l'avis"
                                                            disabled={review.submission_status === 'validated'}
                                                            style={review.submission_status === 'validated' ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
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
            {/* Edit Proposal Modal */}
            {editingProposal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    backdropFilter: 'blur(4px)',
                    padding: '1rem'
                }} onClick={() => setEditingProposal(null)}>
                    <div style={{
                        background: 'white',
                        padding: window.innerWidth <= 768 ? '1.5rem' : '2rem',
                        borderRadius: '1.25rem',
                        width: '100%',
                        maxWidth: '600px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{
                                fontSize: window.innerWidth <= 768 ? '1.125rem' : '1.25rem',
                                fontWeight: 800,
                                color: '#1e293b',
                                margin: 0
                            }}>Modifier l'avis</h3>
                            <button onClick={() => setEditingProposal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.25rem' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveProposal} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Nom de l'auteur</label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.author_name}
                                    onChange={e => setEditForm({ ...editForm, author_name: e.target.value })}
                                    style={{
                                        padding: window.innerWidth <= 768 ? '0.625rem' : '0.75rem',
                                        borderRadius: '0.75rem',
                                        border: '1px solid #e2e8f0',
                                        fontSize: window.innerWidth <= 768 ? '0.9375rem' : '0.875rem',
                                        outline: 'none',
                                        width: '100%'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Note</label>
                                <div style={{ display: 'flex', gap: window.innerWidth <= 768 ? '0.35rem' : '0.5rem', justifyContent: 'flex-start' }}>
                                    {[1, 2, 3, 4, 5].map(rating => (
                                        <button
                                            key={rating}
                                            type="button"
                                            onClick={() => setEditForm({ ...editForm, rating })}
                                            style={{
                                                width: window.innerWidth <= 768 ? '2.25rem' : '2.5rem',
                                                height: window.innerWidth <= 768 ? '2.25rem' : '2.5rem',
                                                border: 'none',
                                                background: 'transparent',
                                                cursor: 'pointer',
                                                fontSize: '1.5rem',
                                                padding: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <Star
                                                size={window.innerWidth <= 768 ? 28 : 32}
                                                fill={rating <= editForm.rating ? '#fbbf24' : 'none'}
                                                color={rating <= editForm.rating ? '#fbbf24' : '#d1d5db'}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Contenu de l'avis</label>
                                <textarea
                                    required
                                    value={editForm.content}
                                    onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                                    rows={window.innerWidth <= 768 ? 4 : 5}
                                    style={{
                                        padding: window.innerWidth <= 768 ? '0.625rem' : '0.75rem',
                                        borderRadius: '0.75rem',
                                        border: '1px solid #e2e8f0',
                                        fontSize: window.innerWidth <= 768 ? '0.9375rem' : '0.875rem',
                                        outline: 'none',
                                        resize: 'vertical',
                                        fontFamily: 'inherit',
                                        width: '100%'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexDirection: window.innerWidth <= 480 ? 'column' : 'row' }}>
                                <button
                                    type="button"
                                    onClick={() => setEditingProposal(null)}
                                    style={{
                                        flex: window.innerWidth <= 480 ? 'auto' : 1,
                                        padding: window.innerWidth <= 768 ? '0.625rem' : '0.75rem',
                                        borderRadius: '0.75rem',
                                        border: '1px solid #e2e8f0',
                                        background: 'white',
                                        color: '#475569',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        fontSize: window.innerWidth <= 768 ? '0.9375rem' : '1rem'
                                    }}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    style={{
                                        flex: window.innerWidth <= 480 ? 'auto' : 2,
                                        padding: window.innerWidth <= 768 ? '0.625rem' : '0.75rem',
                                        borderRadius: '0.75rem',
                                        border: 'none',
                                        background: '#FF6B35',
                                        color: 'white',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        opacity: isSaving ? 0.7 : 1,
                                        fontSize: window.innerWidth <= 768 ? '0.9375rem' : '1rem'
                                    }}
                                >
                                    {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};
