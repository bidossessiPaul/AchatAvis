import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { guideService } from '../../services/guideService';
import { MapPin, DollarSign, Clock, ArrowRight, Star, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const GuideDashboard: React.FC = () => {
    const [missions, setMissions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

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
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Prêt à gagner de l'argent ?</h2>
                        <p style={{ opacity: 0.9, maxWidth: '500px' }}>
                            Sélectionnez une mission ci-dessous, postez votre avis sur Google Business et gagnez jusqu'à 2.50€ par contribution validée.
                        </p>
                    </div>
                    <Star style={{ position: 'absolute', right: '-1rem', top: '-1rem', opacity: 0.1, width: '150px', height: '150px' }} />
                </div>
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
                                        <DollarSign size={14} /> 2.00€
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

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                                    <MapPin size={16} />
                                    <span>{mission.sector || 'Secteur non précisé'}</span>
                                </div>

                                <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                                        Progression de la mission
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#111827', fontWeight: 600 }}>
                                        <Star size={18} color="#f59e0b" fill="#f59e0b" />
                                        <span>{mission.reviews_received || 0} / {mission.quantity} avis postés</span>
                                    </div>
                                </div>

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
                                    Démarrer la mission <ArrowRight size={18} />
                                </button>
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
