import React, { useEffect } from 'react';
import { useAntiDetectionStore } from '../../context/antiDetectionStore';
import { useAuthStore } from '../../context/authStore';
import { Trash2, Mail, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { Button } from '../common/Button';
import Swal, { showConfirm, showSuccess, showError } from '../../utils/Swal';

export const GmailAccountList: React.FC<{ onAddClick: () => void }> = ({ onAddClick }) => {
    const { user } = useAuthStore();
    const { gmailAccounts, fetchGmailAccounts, deleteGmailAccount, updateGmailAccount, loading } = useAntiDetectionStore();

    useEffect(() => {
        if (user) {
            fetchGmailAccounts(user.id);
        }
    }, [user, fetchGmailAccounts]);

    const handleDelete = async (accountId: number) => {
        if (!user) return;

        const result = await showConfirm(
            'Supprimer ce compte ?',
            'Cette action est irréversible et supprimera également l\'historique associé.'
        );

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
                if (!value.includes('google.com/maps/contrib')) {
                    return 'Le lien doit provenir de Google Maps (google.com/maps/contrib/...)';
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
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
                        <div key={account.id} style={{
                            background: 'white',
                            padding: '1.25rem',
                            borderRadius: '1rem',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1.5rem',
                            transition: 'all 0.2s'
                        }}>
                            <div style={{ position: 'relative' }}>
                                {account.avatar_url ? (
                                    <img src={account.avatar_url} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Mail size={20} color="#94a3b8" />
                                    </div>
                                )}
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{account.email}</span>
                                    {(account.is_blocked || !account.maps_profile_url) && (
                                        <span style={{ fontSize: '0.75rem', background: '#fee2e2', color: '#ef4444', padding: '0.1rem 0.5rem', borderRadius: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
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
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        Compte actif • Prêt pour les avis
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
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
