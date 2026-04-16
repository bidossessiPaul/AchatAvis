import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../context/authStore';
import { authApi } from '../../services/api';
import { ShieldCheck, Upload, Clock, LogOut, AlertCircle, CheckCircle2 } from 'lucide-react';
import { showError, showSuccess } from '../../utils/Swal';

export const IdentityVerification: React.FC = () => {
    const { user, logout, silentRefresh } = useAuthStore();
    const [verification, setVerification] = useState<any | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStatus();
    }, []);

    const loadStatus = async () => {
        setIsLoading(true);
        try {
            const res = await authApi.getIdentityVerificationStatus();
            setVerification(res.verification);
        } catch (e: any) {
            console.error('load status error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;
        const maxSize = 8 * 1024 * 1024;
        if (selected.size > maxSize) {
            showError('Fichier trop lourd', 'Taille max : 8 Mo');
            return;
        }
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowed.includes(selected.type)) {
            showError('Format non supporté', 'Utilisez JPG, PNG, WEBP ou PDF');
            return;
        }
        if (preview) URL.revokeObjectURL(preview);
        setFile(selected);
        setPreview(URL.createObjectURL(selected));
    };

    const handleSubmit = async () => {
        if (!file) return;
        setIsUploading(true);
        try {
            await authApi.submitIdentityVerification(file);
            showSuccess(
                'Document envoyé',
                'Votre document a bien été reçu. Nous vérifierons votre compte dans les 24h à venir.'
            );
            await loadStatus();
            setFile(null);
            setPreview(null);
        } catch (e: any) {
            showError('Erreur', e?.response?.data?.error || 'Envoi impossible');
        } finally {
            setIsUploading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        window.location.href = '/login';
    };

    const refresh = async () => {
        await silentRefresh();
        await loadStatus();
    };

    // If user is no longer suspended, redirect them
    useEffect(() => {
        if (user && user.status === 'active') {
            window.location.href = user.role === 'guide' ? '/guide/dashboard' : '/';
        }
    }, [user]);

    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div>Chargement...</div>
            </div>
        );
    }

    const isPending = verification?.status === 'pending';
    const isRejected = verification?.status === 'rejected';

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f0f4f8 0%, #e6eef7 100%)',
            padding: '2rem 1rem'
        }}>
            <div style={{
                maxWidth: '600px',
                width: '100%',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #0369a1, #0284c7)',
                    color: 'white',
                    padding: '2rem',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.2)',
                        margin: '0 auto 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <ShieldCheck size={32} />
                    </div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
                        Vérification d'identité requise
                    </h1>
                    <p style={{ margin: '0.5rem 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
                        Bonjour {user?.full_name || user?.email}
                    </p>
                </div>

                {/* Content */}
                <div style={{ padding: '2rem' }}>
                    {isPending ? (
                        <div style={{
                            background: '#fffbeb',
                            border: '1px solid #fde68a',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            textAlign: 'center'
                        }}>
                            <Clock size={40} style={{ color: '#d97706', marginBottom: '0.75rem' }} />
                            <h3 style={{ margin: 0, color: '#92400e', fontSize: '1.1rem' }}>
                                Votre document est en cours de vérification
                            </h3>
                            <p style={{ margin: '0.75rem 0 0', color: '#78350f', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                Nous avons bien reçu votre pièce d'identité.
                                <br />
                                La validation sera effectuée <strong>sous 24h maximum</strong>.
                                <br />
                                Vous recevrez un email dès que votre compte sera réactivé.
                            </p>
                            <p style={{ margin: '1rem 0 0', fontSize: '0.8rem', color: '#92400e' }}>
                                Envoyé le : {new Date(verification.submitted_at).toLocaleString('fr-FR')}
                            </p>
                            <button
                                onClick={refresh}
                                style={{
                                    marginTop: '1rem',
                                    padding: '0.5rem 1rem',
                                    background: '#d97706',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: 600
                                }}
                            >
                                Actualiser le statut
                            </button>
                        </div>
                    ) : (
                        <>
                            <div style={{
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                borderRadius: '12px',
                                padding: '1.25rem',
                                marginBottom: '1.5rem'
                            }}>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <AlertCircle size={20} style={{ color: '#2563eb', flexShrink: 0, marginTop: '2px' }} />
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 600, color: '#1e3a8a', fontSize: '0.95rem' }}>
                                            Pour des raisons de sécurité
                                        </p>
                                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: '#1e40af', lineHeight: 1.5 }}>
                                            Nous avons besoin de plus d'infos sur vous avant de réactiver votre compte.
                                            Merci de nous fournir une <strong>pièce d'identité</strong> (carte d'identité,
                                            passeport ou permis de conduire).
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {isRejected && (
                                <div style={{
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    borderRadius: '12px',
                                    padding: '1rem',
                                    marginBottom: '1.5rem'
                                }}>
                                    <strong style={{ color: '#b91c1c' }}>Document refusé</strong>
                                    {verification?.rejection_reason && (
                                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#7f1d1d' }}>
                                            Raison : {verification.rejection_reason}
                                        </p>
                                    )}
                                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#7f1d1d' }}>
                                        Merci de soumettre un nouveau document.
                                    </p>
                                </div>
                            )}

                            {/* Upload zone */}
                            <label style={{
                                display: 'block',
                                border: '2px dashed #cbd5e1',
                                borderRadius: '12px',
                                padding: '2rem',
                                textAlign: 'center',
                                cursor: 'pointer',
                                background: preview ? 'transparent' : '#f8fafc',
                                transition: 'all 0.2s'
                            }}>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,application/pdf"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                />
                                {preview ? (
                                    <img
                                        src={preview}
                                        alt="Aperçu"
                                        style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }}
                                    />
                                ) : (
                                    <>
                                        <Upload size={40} style={{ color: '#64748b', marginBottom: '0.5rem' }} />
                                        <p style={{ margin: 0, fontWeight: 600, color: '#334155' }}>
                                            Cliquez pour choisir un fichier
                                        </p>
                                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                                            JPG, PNG ou WEBP (max 8 Mo)
                                        </p>
                                    </>
                                )}
                            </label>

                            {file && (
                                <div style={{
                                    marginTop: '1rem',
                                    padding: '0.75rem 1rem',
                                    background: '#f0f9ff',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <CheckCircle2 size={18} style={{ color: '#059669' }} />
                                        <span style={{ fontSize: '0.85rem' }}>{file.name}</span>
                                    </div>
                                    <button
                                        onClick={() => { setFile(null); setPreview(null); }}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                                    >
                                        Retirer
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={!file || isUploading}
                                style={{
                                    width: '100%',
                                    marginTop: '1.5rem',
                                    padding: '0.9rem',
                                    background: !file || isUploading ? '#94a3b8' : 'linear-gradient(135deg, #0369a1, #0284c7)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    cursor: !file || isUploading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {isUploading ? 'Envoi en cours...' : 'Envoyer ma pièce d\'identité'}
                            </button>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1rem 2rem',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Besoin d'aide ? Contactez le support AchatAvis
                    </span>
                    <button
                        onClick={handleLogout}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.4rem 0.9rem',
                            background: 'transparent',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            color: '#475569',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                        }}
                    >
                        <LogOut size={14} /> Déconnexion
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IdentityVerification;
