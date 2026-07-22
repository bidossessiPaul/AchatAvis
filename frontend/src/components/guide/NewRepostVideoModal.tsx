// Modal auto affiché à la connexion du guide quand une nouvelle vidéo repost
// est disponible et qu'il ne l'a pas encore postée. Affiché une fois par
// session de navigation et par vidéo (sessionStorage) : il réapparaît à
// chaque nouvelle connexion tant que la mission n'est pas accomplie.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, TrendingUp, Eye, ArrowRight, X } from 'lucide-react';
import { guideRepostApi } from '../../services/repost';

type Alert = NonNullable<Awaited<ReturnType<typeof guideRepostApi.newVideoAlert>>>;

const euros = (cents: number) => (cents / 100).toFixed(2).replace('.', ',') + '€';

export const NewRepostVideoModal: React.FC = () => {
    const [alert, setAlert] = useState<Alert | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        guideRepostApi.newVideoAlert()
            .then(a => {
                if (a && !sessionStorage.getItem(`repost_video_alert_${a.video.id}`)) {
                    setAlert(a);
                }
            })
            .catch(() => { /* silencieux : le modal est un bonus, pas bloquant */ });
    }, []);

    if (!alert) return null;

    const dismiss = () => {
        sessionStorage.setItem(`repost_video_alert_${alert.video.id}`, '1');
        setAlert(null);
    };

    const goToMission = () => {
        dismiss();
        navigate('/guide/repost');
    };

    const { video, earnings } = alert;
    const hasBase = earnings.max_base_cents > 0;

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 2000,
                background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
            }}
            onClick={dismiss}
        >
            <div
                style={{
                    background: 'white', borderRadius: '1.25rem', maxWidth: 460, width: '100%',
                    maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative'
                }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={dismiss}
                    style={{
                        position: 'absolute', top: '0.9rem', right: '0.9rem', zIndex: 1,
                        background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%',
                        width: 32, height: 32, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer', color: '#64748b'
                    }}
                >
                    <X size={18} />
                </button>

                <div style={{
                    background: 'linear-gradient(135deg, #0a0a0a, #1e293b)',
                    padding: '1.75rem 1.5rem', borderRadius: '1.25rem 1.25rem 0 0',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: '50%', background: '#FF991F',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 0.75rem'
                    }}>
                        <Video size={28} color="#fff" />
                    </div>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.15rem' }}>
                        Nouvelle mission vidéo !
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        Une vidéo à reposter vous attend
                    </div>
                </div>

                <div style={{ padding: '1.5rem' }}>
                    <div style={{
                        border: '2px solid #FF991F', borderRadius: '1rem', padding: '1rem 1.25rem',
                        background: 'linear-gradient(135deg, #fff7ed, #fffbeb)'
                    }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>{video.title}</div>
                        {!!video.platforms && (
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.3rem' }}>
                                Plateformes : <strong>{video.platforms}</strong>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1.1rem' }}>
                        {hasBase && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', color: '#334155' }}>
                                <TrendingUp size={16} color="#059669" style={{ flexShrink: 0 }} />
                                <span>
                                    Gagnez <strong style={{ color: '#059669' }}>
                                        {earnings.min_base_cents === earnings.max_base_cents
                                            ? euros(earnings.max_base_cents)
                                            : `${euros(earnings.min_base_cents)} à ${euros(earnings.max_base_cents)}`}
                                    </strong> dès que votre repost est validé, selon vos abonnés
                                </span>
                            </div>
                        )}
                        {earnings.max_view_bonus_cents > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', color: '#334155' }}>
                                <Eye size={16} color="#FF991F" style={{ flexShrink: 0 }} />
                                <span>
                                    Puis jusqu'à <strong style={{ color: '#FF991F' }}>{euros(earnings.max_view_bonus_cents)}</strong> de
                                    bonus selon les vues de votre vidéo
                                </span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={goToMission}
                        style={{
                            width: '100%', marginTop: '1.25rem', padding: '0.85rem 1.25rem',
                            borderRadius: '0.75rem', border: 'none', cursor: 'pointer',
                            background: 'linear-gradient(135deg, #FF991F, #f97316)', color: '#fff',
                            fontWeight: 800, fontSize: '0.95rem', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                        }}
                    >
                        Voir la mission <ArrowRight size={18} />
                    </button>
                    <button
                        onClick={dismiss}
                        style={{
                            width: '100%', marginTop: '0.6rem', padding: '0.7rem',
                            borderRadius: '0.75rem', border: '1px solid #e2e8f0', cursor: 'pointer',
                            background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '0.85rem'
                        }}
                    >
                        Plus tard
                    </button>
                </div>
            </div>
        </div>
    );
};
