import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GmailVerificationReminderModalProps {
    // Liste des comptes Gmail non vérifiés (déjà filtrés par le parent)
    gmailAccounts: any[];
}

// Clé localStorage pour stocker le timestamp du dernier affichage
const STORAGE_KEY = 'gmailVerifLastShown';

// Intervalle minimum entre deux affichages : 2 heures en ms
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export const GmailVerificationReminderModal: React.FC<GmailVerificationReminderModalProps> = ({
    gmailAccounts,
}) => {
    const navigate = useNavigate();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Pas de comptes non vérifiés → rien à afficher
        if (gmailAccounts.length === 0) return;

        const lastShownRaw = localStorage.getItem(STORAGE_KEY);
        const lastShown = lastShownRaw ? parseInt(lastShownRaw, 10) : 0;
        const now = Date.now();

        // Affiche la modal si le délai de 2h est écoulé
        if (now - lastShown > TWO_HOURS_MS) {
            setVisible(true);
        }
    }, [gmailAccounts]);

    const handleDismiss = () => {
        // Enregistre le timestamp du dismiss pour le cooldown 2h
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
        setVisible(false);
    };

    const handleGoVerify = () => {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
        setVisible(false);
        navigate('/guide/my-gmails');
    };

    if (!visible) return null;

    const n = gmailAccounts.length;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 3000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
            }}
        >
            {/* Overlay */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(8px)',
                }}
            />

            {/* Contenu */}
            <div
                style={{
                    position: 'relative',
                    background: 'white',
                    borderRadius: '1.25rem',
                    padding: '2rem',
                    width: '100%',
                    maxWidth: '460px',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem',
                }}
            >
                {/* Icône */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div
                        style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: '#fee2e2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <ShieldCheck size={26} color="#dc2626" />
                    </div>
                </div>

                {/* Titre */}
                <h2
                    style={{
                        margin: 0,
                        fontSize: '1.2rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        textAlign: 'center',
                    }}
                >
                    Action requise — Vérification Gmail
                </h2>

                {/* Corps */}
                <p
                    style={{
                        margin: 0,
                        fontSize: '0.9rem',
                        color: '#475569',
                        lineHeight: 1.65,
                        textAlign: 'center',
                    }}
                >
                    Vous avez <strong>{n} compte{n > 1 ? 's' : ''} Gmail</strong> non vérifié{n > 1 ? 's' : ''}. Sans vérification avant le{' '}
                    <strong style={{ color: '#dc2626' }}>vendredi 1er mai 2026</strong>, {n > 1 ? 'ces comptes seront' : 'ce compte sera'} définitivement suspendu{n > 1 ? 's' : ''} et vous ne pourrez plus soumettre d'avis avec {n > 1 ? 'eux' : 'lui'}.
                </p>

                {/* Boutons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <button
                        onClick={handleGoVerify}
                        style={{
                            background: 'linear-gradient(135deg, #059669, #047857)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.75rem 1.25rem',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            width: '100%',
                        }}
                    >
                        Vérifier maintenant
                    </button>
                    <button
                        onClick={handleDismiss}
                        style={{
                            background: 'white',
                            color: '#64748b',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '0.65rem 1.25rem',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            width: '100%',
                        }}
                    >
                        Me le rappeler plus tard
                    </button>
                </div>
            </div>
        </div>
    );
};
