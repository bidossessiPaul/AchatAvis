import React from 'react';
import { ShieldAlert, Mail, ArrowLeft, ExternalLink, MessageCircle } from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';

const SuspendedPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    // Get data from location.state (passed from Login page) or searchParams (from global interceptor)
    const userName = location.state?.userName || searchParams.get('userName');
    const detectedCountry = location.state?.country || searchParams.get('country');
    const suspension = location.state?.suspension;

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at top right, #1e293b, #0f172a)',
            padding: '1.5rem',
            fontFamily: "'Outfit', 'Inter', sans-serif",
            color: '#f8fafc'
        }}>
            {/* Ambient Background Glows */}
            <div style={{
                position: 'fixed', top: '10%', right: '10%', width: '400px', height: '400px',
                background: 'rgba(239, 68, 68, 0.05)', filter: 'blur(100px)', borderRadius: '50%', zIndex: 0
            }} />
            <div style={{
                position: 'fixed', bottom: '10%', left: '10%', width: '300px', height: '300px',
                background: 'rgba(56, 189, 248, 0.05)', filter: 'blur(100px)', borderRadius: '50%', zIndex: 0
            }} />

            <div style={{
                maxWidth: '540px',
                width: '100%',
                background: 'rgba(30, 41, 59, 0.7)',
                backdropFilter: 'blur(20px)',
                borderRadius: '2.5rem',
                padding: '3.5rem 3rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                position: 'relative',
                zIndex: 1
            }}>
                <div style={{
                    width: '96px',
                    height: '96px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
                    borderRadius: '2.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 2.5rem',
                    color: 'white',
                    boxShadow: '0 20px 40px -10px rgba(239, 68, 68, 0.3)',
                    position: 'relative'
                }}>
                    <ShieldAlert size={48} strokeWidth={1.5} />
                    <div style={{
                        position: 'absolute', inset: -4, borderRadius: '2.5rem',
                        border: '2px solid rgba(239, 68, 68, 0.2)', animation: 'pulse 2s infinite'
                    }} />
                </div>

                <h1 style={{
                    fontSize: '2.25rem',
                    fontWeight: 900,
                    marginBottom: '1rem',
                    background: 'linear-gradient(to bottom, #fff, #94a3b8)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.04em'
                }}>
                    Accès Restreint
                </h1>

                <div style={{
                    color: '#94a3b8',
                    lineHeight: '1.7',
                    marginBottom: '3rem',
                    fontSize: '1.125rem'
                }}>
                    {userName ? (
                        <p style={{ margin: 0 }}>
                            Bonjour <span style={{ color: '#fff', fontWeight: 600 }}>{userName}</span>.
                            Votre compte fait l'objet d'une suspension temporaire suite à une violation de nos conditions d'utilisation ou par mesure de sécurité.
                        </p>
                    ) : (
                        <p style={{ margin: 0 }}>
                            Votre compte a été suspendu par mesure de sécurité ou suite à une détection automatique d'activité inhabituelle.
                        </p>
                    )}

                    {suspension && (
                        <div style={{
                            marginTop: '2rem',
                            padding: '1.5rem',
                            background: 'rgba(239, 68, 68, 0.05)',
                            borderRadius: '1.25rem',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            textAlign: 'left'
                        }}>
                            <div style={{ marginBottom: '1rem' }}>
                                <span style={{
                                    display: 'inline-block',
                                    padding: '0.375rem 0.875rem',
                                    background: suspension.badge_color || '#ef4444',
                                    color: '#fff',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem',
                                    fontWeight: 700,
                                    marginBottom: '0.75rem'
                                }}>
                                    {suspension.icon_emoji || '🚫'} {suspension.level_name || `Niveau ${suspension.level_number}`}
                                </span>
                            </div>

                            <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}>
                                <strong style={{ color: '#cbd5e1' }}>Raison :</strong>{' '}
                                <span style={{ color: '#94a3b8' }}>{suspension.reason_details || 'Non spécifiée'}</span>
                            </p>

                            {suspension.started_at && (
                                <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}>
                                    <strong style={{ color: '#cbd5e1' }}>Début :</strong>{' '}
                                    <span style={{ color: '#94a3b8' }}>
                                        {new Date(suspension.started_at).toLocaleDateString('fr-FR', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </p>
                            )}

                            {suspension.ends_at && (
                                <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}>
                                    <strong style={{ color: '#cbd5e1' }}>Fin prévue :</strong>{' '}
                                    <span style={{ color: '#94a3b8' }}>
                                        {new Date(suspension.ends_at).toLocaleDateString('fr-FR', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </p>
                            )}

                            {suspension.days_total && (
                                <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}>
                                    <strong style={{ color: '#cbd5e1' }}>Durée :</strong>{' '}
                                    <span style={{ color: '#94a3b8' }}>{suspension.days_total} jour(s)</span>
                                </p>
                            )}
                        </div>
                    )}

                    {detectedCountry && (
                        <div style={{
                            marginTop: '2rem',
                            padding: '1rem',
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '1.25rem',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            fontSize: '0.875rem'
                        }}>
                            <span style={{ color: '#64748b' }}>Région d'origine :</span>
                            <span style={{ color: '#ef4444', fontWeight: 700, letterSpacing: '0.05em' }}>{detectedCountry}</span>
                        </div>
                    )}
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                    <a
                        href="mailto:contact@achatavis.com?subject=Réclamation Suspension Compte"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.875rem',
                            background: '#fff',
                            color: '#0f172a',
                            padding: '1.125rem',
                            borderRadius: '1.25rem',
                            textDecoration: 'none',
                            fontWeight: 800,
                            fontSize: '1rem',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'scale(1.02)';
                            e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.2)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                        }}
                    >
                        <Mail size={20} />
                        Déposer une réclamation
                    </a>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <button
                            onClick={() => navigate('/login')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.625rem',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: '#94a3b8',
                                padding: '1rem',
                                borderRadius: '1.25rem',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.color = '#fff';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                e.currentTarget.style.color = '#94a3b8';
                            }}
                        >
                            <ArrowLeft size={16} />
                            Retour
                        </button>

                        <a
                            href="https://achatavis.com/terms"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.625rem',
                                background: 'transparent',
                                color: '#64748b',
                                padding: '1rem',
                                borderRadius: '1.25rem',
                                border: '1px solid transparent',
                                fontWeight: 600,
                                textDecoration: 'none',
                                fontSize: '0.875rem',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            Conditions <ExternalLink size={14} />
                        </a>
                    </div>
                </div>

                <div style={{ marginTop: '3.5rem', paddingTop: '2rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', opacity: 0.5 }}>
                        <div style={{ textAlign: 'left' }}>
                            <p style={{ fontSize: '0.625rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.25rem' }}>
                                Ref ID
                            </p>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, margin: 0 }}>
                                #{Math.random().toString(36).substr(2, 6).toUpperCase()}
                            </p>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <p style={{ fontSize: '0.625rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.25rem' }}>
                                Status
                            </p>
                            <p style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700, margin: 0 }}>
                                RESTRICTED
                            </p>
                        </div>
                    </div>
                </div>
            </div >

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(1.1); opacity: 0; }
                }
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
            `}} />
        </div >
    );
};

export default SuspendedPage;
