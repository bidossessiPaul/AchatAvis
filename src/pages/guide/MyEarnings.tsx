import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { payoutApi } from '../../services/api';
import {
    Wallet,
    TrendingUp,
    Clock,
    AlertCircle,
    History,
    Calendar,
    CheckCircle2,
    RotateCw,
    AlertTriangle,
    CreditCard,
    Plus,
    X,
    Banknote,
    Smartphone
} from 'lucide-react';
import { showConfirm, showSuccess, showError } from '../../utils/Swal';
import './MyEarnings.css';
import '../guide/Submissions.css'; // Reuse table and card styles

interface PayoutRequest {
    id: string;
    amount: number;
    status: 'pending' | 'paid' | 'refused' | 'in_revision';
    requested_at: string;
    processed_at?: string;
    admin_note?: string;
}

export const MyEarnings: React.FC = () => {
    const [stats, setStats] = useState<{ totalEarned: number, totalPaid: number, totalPending: number, balance: number } | null>(null);
    const [history, setHistory] = useState<PayoutRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<{ method: string, details: any } | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState('');
    const [methodDetails, setMethodDetails] = useState<any>({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [statsData, historyData, paymentData] = await Promise.all([
                payoutApi.getEarnings(),
                payoutApi.getPayoutHistory(),
                payoutApi.getPaymentMethod()
            ]);
            setStats(statsData);
            setHistory(historyData);
            setPaymentMethod(paymentData);
            if (paymentData) {
                setSelectedMethod(paymentData.method);
                setMethodDetails(paymentData.details || {});
            }
        } catch (error) {
            showError('Erreur', 'Erreur lors du chargement de vos gains');
        } finally {
            setIsLoading(false);
        }
    };

    const handleWithdrawRequest = async () => {
        if (!stats || stats.balance < 20) {
            showError('Montant insuffisant', 'Montant minimum de 20€ requis pour un retrait');
            return;
        }

        const result = await showConfirm(
            'Demande de retrait',
            `Voulez-vous lancer une demande de retrait pour la totalité de votre solde (${stats.balance.toFixed(2)}€) ?`
        );

        if (!result.isConfirmed) return;

        setIsActionLoading(true);
        try {
            await payoutApi.requestPayout();
            showSuccess('Succès', 'Demande de retrait envoyée !');
            loadData(); // Refresh to see balance zero and new pending request
        } catch (error: any) {
            showError('Erreur', error.response?.data?.error || 'Erreur lors de la demande');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleSavePaymentMethod = async () => {
        if (!selectedMethod) {
            showError('Erreur', 'Veuillez choisir un moyen de paiement');
            return;
        }

        setIsActionLoading(true);
        try {
            await payoutApi.updatePaymentMethod({ method: selectedMethod, details: methodDetails });
            showSuccess('Succès', 'Moyen de paiement mis à jour !');
            setShowPaymentModal(false);
            loadData();
        } catch (error: any) {
            showError('Erreur', error.response?.data?.error || 'Erreur lors de la mise à jour');
        } finally {
            setIsActionLoading(false);
        }
    };

    const getMethodLabel = (method: string) => {
        switch (method) {
            case 'bank_transfer': return 'Virement bancaire';
            case 'paypal': return 'PayPal';
            case 'mobile_money': return 'Mobile Money';
            case 'wave': return 'Wave';
            case 'other': return 'Autre';
            default: return 'Non configuré';
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'paid': return { label: 'Payé', icon: <CheckCircle2 size={14} />, class: 'paid' };
            case 'pending': return { label: 'En attente', icon: <Clock size={14} />, class: 'pending' };
            case 'in_revision': return { label: 'En révision', icon: <RotateCw size={14} />, class: 'in_revision' };
            case 'refused': return { label: 'Refusé', icon: <AlertTriangle size={14} />, class: 'refused' };
            default: return { label: status, icon: <AlertCircle size={14} />, class: '' };
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout title="Mes gains">
                <div className="loading-container">
                    <div className="spinner"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Mes gains">
            <div className="earnings-page">
                {/* Notification Banner */}
                <div className="payout-info-banner">
                    <Calendar size={20} />
                    <div>
                        <p><strong>Information importante :</strong> Les paiements sont effectués chaque <strong>15</strong> et <strong>30</strong> du mois.</p>
                        {stats && stats.balance > 0 && stats.balance < 20 && (
                            <p style={{ marginTop: '4px', opacity: 0.8 }}>Si vous lancez un retrait inférieur à 20€ avant d'avoir atteint le seuil, il restera en attente jusqu'au prochain cycle.</p>
                        )}
                    </div>
                </div>

                {/* Balance & Stats Cards */}
                <div className="earnings-stats">
                    <div className="stat-card balance">
                        <div className="stat-icon-wrapper" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                            <Wallet size={24} />
                        </div>
                        <div className="stat-info">
                            <p className="stat-label">Solde disponible</p>
                            <h3 className="stat-value">{stats?.balance.toFixed(2)}€</h3>
                        </div>
                    </div>

                    <div className="stat-card earnings">
                        <div className="stat-icon-wrapper">
                            <TrendingUp size={24} />
                        </div>
                        <div className="stat-info">
                            <p className="stat-label">Cumul des gains</p>
                            <h3 className="stat-value">{stats?.totalEarned.toFixed(2)}€</h3>
                        </div>
                    </div>

                    <div className="stat-card pending-stats">
                        <div className="stat-icon-wrapper">
                            <Clock size={24} />
                        </div>
                        <div className="stat-info">
                            <p className="stat-label">En attente de paiement</p>
                            <h3 className="stat-value">{stats?.totalPending.toFixed(2)}€</h3>
                        </div>
                    </div>
                </div>

                {/* Withdraw Action Section */}
                <div className="withdraw-section-container">
                    <div className="withdraw-section">
                        <h3 style={{ margin: 0, fontWeight: 700 }}>Retirer mes gains</h3>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', maxWidth: '400px' }}>
                            Cliquez sur le bouton ci-dessous pour transférer votre solde disponible vers votre compte de paiement enregistré.
                        </p>
                        <button
                            className="withdraw-btn"
                            onClick={handleWithdrawRequest}
                            disabled={isActionLoading || (stats?.balance || 0) < 20 || !paymentMethod}
                        >
                            {isActionLoading ? 'Traitement...' : `Retirer ${stats?.balance.toFixed(2)}€`}
                        </button>
                        {(stats?.balance || 0) < 20 && (
                            <p className="withdraw-amount-tip">
                                <AlertCircle size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                Solde minimum de 20.00€ requis pour effectuer un retrait.
                            </p>
                        )}
                        {!paymentMethod && (
                            <p className="withdraw-amount-tip" style={{ color: '#ef4444' }}>
                                <AlertTriangle size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                Veuillez configurer un moyen de paiement pour demander un retrait.
                            </p>
                        )}
                    </div>

                    <div className="payment-method-card">
                        <div className="method-info">
                            <CreditCard size={20} />
                            <div>
                                <p className="method-label">Moyen de paiement</p>
                                <p className="method-value">{paymentMethod ? getMethodLabel(paymentMethod.method) : 'Non configuré'}</p>
                            </div>
                        </div>
                        <button className="setup-btn" onClick={() => setShowPaymentModal(true)}>
                            {paymentMethod ? 'Modifier' : 'Ajouter'} <Plus size={16} />
                        </button>
                    </div>
                </div>

                {/* Payment Method Modal */}
                {showPaymentModal && (
                    <div className="modal-overlay">
                        <div className="modal-content payment-config-modal">
                            <div className="modal-header">
                                <h3>Configurer le paiement</h3>
                                <button className="close-btn" onClick={() => setShowPaymentModal(false)}><X size={20} /></button>
                            </div>
                            <div className="modal-body">
                                <div className="method-selector">
                                    <label>Type de paiement</label>
                                    <div className="method-options">
                                        {[
                                            { id: 'bank_transfer', label: 'Virement', icon: <Banknote size={16} /> },
                                            { id: 'paypal', label: 'PayPal', icon: <TrendingUp size={16} /> }, // PayPal doesn't have a specific icon here, using generic
                                            { id: 'mobile_money', label: 'Mobile Money', icon: <Smartphone size={16} /> },
                                            { id: 'wave', label: 'Wave', icon: <Smartphone size={16} /> },
                                            { id: 'other', label: 'Autre', icon: <CreditCard size={16} /> }
                                        ].map(option => (
                                            <div
                                                key={option.id}
                                                className={`method-option-card ${selectedMethod === option.id ? 'active' : ''}`}
                                                onClick={() => setSelectedMethod(option.id)}
                                            >
                                                {option.icon}
                                                <span>{option.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {selectedMethod === 'bank_transfer' && (
                                    <div className="method-details-form">
                                        <div className="form-group">
                                            <label>Titulaire du compte</label>
                                            <input type="text" value={methodDetails.accountName || ''} onChange={e => setMethodDetails({ ...methodDetails, accountName: e.target.value })} placeholder="Nom Complet" />
                                        </div>
                                        <div className="form-group">
                                            <label>IBAN</label>
                                            <input type="text" value={methodDetails.iban || ''} onChange={e => setMethodDetails({ ...methodDetails, iban: e.target.value })} placeholder="FR76 ..." />
                                        </div>
                                        <div className="form-group">
                                            <label>BIC/SWIFT</label>
                                            <input type="text" value={methodDetails.bic || ''} onChange={e => setMethodDetails({ ...methodDetails, bic: e.target.value })} placeholder="BANKFR ..." />
                                        </div>
                                    </div>
                                )}

                                {selectedMethod === 'paypal' && (
                                    <div className="method-details-form">
                                        <div className="form-group">
                                            <label>Email PayPal</label>
                                            <input type="email" value={methodDetails.email || ''} onChange={e => setMethodDetails({ ...methodDetails, email: e.target.value })} placeholder="votre@email.com" />
                                        </div>
                                    </div>
                                )}

                                {(selectedMethod === 'mobile_money' || selectedMethod === 'wave') && (
                                    <div className="method-details-form">
                                        <div className="form-group">
                                            <label>Numéro de téléphone</label>
                                            <input type="tel" value={methodDetails.phone || ''} onChange={e => setMethodDetails({ ...methodDetails, phone: e.target.value })} placeholder="+225 ..." />
                                        </div>
                                        <div className="form-group">
                                            <label>Nom du bénéficiaire</label>
                                            <input type="text" value={methodDetails.fullName || ''} onChange={e => setMethodDetails({ ...methodDetails, fullName: e.target.value })} placeholder="Nom Complet" />
                                        </div>
                                    </div>
                                )}

                                {selectedMethod === 'other' && (
                                    <div className="method-details-form">
                                        <div className="form-group">
                                            <label>Détails du paiement</label>
                                            <textarea value={methodDetails.info || ''} onChange={e => setMethodDetails({ ...methodDetails, info: e.target.value })} placeholder="Décrivez comment vous souhaitez être payé..." />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn-cancel" onClick={() => setShowPaymentModal(false)}>Annuler</button>
                                <button className="btn-save" onClick={handleSavePaymentMethod} disabled={isActionLoading}>
                                    {isActionLoading ? 'Enregistrement...' : 'Enregistrer'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* History Table */}
                <div className="submissions-main-card">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title"><History size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />Historique des retraits</h3>
                            <p className="card-subtitle">Retrouvez toutes vos demandes de paiement ici.</p>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Date de demande</th>
                                    <th>Montant</th>
                                    <th>Statut</th>
                                    <th>Date de paiement</th>
                                    <th className="text-right">Note Admin</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length > 0 ? history.map(payout => {
                                    const statusInfo = getStatusInfo(payout.status);
                                    return (
                                        <tr key={payout.id}>
                                            <td data-label="Date">{new Date(payout.requested_at).toLocaleDateString()}</td>
                                            <td data-label="Montant" className="earnings-amount success">+{payout.amount.toFixed(2)}€</td>
                                            <td data-label="Statut">
                                                <span className={`status-badge ${statusInfo.class}`}>
                                                    {statusInfo.icon} {statusInfo.label}
                                                </span>
                                            </td>
                                            <td data-label="Date paiement">
                                                {payout.processed_at ? new Date(payout.processed_at).toLocaleDateString() : '—'}
                                            </td>
                                            <td data-label="Note" className="text-right text-gray-500 italic">
                                                {payout.admin_note || '—'}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={5} className="text-center" style={{ padding: '48px' }}>
                                            <div className="empty-state">
                                                <Clock size={48} className="empty-icon" />
                                                <p className="empty-text">Aucun historique de paiement pour le moment.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};
