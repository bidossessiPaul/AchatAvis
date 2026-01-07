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
    AlertTriangle
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

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [statsData, historyData] = await Promise.all([
                payoutApi.getEarnings(),
                payoutApi.getPayoutHistory()
            ]);
            setStats(statsData);
            setHistory(historyData);
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
                <div className="withdraw-section">
                    <h3 style={{ margin: 0, fontWeight: 700 }}>Retirer mes gains</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', maxWidth: '400px' }}>
                        Cliquez sur le bouton ci-dessous pour transférer votre solde disponible vers votre compte de paiement enregistré.
                    </p>
                    <button
                        className="withdraw-btn"
                        onClick={handleWithdrawRequest}
                        disabled={isActionLoading || (stats?.balance || 0) < 20}
                    >
                        {isActionLoading ? 'Traitement...' : `Retirer ${stats?.balance.toFixed(2)}€`}
                    </button>
                    {(stats?.balance || 0) < 20 && (
                        <p className="withdraw-amount-tip">
                            <AlertCircle size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                            Solde minimum de 20.00€ requis pour effectuer un retrait.
                        </p>
                    )}
                </div>

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
