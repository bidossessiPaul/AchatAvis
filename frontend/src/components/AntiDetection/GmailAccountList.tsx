import React, { useEffect } from 'react';
import { useAntiDetectionStore } from '../../context/antiDetectionStore';
import { useAuthStore } from '../../context/authStore';
import { Trash2, Shield, ExternalLink, Mail, Award, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';
import toast from 'react-hot-toast';

export const GmailAccountList: React.FC<{ onAddClick: () => void }> = ({ onAddClick }) => {
    const { user } = useAuthStore();
    const { gmailAccounts, fetchGmailAccounts, deleteGmailAccount, loading } = useAntiDetectionStore();

    useEffect(() => {
        if (user) {
            fetchGmailAccounts(user.id);
        }
    }, [user, fetchGmailAccounts]);

    const handleDelete = async (accountId: number) => {
        if (!user || !window.confirm('Supprimer ce compte Gmail ?')) return;
        try {
            await deleteGmailAccount(accountId, user.id);
            toast.success('Compte supprimé');
            fetchGmailAccounts(user.id);
        } catch (error: any) {
            toast.error('Erreur lors de la suppression');
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
                                {account.is_verified && (
                                    <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'white', borderRadius: '50%', padding: '2px' }}>
                                        <CheckCircle2 size={14} color="#10b981" fill="#fff" />
                                    </div>
                                )}
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{account.email}</span>
                                    <span style={{
                                        fontSize: '0.65rem',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        padding: '0.125rem 0.5rem',
                                        borderRadius: '4px',
                                        background: account.account_level === 'gold' ? '#fef3c7' : (account.account_level === 'silver' ? '#f1f5f9' : '#ecfdf5'),
                                        color: account.account_level === 'gold' ? '#92400e' : (account.account_level === 'silver' ? '#475569' : '#065f46')
                                    }}>
                                        {account.account_level}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: '#64748b' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Shield size={12} /> Trust Score: <b>{account.trust_score}%</b>
                                    </span>
                                    {account.local_guide_level > 1 && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <Award size={12} /> Local Guide Niv. {account.local_guide_level}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {account.maps_profile_url && (
                                    <a
                                        href={account.maps_profile_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#94a3b8', padding: '0.5rem', borderRadius: '0.5rem' }}
                                        title="Voir le profil Maps"
                                    >
                                        <ExternalLink size={18} />
                                    </a>
                                )}
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

            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fffbeb', borderRadius: '0.75rem', border: '1px solid #fef3c7', display: 'flex', gap: '1rem' }}>
                <AlertCircle size={20} color="#d97706" style={{ flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#92400e', lineHeight: 1.5 }}>
                    <b>Important :</b> Plus vos comptes Gmail sont anciens et actifs sur Google Maps (avis réels, photos), plus votre "Trust Score" sera élevé, vous ouvrant l'accès à des missions mieux rémunérées.
                </p>
            </div>
        </div>
    );
};
