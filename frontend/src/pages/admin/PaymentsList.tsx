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
    Wallet
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

    return (
        <DashboardLayout title="Gestion des Paiements">
            <div className="admin-dashboard revamped">
                <div className="admin-main-card">
                    <div className="admin-card-header">
                        <div>
                            <h2 className="card-title">Demandes de Retrait Guides</h2>
                            <p className="admin-p-subtitle">Gérez et validez les transferts de fonds pour les guides.</p>
                        </div>
                        <div className="admin-controls">
                            <div className="search-box">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Rechercher guide (nom, email)..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="filter-select-wrapper">
                                <Filter size={16} />
                                <select
                                    className="admin-select"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="all">Tous les statuts</option>
                                    <option value="pending">En attente</option>
                                    <option value="in_revision">En révision</option>
                                    <option value="paid">Payés</option>
                                    <option value="refused">Refusés</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="admin-table-container">
                        {isLoading ? (
                            <div className="admin-loading">
                                <LoadingSpinner size="lg" text="Chargement des paiements..." />
                            </div>
                        ) : (
                            <table className="admin-modern-table">
                                <thead>
                                    <tr>
                                        <th>Guide</th>
                                        <th>Compte Google</th>
                                        <th>Montant</th>
                                        <th>Date</th>
                                        <th>Statut</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRequests.length > 0 ? filteredRequests.map(request => (
                                        <tr key={request.id}>
                                            <td className="font-medium">
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <UserIcon size={14} className="text-gray-400" /> {request.guide_name}
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                        <Mail size={10} style={{ verticalAlign: 'middle', marginRight: '2px' }} /> {request.guide_email}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="text-gray-500 font-mono" style={{ fontSize: '12px' }}>{request.google_email}</td>
                                            <td>
                                                <div style={{ fontWeight: 700, color: '#059669' }}>
                                                    {Number(request.amount).toFixed(2)}€
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '12px', color: '#64748b' }}>
                                                {new Date(request.requested_at).toLocaleDateString()}
                                            </td>
                                            <td>
                                                <span className={`admin-badge ${request.status}`}>
                                                    {request.status === 'pending' && <RotateCcw size={12} style={{ marginRight: '4px' }} />}
                                                    {request.status === 'paid' && <CheckCircle size={12} style={{ marginRight: '4px' }} />}
                                                    {request.status}
                                                </span>
                                            </td>
                                            <td className="actions-cell">
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
