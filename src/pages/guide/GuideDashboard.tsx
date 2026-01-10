import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { guideService } from '../../services/guideService';
import { MapPin, DollarSign, Clock, ArrowRight, Star, ShieldCheck, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import { GuideLevelProgress } from './GuideLevelProgress';
import './GuideDashboard.css';

export const GuideDashboard: React.FC = () => {
    const [missions, setMissions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuthStore();

    useEffect(() => {
        loadMissions();
    }, []);

    const loadMissions = async () => {
        try {
            const data = await guideService.getAvailableMissions();
            setMissions(data);
        } catch (error) {
            console.error("Failed to load missions", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout title="Missions Disponibles">
            <div className="guide-dashboard-hero">
                <div className="guide-dashboard-hero-content">
                    <div className="guide-dashboard-hero-text">
                        <h2 className="guide-dashboard-hero-title">Prêt à gagner de l'argent ?</h2>
                        <p className="guide-dashboard-hero-subtitle">
                            Sélectionnez une mission ci-dessous, postez votre avis sur Google Business et gagnez jusqu'à 2.50€ par contribution validée.
                        </p>
                    </div>
                    <Star className="guide-dashboard-hero-icon" />
                </div>
            </div>

            {/* Gamification Progress */}
            <GuideLevelProgress />

            {/* Anti-Detection Alert */}
            <div
                onClick={() => navigate('/guide/anti-detection')}
                className="anti-detection-alert"
            >
                <div className="anti-detection-icon-wrapper">
                    <ShieldCheck size={24} color="#f97316" />
                </div>
                <div className="anti-detection-content">
                    <h3 className="anti-detection-title">
                        Protégez vos gains et vos comptes !
                    </h3>
                    <p className="anti-detection-text">
                        Découvrez nos conseils anti-détection pour éviter que vos avis ne soient supprimés par Google.
                    </p>
                </div>
                <ArrowRight size={20} color="#9a3412" />
            </div>

            <div className="missions-header">
                <h3 className="missions-header-title">
                    {missions.length} Missions près de chez vous
                </h3>
            </div>

            {isLoading ? (
                <div className="loading-state">
                    <div className="animate-spin loading-spinner">
                        <Clock size={32} color="#ff3b6a" />
                    </div>
                    <p className="loading-text">Recherche des meilleures missions...</p>
                </div>
            ) : missions.length > 0 ? (
                <div className="missions-grid">
                    {missions.map((mission) => (
                        <div
                            key={mission.id}
                            className="mission-card"
                            onClick={() => navigate(`/guide/missions/${mission.id}`)}
                        >
                            <div className="mission-card-content">
                                <div className="mission-card-header">
                                    <div className="payout-badge">
                                        <DollarSign size={14} /> {Number(mission.payout_per_review || 1.50).toFixed(2)}€
                                    </div>
                                    <div className="time-badge">
                                        <Clock size={14} />
                                        {(() => {
                                            const date = new Date(mission.published_at || mission.created_at);
                                            const diffMs = Date.now() - date.getTime();
                                            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                                            const diffMins = Math.floor(diffMs / (1000 * 60));
                                            if (diffHrs > 0) return `Il y a ${diffHrs}h`;
                                            if (diffMins > 0) return `Il y a ${diffMins} min`;
                                            return `À l'instant`;
                                        })()}
                                    </div>
                                </div>

                                <h4 className="mission-company-name">
                                    {mission.company_name}
                                </h4>

                                <div className="mission-details-row">
                                    <div className="mission-sector">
                                        <span style={{ fontSize: '1.2rem' }}>{mission.sector_icon || <MapPin size={16} />}</span>
                                        <span>{mission.sector || 'Secteur non précisé'}</span>
                                    </div>
                                    <div
                                        className="mission-difficulty"
                                        style={{
                                            background: mission.difficulty === 'hard' ? '#fef2f2' : (mission.difficulty === 'medium' ? '#fffbeb' : '#f0fdf4'),
                                            color: mission.difficulty === 'hard' ? '#ef4444' : (mission.difficulty === 'medium' ? '#f59e0b' : '#10b981'),
                                            border: `1px solid ${mission.difficulty === 'hard' ? '#fee2e2' : (mission.difficulty === 'medium' ? '#fef3c7' : '#dcfce7')}`
                                        }}
                                    >
                                        {mission.difficulty === 'easy' ? 'Simple' : (mission.difficulty === 'medium' ? 'Modéré' : 'Difficile')}
                                    </div>
                                </div>

                                <div className="mission-progress-container">
                                    <div className="progress-header">
                                        <span>Progression Totale</span>
                                        <span className="progress-value">{mission.reviews_received || 0} / {mission.quantity}</span>
                                    </div>
                                    <div className="progress-bar-bg">
                                        <div
                                            className="progress-bar-fill"
                                            style={{
                                                width: `${Math.min(100, ((mission.reviews_received || 0) / mission.quantity) * 100)}%`
                                            }}
                                        ></div>
                                    </div>

                                    <div className="daily-goal-header">
                                        Objectif du jour
                                    </div>
                                    <div className="daily-goal-value">
                                        <Clock size={16} color="#3b82f6" />
                                        <span>{mission.daily_submissions_count || 0} / {mission.reviews_per_day} avis demandés</span>
                                    </div>
                                </div>

                                {(() => {
                                    const isLocked = mission.locked_by && new Date(mission.locked_until) > new Date();
                                    const lockedByMe = mission.locked_by === user?.id;
                                    const isDailyQuotaFull = (mission.daily_submissions_count || 0) >= mission.reviews_per_day;

                                    if (isLocked && !lockedByMe) {
                                        return (
                                            <div className="mission-status-message status-occupied">
                                                <Shield size={18} /> Mission occupée
                                            </div>
                                        );
                                    }

                                    if (isDailyQuotaFull) {
                                        return (
                                            <div className="mission-status-message status-quota-full">
                                                <Clock size={18} /> Quota du jour atteint
                                            </div>
                                        );
                                    }

                                    return (
                                        <button className="mission-action-btn">
                                            {lockedByMe ? 'Reprendre la mission' : 'Démarrer la mission'} <ArrowRight size={18} />
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
                    <h3 className="empty-state-title">Toutes les missions sont complétées !</h3>
                    <p className="empty-state-text">
                        Bravo ! Revenez plus tard pour découvrir de nouvelles opportunités de gagner de l'argent.
                    </p>
                </div>
            )}
        </DashboardLayout>
    );
};
