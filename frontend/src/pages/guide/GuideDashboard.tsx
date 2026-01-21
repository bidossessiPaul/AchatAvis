import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { guideService } from '../../services/guideService';
import { MapPin, DollarSign, Clock, ArrowRight, Star, ShieldCheck, Shield, TrendingUp, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import { GuideLevelProgress } from './GuideLevelProgress';
import { EarningsChart, DistributionChart } from '../../components/Dashboard/DashboardCharts';
import { motion } from 'framer-motion';
import './GuideDashboard.css';

export const GuideDashboard: React.FC = () => {
    const [fiches, setfiches] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuthStore();

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setIsLoading(true);
        try {
            const [fichesData, statsData] = await Promise.all([
                guideService.getAvailablefiches(),
                guideService.getStats()
            ]);
            setfiches(fichesData);
            setStats(statsData);
        } catch (error) {
            console.error("Failed to load guide dashboard data", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout title="fiches Disponibles">
            <div className="guide-dashboard-hero">
                <div className="guide-dashboard-hero-content">
                    <div className="guide-dashboard-hero-text">
                        <h2 className="guide-dashboard-hero-title">Prêt à gagner de l'argent ?</h2>
                        <p className="guide-dashboard-hero-subtitle">
                            Sélectionnez une fiche ci-dessous, postez votre avis sur Google Business et gagnez jusqu'à 2.50€ par contribution validée.
                        </p>
                    </div>
                    <Star className="guide-dashboard-hero-icon" />
                </div>
            </div>

            {/* Gamification Progress */}
            <GuideLevelProgress />

            {/* Earnings Recap */}
            <div className="earnings-recap-grid">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="recap-card"
                >
                    <span className="recap-label">Solde Actuel</span>
                    <span className="recap-value">{Number(stats?.balance || 0).toFixed(2)}€</span>
                    <div className="recap-subvalue">
                        <Wallet size={14} />
                        <span>Prêt pour retrait</span>
                    </div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="recap-card"
                >
                    <span className="recap-label">En attente</span>
                    <span className="recap-value" style={{ color: '#f59e0b' }}>{Number(stats?.pending || 0).toFixed(2)}€</span>
                    <div className="recap-subvalue" style={{ color: '#6b7280' }}>
                        <Clock size={14} />
                        <span>Vérification Google</span>
                    </div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="recap-card"
                >
                    <span className="recap-label">Total Gagné</span>
                    <span className="recap-value" style={{ color: '#FF6B35' }}>{Number((stats?.totalPaid || 0) + (stats?.balance || 0)).toFixed(2)}€</span>
                    <div className="recap-subvalue">
                        <TrendingUp size={14} />
                        <span>Depuis le début</span>
                    </div>
                </motion.div>
            </div>

            {/* Analytics Section */}
            <div className="guide-analytics-grid">
                <div className="analytics-card">
                    <h3 className="analytics-card-title">Gains des 7 derniers jours</h3>
                    <EarningsChart data={stats?.dailyEarnings || []} />
                </div>
                <div className="analytics-card">
                    <h3 className="analytics-card-title">État de vos contributions</h3>
                    <DistributionChart data={stats?.statusDistribution?.map((s: any) => ({
                        name: s.status === 'validated' ? 'Validés' : (s.status === 'rejected' ? 'Rejetés' : 'En attente'),
                        value: s.count
                    })) || []} />
                </div>
            </div>

            {/* Anti-Detection Alert */}
            <div
                onClick={() => navigate('/guide/anti-detection')}
                className="anti-detection-alert"
            >
                <div className="anti-detection-icon-wrapper">
                    <ShieldCheck size={24} color="var(--artisan-primary)" />
                </div>
                <div className="anti-detection-content">
                    <h3 className="anti-detection-title">
                        Protégez vos gains et vos comptes !
                    </h3>
                    <p className="anti-detection-text">
                        Découvrez nos conseils anti-détection pour éviter que vos avis ne soient supprimés par Google.
                    </p>
                </div>
                <ArrowRight size={20} color="#FF991F" />
            </div>

            <div className="fiches-header">
                <h3 className="fiches-header-title">
                    Dernières fiches disponibles
                </h3>
                <span
                    className="see-all-link"
                    onClick={() => navigate('/guide/fiches')}
                    style={{ cursor: 'pointer', color: 'var(--artisan-primary)', fontWeight: 800, fontSize: '0.9rem' }}
                >
                    Voir tout ({fiches.length})
                </span>
            </div>

            {isLoading ? (
                <div className="loading-state">
                    <div className="animate-spin loading-spinner">
                        <Clock size={32} color="var(--guide-primary)" />
                    </div>
                    <p className="loading-text">Recherche des meilleures fiches...</p>
                </div>
            ) : fiches.length > 0 ? (
                <div className="fiches-grid">
                    {fiches
                        .filter(fiche => fiche.status !== 'completed' && fiche.status !== 'cancelled')
                        .slice(0, 3)
                        .map((fiche) => (
                            <div
                                key={fiche.id}
                                className="fiche-card"
                                onClick={() => navigate(`/guide/fiches/${fiche.id}`)}
                            >
                                <div className="fiche-card-content">
                                    <div className="fiche-card-header">
                                        <div className="payout-badge">
                                            <DollarSign size={14} /> {Number(fiche.payout_per_review || 1.50).toFixed(2)}€
                                        </div>
                                        <div className="time-badge">
                                            <Clock size={14} />
                                            {(() => {
                                                const date = new Date(fiche.published_at || fiche.created_at);
                                                const diffMs = Date.now() - date.getTime();
                                                const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                                                const diffMins = Math.floor(diffMs / (1000 * 60));
                                                if (diffHrs > 0) return `Il y a ${diffHrs}h`;
                                                if (diffMins > 0) return `Il y a ${diffMins} min`;
                                                return `À l'instant`;
                                            })()}
                                        </div>
                                    </div>

                                    <h4 className="fiche-company-name" >
                                        {fiche.company_name}
                                    </h4>

                                    <div className="fiche-details-row">
                                        <div className="fiche-sector">
                                            <MapPin size={16} />
                                            <span>{fiche.sector || 'Secteur non précisé'}</span>
                                        </div>
                                        <div
                                            className="fiche-difficulty"
                                            style={{
                                                background: fiche.difficulty === 'hard' ? '#fef2f2' : (fiche.difficulty === 'medium' ? '#fffbeb' : '#f0fdf4'),
                                                color: fiche.difficulty === 'hard' ? '#ef4444' : (fiche.difficulty === 'medium' ? '#f59e0b' : '#FF991F'),
                                                border: `1px solid ${fiche.difficulty === 'hard' ? '#fee2e2' : (fiche.difficulty === 'medium' ? '#fef3c7' : '#dcfce7')}`
                                            }}
                                        >
                                            {fiche.difficulty === 'easy' ? 'Simple' : (fiche.difficulty === 'medium' ? 'Modéré' : 'Difficile')}
                                        </div>
                                    </div>

                                    <div className="fiche-progress-container">
                                        <div className="progress-header">
                                            <span>Progression Totale</span>
                                            <span className="progress-value">{fiche.reviews_received || 0} / {fiche.quantity}</span>
                                        </div>
                                        <div className="progress-bar-bg">
                                            <div
                                                className="progress-bar-fill"
                                                style={{
                                                    width: `${Math.min(100, ((fiche.reviews_received || 0) / fiche.quantity) * 100)}%`
                                                }}
                                            ></div>
                                        </div>

                                        <div className="daily-goal-header">
                                            Objectif du jour
                                        </div>
                                        <div className="daily-goal-value">
                                            <Clock size={16} color="#FF991F" />
                                            <span>{fiche.daily_submissions_count || 0} / {fiche.reviews_per_day} avis demandés</span>
                                        </div>
                                    </div>

                                    {(() => {
                                        const isLocked = fiche.locked_by && new Date(fiche.locked_until) > new Date();
                                        const lockedByMe = fiche.locked_by === user?.id;
                                        const isDailyQuotaFull = (fiche.daily_submissions_count || 0) >= fiche.reviews_per_day;

                                        if (isLocked && !lockedByMe) {
                                            return (
                                                <div className="fiche-status-message status-occupied">
                                                    <Shield size={18} /> fiche occupée
                                                </div>
                                            );
                                        }

                                        if (isDailyQuotaFull) {
                                            return (
                                                <div className="fiche-status-message status-quota-full">
                                                    <Clock size={18} /> Quota du jour atteint
                                                </div>
                                            );
                                        }

                                        return (
                                            <button className="fiche-action-btn">
                                                {lockedByMe ? 'Reprendre la fiche' : 'Démarrer la fiche'} <ArrowRight size={18} />
                                            </button>
                                        );
                                    })()}
                                </div>
                            </div>
                        ))}
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <ShieldCheck size={40} color="#9ca3af" />
                    </div>
                    <h3 className="empty-state-title">Toutes les fiches sont complétées !</h3>
                    <p className="empty-state-text">
                        Bravo ! Revenez plus tard pour découvrir de nouvelles opportunités de gagner de l'argent.
                    </p>
                </div>
            )}
        </DashboardLayout>
    );
};
