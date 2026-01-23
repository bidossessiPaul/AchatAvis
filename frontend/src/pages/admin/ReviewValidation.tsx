import React, { useState, useEffect } from 'react';
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
    Building2
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
    guide_name: string;
    guide_avatar?: string;
    artisan_name: string;
    proposal_content: string;
}


export const ReviewValidation: React.FC = () => {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showOnlyOld, setShowOnlyOld] = useState(false);

    // Modal state
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);

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
            await adminApi.updateSubmissionStatus(submissionId, { status, rejectionReason: reason });
            showSuccess(status === 'validated' ? 'Avis validé !' : 'Avis rejeté.');
            setShowRejectModal(false);
            setRejectionReason('');
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

    const filteredSubmissions = submissions.filter(s => {
        const matchesSearch =
            s.guide_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.artisan_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.google_email?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
        const matchesAge = !showOnlyOld || isOldReview(s.submitted_at);

        return matchesSearch && matchesStatus && matchesAge;
    });


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

                            <div className="admin-controls-premium" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div className="search-box-premium" style={{ position: 'relative' }}>
                                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                    <input
                                        type="text"
                                        placeholder="Guide, artisan, email..."
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
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Artisan</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Date & Email</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Preuve</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Statut</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }} className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSubmissions.length > 0 ? filteredSubmissions.map((submission) => (
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
                                                    <span style={{ fontWeight: 600, color: '#111827' }}>{submission.guide_name}</span>
                                                </div>
                                            </td>
                                            <td style={{ border: 'none' }}>
                                                <div style={{ border: 'none', color: '#374151', fontWeight: 500 }}>{submission.artisan_name}</div>
                                            </td>
                                            <td style={{ border: 'none' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <span style={{ fontSize: '13px', color: '#111827', fontWeight: 600 }}>
                                                        {new Date(submission.submitted_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
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
                            </div>
                            <div className="modal-footer">
                                <button className="cancel-btn" onClick={() => setShowRejectModal(false)}>Annuler</button>
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
        </DashboardLayout>
    );
};
