import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useAuthStore } from '../../context/authStore';
import { artisanService } from '../../services/artisanService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
    Zap,
    History,
    Package,
    ArrowUpRight,
    CreditCard,
    Calendar,
    ChevronRight,
    Target
} from 'lucide-react';
import { SubscriptionPack } from '../../types';
import toast from 'react-hot-toast';
import './BillingPage.css';
import '../artisan/PlanSelection.css';

export const BillingPage: React.FC = () => {
    const { user } = useAuthStore();
    const [packs, setPacks] = useState<SubscriptionPack[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [isFetching, setIsFetching] = useState(true);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [packsData, historyData] = await Promise.all([
                    artisanService.getSubscriptionPacks(),
                    artisanService.getPaymentHistory()
                ]);
                setPacks(packsData);
                setHistory(historyData);
            } catch (error) {
                console.error("Failed to load billing data", error);
                toast.error("Erreur lors du chargement des données.");
            } finally {
                setIsFetching(false);
            }
        };
        loadData();
    }, []);

    const handleUpgrade = async (planId: string) => {
        setIsProcessing(planId);
        try {
            const { url } = await artisanService.createCheckoutSession(planId);
            window.location.href = url;
        } catch (error) {
            console.error("Payment error", error);
            toast.error("Erreur lors de l'initialisation du paiement.");
            setIsProcessing(null);
        }
    };

    const missionTotal = user?.missions_allowed || 0;
    const missionUsed = user?.missions_used || 0;
    const missionRemaining = Math.max(0, missionTotal - missionUsed);
    const progressPercentage = missionTotal > 0 ? (missionUsed / missionTotal) * 100 : 0;

    if (isFetching) {
        return (
            <DashboardLayout title="Ma Facturation">
                <div className="loading-centered">
                    <LoadingSpinner size="lg" text="Chargement de vos données de facturation..." />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Ma Facturation">
            <div className="billing-page-container">
                {/* 1. Mission Inventory Section - Premium Card */}
                <div className="inventory-section">
                    <div className="billing-glass-card inventory-card">
                        <div className="card-header">
                            <div className="icon-badge">
                                <Package className="text-primary" />
                            </div>
                            <div>
                                <h2>Stock de Missions</h2>
                                <p>Consommation totale de vos packs achetés</p>
                            </div>
                            <div className="status-badge-premium active">
                                <span className="pulse-dot"></span>
                                Actif
                            </div>
                        </div>

                        <div className="inventory-stats-grid">
                            <div className="stat-item">
                                <span className="stat-label">Total acheté</span>
                                <span className="stat-value">{missionTotal}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Utilisées</span>
                                <span className="stat-value">{missionUsed}</span>
                            </div>
                            <div className="stat-item highlight">
                                <span className="stat-label">Restantes</span>
                                <span className="stat-value">{missionRemaining}</span>
                            </div>
                        </div>

                        <div className="progress-container-premium">
                            <div className="progress-labels">
                                <span>Utilisation</span>
                                <span>{Math.round(progressPercentage)}%</span>
                            </div>
                            <div className="progress-bar-bg">
                                <div
                                    className="progress-bar-fill-premium"
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats sidebar for dates */}
                    <div className="billing-glass-card dates-card">
                        <h3>Détails Abonnement</h3>
                        <div className="info-row">
                            <Calendar size={16} />
                            <div>
                                <span className="info-label">Dernière activation</span>
                                <span className="info-value">
                                    {user?.subscription_start_date ? new Date(user.subscription_start_date).toLocaleDateString('fr-FR') : 'Non définie'}
                                </span>
                            </div>
                        </div>
                        <div className="info-row">
                            <Target size={16} />
                            <div>
                                <span className="info-label">Quota Mensuel Avis</span>
                                <span className="info-value">{user?.current_month_reviews || 0} / {user?.monthly_reviews_quota || 0}</span>
                            </div>
                        </div>
                        <button className="receipt-button">
                            <CreditCard size={16} />
                            Gérer sur Stripe
                        </button>
                    </div>
                </div>

                {/* 2. Buy More Packs Section */}
                <div className="upgrade-section">
                    <div className="section-header">
                        <Zap className="text-yellow-500" />
                        <h3>Besoin de plus de missions ?</h3>
                    </div>
                    <div className="plans-grid">
                        {packs.map((plan) => (
                            <div
                                key={plan.id}
                                className={`plan-card-mini ${plan.color} ${user?.subscription_tier === plan.id ? 'featured' : ''}`}
                            >
                                <div className="plan-info">
                                    <span className="plan-name-mini">{plan.name}</span>
                                    <div className="plan-price-mini">
                                        <span className="amount">{plan.price_cents / 100}€</span>
                                        <span className="period">/pack</span>
                                    </div>
                                    <p className="plan-quota-text">+{plan.quantity} missions à votre stock</p>
                                </div>
                                <button
                                    onClick={() => handleUpgrade(plan.id)}
                                    disabled={isProcessing !== null}
                                    className={`buy-again-button ${plan.color}`}
                                >
                                    {isProcessing === plan.id ? '...' : <ArrowUpRight size={20} />}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Payment History Section */}
                <div className="history-section">
                    <div className="section-header">
                        <History />
                        <h3>Historique des achats</h3>
                    </div>
                    <div className="billing-glass-card history-card">
                        {history.length === 0 ? (
                            <div className="empty-history">
                                <p>Aucun achat enregistré pour le moment.</p>
                            </div>
                        ) : (
                            <div className="history-table-wrapper">
                                <table className="history-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Description</th>
                                            <th>Montant</th>
                                            <th>Statut</th>
                                            <th />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map((payment) => (
                                            <tr key={payment.id}>
                                                <td>
                                                    <span className="date-cell">
                                                        {new Date(payment.created_at).toLocaleDateString('fr-FR')}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="desc-cell">{payment.description || 'Pack Booster'}</span>
                                                </td>
                                                <td>
                                                    <span className="amount-cell">{payment.amount}€</span>
                                                </td>
                                                <td>
                                                    <span className={`status-pill ${payment.status}`}>
                                                        {payment.status === 'completed' ? 'Validé' : payment.status}
                                                    </span>
                                                </td>
                                                <td className="actions-cell">
                                                    <ChevronRight size={16} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};
