import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminApi } from '../../services/api';
import { CheckCircle, XCircle, ShieldCheck, User, Clock, Eye, AlertTriangle, RotateCw } from 'lucide-react';
import { showConfirm, showSuccess, showError } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './AdminLists.css';

type VerifStatus = 'pending' | 'approved' | 'rejected';

interface Verification {
    id: string;
    user_id: string;
    document_url: string;
    status: VerifStatus;
    submitted_at: string;
    reviewed_at: string | null;
    rejection_reason: string | null;
    email: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
    user_created_at: string | null;
    google_email: string | null;
    declared_city: string | null;
    detected_city: string | null;
    detected_country: string | null;
    detected_country_code: string | null;
    detected_is_vpn: number | null;
}

const isPdfUrl = (url: string) => /\.pdf($|\?)/i.test(url);

import { countryCodeToFlag } from '../../utils/countryFlag';

export const IdentityVerifications: React.FC = () => {
    const [items, setItems] = useState<Verification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<VerifStatus>('pending');
    const [preview, setPreview] = useState<string | null>(null);

    const load = async () => {
        setIsLoading(true);
        try {
            const data = await adminApi.getIdentityVerifications(filter);
            setItems(data);
        } catch (e) {
            showError('Erreur', 'Chargement impossible');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { load(); }, [filter]);

    const handleApprove = async (v: Verification) => {
        const r = await showConfirm(
            'Valider ce compte ?',
            `Le compte de ${v.full_name || v.email} sera réactivé immédiatement.`
        );
        if (!r.isConfirmed) return;
        try {
            await adminApi.approveIdentityVerification(v.id);
            showSuccess('Validé', 'Le compte a été réactivé');
            load();
        } catch (e: any) {
            showError('Erreur', e?.response?.data?.error || 'Validation impossible');
        }
    };

    const handleRelaunch = async (v: Verification) => {
        const reasonSnippet = v.rejection_reason
            ? `<p style="margin:0.5rem 0;padding:0.5rem 0.75rem;background:#fef2f2;border-radius:6px;font-size:0.85rem;color:#7f1d1d;"><strong>Raison initiale du refus :</strong> ${v.rejection_reason.replace(/</g, '&lt;')}</p>`
            : '';
        const Swal = (await import('sweetalert2')).default;
        const { isConfirmed } = await Swal.fire({
            title: 'Relancer la validation ?',
            html: `<div style="text-align:left;font-size:0.9rem">
                    <p>Le compte de <strong>${v.full_name || v.email}</strong> sera remis en attente de vérification.</p>
                    <p>Le guide pourra se reconnecter et <strong>soumettre un nouveau document</strong>. La raison du précédent refus restera visible pour qu'il comprenne ce qu'il doit corriger.</p>
                    ${reasonSnippet}
                </div>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Oui, relancer',
            cancelButtonText: 'Annuler',
            confirmButtonColor: '#0369a1',
        });
        if (!isConfirmed) return;
        try {
            await adminApi.relaunchIdentityVerification(v.id);
            showSuccess('Relancé', 'Le guide peut maintenant soumettre un nouveau document');
            load();
        } catch (e: any) {
            showError('Erreur', e?.response?.data?.error || 'Action impossible');
        }
    };

    const handleReject = async (v: Verification) => {
        const Swal = (await import('sweetalert2')).default;
        const { value: reason, isConfirmed } = await Swal.fire({
            title: 'Bloquer définitivement ce compte ?',
            html: `<p style="margin:0 0 1rem;font-size:0.9rem">Cette action <strong>bloquera le compte de ${v.full_name || v.email}</strong>. Motif obligatoire :</p>`,
            input: 'textarea',
            inputPlaceholder: 'Raison du refus (visible par le guide)...',
            inputAttributes: { required: 'true' },
            showCancelButton: true,
            confirmButtonText: 'Bloquer le compte',
            cancelButtonText: 'Annuler',
            confirmButtonColor: '#dc2626',
            inputValidator: (val) => (!val || val.trim().length < 5) ? 'Merci de fournir une raison (min 5 caractères)' : null,
        });
        if (!isConfirmed || !reason) return;
        try {
            await adminApi.rejectIdentityVerification(v.id, reason);
            showSuccess('Bloqué', 'Le compte a été bloqué définitivement');
            load();
        } catch (e: any) {
            showError('Erreur', e?.response?.data?.error || 'Action impossible');
        }
    };



    return (
        <DashboardLayout title="Vérifications d'identité">
            <div className="admin-dashboard revamped">
                <div className="admin-main-card">
                    <div className="admin-card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <ShieldCheck size={24} style={{ color: '#0369a1' }} />
                            <h2 className="card-title">Pièces d'identité à valider</h2>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {(['pending', 'approved', 'rejected'] as VerifStatus[]).map(s => (
                                <button
                                    key={s}
                                    onClick={() => setFilter(s)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '8px',
                                        border: '1px solid',
                                        borderColor: filter === s ? '#0369a1' : '#e2e8f0',
                                        background: filter === s ? '#0369a1' : 'white',
                                        color: filter === s ? 'white' : '#475569',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        textTransform: 'capitalize'
                                    }}
                                >
                                    {s === 'pending' ? 'En attente' : s === 'approved' ? 'Validés' : 'Refusés'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="admin-table-container">
                        {isLoading ? (
                            <div className="admin-loading">
                                <LoadingSpinner size="lg" text="Chargement..." />
                            </div>
                        ) : items.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                Aucune vérification {filter === 'pending' ? 'en attente' : filter === 'approved' ? 'validée' : 'refusée'}
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '1rem', padding: '1rem 0' }}>
                                {items.map(v => (
                                    <div key={v.id} style={{
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '12px',
                                        padding: '1.25rem',
                                        background: 'white',
                                        display: 'grid',
                                        gridTemplateColumns: '120px 1fr auto',
                                        gap: '1.25rem',
                                        alignItems: 'start'
                                    }}>
                                        {/* Document thumbnail */}
                                        <div
                                            onClick={() => isPdfUrl(v.document_url) ? window.open(v.document_url, '_blank') : setPreview(v.document_url)}
                                            style={{
                                                width: '120px',
                                                height: '120px',
                                                borderRadius: '8px',
                                                overflow: 'hidden',
                                                cursor: 'pointer',
                                                border: '1px solid #e2e8f0',
                                                position: 'relative',
                                                background: '#f1f5f9',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            {isPdfUrl(v.document_url) ? (
                                                <div style={{ textAlign: 'center', color: '#64748b' }}>
                                                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#dc2626' }}>PDF</div>
                                                    <div style={{ fontSize: '0.7rem' }}>Document</div>
                                                </div>
                                            ) : (
                                                <img
                                                    src={v.document_url}
                                                    alt="Pièce"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            )}
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                background: 'rgba(0,0,0,0.6)',
                                                color: 'white',
                                                padding: '4px',
                                                fontSize: '0.7rem',
                                                textAlign: 'center',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '4px'
                                            }}>
                                                <Eye size={12} /> {isPdfUrl(v.document_url) ? 'Ouvrir PDF' : 'Agrandir'}
                                            </div>
                                        </div>

                                        {/* User info */}
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.75rem' }}>
                                                {v.avatar_url ? (
                                                    <img src={v.avatar_url} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <User size={20} style={{ color: '#64748b' }} />
                                                    </div>
                                                )}
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{v.full_name || v.email}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{v.email}</div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem 1.5rem', fontSize: '0.85rem' }}>
                                                {v.google_email && (
                                                    <div><span style={{ color: '#64748b' }}>Gmail :</span> <strong>{v.google_email}</strong></div>
                                                )}
                                                {v.declared_city && (
                                                    <div><span style={{ color: '#64748b' }}>Ville déclarée :</span> <strong>{v.declared_city}</strong></div>
                                                )}
                                                {(v.detected_city || v.detected_country) && (
                                                    <div>
                                                        <span style={{ color: '#64748b' }}>Localisation détectée :</span>{' '}
                                                        <strong>
                                                            {countryCodeToFlag(v.detected_country_code)} {v.detected_city || '—'}, {v.detected_country}
                                                        </strong>
                                                        {!!v.detected_is_vpn && (
                                                            <span style={{ marginLeft: '6px', fontSize: '0.7rem', padding: '1px 6px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '4px', fontWeight: 700 }}>
                                                                🚨 VPN
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {v.user_created_at && (
                                                    <div>
                                                        <span style={{ color: '#64748b' }}>Inscrit le :</span>{' '}
                                                        <strong>{new Date(v.user_created_at).toLocaleString('fr-FR')}</strong>
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Clock size={14} style={{ color: '#64748b' }} />
                                                    <span style={{ color: '#64748b' }}>Envoyé :</span>{' '}
                                                    <strong>{new Date(v.submitted_at).toLocaleString('fr-FR')}</strong>
                                                </div>
                                            </div>

                                            {/* Mismatch warning */}
                                            {v.declared_city && v.detected_city &&
                                                v.declared_city.toLowerCase().trim() !== v.detected_city.toLowerCase().trim() && (
                                                    <div style={{
                                                        marginTop: '0.75rem',
                                                        padding: '0.5rem 0.75rem',
                                                        background: '#fef3c7',
                                                        border: '1px solid #fde68a',
                                                        borderRadius: '6px',
                                                        fontSize: '0.8rem',
                                                        color: '#92400e',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}>
                                                        <AlertTriangle size={14} />
                                                        Ville déclarée ≠ ville détectée
                                                    </div>
                                                )}

                                            {v.status === 'rejected' && v.rejection_reason && (
                                                <div style={{
                                                    marginTop: '0.75rem',
                                                    padding: '0.5rem 0.75rem',
                                                    background: '#fef2f2',
                                                    borderRadius: '6px',
                                                    fontSize: '0.8rem',
                                                    color: '#7f1d1d'
                                                }}>
                                                    <strong>Motif du refus :</strong> {v.rejection_reason}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        {v.status === 'pending' ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => handleApprove(v)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '0.6rem 1rem',
                                                        background: '#059669',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    <CheckCircle size={16} /> Valider
                                                </button>
                                                <button
                                                    onClick={() => handleReject(v)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '0.6rem 1rem',
                                                        background: '#dc2626',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    <XCircle size={16} /> Bloquer
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'stretch' }}>
                                                <span style={{
                                                    padding: '0.4rem 0.8rem',
                                                    borderRadius: '8px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600,
                                                    background: v.status === 'approved' ? '#d1fae5' : '#fee2e2',
                                                    color: v.status === 'approved' ? '#065f46' : '#991b1b',
                                                    textAlign: 'center'
                                                }}>
                                                    {v.status === 'approved' ? '✓ Validé' : '✗ Refusé'}
                                                </span>
                                                {v.status === 'rejected' && (
                                                    <button
                                                        onClick={() => handleRelaunch(v)}
                                                        title="Relancer la validation — le guide pourra soumettre un nouveau document"
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px',
                                                            padding: '0.5rem 0.9rem',
                                                            background: '#0369a1',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.8rem',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        <RotateCw size={14} /> Relancer
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Preview modal */}
            {preview && (
                <div
                    onClick={() => setPreview(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.85)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem'
                    }}
                >
                    <img
                        src={preview}
                        alt="Pièce d'identité"
                        style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain', borderRadius: '8px' }}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </DashboardLayout>
    );
};

export default IdentityVerifications;
