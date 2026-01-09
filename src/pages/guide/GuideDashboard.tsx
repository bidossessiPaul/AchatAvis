import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { guideService } from '../../services/guideService';
import { MapPin, DollarSign, Clock, ArrowRight, Star, ShieldCheck, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';

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
            <div style={{ marginBottom: '2rem' }}>
                <div style={{
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                    padding: '2rem',
                    borderRadius: '1.5rem',
                    color: 'white',
                    boxShadow: '0 10px 25px rgba(30, 27, 75, 0.2)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'white' }}>Prêt à gagner de l'argent ?</h2>
                        <p style={{ opacity: 0.9, maxWidth: '500px' }}>
                            Sélectionnez une mission ci-dessous, postez votre avis sur Google Business et gagnez jusqu'à 2.50€ par contribution validée.
                        </p>
                    </div>
                    <Star style={{ position: 'absolute', right: '-1rem', top: '-1rem', opacity: 0.1, width: '150px', height: '150px' }} />
                </div>
            </div>

            {/* Anti-Detection Alert */}
            <div
                onClick={() => navigate('/guide/anti-detection')}
                style={{
                    marginBottom: '2rem',
                    background: 'linear-gradient(to right, #fff7ed, #ffedd5)',
                    border: '1px solid #fed7aa',
                    borderRadius: '1rem',
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                    boxShadow: '0 2px 5px rgba(249, 115, 22, 0.1)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                <div style={{
                    background: '#fff',
                    padding: '0.5rem',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(249, 115, 22, 0.1)'
                }}>
                    <ShieldCheck size={24} color="#f97316" />
                </div>
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#9a3412', marginBottom: '0.2rem' }}>
                        Protégez vos gains et vos comptes !
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: '#c2410c', margin: 0 }}>
                        Découvrez nos conseils anti-détection pour éviter que vos avis ne soient supprimés par Google.
                    </p>
                </div>
                <ArrowRight size={20} color="#9a3412" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827' }}>
                    {missions.length} Missions près de chez vous
                </h3>
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="animate-spin" style={{ margin: '0 auto 1.25rem' }}>
                        <Clock size={32} color="#ff3b6a" />
                    </div>
                    <p style={{ fontWeight: 600, color: '#6b7280' }}>Recherche des meilleures missions...</p>
                </div>
            ) : missions.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {missions.map((mission) => (
                        <div
                            key={mission.id}
                            style={{
                                background: 'white',
                                borderRadius: '1.25rem',
                                border: '1px solid #f3f4f6',
                                overflow: 'hidden',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-5px)';
                                e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.08)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <div style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div style={{
                                        background: '#fff1f2',
                                        color: '#ff3b6a',
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '0.75rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                    }}>
                                        <DollarSign size={14} /> {Number(mission.payout_per_review || 1.50).toFixed(2)}€
                                    </div>
                                    <div style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
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

                                <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>
                                    {mission.company_name}
                                </h4>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                                        <span style={{ fontSize: '1.2rem' }}>{mission.sector_icon || <MapPin size={16} />}</span>
                                        <span>{mission.sector || 'Secteur non précisé'}</span>
                                    </div>
                                    <div style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        padding: '0.25rem 0.6rem',
                                        borderRadius: '0.5rem',
                                        background: mission.difficulty === 'hard' ? '#fef2f2' : (mission.difficulty === 'medium' ? '#fffbeb' : '#f0fdf4'),
                                        color: mission.difficulty === 'hard' ? '#ef4444' : (mission.difficulty === 'medium' ? '#f59e0b' : '#10b981'),
                                        border: `1px solid ${mission.difficulty === 'hard' ? '#fee2e2' : (mission.difficulty === 'medium' ? '#fef3c7' : '#dcfce7')}`
                                    }}>
                                        {mission.difficulty === 'easy' ? 'Simple' : (mission.difficulty === 'medium' ? 'Modéré' : 'Difficile')}
                                    </div>
                                </div>

                                <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Progression Totale</span>
                                        <span style={{ color: '#10b981' }}>{mission.reviews_received || 0} / {mission.quantity}</span>
                                    </div>
                                    <div style={{ width: '100%', height: '6px', background: '#e5e7eb', borderRadius: '3px', marginBottom: '1rem', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${Math.min(100, ((mission.reviews_received || 0) / mission.quantity) * 100)}%`,
                                            height: '100%',
                                            background: '#10b981',
                                            borderRadius: '3px'
                                        }}></div>
                                    </div>

                                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                                        Objectif du jour
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#111827', fontWeight: 600 }}>
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
                                            <div style={{
                                                width: '100%',
                                                padding: '1rem',
                                                borderRadius: '1rem',
                                                background: '#f3f4f6',
                                                color: '#9ca3af',
                                                fontWeight: 700,
                                                fontSize: '0.9375rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem',
                                                cursor: 'not-allowed'
                                            }}>
                                                <Shield size={18} /> Mission occupée
                                            </div>
                                        );
                                    }

                                    if (isDailyQuotaFull) {
                                        return (
                                            <div style={{
                                                width: '100%',
                                                padding: '1rem',
                                                borderRadius: '1rem',
                                                background: '#fff7ed',
                                                color: '#c2410c',
                                                fontWeight: 700,
                                                fontSize: '0.9375rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem',
                                                cursor: 'not-allowed',
                                                border: '1px solid #ffedd5'
                                            }}>
                                                <Clock size={18} /> Quota du jour atteint
                                            </div>
                                        );
                                    }

                                    return (
                                        <button
                                            onClick={() => navigate(`/guide/missions/${mission.id}`)}
                                            style={{
                                                width: '100%',
                                                padding: '1rem',
                                                borderRadius: '1rem',
                                                border: 'none',
                                                background: '#ff3b6a',
                                                color: 'white',
                                                fontWeight: 700,
                                                fontSize: '0.9375rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem',
                                                boxShadow: '0 4px 12px rgba(255, 59, 106, 0.2)'
                                            }}
                                        >
                                            {lockedByMe ? 'Reprendre la mission' : 'Démarrer la mission'} <ArrowRight size={18} />
                                        </button>
                                    );
                                })()}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ background: 'white', padding: '4rem 2rem', borderRadius: '1.5rem', textAlign: 'center', border: '1px solid #f3f4f6' }}>
                    <div style={{ background: '#f3f4f6', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <ShieldCheck size={40} color="#9ca3af" />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>Toutes les missions sont complétées !</h3>
                    <p style={{ color: '#6b7280', maxWidth: '400px', margin: '0 auto' }}>
                        Bravo ! Revenez plus tard pour découvrir de nouvelles opportunités de gagner de l'argent.
                    </p>
                </div>
            )}
        </DashboardLayout>
    );
};
