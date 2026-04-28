import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAntiDetectionStore } from '../../context/antiDetectionStore';

interface GmailVerificationBannerProps {
    userId: string | undefined;
}

// Date limite de vérification Gmail (1er mai 2026)
const DEADLINE = new Date('2026-05-01T00:00:00');

export const GmailVerificationBanner: React.FC<GmailVerificationBannerProps> = ({ userId }) => {
    const navigate = useNavigate();
    const { gmailAccounts, fetchGmailAccounts } = useAntiDetectionStore();

    useEffect(() => {
        if (userId) {
            fetchGmailAccounts(userId);
        }
    }, [userId, fetchGmailAccounts]);

    // Récupère les IDs des comptes déjà soumis (en attente de validation admin) depuis localStorage
    const submittedIds: Set<number> = (() => {
        if (!userId) return new Set();
        try {
            const raw = localStorage.getItem(`gmail_verif_submitted_${userId}`);
            return raw ? new Set(JSON.parse(raw)) : new Set();
        } catch {
            return new Set();
        }
    })();

    // Filtre : non vérifié + non supprimé + pas déjà soumis (en attente de validation)
    const unverified = gmailAccounts.filter(
        (a) =>
            a.manual_verification_status !== 'verified' &&
            !a.deleted_at &&
            !submittedIds.has(a.id)
    );

    if (unverified.length === 0) return null;

    // Détermine si on est à moins de 3 jours de la deadline → rouge urgent
    const msLeft = DEADLINE.getTime() - Date.now();
    const daysLeft = msLeft / (1000 * 60 * 60 * 24);
    const isUrgent = daysLeft < 3;

    const bannerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.875rem',
        background: isUrgent ? '#fee2e2' : '#fef3c7',
        borderLeft: `4px solid ${isUrgent ? '#dc2626' : '#d97706'}`,
        borderRadius: '8px',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
    };

    return (
        <div style={bannerStyle} role="alert">
            <AlertTriangle size={20} color={isUrgent ? '#dc2626' : '#d97706'} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500, color: isUrgent ? '#7f1d1d' : '#78350f' }}>
                {unverified.length} compte{unverified.length > 1 ? 's' : ''} Gmail non vérifié{unverified.length > 1 ? 's' : ''} — Délai&nbsp;: 1er mai 2026. Après cette date, ces comptes seront automatiquement suspendus.
            </span>
            <button
                onClick={() => navigate('/guide/my-gmails')}
                style={{
                    flexShrink: 0,
                    background: isUrgent ? '#dc2626' : '#d97706',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.45rem 0.9rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                }}
            >
                Vérifier mes comptes
            </button>
        </div>
    );
};
