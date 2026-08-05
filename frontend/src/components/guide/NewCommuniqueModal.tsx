// Modal affiché au dashboard guide quand un communiqué publié n'a pas encore
// été lu. Remplace l'ancien email de notification : dès que le guide ferme le
// modal ou clique pour lire, TOUS les communiqués publiés sont marqués comme
// lus côté serveur — il ne le reverra donc plus, même sur un autre appareil.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Megaphone, ShieldCheck, FileText, AlertTriangle, BookOpen,
    Info, Award, Bell, Wallet, ArrowRight, X
} from 'lucide-react';
import { communiquesApi } from '../../services/api';

interface Communique {
    id: string;
    title: string;
    subtitle: string | null;
    date_label: string | null;
    icon: string;
    accent_color: string;
}

const iconFor = (key: string, size = 28) => {
    const map: Record<string, React.ReactNode> = {
        Megaphone: <Megaphone size={size} />,
        ShieldCheck: <ShieldCheck size={size} />,
        FileText: <FileText size={size} />,
        AlertTriangle: <AlertTriangle size={size} />,
        BookOpen: <BookOpen size={size} />,
        Info: <Info size={size} />,
        Award: <Award size={size} />,
        Bell: <Bell size={size} />,
        Wallet: <Wallet size={size} />,
    };
    return map[key] || <Megaphone size={size} />;
};

export const NewCommuniqueModal: React.FC = () => {
    const [communique, setCommunique] = useState<Communique | null>(null);
    const [othersCount, setOthersCount] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        communiquesApi.unread()
            .then(({ communique, unread_count }) => {
                if (communique) {
                    setCommunique(communique);
                    setOthersCount(Math.max(0, unread_count - 1));
                }
            })
            .catch(() => { /* silencieux : le modal est un rappel, pas un bloquant */ });
    }, []);

    if (!communique) return null;

    const dismiss = () => {
        // Marqué lu immédiatement : le modal ne doit apparaître qu'une seule fois
        communiquesApi.markSeen().catch(() => { /* rejoué à la prochaine ouverture */ });
        setCommunique(null);
    };

    const goToCommuniques = () => {
        dismiss();
        navigate('/guide/communiques');
    };

    const accent = communique.accent_color || '#0369a1';

    return (
        <div
            style={{
                // 2001 : passe devant le modal « nouvelle vidéo repost » (2000)
                // quand les deux se déclenchent à la même connexion, et reste
                // derrière le rappel Gmail (3000), qui est bloquant.
                position: 'fixed', inset: 0, zIndex: 2001,
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
                    background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                    padding: '1.75rem 1.5rem', borderRadius: '1.25rem 1.25rem 0 0',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 0.75rem', color: '#fff'
                    }}>
                        {iconFor(communique.icon)}
                    </div>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.15rem' }}>
                        Nouveau communiqué
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        L'équipe AchatAvis a une information importante pour vous
                    </div>
                </div>

                <div style={{ padding: '1.5rem' }}>
                    <div style={{
                        border: `2px solid ${accent}`, borderRadius: '1rem', padding: '1rem 1.25rem',
                        background: `${accent}0d`
                    }}>
                        <div style={{
                            fontSize: '0.7rem', fontWeight: 700, color: accent,
                            textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px'
                        }}>
                            Communiqué officiel{communique.date_label ? ` · ${communique.date_label}` : ''}
                        </div>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                            {communique.title}
                        </div>
                        {communique.subtitle && (
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.3rem' }}>
                                {communique.subtitle}
                            </div>
                        )}
                    </div>

                    {othersCount > 0 && (
                        <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.85rem', textAlign: 'center' }}>
                            {othersCount === 1
                                ? '1 autre communiqué vous attend également.'
                                : `${othersCount} autres communiqués vous attendent également.`}
                        </div>
                    )}

                    <button
                        onClick={goToCommuniques}
                        style={{
                            width: '100%', marginTop: '1.25rem', padding: '0.85rem 1.25rem',
                            borderRadius: '0.75rem', border: 'none', cursor: 'pointer',
                            background: `linear-gradient(135deg, ${accent}, ${accent}dd)`, color: '#fff',
                            fontWeight: 800, fontSize: '0.95rem', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                        }}
                    >
                        Lire le communiqué <ArrowRight size={18} />
                    </button>
                    <button
                        onClick={dismiss}
                        style={{
                            width: '100%', marginTop: '0.6rem', padding: '0.7rem',
                            borderRadius: '0.75rem', border: '1px solid #e2e8f0', cursor: 'pointer',
                            background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '0.85rem'
                        }}
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
};
