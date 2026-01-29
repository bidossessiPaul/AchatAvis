import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { payoutApi } from '../../services/api';
import {
    CheckCircle,
    XCircle,
    Search,
    Filter,
    RotateCcw,
    Mail,
    User as UserIcon,
    Wallet,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { showConfirm, showSuccess, showError } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './AdminLists.css';

interface PayoutRequest {
    id: string;
    guide_id: string;
    guide_name: string;
    guide_email: string;
    google_email: string;
    amount: number;
    status: 'pending' | 'paid' | 'refused' | 'in_revision';
    requested_at: string;
    processed_at?: string;
    admin_note?: string;
}

export const PaymentsList: React.FC = () => {
    const [requests, setRequests] = useState<PayoutRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
    const [adminNote, setAdminNote] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        setIsLoading(true);
        try {
            const data = await payoutApi.getAllRequests();
            setRequests(data);
        } catch (error) {
            showError('Erreur', 'Erreur lors du chargement des demandes');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusUpdate = async (payoutId: string, newStatus: string) => {
        const result = await showConfirm(
            'Confirmation',
            `Voulez-vous passer cette demande au statut : ${newStatus} ?`
        );

        if (!result.isConfirmed) return;

        setIsActionLoading(true);
        try {
            await payoutApi.updateStatus(payoutId, { status: newStatus, adminNote: adminNote || undefined });
            showSuccess('Succès', `Statut mis à jour : ${newStatus}`);
            setAdminNote('');
            setSelectedPayout(null);
            loadRequests();
        } catch (error) {
            showError('Erreur', 'Erreur lors de la mise à jour');
        } finally {
            setIsActionLoading(false);
        }
    };

    const filteredRequests = requests.filter(r => {
        const matchesSearch =
            r.guide_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.guide_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.google_email?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || r.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedRequests = filteredRequests.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    return (
        <DashboardLayout title="Gestion des Paiements">
            <div className="admin-dashboard revamped">
                <div className="admin-main-card">
                    <div className="admin-card-header" style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '1.5rem' }}>
                            <div>
                                <h2 className="card-title" style={{ fontSize: '1.5rem', fontWeight: 800 }}>Demandes de Retrait Guides</h2>
                                <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginTop: '4px' }}>
                                    Gérez et validez les transferts de fonds pour les guides.
                                </p>
                            </div>
                            <div className="admin-controls-premium" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div className="search-box-premium" style={{ position: 'relative' }}>
                                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                    <input
                                        type="text"
                                        placeholder="Rechercher guide (nom, email)..."
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
                                            <option value="in_revision">En révision</option>
                                            <option value="paid">Payés</option>
                                            <option value="refused">Refusés</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="admin-table-container">
                        {isLoading ? (
                            <div className="admin-loading">
                                <LoadingSpinner size="lg" text="Chargement des paiements..." />
                            </div>
                        ) : (
                            <table className="admin-modern-table" style={{ borderCollapse: 'separate', borderSpacing: '0 10px' }}>
                                <thead>
                                    <tr style={{ background: 'transparent' }}>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Guide</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Compte Google</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Montant</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Date</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Statut</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }} className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedRequests.length > 0 ? paginatedRequests.map(request => (
                                        <tr key={request.id} style={{ backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', borderRadius: '16px', overflow: 'hidden' }}>
                                            <td className="font-medium" style={{ padding: '1.25rem 1.5rem', border: 'none', borderRadius: '16px 0 0 16px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <UserIcon size={14} className="text-gray-400" /> {request.guide_name}
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                        <Mail size={10} style={{ verticalAlign: 'middle', marginRight: '2px' }} /> {request.guide_email}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="text-gray-500 font-mono" style={{ fontSize: '12px', border: 'none' }}>{request.google_email}</td>
                                            <td style={{ border: 'none' }}>
                                                <div style={{ fontWeight: 700, color: '#FF991F' }}>
                                                    {Number(request.amount).toFixed(2)}€
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '12px', color: '#64748b', border: 'none' }}>
                                                {new Date(request.requested_at).toLocaleDateString()}
                                            </td>
                                            <td style={{ border: 'none' }}>
                                                <span className={`admin-badge ${request.status}`} style={{
                                                    padding: '0.4rem 0.8rem',
                                                    borderRadius: '10px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {request.status === 'pending' && <RotateCcw size={12} style={{ marginRight: '4px' }} />}
                                                    {request.status === 'paid' && <CheckCircle size={12} style={{ marginRight: '4px' }} />}
                                                    {request.status}
                                                </span>
                                            </td>
                                            <td className="actions-cell" style={{ border: 'none', borderRadius: '0 16px 16px 0' }}>
                                                <div className="action-buttons">
                                                    {request.status !== 'paid' && request.status !== 'refused' ? (
                                                        <>
                                                            <button
                                                                className="action-btn active-btn"
                                                                title="Marquer comme payé"
                                                                onClick={() => handleStatusUpdate(request.id, 'paid')}
                                                            >
                                                                <CheckCircle size={18} />
                                                            </button>
                                                            <button
                                                                className="action-btn warn-btn"
                                                                title="Mettre en révision"
                                                                onClick={() => {
                                                                    setSelectedPayout(request);
                                                                    setAdminNote(request.admin_note || '');
                                                                }}
                                                            >
                                                                <RotateCcw size={18} />
                                                            </button>
                                                            <button
                                                                className="action-btn block-btn"
                                                                title="Refuser"
                                                                onClick={() => {
                                                                    setSelectedPayout(request);
                                                                    setAdminNote(request.admin_note || '');
                                                                }}
                                                            >
                                                                <XCircle size={18} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs italic">Terminé</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="text-center" style={{ padding: '60px' }}>
                                                <div className="empty-state">
                                                    <Wallet size={48} className="empty-icon" />
                                                    <p className="empty-text">Aucune demande de paiement trouvée.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {!isLoading && filteredRequests.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--gray-50)', borderRadius: '12px', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)', fontWeight: 500 }}>Afficher :</span>
                                <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--gray-300)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', backgroundColor: 'white' }}>
                                    <option value={20}>20 paiements</option>
                                    <option value={50}>50 paiements</option>
                                    <option value={100}>100 paiements</option>
                                    <option value={200}>200 paiements</option>
                                </select>
                                <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>{startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredRequests.length)} sur {filteredRequests.length}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--gray-300)', backgroundColor: currentPage === 1 ? 'var(--gray-100)' : 'white', color: currentPage === 1 ? 'var(--gray-400)' : 'var(--gray-700)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s' }}><ChevronLeft size={16} />Précédent</button>
                                <span style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)' }}>Page {currentPage} / {totalPages}</span>
                                <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--gray-300)', backgroundColor: currentPage === totalPages ? 'var(--gray-100)' : 'white', color: currentPage === totalPages ? 'var(--gray-400)' : 'var(--gray-700)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s' }}>Suivant<ChevronRight size={16} /></button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Revision/Refuse Modal Mockup (Conditional Inline Card) */}
                {selectedPayout && (
                    <div className="admin-main-card" style={{ marginTop: '24px', borderLeft: '4px solid #f59e0b' }}>
                        <div className="admin-card-header">
                            <h3 className="card-title">Gérer la demande de {selectedPayout.guide_name}</h3>
                            <button className="back-btn" onClick={() => setSelectedPayout(null)}>Annuler</button>
                        </div>
                        <div style={{ padding: '0 24px 24px 24px' }}>
                            <p style={{ fontSize: '14px', marginBottom: '16px', color: '#64748b' }}>
                                Ajoutez une note pour expliquer le refus ou la mise en révision (ex: Infos RIB manquantes).
                            </p>
                            <textarea
                                className="admin-textarea"
                                style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}
                                placeholder="Note pour le guide..."
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                            />
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    className="admin-p-btn warn"
                                    onClick={() => handleStatusUpdate(selectedPayout.id, 'in_revision')}
                                    disabled={isActionLoading}
                                >
                                    Confirmer Mise en révision
                                </button>
                                <button
                                    className="admin-p-btn danger"
                                    onClick={() => handleStatusUpdate(selectedPayout.id, 'refused')}
                                    disabled={isActionLoading}
                                >
                                    Confirmer Refus
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};
