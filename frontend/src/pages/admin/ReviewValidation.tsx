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
    RotateCcw
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

interface Pendingfiche {
    id: string;
    artisan_id: string;
    artisan_name: string;
    company_name: string;
    quantity: number;
    price: number;
    status: string;
    created_at: string;
    sector: string;
    desired_tone: string;
}

export const ReviewValidation: React.FC = () => {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [pendingfiches, setPendingfiches] = useState<Pendingfiche[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'submissions' | 'fiches'>('submissions');
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
            const [subs, fiches] = await Promise.all([
                adminApi.getAllSubmissions(),
                adminApi.getPendingfiches()
            ]);
            setSubmissions(subs);
            setPendingfiches(fiches);
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

    const handleApprovefiche = async (orderId: string) => {
        setIsActionLoading(true);
        try {
            await adminApi.approvefiche(orderId);
            showSuccess('Succès', 'fiche publiée !');
            fetchData(true);
        } catch (error) {
            showError('Erreur', 'Erreur lors de la publication');
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

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'validated': return 'active';
            case 'rejected': return 'suspended'; // Red styling
            case 'pending': return 'warning'; // Or customized pending
            default: return 'inactive';
        }
    };

    return (
        <DashboardLayout title="Validation Avis">
            <div className="admin-dashboard revamped">
                <div className="admin-main-card">
                    <div className="admin-card-header">
                        <div className="tabs-container" style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--gray-200)' }}>
                            <button
                                className={`tab-btn ${activeTab === 'submissions' ? 'active' : ''}`}
                                onClick={() => setActiveTab('submissions')}
                                style={{
                                    padding: '0.75rem 0',
                                    fontWeight: 700,
                                    fontSize: '0.9375rem',
                                    color: activeTab === 'submissions' ? 'var(--primary-brand)' : 'var(--gray-500)',
                                    borderBottom: activeTab === 'submissions' ? '2px solid var(--primary-brand)' : 'none',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                Avis à valider ({submissions.filter(s => s.status === 'pending').length})
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'fiches' ? 'active' : ''}`}
                                onClick={() => setActiveTab('fiches')}
                                style={{
                                    padding: '0.75rem 0',
                                    fontWeight: 700,
                                    fontSize: '0.9375rem',
                                    color: activeTab === 'fiches' ? 'var(--primary-brand)' : 'var(--gray-500)',
                                    borderBottom: activeTab === 'fiches' ? '2px solid var(--primary-brand)' : 'none',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                fiches à publier ({pendingfiches.length})
                            </button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <h2 className="card-title">
                                {activeTab === 'submissions' ? 'Validation des Avis' : 'Approbation des fiches'}
                            </h2>
                            <div className="admin-controls">
                                <div className="search-box">
                                    <Search size={18} />
                                    <input
                                        type="text"
                                        placeholder="Guide, artisan, email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                {activeTab === 'submissions' && (
                                    <>
                                        <div className="filter-select-wrapper">
                                            <Filter size={16} />
                                            <select
                                                className="admin-select"
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                            >
                                                <option value="all">Tous</option>
                                                <option value="pending">En attente</option>
                                                <option value="validated">Validés</option>
                                                <option value="rejected">Rejetés</option>
                                            </select>
                                        </div>

                                        <button
                                            className={`age-filter-btn ${showOnlyOld ? 'active' : ''}`}
                                            onClick={() => setShowOnlyOld(!showOnlyOld)}
                                            title="Afficher uniquement les avis de plus de 7 jours"
                                        >
                                            <Clock size={16} />
                                            <span>{showOnlyOld ? '> 7 jours' : 'Tout'}</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="admin-table-container">
                        {isLoading ? (
                            <div className="admin-loading">
                                <LoadingSpinner size="lg" text="Chargement..." />
                            </div>
                        ) : activeTab === 'submissions' ? (
                            <table className="admin-modern-table">
                                <thead>
                                    <tr>
                                        <th>Guide</th>
                                        <th>Artisan</th>
                                        <th>Date & Email</th>
                                        <th>Preuve</th>
                                        <th>Statut</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSubmissions.length > 0 ? filteredSubmissions.map((submission) => (
                                        <tr key={submission.id}>
                                            <td className="font-medium">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                                    {submission.guide_avatar ? (
                                                        <img src={submission.guide_avatar} alt="" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>
                                                            <User size={16} />
                                                        </div>
                                                    )}
                                                    {submission.guide_name}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="text-gray-900 font-medium">{submission.artisan_name}</div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <span style={{ fontSize: '13px', color: 'var(--gray-700)' }}>
                                                        {new Date(submission.submitted_at).toLocaleDateString()}
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                                                        {submission.google_email}
                                                    </span>
                                                    {isOldReview(submission.submitted_at) && submission.status === 'pending' && (
                                                        <span style={{ fontSize: '10px', color: 'var(--primary-orange)', fontWeight: 600 }}>En retard</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <a href={submission.review_url} target="_blank" rel="noopener noreferrer" className="review-link-simple">
                                                    Voir <ExternalLink size={12} />
                                                </a>
                                            </td>
                                            <td>
                                                <span className={`admin-badge ${getStatusBadgeClass(submission.status)}`}>
                                                    {submission.status === 'pending' ? 'En attente' :
                                                        submission.status === 'validated' ? 'Validé' : 'Rejeté'}
                                                </span>
                                            </td>
                                            <td className="actions-cell">
                                                <div className="action-buttons">
                                                    {submission.status === 'pending' && (
                                                        <>
                                                            <button
                                                                className="action-btn active-btn"
                                                                title="Valider"
                                                                onClick={() => handleUpdateStatus(submission.id, 'validated')}
                                                                disabled={isActionLoading}
                                                            >
                                                                <CheckCircle2 size={18} />
                                                            </button>
                                                            <button
                                                                className="action-btn block-btn"
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
                                            <td colSpan={6} className="text-center" style={{ padding: '40px', color: 'var(--gray-500)' }}>
                                                Aucun avis trouvé.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            <table className="admin-modern-table">
                                <thead>
                                    <tr>
                                        <th>Artisan</th>
                                        <th>Société</th>
                                        <th>Détails</th>
                                        <th>Statut</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingfiches.length > 0 ? pendingfiches.map((fiche) => (
                                        <tr key={fiche.id}>
                                            <td className="font-medium">{fiche.artisan_name}</td>
                                            <td>{fiche.company_name}</td>
                                            <td>
                                                <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                                                    <strong>{fiche.quantity} avis</strong> • {fiche.sector}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="admin-badge warning">À valider</span>
                                            </td>
                                            <td className="actions-cell">
                                                <button
                                                    className="btn-next"
                                                    style={{ padding: '6px 12px', fontSize: '12px', width: 'auto' }}
                                                    onClick={() => handleApprovefiche(fiche.id)}
                                                    disabled={isActionLoading}
                                                >
                                                    <CheckCircle2 size={16} /> Publier
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="text-center" style={{ padding: '40px', color: 'var(--gray-500)' }}>
                                                Aucune fiche en attente de publication.
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
