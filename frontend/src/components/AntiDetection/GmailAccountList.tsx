import React, { useEffect, useRef, useState } from 'react';
import { useAntiDetectionStore } from '../../context/antiDetectionStore';
import { useAuthStore } from '../../context/authStore';
import { Trash2, Mail, AlertTriangle, Link as LinkIcon, Trophy, CheckCircle, ShieldCheck, Upload, X } from 'lucide-react';
import api from '../../services/api';

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

    // État modal vérification Gmail
    const [verifyingAccount, setVerifyingAccount] = useState<any | null>(null);
    const [verifyFile, setVerifyFile] = useState<File | null>(null);
    const [verifyMapsUrl, setVerifyMapsUrl] = useState('');
    const [verifyLoading, setVerifyLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // IDs des comptes déjà soumis (persistés en localStorage pour survivre au refresh)
    const LS_KEY = `gmail_verif_submitted_${user?.id ?? ''}`;
    const [submittedIds, setSubmittedIds] = useState<Set<number>>(() => {
        try {
            const raw = localStorage.getItem(`gmail_verif_submitted_${user?.id ?? ''}`);
            return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
        } catch { return new Set(); }
    });

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

    const openVerifyModal = (account: any) => {
        setVerifyingAccount(account);
        setVerifyFile(null);
        setVerifyMapsUrl('');
    };

    const closeVerifyModal = () => {
        setVerifyingAccount(null);
        setVerifyFile(null);
        setVerifyMapsUrl('');
    };

    const handleVerifySubmit = async () => {
        if (!verifyFile) { showError('Capture requise', 'Sélectionnez une capture d\'écran'); return; }
        if (!verifyMapsUrl.trim()) { showError('Lien requis', 'Collez votre lien profil Google Maps'); return; }
        setVerifyLoading(true);
        try {
            const fd = new FormData();
            fd.append('screenshot', verifyFile);
            fd.append('maps_profile_url', verifyMapsUrl.trim());
            await api.post(`/anti-detection/gmail-accounts/${verifyingAccount.id}/verify`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            showSuccess('Soumis pour vérification', 'Un admin examinera votre dossier sous 48h.');
            // Mémoriser l'ID soumis pour changer l'affichage du bouton
            const newIds = new Set(submittedIds).add(verifyingAccount.id);
            setSubmittedIds(newIds);
            localStorage.setItem(LS_KEY, JSON.stringify([...newIds]));
            closeVerifyModal();
            if (user) fetchGmailAccounts(user.id);
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        } finally {
            setVerifyLoading(false);
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
                                        {/* Boutons d'action sur chaque carte */}
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                                            {/* Vérifier ce compte Gmail */}
                                            {account.manual_verification_status === 'verified' ? (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#dcfce7', color: '#166534', border: '1px solid #a7f3d0', padding: '0.3rem 0.7rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                    <ShieldCheck size={13} />
                                                    Mail vérifié
                                                </span>
                                            ) : submittedIds.has(account.id) ? (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '0.3rem 0.7rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', cursor: 'default' }}>
                                                    <ShieldCheck size={13} />
                                                    En attente de validation par un admin
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => openVerifyModal(account)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#dc2626', color: '#fff', border: 'none', padding: '0.3rem 0.7rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                >
                                                    <ShieldCheck size={13} />
                                                    Vérifier ce mail
                                                </button>
                                            )}

                                            {/* Vérifier mon niveau */}
                                            {onVerifyLevel && (
                                                <button
                                                    onClick={() => (account.validated_reviews_count || 0) >= 5 ? onVerifyLevel(account.id) : null}
                                                    disabled={(account.validated_reviews_count || 0) < 5}
                                                    title={(account.validated_reviews_count || 0) < 5 ? `Encore ${5 - (account.validated_reviews_count || 0)} avis validés requis` : 'Soumettre votre niveau'}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: (account.validated_reviews_count || 0) >= 5 ? '#fef3c7' : '#f1f5f9', color: (account.validated_reviews_count || 0) >= 5 ? '#92400e' : '#94a3b8', border: `1px solid ${(account.validated_reviews_count || 0) >= 5 ? '#fde68a' : '#e2e8f0'}`, padding: '0.3rem 0.7rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600, cursor: (account.validated_reviews_count || 0) >= 5 ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
                                                >
                                                    <Trophy size={13} />
                                                    Vérifier mon niveau
                                                </button>
                                            )}
                                        </div>
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

            {/* Modal vérification Gmail */}
            {verifyingAccount && (
                <div onClick={closeVerifyModal} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '1.25rem', padding: '1.5rem', width: '100%', maxWidth: 480, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ShieldCheck size={18} color="#dc2626" />
                                Vérifier ce compte Gmail
                            </h3>
                            <button onClick={closeVerifyModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
                        </div>

                        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#92400e' }}>
                            <p style={{ margin: '0 0 0.75rem', fontWeight: 700 }}>
                                Avant de soumettre <strong>{verifyingAccount.email}</strong>, vérifiez que les 3 conditions suivantes sont remplies :
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                    <span style={{ fontWeight: 700, flexShrink: 0 }}>1.</span>
                                    <span><strong>Nom d'affichage français</strong> — Le nom du compte doit paraître français ou international (ex : Jean Dupont, Sophie Martin). Les noms typiquement régionaux (béninois, togolais, ivoiriens...) sont refusés.</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                    <span style={{ fontWeight: 700, flexShrink: 0 }}>2.</span>
                                    <span><strong>Anciens avis masqués</strong> — Archivez ou supprimez les avis sur des entreprises/lieux au Bénin, et désactivez la visibilité de votre historique si votre localisation était en Afrique.</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                    <span style={{ fontWeight: 700, flexShrink: 0 }}>3.</span>
                                    <span><strong>Photo de profil neutre</strong> — Utilisez une image sobre (paysage, illustration neutre). Pas de selfie, pas de photo de vous, pas d'image floue ou bizarre.</span>
                                </div>
                            </div>
                            <p style={{ margin: '0.75rem 0 0', fontSize: '0.78rem', fontStyle: 'italic' }}>
                                Soumettez une capture prouvant que le compte est conforme + votre lien profil Google Maps.
                            </p>
                        </div>

                        {/* Upload capture */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                                Capture d'écran de la boîte mail *
                            </label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                style={{ border: `2px dashed ${verifyFile ? '#059669' : '#cbd5e1'}`, borderRadius: 8, padding: '1rem', textAlign: 'center', cursor: 'pointer', background: verifyFile ? '#f0fdf4' : '#f8fafc' }}
                            >
                                {verifyFile ? (
                                    <span style={{ color: '#059669', fontWeight: 600, fontSize: '0.85rem' }}>✓ {verifyFile.name}</span>
                                ) : (
                                    <span style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                                        <Upload size={16} /> Cliquez pour sélectionner (JPG, PNG, WEBP — max 5 Mo)
                                    </span>
                                )}
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={e => setVerifyFile(e.target.files?.[0] || null)} />
                        </div>

                        {/* Lien Maps */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                                Lien profil Google Maps *
                            </label>
                            <input
                                type="url"
                                value={verifyMapsUrl}
                                onChange={e => setVerifyMapsUrl(e.target.value)}
                                placeholder="https://www.google.com/maps/contrib/..."
                                style={{ width: '100%', padding: '0.65rem 0.85rem', border: `2px solid ${verifyMapsUrl ? '#059669' : '#e2e8f0'}`, borderRadius: 8, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={closeVerifyModal} style={{ flex: 1, padding: '0.65rem', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#475569' }}>
                                Annuler
                            </button>
                            <button onClick={handleVerifySubmit} disabled={verifyLoading} style={{ flex: 1, padding: '0.65rem', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', cursor: verifyLoading ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: verifyLoading ? 0.7 : 1 }}>
                                {verifyLoading ? 'Envoi...' : 'Soumettre'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
