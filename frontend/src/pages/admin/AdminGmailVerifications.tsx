// Page admin : vérification des comptes Gmail des guides.

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import { CheckCircle2, XCircle, Mail, ExternalLink, ShieldCheck, Clock, User, Image } from 'lucide-react';
import Swal, { showSuccess, showError } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './AdminLists.css';

type FilterStatus = 'pending' | 'approved' | 'rejected' | 'all';

interface GmailVerif {
    id: string;
    gmail_account_id: number;
    guide_id: string;
    guide_name: string;
    guide_email: string;
    gmail_email: string;
    maps_profile_url: string;
    screenshot_url: string;
    status: 'pending' | 'approved' | 'rejected';
    rejection_reason: string | null;
    submitted_at: string;
    reviewed_at: string | null;
}

const FILTERS: { key: FilterStatus; label: string }[] = [
    { key: 'pending',  label: 'En attente' },
    { key: 'approved', label: 'Validés' },
    { key: 'rejected', label: 'Rejetés' },
    { key: 'all',      label: 'Tous' },
];

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string; label: string }> = {
    pending:  { bg: '#fef3c7', color: '#92400e', border: '#fde68a', label: 'En attente' },
    approved: { bg: '#dcfce7', color: '#166534', border: '#a7f3d0', label: 'Validé' },
    rejected: { bg: '#fee2e2', color: '#991b1b', border: '#fecaca', label: 'Rejeté' },
};

function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AdminGmailVerifications: React.FC<any> = () => {
    const [items, setItems] = useState<GmailVerif[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterStatus>('pending');
    const [preview, setPreview] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const params = filter !== 'all' ? `?status=${filter}` : '';
            const r = await api.get(`/admin/gmail-verifications${params}`);
            setItems(r.data.verifications ?? r.data);
        } catch (e: any) {
            if (e.response?.status === 404) {
                showError(
                    'Vérifications indisponibles',
                    'La route admin des vérifications Gmail n’est pas disponible sur le backend déployé.'
                );
            } else {
                showError('Erreur', 'Chargement impossible');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [filter]);

    const approve = async (v: GmailVerif) => {
        const { isConfirmed } = await Swal.fire({
            title: 'Valider ce compte Gmail ?',
            text: `${v.gmail_email} — Guide : ${v.guide_name}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Valider',
            cancelButtonText: 'Annuler',
            confirmButtonColor: '#059669',
        });
        if (!isConfirmed) return;
        try {
            await api.patch(`/admin/gmail-verifications/${v.id}/approve`);
            showSuccess('Compte Gmail validé');
            load();
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        }
    };

    const reject = async (v: GmailVerif) => {
        const { value: reason, isConfirmed } = await Swal.fire({
            title: 'Rejeter cette vérification ?',
            input: 'textarea',
            inputLabel: 'Raison du rejet',
            inputPlaceholder: 'Ex: Capture floue, nom non conforme, profil non masqué...',
            showCancelButton: true,
            confirmButtonText: 'Rejeter',
            cancelButtonText: 'Annuler',
            confirmButtonColor: '#dc2626',
        });
        if (!isConfirmed) return;
        try {
            await api.patch(`/admin/gmail-verifications/${v.id}/reject`, { reason: reason || '' });
            showSuccess('Vérification rejetée');
            load();
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        }
    };

    const pendingCount = items.filter(i => i.status === 'pending').length;

    return (
        <DashboardLayout title="Vérifications Gmail">
            <style>{`
                .gmail-verif-card-grid {
                    padding: 1.25rem;
                    display: grid;
                    grid-template-columns: 1.2fr 1fr auto;
                    gap: 1.5rem;
                    align-items: center;
                }
                @media (max-width: 768px) {
                    .gmail-verif-card-grid {
                        grid-template-columns: 1fr;
                        gap: 1rem;
                        padding: 1rem;
                    }
                    .gmail-verif-actions {
                        flex-direction: row !important;
                        min-width: 0 !important;
                    }
                    .gmail-verif-actions button {
                        flex: 1;
                    }
                    .gmail-verif-screenshot {
                        height: 160px !important;
                    }
                }
            `}</style>

            {/* En-tête */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <ShieldCheck size={22} color="#059669" />
                        Vérifications Gmail des guides
                    </h1>
                    <p style={{ margin: '0.3rem 0 0', color: '#64748b', fontSize: '0.875rem' }}>
                        Vérifiez nom français · anciens avis masqués · photo neutre · appartenance du compte
                    </p>
                </div>
                {pendingCount > 0 && (
                    <span style={{ background: '#fee2e2', color: '#991b1b', padding: '0.4rem 1rem', borderRadius: '2rem', fontWeight: 700, fontSize: '0.875rem', border: '1px solid #fecaca' }}>
                        {pendingCount} en attente
                    </span>
                )}
            </div>

            {/* Filtres */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {FILTERS.map(f => (
                    <button key={f.key} onClick={() => setFilter(f.key)} style={{
                        padding: '0.45rem 1.1rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: filter === f.key ? 700 : 500,
                        background: filter === f.key ? '#0f172a' : '#fff',
                        color: filter === f.key ? '#fff' : '#64748b',
                        border: filter === f.key ? '1px solid #0f172a' : '1px solid #e2e8f0',
                        transition: 'all 0.15s',
                    }}>
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Contenu */}
            {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}><LoadingSpinner /></div>
            ) : items.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '1rem', border: '2px dashed #e2e8f0' }}>
                    <ShieldCheck size={32} color="#cbd5e1" style={{ marginBottom: '0.75rem' }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>Aucune vérification {filter !== 'all' ? `"${FILTERS.find(f => f.key === filter)?.label}"` : ''}</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {items.map(v => {
                        const st = STATUS_STYLE[v.status];
                        return (
                            <div key={v.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                {/* Bande statut en haut */}
                                <div style={{ height: 4, background: v.status === 'approved' ? '#059669' : v.status === 'rejected' ? '#dc2626' : '#f59e0b' }} />

                                <div className="gmail-verif-card-grid">

                                    {/* Colonne gauche : Guide + Gmail */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {/* Guide */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                                                {initials(v.guide_name || 'G')}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{v.guide_name}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <User size={11} />{v.guide_email}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Gmail */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                                            <Mail size={15} color="#64748b" />
                                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{v.gmail_email}</span>
                                        </div>

                                        {/* Dates + statut */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#94a3b8' }}>
                                                <Clock size={12} />
                                                Soumis le {new Date(v.submitted_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}`, padding: '0.15rem 0.6rem', borderRadius: '1rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                {st.label}
                                            </span>
                                        </div>
                                        {v.reviewed_at && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: v.status === 'approved' ? '#166534' : '#991b1b' }}>
                                                <Clock size={12} />
                                                {v.status === 'approved' ? 'Validé le' : 'Rejeté le'} {new Date(v.reviewed_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        )}

                                        {v.rejection_reason && (
                                            <div style={{ fontSize: '0.8rem', color: '#991b1b', background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 6, padding: '0.4rem 0.6rem' }}>
                                                Motif : {v.rejection_reason}
                                            </div>
                                        )}
                                    </div>

                                    {/* Colonne centre : capture + lien Maps */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {/* Miniature capture cliquable */}
                                        <div className="gmail-verif-screenshot" onClick={() => setPreview(v.screenshot_url)} style={{ cursor: 'pointer', position: 'relative', borderRadius: 8, overflow: 'hidden', border: '2px solid #e2e8f0', height: 100, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            title="Cliquer pour agrandir">
                                            {v.screenshot_url ? (
                                                <img src={v.screenshot_url} alt="Capture" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <Image size={24} color="#cbd5e1" />
                                            )}
                                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.35)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}>
                                                <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700, opacity: 0, transition: 'opacity 0.15s' }}
                                                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                                    onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
                                                    Agrandir
                                                </span>
                                            </div>
                                        </div>

                                        {/* Lien Maps */}
                                        <a href={v.maps_profile_url} target="_blank" rel="noopener noreferrer"
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#2383e2', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.45rem 0.75rem' }}>
                                            <ExternalLink size={13} /> Voir profil Google Maps
                                        </a>
                                    </div>

                                    {/* Colonne droite : actions */}
                                    {v.status === 'pending' && (
                                        <div className="gmail-verif-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', minWidth: 120 }}>
                                            <button onClick={() => approve(v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem 1rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
                                                <CheckCircle2 size={15} /> Valider
                                            </button>
                                            <button onClick={() => reject(v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: '0.6rem 1rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
                                                <XCircle size={15} /> Rejeter
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Preview plein écran */}
            {preview && (
                <div onClick={() => setPreview(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: '1rem' }}>
                    <img src={preview} alt="Capture Gmail" style={{ maxWidth: '92vw', maxHeight: '92vh', borderRadius: 12, boxShadow: '0 30px 60px rgba(0,0,0,0.6)' }} />
                </div>
            )}
        </DashboardLayout>
    );
};
