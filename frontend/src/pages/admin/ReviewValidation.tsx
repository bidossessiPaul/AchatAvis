import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminApi } from '../../services/api';
import {
    Search,
    Filter,
    CheckCircle2,
    XCircle,
    ExternalLink,
    Clock,
    User,
    RotateCcw,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { showSuccess, showError } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './ReviewValidation.css';
import './AdminLists.css';

interface Submission {
    id: string;
    guide_id: string;
    artisan_id: string;
    order_id: string;
    proposal_id: string;
    review_url: string;
    google_email: string;
    status: 'pending' | 'validated' | 'rejected';
    rejection_reason?: string;
    earnings: number;
    submitted_at: string;
    validated_at?: string;
    validated_by_name?: string;
    guide_name: string;
    guide_avatar?: string;
    artisan_name: string;
    fiche_name: string;
    proposal_content: string;
}


export const ReviewValidation: React.FC = () => {
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showOnlyOld, setShowOnlyOld] = useState(false);
    const [artisanFilter, setArtisanFilter] = useState<string>('all');
    const [ficheFilter, setFicheFilter] = useState<string>('all');

    // Modal state
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [allowResubmit, setAllowResubmit] = useState(false);
    const [allowAppeal, setAllowAppeal] = useState(false);
    const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const subs = await adminApi.getAllSubmissions();
            setSubmissions(subs);
        } catch (error) {
            showError('Erreur', 'Erreur lors du chargement des données');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const handleUpdateStatus = async (submissionId: string, status: 'validated' | 'rejected' | 'pending', reason?: string) => {
        setIsActionLoading(true);
        try {
            await adminApi.updateSubmissionStatus(submissionId, {
                status,
                rejectionReason: reason,
                allowResubmit: status === 'rejected' ? allowResubmit : undefined,
                allowAppeal: status === 'rejected' ? allowAppeal : undefined
            });
            showSuccess(status === 'validated' ? 'Avis validé !' : (allowResubmit ? 'Avis rejeté. Le guide pourra corriger le lien.' : allowAppeal ? 'Avis rejeté. Le guide pourra faire appel.' : 'Avis rejeté.'));
            setShowRejectModal(false);
            setRejectionReason('');
            setAllowResubmit(false);
            setAllowAppeal(false);
            setSelectedSubmissionId(null);
            fetchData(true);
        } catch (error) {
            showError('Erreur', 'Erreur lors de la mise à jour');
        } finally {
            setIsActionLoading(false);
        }
    };

    const isOldReview = (dateString: string) => {
        const submittedDate = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - submittedDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 7;
    };

    // Listes uniques pour les sélecteurs
    const artisanOptions = Array.from(
        new Map(
            submissions
                .filter(s => s.artisan_id && s.artisan_name)
                .map(s => [s.artisan_id, { id: s.artisan_id, name: s.artisan_name }])
        ).values()
    ).sort((a, b) => a.name.localeCompare(b.name));

    // Fiches dépendantes de l'artisan sélectionné
    const ficheOptions = Array.from(
        new Set(
            submissions
                .filter(s => artisanFilter === 'all' || s.artisan_id === artisanFilter)
                .map(s => s.fiche_name)
                .filter(Boolean)
        )
    ).sort();

    const filteredSubmissions = submissions.filter(s => {
        const term = searchTerm.toLowerCase().trim();
        const matchesSearch = !term || (
            s.guide_name?.toLowerCase().includes(term) ||
            s.artisan_name?.toLowerCase().includes(term) ||
            s.google_email?.toLowerCase().includes(term) ||
            s.fiche_name?.toLowerCase().includes(term) ||
            s.proposal_content?.toLowerCase().includes(term)
        );

        const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
        const matchesAge = !showOnlyOld || isOldReview(s.submitted_at);
        const matchesArtisan = artisanFilter === 'all' || s.artisan_id === artisanFilter;
        const matchesFiche = ficheFilter === 'all' || s.fiche_name === ficheFilter;

        return matchesSearch && matchesStatus && matchesAge && matchesArtisan && matchesFiche;
    });

    const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedSubmissions = filteredSubmissions.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, showOnlyOld, artisanFilter, ficheFilter]);


    return (
        <DashboardLayout title="Validation Avis">
            <div className="admin-dashboard revamped">
                <div className="admin-main-card">
                    <div className="admin-card-header" style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '1.5rem' }}>
                            <div>
                                <h2 className="card-title" style={{ fontSize: '1.5rem', fontWeight: 800 }}>Validation des Avis</h2>
                                <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginTop: '4px' }}>
                                    {submissions.filter(s => s.status === 'pending').length} avis en attente de vérification
                                </p>
                            </div>

                            <div className="admin-controls-premium" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div className="search-box-premium" style={{ position: 'relative' }}>
                                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                    <input
                                        type="text"
                                        placeholder="Guide, artisan, email, fiche, contenu de l'avis..."
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

                                {/* Sélecteur Artisan + cascade Fiche */}
                                <select
                                    value={artisanFilter}
                                    onChange={(e) => {
                                        setArtisanFilter(e.target.value);
                                        setFicheFilter('all'); // reset fiche quand on change d'artisan
                                    }}
                                    title="Filtrer par artisan"
                                    style={{
                                        padding: '0.6rem 0.9rem',
                                        borderRadius: '10px',
                                        border: '1px solid var(--gray-200)',
                                        background: 'white',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        color: 'var(--gray-700)',
                                        cursor: 'pointer',
                                        maxWidth: '200px',
                                    }}
                                >
                                    <option value="all">Tous les artisans</option>
                                    {artisanOptions.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                                <select
                                    value={ficheFilter}
                                    onChange={(e) => setFicheFilter(e.target.value)}
                                    title="Filtrer par fiche"
                                    disabled={ficheOptions.length === 0}
                                    style={{
                                        padding: '0.6rem 0.9rem',
                                        borderRadius: '10px',
                                        border: '1px solid var(--gray-200)',
                                        background: 'white',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        color: 'var(--gray-700)',
                                        cursor: ficheOptions.length === 0 ? 'not-allowed' : 'pointer',
                                        opacity: ficheOptions.length === 0 ? 0.5 : 1,
                                        maxWidth: '220px',
                                    }}
                                >
                                    <option value="all">
                                        {artisanFilter === 'all' ? 'Toutes les fiches' : 'Toutes les fiches de cet artisan'}
                                    </option>
                                    {ficheOptions.map(f => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>

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
                                            <option value="pending">En attente</option>
                                            <option value="validated">Validés</option>
                                            <option value="rejected">Rejetés</option>
                                        </select>
                                    </div>

                                    <button
                                        className={`age-filter-btn-premium ${showOnlyOld ? 'active' : ''}`}
                                        onClick={() => setShowOnlyOld(!showOnlyOld)}
                                        title="Afficher uniquement les avis de plus de 7 jours"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '0.6rem 1rem',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: showOnlyOld ? '#fff1f2' : 'white',
                                            color: showOnlyOld ? '#e11d48' : 'var(--gray-600)',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                        }}
                                    >
                                        <Clock size={16} />
                                        <span>{showOnlyOld ? '> 7 jours' : 'Tout'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="admin-table-container">
                        {isLoading ? (
                            <div className="admin-loading">
                                <LoadingSpinner size="lg" text="Chargement..." />
                            </div>
                        ) : (
                            <table className="admin-modern-table" style={{ borderCollapse: 'separate', borderSpacing: '0 10px' }}>
                                <thead>
                                    <tr style={{ background: 'transparent' }}>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Guide</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Fiche</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Date & Email</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Preuve</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Contenu avis</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Statut</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }} className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedSubmissions.length > 0 ? paginatedSubmissions.map((submission) => (
                                        <tr key={submission.id} style={{ backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', borderRadius: '16px', overflow: 'hidden' }}>
                                            <td className="font-medium" style={{ padding: '1.25rem 1.5rem', border: 'none', borderRadius: '16px 0 0 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                                    {submission.guide_avatar ? (
                                                        <img src={submission.guide_avatar} alt="" style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>
                                                            <User size={18} />
                                                        </div>
                                                    )}
                                                    <span
                                                        style={{
                                                            fontWeight: 600,
                                                            color: '#111827',
                                                            cursor: 'pointer',
                                                            textDecoration: 'underline',
                                                            textUnderlineOffset: '2px',
                                                            maxWidth: '150px',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/admin/guides/${submission.guide_id}`);
                                                        }}
                                                        title={submission.guide_name}
                                                    >
                                                        {submission.guide_name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ border: 'none' }}>
                                                <div
                                                    style={{
                                                        border: 'none',
                                                        color: '#374151',
                                                        fontWeight: 600,
                                                        maxWidth: '200px',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}
                                                    title={submission.fiche_name}
                                                >
                                                    {submission.fiche_name}
                                                </div>
                                                <div
                                                    style={{
                                                        border: 'none',
                                                        color: '#6b7280',
                                                        fontSize: '11px',
                                                        cursor: 'pointer',
                                                        textDecoration: 'underline',
                                                        textUnderlineOffset: '2px',
                                                        maxWidth: '200px',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/admin/artisans/${submission.artisan_id}`);
                                                    }}
                                                    title={submission.artisan_name}
                                                >
                                                    {submission.artisan_name}
                                                </div>
                                            </td>
                                            <td style={{ border: 'none' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <span style={{ fontSize: '13px', color: '#111827', fontWeight: 600 }}>
                                                        {new Date(submission.submitted_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                        {' '}
                                                        <span style={{ fontWeight: 500, color: '#6b7280' }}>
                                                            {new Date(submission.submitted_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: '#6b7280' }}>
                                                        {submission.google_email}
                                                    </span>
                                                    {isOldReview(submission.submitted_at) && submission.status === 'pending' && (
                                                        <span style={{ fontSize: '10px', color: '#e11d48', fontWeight: 700, textTransform: 'uppercase' }}>En retard</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ border: 'none' }}>
                                                <a href={submission.review_url} target="_blank" rel="noopener noreferrer" className="review-link-premium" style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '0.4rem 0.8rem',
                                                    backgroundColor: '#f8fafc',
                                                    borderRadius: '8px',
                                                    color: 'var(--primary-brand)',
                                                    textDecoration: 'none',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600,
                                                    transition: 'all 0.2s'
                                                }}>
                                                    Voir la preuve <ExternalLink size={14} />
                                                </a>
                                            </td>
                                            <td style={{ border: 'none', maxWidth: '250px' }}>
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    color: '#374151',
                                                    lineHeight: 1.4,
                                                    maxHeight: '60px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 3,
                                                    WebkitBoxOrient: 'vertical',
                                                    cursor: 'pointer'
                                                }}
                                                title={submission.proposal_content}
                                                >
                                                    {submission.proposal_content || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Aucun contenu</span>}
                                                </div>
                                            </td>
                                            <td style={{ border: 'none' }}>
                                                <span
                                                    className={`admin-badge`}
                                                    style={{
                                                        padding: '0.4rem 0.8rem',
                                                        borderRadius: '10px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        textTransform: 'uppercase',
                                                        backgroundColor:
                                                            submission.status === 'validated' ? '#dcfce7' :
                                                                submission.status === 'rejected' ? '#fee2e2' :
                                                                    submission.status === 'pending' ? '#fef3c7' : '#f3f4f6',
                                                        color:
                                                            submission.status === 'validated' ? '#166534' :
                                                                submission.status === 'rejected' ? '#991b1b' :
                                                                    submission.status === 'pending' ? '#92400e' : '#4b5563'
                                                    }}
                                                >
                                                    {submission.status === 'pending' ? 'En attente' :
                                                        submission.status === 'validated' ? 'Validé' : 'Rejeté'}
                                                </span>
                                                {submission.validated_by_name && (submission.status === 'validated' || submission.status === 'rejected') && (
                                                    <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.2rem', fontWeight: 500 }}>
                                                        par {submission.validated_by_name}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="actions-cell" style={{ border: 'none', borderRadius: '0 16px 16px 0' }}>
                                                <div className="action-buttons">
                                                    {submission.status === 'pending' && (
                                                        <>
                                                            <button
                                                                className="action-btn active-btn"
                                                                style={{ backgroundColor: '#f0fdf4', borderRadius: '10px', color: '#16a34a' }}
                                                                title="Valider"
                                                                onClick={() => handleUpdateStatus(submission.id, 'validated')}
                                                                disabled={isActionLoading}
                                                            >
                                                                <CheckCircle2 size={18} />
                                                            </button>
                                                            <button
                                                                className="action-btn block-btn"
                                                                style={{ backgroundColor: '#fff1f2', borderRadius: '10px', color: '#e11d48' }}
                                                                title="Rejeter"
                                                                onClick={() => {
                                                                    setSelectedSubmissionId(submission.id);
                                                                    setShowRejectModal(true);
                                                                }}
                                                                disabled={isActionLoading}
                                                            >
                                                                <XCircle size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {submission.status !== 'pending' && (
                                                        <button
                                                            className="action-btn"
                                                            style={{ backgroundColor: '#f3f4f6', borderRadius: '10px', color: '#4b5563' }}
                                                            title="Remettre en attente"
                                                            onClick={() => handleUpdateStatus(submission.id, 'pending')}
                                                            disabled={isActionLoading}
                                                        >
                                                            <RotateCcw size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="text-center" style={{ padding: '60px', color: '#9ca3af' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                                    <Search size={48} style={{ opacity: 0.2 }} />
                                                    <p style={{ fontSize: '1.125rem', fontWeight: 500 }}>Aucun avis trouvé.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {!isLoading && filteredSubmissions.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--gray-50)', borderRadius: '12px', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)', fontWeight: 500 }}>Afficher :</span>
                                <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--gray-300)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', backgroundColor: 'white' }}>
                                    <option value={20}>20 avis</option>
                                    <option value={50}>50 avis</option>
                                    <option value={100}>100 avis</option>
                                    <option value={200}>200 avis</option>
                                </select>
                                <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>{startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredSubmissions.length)} sur {filteredSubmissions.length}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--gray-300)', backgroundColor: currentPage === 1 ? 'var(--gray-100)' : 'white', color: currentPage === 1 ? 'var(--gray-400)' : 'var(--gray-700)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s' }}><ChevronLeft size={16} />Précédent</button>
                                <span style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)' }}>Page {currentPage} / {totalPages}</span>
                                <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--gray-300)', backgroundColor: currentPage === totalPages ? 'var(--gray-100)' : 'white', color: currentPage === totalPages ? 'var(--gray-400)' : 'var(--gray-700)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s' }}>Suivant<ChevronRight size={16} /></button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Rejection Modal */}
                {showRejectModal && (
                    <div className="rejection-modal-overlay">
                        <div className="rejection-modal">
                            <div className="modal-header">
                                <h3>Motif du rejet</h3>
                                <button className="close-modal-btn" onClick={() => setShowRejectModal(false)}>
                                    <XCircle size={20} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <label>Expliquez au guide pourquoi son avis a été rejeté :</label>
                                <textarea
                                    placeholder="Ex: L'avis n'apparaît pas publiquement, mauvais compte Google utilisé..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                ></textarea>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', cursor: 'pointer', fontSize: '0.875rem', color: '#374151' }}>
                                    <input
                                        type="checkbox"
                                        checked={allowResubmit}
                                        onChange={(e) => setAllowResubmit(e.target.checked)}
                                        style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                                    />
                                    Permettre au guide de corriger le lien
                                </label>
                                {allowResubmit && (
                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', marginLeft: '1.75rem' }}>
                                        Le guide recevra un email et pourra soumettre un nouveau lien depuis sa page "Corrections".
                                    </p>
                                )}
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', cursor: 'pointer', fontSize: '0.875rem', color: '#374151' }}>
                                    <input
                                        type="checkbox"
                                        checked={allowAppeal}
                                        onChange={(e) => setAllowAppeal(e.target.checked)}
                                        style={{ width: '18px', height: '18px', accentColor: '#3b82f6', cursor: 'pointer' }}
                                    />
                                    Permettre au guide de faire appel
                                </label>
                                {allowAppeal && (
                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', marginLeft: '1.75rem' }}>
                                        Si l'avis revient en ligne, le guide pourra relancer la validation depuis sa page "Corrections".
                                    </p>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="cancel-btn" onClick={() => { setShowRejectModal(false); setAllowResubmit(false); setAllowAppeal(false); }}>Annuler</button>
                                <button
                                    className="confirm-btn"
                                    disabled={!rejectionReason.trim() || isActionLoading}
                                    onClick={() => handleUpdateStatus(selectedSubmissionId!, 'rejected', rejectionReason)}
                                >
                                    Confirmer le rejet
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout >
    );
};
