import React, { useEffect } from 'react';
import { useAntiDetectionStore } from '../../context/antiDetectionStore';
import { useAuthStore } from '../../context/authStore';
import { Trash2, Mail } from 'lucide-react';
import { Button } from '../common/Button';
import { showConfirm, showSuccess, showError } from '../../utils/Swal';

export const GmailAccountList: React.FC<{ onAddClick: () => void }> = ({ onAddClick }) => {
    const { user } = useAuthStore();
    const { gmailAccounts, fetchGmailAccounts, deleteGmailAccount, loading } = useAntiDetectionStore();

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
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    Compte actif • Prêt pour les avis
                                </div>
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
