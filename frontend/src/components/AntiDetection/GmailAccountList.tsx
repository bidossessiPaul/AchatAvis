import React, { useEffect } from 'react';
import { useAntiDetectionStore } from '../../context/antiDetectionStore';
import { useAuthStore } from '../../context/authStore';
import { Trash2, Mail, AlertTriangle, Link as LinkIcon, Trophy, CheckCircle } from 'lucide-react';

const LEVEL_BADGE_IMAGES: Record<number, string> = {
    4: 'https://services.google.com/fh/files/helpcenter/points-badge_level_four.png',
    5: 'https://services.google.com/fh/files/helpcenter/points-badges_level_five.png',
    6: 'https://services.google.com/fh/files/helpcenter/points-badges_level_six.png',
    7: 'https://services.google.com/fh/files/helpcenter/points-badges_level_seven.png',
    8: 'https://services.google.com/fh/files/helpcenter/points-badges_level_eight.png',
    9: 'https://services.google.com/fh/files/helpcenter/points-badges_level_nine.png',
    10: 'https://services.google.com/fh/files/helpcenter/points-badges_level_ten.png',
};
import { Button } from '../common/Button';
import Swal, { showSuccess, showError } from '../../utils/Swal';

interface GmailAccountListProps {
    onAddClick: () => void;
    onVerifyLevel?: (accountId: number) => void;
}

export const GmailAccountList: React.FC<GmailAccountListProps> = ({ onAddClick, onVerifyLevel }) => {
    const { user } = useAuthStore();
    const { gmailAccounts, fetchGmailAccounts, deleteGmailAccount, updateGmailAccount, loading } = useAntiDetectionStore();

    useEffect(() => {
        if (user) {
            fetchGmailAccounts(user.id);
        }
    }, [user, fetchGmailAccounts]);

    const handleDelete = async (accountId: number) => {
        if (!user) return;

        const result = await Swal.fire({
            title: 'Supprimer ce compte Gmail ?',
            html: `
                <div style="text-align: left; font-size: 0.9rem; line-height: 1.6;">
                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 0.75rem; padding: 1rem; margin-bottom: 1rem;">
                        <p style="color: #991b1b; font-weight: 700; margin: 0 0 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
                            ⚠️ Attention
                        </p>
                        <ul style="color: #7f1d1d; margin: 0; padding-left: 1.2rem; font-size: 0.85rem;">
                            <li>Ce compte Gmail sera <strong>retiré</strong> de votre profil</li>
                            <li>Les <strong>primes de niveau déjà reçues</strong> pour cet email ne pourront <strong>pas être réclamées à nouveau</strong>, même sur un autre compte guide</li>
                            <li>Seule une montée de niveau supérieur permettra de recevoir une nouvelle prime</li>
                        </ul>
                    </div>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Oui, supprimer',
            cancelButtonText: 'Annuler',
        });

        if (!result.isConfirmed) return;

        try {
            await deleteGmailAccount(accountId, user.id);
            showSuccess('Compte supprimé');
            fetchGmailAccounts(user.id);
        } catch (error: any) {
            showError('Erreur', 'Impossible de supprimer le compte');
        }
    };

    const handleAddLink = async (accountId: number) => {
        if (!user) return;

        const { value: url } = await Swal.fire({
            title: 'Ajout du lien profil',
            input: 'url',
            inputLabel: 'Lien vers votre profil Guide Local',
            inputPlaceholder: 'https://www.google.com/maps/contrib/...',
            html: `
                <div style="background: #f0f9ff; padding: 10px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #bae6fd;">
                    <p style="font-size: 0.85rem; color: #0369a1; margin: 0;">
                        Pour débloquer ce compte, collez le lien de votre profil Guide Local.
                        <a href="https://www.google.com/maps/contrib/" target="_blank" style="color: #0284c7; text-decoration: underline;">Trouver mon lien</a>
                    </p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Enregistrer',
            cancelButtonText: 'Annuler',
            confirmButtonColor: '#2383E2',
            inputValidator: (value) => {
                if (!value) {
                    return 'Le lien est requis !';
                }
            }
        });

        if (url) {
            try {
                await updateGmailAccount(accountId, { maps_profile_url: url });
                showSuccess('Succès', 'Profil mis à jour et compte débloqué !');
                fetchGmailAccounts(user.id);
            } catch (error: any) {
                showError('Erreur', error.response?.data?.error || 'Erreur lors de la mise à jour');
            }
        }
    };

    if (loading && gmailAccounts.length === 0) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Chargement des comptes...</div>;
    }

    return (
        <div className="gmail-account-list">
            <div className="gmails-header">
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Comptes Gmail Enregistrés</h3>
                <Button variant="secondary" size="sm" onClick={onAddClick}>Ajouter un compte</Button>
            </div>

            {gmailAccounts.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', background: '#f8fafc', borderRadius: '1rem', border: '2px dashed #e2e8f0' }}>
                    <Mail size={32} color="#94a3b8" style={{ marginBottom: '1rem' }} />
                    <p style={{ color: '#64748b', margin: 0 }}>Aucun compte Gmail enregistré pour le moment.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {gmailAccounts.map((account) => (
                        <div key={account.id} className="gmail-account-card">
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                {account.avatar_url ? (
                                    <img src={account.avatar_url} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Mail size={20} color="#94a3b8" />
                                    </div>
                                )}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="gmail-account-email-row">
                                    <span style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', wordBreak: 'break-all' }}>
                                        {account.email}
                                        {account.local_guide_level && account.local_guide_level >= 4 && LEVEL_BADGE_IMAGES[account.local_guide_level] && (
                                            <img
                                                src={LEVEL_BADGE_IMAGES[account.local_guide_level]}
                                                alt={`Niveau ${account.local_guide_level}`}
                                                title={`Local Guide Niveau ${account.local_guide_level}`}
                                                style={{ width: '22px', height: '22px', flexShrink: 0 }}
                                            />
                                        )}
                                    </span>
                                    {(account.is_blocked || !account.maps_profile_url) && (
                                        <span style={{ fontSize: '0.75rem', background: '#fee2e2', color: '#ef4444', padding: '0.1rem 0.5rem', borderRadius: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}>
                                            <AlertTriangle size={12} />
                                            Bloqué
                                        </span>
                                    )}
                                </div>

                                {(account.is_blocked || !account.maps_profile_url) ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <p style={{ fontSize: '0.8rem', color: '#ef4444', margin: 0, fontWeight: 500 }}>
                                            Action requise : Lien profil manquant
                                        </p>
                                        <button
                                            onClick={() => handleAddLink(account.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                background: '#2383E2',
                                                color: 'white',
                                                border: 'none',
                                                padding: '0.4rem 0.8rem',
                                                borderRadius: '0.5rem',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                width: 'fit-content'
                                            }}
                                        >
                                            <LinkIcon size={14} />
                                            Ajouter le lien du profil
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="gmail-account-status-row">
                                            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                {account.local_guide_level && account.local_guide_level >= 4 && LEVEL_BADGE_IMAGES[account.local_guide_level] ? (
                                                    <img src={LEVEL_BADGE_IMAGES[account.local_guide_level]} alt="" style={{ width: '16px', height: '16px' }} />
                                                ) : null}
                                                Niveau {account.local_guide_level || 1} • Compte actif
                                            </span>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.3rem',
                                                color: (account.validated_reviews_count || 0) >= 5 ? '#059669' : '#f59e0b',
                                                background: (account.validated_reviews_count || 0) >= 5 ? '#ecfdf5' : '#fffbeb',
                                                padding: '0.15rem 0.5rem',
                                                borderRadius: '1rem',
                                                border: (account.validated_reviews_count || 0) >= 5 ? '1px solid #a7f3d0' : '1px solid #fde68a',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                <CheckCircle size={12} />
                                                {Math.min(account.validated_reviews_count || 0, 5)}/5 avis validés
                                            </span>
                                        </div>
                                        {onVerifyLevel && (account.validated_reviews_count || 0) >= 5 && (
                                            <button
                                                onClick={() => onVerifyLevel(account.id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.4rem',
                                                    background: '#fef3c7',
                                                    color: '#92400e',
                                                    border: '1px solid #fde68a',
                                                    padding: '0.25rem 0.6rem',
                                                    borderRadius: '0.5rem',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    whiteSpace: 'nowrap',
                                                    width: 'fit-content'
                                                }}
                                            >
                                                <Trophy size={13} />
                                                Vérifier mon niveau
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                <button
                                    onClick={() => handleDelete(account.id)}
                                    style={{ color: '#ef4444', padding: '0.5rem', borderRadius: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
                                    title="Supprimer"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
