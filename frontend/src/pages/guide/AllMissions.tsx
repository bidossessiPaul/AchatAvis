import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { guideService } from '../../services/guideService';
import { MapPin, DollarSign, Clock, ArrowRight, Shield, Filter, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import './GuideDashboard.css'; // Reuse existing styles

export const AllMissions: React.FC = () => {
    const [missions, setMissions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSector, setSelectedSector] = useState<string>('all');
    const [onlyAvailable, setOnlyAvailable] = useState<boolean>(true); // Default to showing only available
    const [searchQuery, setSearchQuery] = useState('');

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

    // Extract unique sectors
    const sectors = useMemo(() => {
        const sectorSet = new Set(missions.map(m => m.sector).filter(Boolean));
        return Array.from(sectorSet).sort();
    }, [missions]);

    // Filter missions
    const filteredMissions = useMemo(() => {
        return missions.filter(mission => {
            // Sector Filter
            if (selectedSector !== 'all' && mission.sector !== selectedSector) return false;

            // Search Filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                if (!mission.company_name?.toLowerCase().includes(query) &&
                    !mission.city?.toLowerCase().includes(query)) {
                    return false;
                }
            }

            // Quota Filter
            // If onlyAvailable is true, we HIDE missions where daily quota is reached
            const isDailyQuotaFull = (mission.daily_submissions_count || 0) >= mission.reviews_per_day;
            if (onlyAvailable && isDailyQuotaFull) return false;

            return true;
        });
    }, [missions, selectedSector, searchQuery, onlyAvailable]);

    return (
        <DashboardLayout title="Toutes les Missions">
            <div className="filters-container" style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem', border: '1px solid #f3f4f6' }}>
                <div className="filters-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>

                    {/* Search */}
                    <div className="search-wrapper" style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                        <input
                            type="text"
                            placeholder="Rechercher une entreprise ou ville..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 10px 10px 36px',
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                                fontSize: '0.9rem'
                            }}
                        />
                    </div>

                    {/* Sector Filter */}
                    <div className="filter-group">
                        <select
                            value={selectedSector}
                            onChange={(e) => setSelectedSector(e.target.value)}
                            style={{
                                padding: '10px',
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                                fontSize: '0.9rem',
                                minWidth: '150px'
                            }}
                        >
                            <option value="all">Tous les secteurs</option>
                            {sectors.map(sector => (
                                <option key={sector} value={sector}>{sector}</option>
                            ))}
                        </select>
                    </div>

                    {/* Quota Toggle */}
                    <div className="filter-toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="checkbox"
                            id="onlyAvailable"
                            checked={onlyAvailable}
                            onChange={(e) => setOnlyAvailable(e.target.checked)}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--guide-primary)' }}
                        />
                        <label htmlFor="onlyAvailable" style={{ fontSize: '0.9rem', color: '#4b5563', cursor: 'pointer' }}>
                            Quotas disponibles uniquement
                        </label>
                    </div>
                </div>
            </div>

            <div className="missions-header">
                <h3 className="missions-header-title">
                    {filteredMissions.length} mission{filteredMissions.length !== 1 ? 's' : ''} trouvée{filteredMissions.length !== 1 ? 's' : ''}
                </h3>
            </div>

            {isLoading ? (
                <div style={{ padding: '80px 0' }}>
                    <LoadingSpinner text="Chargement des missions..." size="lg" className="theme-guide" />
                </div>
            ) : filteredMissions.length > 0 ? (
                <div className="missions-grid">
                    {filteredMissions.map((mission) => (
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
                                        <Clock size={16} color="var(--guide-primary)" />
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
                        <Filter size={40} color="#9ca3af" />
                    </div>
                    <h3 className="empty-state-title">Aucune mission trouvée</h3>
                    <p className="empty-state-text">
                        Essayez de modifier vos filtres pour voir plus de résultats.
                    </p>
                </div>
            )}
        </DashboardLayout>
    );
};
