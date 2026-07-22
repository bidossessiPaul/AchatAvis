import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { Modal } from '../../../components/common/Modal';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import CopyLinkButton from '../../../components/common/CopyLinkButton';
import { usePermissions } from '../../../hooks/usePermissions';
import {
    adminTiersApi,
    adminViewTiersApi,
    adminVideosApi,
    adminAccountsApi,
    adminSubmissionsApi,
    adminViewUpdatesApi,
} from '../../../services/repost';
import {
    RepostTier,
    RepostViewTier,
    RepostVideo,
    RepostAccount,
    RepostSubmission,
    RepostViewUpdate,
} from '../../../types/repost';
import {
    Layers,
    Video,
    UserCheck,
    Send,
    Eye,
    Plus,
    Trash2,
    Pencil,
    CheckCircle2,
    XCircle,
    Clock,
    Image as ImageIcon,
    Settings2,
    Ban,
    ShieldCheck,
} from 'lucide-react';
import { showSuccess, showError, showConfirm } from '../../../utils/Swal';
import '../AdminLists.css';
import './AdminRepost.css';

type Tab = 'accounts' | 'submissions' | 'viewUpdates' | 'tiers' | 'videos';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    pending: { label: 'En attente', color: '#92400e', bg: '#fef3c7', icon: <Clock size={13} /> },
    approved: { label: 'Approuvé', color: '#166534', bg: '#dcfce7', icon: <CheckCircle2 size={13} /> },
    rejected: { label: 'Rejeté', color: '#991b1b', bg: '#fee2e2', icon: <XCircle size={13} /> },
    blocked: { label: 'Bloqué', color: '#475569', bg: '#e2e8f0', icon: <Ban size={13} /> },
};

const formatDateTime = (iso: string | null | undefined): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const centsToEuros = (cents: number): string => (cents / 100).toFixed(2).replace('.', ',') + ' €';

export const AdminRepost: React.FC = () => {
    const { hasPermission } = usePermissions();
    const canManage = hasPermission('can_manage_repost');
    const canValidate = hasPermission('can_validate_reposts');

    const [tab, setTab] = useState<Tab>(canValidate ? 'accounts' : 'tiers');
    const [stats, setStats] = useState<{ pending_accounts_count: number; pending_submissions_count: number; pending_view_updates_count: number } | null>(null);

    useEffect(() => {
        if (canValidate) {
            adminViewUpdatesApi.stats().then(setStats).catch(() => {});
        }
    }, [canValidate]);

    const tabs: Array<{ key: Tab; label: string; icon: React.ReactNode; badge?: number }> = [
        ...(canValidate ? [{ key: 'accounts' as Tab, label: 'Comptes', icon: <UserCheck size={16} />, badge: stats?.pending_accounts_count }] : []),
        ...(canValidate ? [{ key: 'submissions' as Tab, label: 'Soumissions', icon: <Send size={16} />, badge: stats?.pending_submissions_count }] : []),
        ...(canValidate ? [{ key: 'viewUpdates' as Tab, label: 'Déclarations de vues', icon: <Eye size={16} />, badge: stats?.pending_view_updates_count }] : []),
        ...(canManage ? [{ key: 'tiers' as Tab, label: 'Paliers', icon: <Layers size={16} /> }] : []),
        ...(canManage ? [{ key: 'videos' as Tab, label: 'Vidéothèque', icon: <Video size={16} /> }] : []),
    ];

    return (
        <DashboardLayout title="Repost Social">
            <div className="repost-tabs">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        className={`repost-tab ${tab === t.key ? 'active' : ''}`}
                        onClick={() => setTab(t.key)}
                    >
                        {t.icon}
                        {t.label}
                        {!!t.badge && <span className="repost-tab-badge">{t.badge}</span>}
                    </button>
                ))}
            </div>

            {tab === 'accounts' && canValidate && <AccountsTab />}
            {tab === 'submissions' && canValidate && <SubmissionsTab />}
            {tab === 'viewUpdates' && canValidate && <ViewUpdatesTab />}
            {tab === 'tiers' && canManage && <TiersTab />}
            {tab === 'videos' && canManage && <VideosTab />}
        </DashboardLayout>
    );
};

// ========================================================================
// Comptes réseaux sociaux (candidatures)
// ========================================================================
// Ligne en cours d'édition inline : soit une revue (compte pending), soit un
// changement de palier (compte approuvé). Un seul compte édité à la fois.
type AccountEdit = { id: string; mode: 'review' | 'tier'; tierId: string };

const AccountsTab: React.FC = () => {
    const [accounts, setAccounts] = useState<RepostAccount[]>([]);
    const [tiers, setTiers] = useState<RepostTier[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'pending' | 'all' | 'approved' | 'rejected'>('pending');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [edit, setEdit] = useState<AccountEdit | null>(null);

    // includeInactive : on veut aussi afficher le libellé d'un palier désactivé
    // depuis (compte historiquement classé dessus), mais les selects n'offrent
    // que les paliers actifs.
    const activeTiers = tiers.filter(t => t.is_active);

    const load = useCallback(async (status: typeof statusFilter) => {
        setLoading(true);
        try {
            const [r, t] = await Promise.all([adminAccountsApi.list(status), adminTiersApi.list(true)]);
            setAccounts(r.accounts);
            setTiers(t);
        } catch {
            showError('Erreur', 'Impossible de charger les comptes');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(statusFilter); }, [statusFilter, load]);

    const tierLabel = (id: string | null): string => {
        if (!id) return '—';
        return tiers.find(t => t.id === id)?.label ?? 'Palier supprimé';
    };

    const startReview = (acc: RepostAccount) => setEdit({ id: acc.id, mode: 'review', tierId: acc.suggested_tier_id || '' });
    const startTierEdit = (acc: RepostAccount) => setEdit({ id: acc.id, mode: 'tier', tierId: acc.tier_id || '' });

    const approve = async (acc: RepostAccount) => {
        if (!edit?.tierId) {
            showError('Palier requis', 'Sélectionnez le palier à assigner avant d\'approuver');
            return;
        }
        try {
            await adminAccountsApi.review(acc.id, 'approved', edit.tierId);
            showSuccess('Compte approuvé', 'Le guide voit désormais la vidéothèque pour ce compte.');
            setEdit(null);
            load(statusFilter);
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || 'Impossible d\'approuver');
        }
    };

    const reject = async (acc: RepostAccount) => {
        const r = await showConfirm('Rejeter ce compte ?', `${acc.guide_full_name} — ${acc.platform}`);
        if (!r.isConfirmed) return;
        try {
            await adminAccountsApi.review(acc.id, 'rejected', null);
            showSuccess('Compte rejeté');
            load(statusFilter);
        } catch {
            showError('Erreur', 'Impossible de rejeter');
        }
    };

    const saveTier = async (acc: RepostAccount) => {
        if (!edit?.tierId) {
            showError('Palier requis', 'Sélectionnez un palier');
            return;
        }
        try {
            await adminAccountsApi.updateTier(acc.id, edit.tierId);
            showSuccess('Palier mis à jour');
            setEdit(null);
            load(statusFilter);
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || 'Impossible de changer le palier');
        }
    };

    const toggleBlock = async (acc: RepostAccount) => {
        const blocking = !acc.blocked_at;
        const r = await showConfirm(
            blocking ? 'Bloquer ce compte ?' : 'Débloquer ce compte ?',
            blocking
                ? `${acc.guide_full_name} perd l'accès à la vidéothèque pour ce compte (réversible).`
                : `${acc.guide_full_name} retrouve l'accès à la vidéothèque pour ce compte.`
        );
        if (!r.isConfirmed) return;
        try {
            await adminAccountsApi.setBlocked(acc.id, blocking);
            showSuccess(blocking ? 'Compte bloqué' : 'Compte débloqué');
            load(statusFilter);
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || 'Action impossible');
        }
    };

    const remove = async (acc: RepostAccount) => {
        const r = await showConfirm('Supprimer ce compte ?', `${acc.guide_full_name} — ${acc.platform}. Le compte sera archivé (soft-delete).`);
        if (!r.isConfirmed) return;
        try {
            await adminAccountsApi.remove(acc.id);
            showSuccess('Compte supprimé');
            load(statusFilter);
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || 'Impossible de supprimer');
        }
    };

    if (loading) return <div style={{ padding: '3rem 0' }}><LoadingSpinner text="Chargement des comptes..." /></div>;

    const renderActions = (acc: RepostAccount) => {
        // Édition inline en cours sur cette ligne (revue ou changement de palier)
        if (edit && edit.id === acc.id) {
            const onSave = edit.mode === 'review' ? () => approve(acc) : () => saveTier(acc);
            return (
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <select
                        value={edit.tierId}
                        onChange={e => setEdit({ ...edit, tierId: e.target.value })}
                        className="repost-inline-select"
                    >
                        <option value="">Palier...</option>
                        {activeTiers.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                    <button className="repost-icon-btn success" onClick={onSave} title="Valider"><CheckCircle2 size={14} /></button>
                    <button className="repost-icon-btn" onClick={() => setEdit(null)} title="Annuler">✕</button>
                </div>
            );
        }

        if (acc.status === 'pending') {
            return (
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="repost-btn-small success" onClick={() => startReview(acc)}><CheckCircle2 size={14} /> Approuver</button>
                    <button className="repost-btn-small danger" onClick={() => reject(acc)}><XCircle size={14} /> Rejeter</button>
                    <button className="repost-icon-btn danger" onClick={() => remove(acc)} title="Supprimer"><Trash2 size={14} /></button>
                </div>
            );
        }

        if (acc.status === 'approved') {
            const blocked = !!acc.blocked_at;
            return (
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button className="repost-btn-small" style={{ background: '#eff6ff', color: '#2383e2' }} onClick={() => startTierEdit(acc)}>
                        <Layers size={14} /> Palier
                    </button>
                    {blocked ? (
                        <button className="repost-btn-small success" onClick={() => toggleBlock(acc)}><ShieldCheck size={14} /> Débloquer</button>
                    ) : (
                        <button className="repost-btn-small warning" onClick={() => toggleBlock(acc)}><Ban size={14} /> Bloquer</button>
                    )}
                    <button className="repost-icon-btn danger" onClick={() => remove(acc)} title="Supprimer"><Trash2 size={14} /></button>
                </div>
            );
        }

        // rejected
        return (
            <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button className="repost-icon-btn danger" onClick={() => remove(acc)} title="Supprimer"><Trash2 size={14} /></button>
            </div>
        );
    };

    return (
        <div>
            <div className="repost-filter-buttons">
                {[{ v: 'pending', l: 'En attente' }, { v: 'all', l: 'Tout' }, { v: 'approved', l: 'Approuvés' }, { v: 'rejected', l: 'Rejetés' }].map(f => (
                    <button key={f.v} className={`repost-filter-btn ${statusFilter === f.v ? 'active' : ''}`} onClick={() => setStatusFilter(f.v as any)}>{f.l}</button>
                ))}
            </div>

            <div className="repost-table-wrap">
                <table className="admin-modern-table">
                    <thead>
                        <tr>
                            <th>Guide</th>
                            <th>Plateforme</th>
                            <th>Abonnés déclarés</th>
                            <th>Palier</th>
                            <th>Preuve</th>
                            <th>Statut</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {accounts.map(acc => {
                            const displayStatus = acc.blocked_at ? 'blocked' : acc.status;
                            return (
                                <tr key={acc.id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{acc.guide_full_name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{acc.guide_email}</div>
                                    </td>
                                    <td>{acc.platform}</td>
                                    <td style={{ fontWeight: 700 }}>{acc.claimed_followers_count.toLocaleString('fr-FR')}</td>
                                    <td>{acc.status === 'approved' ? tierLabel(acc.tier_id) : <span style={{ color: '#94a3b8' }}>—</span>}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            <button className="repost-icon-btn" onClick={() => setPreviewUrl(acc.screenshot_url)}><ImageIcon size={14} /></button>
                                            <CopyLinkButton url={acc.profile_link} label="Profil" size="sm" />
                                        </div>
                                    </td>
                                    <td>
                                        <span className="repost-badge" style={{ background: statusConfig[displayStatus].bg, color: statusConfig[displayStatus].color }}>
                                            {statusConfig[displayStatus].icon} {statusConfig[displayStatus].label}
                                        </span>
                                    </td>
                                    <td>{renderActions(acc)}</td>
                                </tr>
                            );
                        })}
                        {accounts.length === 0 && (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Aucun compte</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {previewUrl && <ScreenshotPreview url={previewUrl} onClose={() => setPreviewUrl(null)} />}
        </div>
    );
};

// ========================================================================
// Soumissions de repost (preuve du post)
// ========================================================================
const SubmissionsTab: React.FC = () => {
    const [submissions, setSubmissions] = useState<RepostSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'pending' | 'all' | 'approved' | 'rejected'>('pending');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const load = useCallback(async (status: typeof statusFilter) => {
        setLoading(true);
        try {
            const r = await adminSubmissionsApi.list(status);
            setSubmissions(r.submissions);
        } catch {
            showError('Erreur', 'Impossible de charger les soumissions');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(statusFilter); }, [statusFilter, load]);

    const approve = async (s: RepostSubmission) => {
        try {
            await adminSubmissionsApi.approve(s.id);
            showSuccess('Repost validé', `${centsToEuros(s.base_earnings_cents)} de base crédités au guide.`);
            load(statusFilter);
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || 'Impossible de valider');
        }
    };

    const confirmReject = async () => {
        if (!rejectingId) return;
        try {
            await adminSubmissionsApi.reject(rejectingId, rejectReason || 'Preuve non conforme');
            showSuccess('Soumission rejetée');
            setRejectingId(null);
            setRejectReason('');
            load(statusFilter);
        } catch {
            showError('Erreur', 'Impossible de rejeter');
        }
    };

    if (loading) return <div style={{ padding: '3rem 0' }}><LoadingSpinner text="Chargement des soumissions..." /></div>;

    return (
        <div>
            <div className="repost-filter-buttons">
                {[{ v: 'pending', l: 'En attente' }, { v: 'all', l: 'Tout' }, { v: 'approved', l: 'Approuvées' }, { v: 'rejected', l: 'Rejetées' }].map(f => (
                    <button key={f.v} className={`repost-filter-btn ${statusFilter === f.v ? 'active' : ''}`} onClick={() => setStatusFilter(f.v as any)}>{f.l}</button>
                ))}
            </div>

            <div className="repost-table-wrap">
                <table className="admin-modern-table">
                    <thead>
                        <tr>
                            <th>Guide</th>
                            <th>Vidéo</th>
                            <th>Plateforme</th>
                            <th>Preuve</th>
                            <th>Base</th>
                            <th>Vues déclarées</th>
                            <th>Statut</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {submissions.map(s => (
                            <tr key={s.id}>
                                <td>
                                    <div style={{ fontWeight: 600 }}>{s.guide_full_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{s.guide_email}</div>
                                </td>
                                <td>{s.video_title}</td>
                                <td>{s.platform}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        <button className="repost-icon-btn" onClick={() => setPreviewUrl(s.screenshot_url)}><ImageIcon size={14} /></button>
                                        <CopyLinkButton url={s.post_link} label="Post" size="sm" />
                                    </div>
                                </td>
                                <td style={{ fontWeight: 700, color: '#059669' }}>{centsToEuros(s.base_earnings_cents)}</td>
                                <td>{s.latest_declared_views.toLocaleString('fr-FR')} {s.view_earnings_cents > 0 && <span style={{ color: '#059669', fontSize: '0.75rem' }}>(+{centsToEuros(s.view_earnings_cents)})</span>}</td>
                                <td>
                                    <span className="repost-badge" style={{ background: statusConfig[s.status].bg, color: statusConfig[s.status].color }}>
                                        {statusConfig[s.status].icon} {statusConfig[s.status].label}
                                    </span>
                                </td>
                                <td>
                                    {s.status === 'pending' ? (
                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            <button className="repost-btn-small success" onClick={() => approve(s)}><CheckCircle2 size={14} /> Valider</button>
                                            <button className="repost-btn-small danger" onClick={() => setRejectingId(s.id)}><XCircle size={14} /> Rejeter</button>
                                        </div>
                                    ) : <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{formatDateTime(s.reviewed_at)}</span>}
                                </td>
                            </tr>
                        ))}
                        {submissions.length === 0 && (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Aucune soumission</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {previewUrl && <ScreenshotPreview url={previewUrl} onClose={() => setPreviewUrl(null)} />}

            <Modal isOpen={!!rejectingId} onClose={() => setRejectingId(null)} title="Rejeter la soumission" maxWidth="420px">
                <div className="repost-form">
                    <label>Raison du rejet</label>
                    <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Ex: le repost n'est plus visible sur le profil" />
                    <button className="repost-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', background: '#ef4444' }} onClick={confirmReject}>
                        Confirmer le rejet
                    </button>
                </div>
            </Modal>
        </div>
    );
};

// ========================================================================
// Déclarations de vues
// ========================================================================
const ViewUpdatesTab: React.FC = () => {
    const [updates, setUpdates] = useState<RepostViewUpdate[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'pending' | 'all' | 'approved' | 'rejected'>('pending');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const load = useCallback(async (status: typeof statusFilter) => {
        setLoading(true);
        try {
            const r = await adminViewUpdatesApi.list(status);
            setUpdates(r.updates);
        } catch {
            showError('Erreur', 'Impossible de charger les déclarations');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(statusFilter); }, [statusFilter, load]);

    const approve = async (u: RepostViewUpdate) => {
        try {
            await adminViewUpdatesApi.approve(u.id);
            showSuccess('Déclaration validée', 'Le bonus de vues éventuel a été crédité.');
            load(statusFilter);
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || 'Impossible de valider');
        }
    };

    const confirmReject = async () => {
        if (!rejectingId) return;
        try {
            await adminViewUpdatesApi.reject(rejectingId, rejectReason || 'Preuve non conforme');
            showSuccess('Déclaration rejetée');
            setRejectingId(null);
            setRejectReason('');
            load(statusFilter);
        } catch {
            showError('Erreur', 'Impossible de rejeter');
        }
    };

    if (loading) return <div style={{ padding: '3rem 0' }}><LoadingSpinner text="Chargement des déclarations..." /></div>;

    return (
        <div>
            <div className="repost-filter-buttons">
                {[{ v: 'pending', l: 'En attente' }, { v: 'all', l: 'Tout' }, { v: 'approved', l: 'Approuvées' }, { v: 'rejected', l: 'Rejetées' }].map(f => (
                    <button key={f.v} className={`repost-filter-btn ${statusFilter === f.v ? 'active' : ''}`} onClick={() => setStatusFilter(f.v as any)}>{f.l}</button>
                ))}
            </div>

            <div className="repost-table-wrap">
                <table className="admin-modern-table">
                    <thead>
                        <tr>
                            <th>Guide</th>
                            <th>Vidéo / post</th>
                            <th>Vues déclarées</th>
                            <th>Preuve</th>
                            <th>Bonus crédité</th>
                            <th>Statut</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {updates.map(u => (
                            <tr key={u.id}>
                                <td>
                                    <div style={{ fontWeight: 600 }}>{u.guide_full_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{u.guide_email}</div>
                                </td>
                                <td>
                                    <div>{u.video_title}</div>
                                    <CopyLinkButton url={u.post_link || ''} label="Post" size="sm" />
                                </td>
                                <td style={{ fontWeight: 700 }}>{u.declared_views.toLocaleString('fr-FR')}</td>
                                <td>
                                    <button className="repost-icon-btn" onClick={() => setPreviewUrl(u.screenshot_url)}><ImageIcon size={14} /></button>
                                </td>
                                <td style={{ fontWeight: 700, color: '#059669' }}>{u.status === 'approved' ? centsToEuros(u.credited_amount_cents) : '—'}</td>
                                <td>
                                    <span className="repost-badge" style={{ background: statusConfig[u.status].bg, color: statusConfig[u.status].color }}>
                                        {statusConfig[u.status].icon} {statusConfig[u.status].label}
                                    </span>
                                </td>
                                <td>
                                    {u.status === 'pending' ? (
                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            <button className="repost-btn-small success" onClick={() => approve(u)}><CheckCircle2 size={14} /> Valider</button>
                                            <button className="repost-btn-small danger" onClick={() => setRejectingId(u.id)}><XCircle size={14} /> Rejeter</button>
                                        </div>
                                    ) : <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{formatDateTime(u.reviewed_at)}</span>}
                                </td>
                            </tr>
                        ))}
                        {updates.length === 0 && (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Aucune déclaration</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {previewUrl && <ScreenshotPreview url={previewUrl} onClose={() => setPreviewUrl(null)} />}

            <Modal isOpen={!!rejectingId} onClose={() => setRejectingId(null)} title="Rejeter la déclaration" maxWidth="420px">
                <div className="repost-form">
                    <label>Raison du rejet</label>
                    <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Ex: capture ne correspond pas au compteur de vues" />
                    <button className="repost-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', background: '#ef4444' }} onClick={confirmReject}>
                        Confirmer le rejet
                    </button>
                </div>
            </Modal>
        </div>
    );
};

// ========================================================================
// Paliers (abonnés + vues rattachées)
// ========================================================================
const TiersTab: React.FC = () => {
    const [tiers, setTiers] = useState<RepostTier[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<RepostTier | null>(null);
    const [form, setForm] = useState({ label: '', min_followers: '', max_followers: '', amount_cents: '' });
    const [saving, setSaving] = useState(false);
    const [viewTiersForTier, setViewTiersForTier] = useState<RepostTier | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setTiers(await adminTiersApi.list(true));
        } catch {
            showError('Erreur', 'Impossible de charger les paliers');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => {
        setEditing(null);
        setForm({ label: '', min_followers: '', max_followers: '', amount_cents: '' });
        setShowModal(true);
    };

    const openEdit = (t: RepostTier) => {
        setEditing(t);
        setForm({
            label: t.label,
            min_followers: String(t.min_followers),
            max_followers: t.max_followers !== null ? String(t.max_followers) : '',
            amount_cents: (t.amount_cents / 100).toString(),
        });
        setShowModal(true);
    };

    const save = async () => {
        if (!form.label.trim() || form.min_followers === '' || form.amount_cents === '') {
            showError('Champs requis', 'Libellé, seuil minimum et montant sont obligatoires');
            return;
        }
        setSaving(true);
        try {
            const input = {
                label: form.label.trim(),
                min_followers: parseInt(form.min_followers, 10),
                max_followers: form.max_followers === '' ? null : parseInt(form.max_followers, 10),
                amount_cents: Math.round(parseFloat(form.amount_cents) * 100),
            };
            if (editing) {
                await adminTiersApi.update(editing.id, input);
                showSuccess('Palier mis à jour');
            } else {
                await adminTiersApi.create(input);
                showSuccess('Palier créé');
            }
            setShowModal(false);
            load();
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || 'Impossible d\'enregistrer le palier');
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (t: RepostTier) => {
        try {
            await adminTiersApi.update(t.id, { is_active: !t.is_active });
            load();
        } catch {
            showError('Erreur', 'Impossible de changer le statut');
        }
    };

    const remove = async (t: RepostTier) => {
        const r = await showConfirm('Supprimer ce palier ?', `"${t.label}" sera archivé (soft-delete).`);
        if (!r.isConfirmed) return;
        try {
            await adminTiersApi.remove(t.id);
            showSuccess('Palier supprimé');
            load();
        } catch {
            showError('Erreur', 'Impossible de supprimer le palier');
        }
    };

    if (loading) return <div style={{ padding: '3rem 0' }}><LoadingSpinner text="Chargement des paliers..." /></div>;

    return (
        <div>
            <div className="repost-toolbar">
                <p className="repost-toolbar-hint">Palier d'abonnés = montant de base payé pour un repost + accès à la vidéothèque. Chaque palier a son propre barème de bonus selon les vues (bouton "Paliers de vues").</p>
                <button className="repost-btn-primary" onClick={openCreate}><Plus size={16} /> Nouveau palier</button>
            </div>

            <div className="repost-table-wrap">
                <table className="admin-modern-table">
                    <thead>
                        <tr>
                            <th>Libellé</th>
                            <th>Abonnés</th>
                            <th>Montant de base / repost</th>
                            <th>Statut</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tiers.map(t => (
                            <tr key={t.id}>
                                <td style={{ fontWeight: 600 }}>{t.label}</td>
                                <td>{t.min_followers.toLocaleString('fr-FR')} {t.max_followers !== null ? `– ${t.max_followers.toLocaleString('fr-FR')}` : '+'}</td>
                                <td style={{ fontWeight: 700, color: '#059669' }}>{centsToEuros(t.amount_cents)}</td>
                                <td>
                                    <button className={`repost-status-toggle ${t.is_active ? 'active' : ''}`} onClick={() => toggleActive(t)}>
                                        {t.is_active ? 'Actif' : 'Inactif'}
                                    </button>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        <button className="repost-btn-small" onClick={() => setViewTiersForTier(t)}><Settings2 size={14} /> Paliers de vues</button>
                                        <button className="repost-icon-btn" onClick={() => openEdit(t)}><Pencil size={14} /></button>
                                        <button className="repost-icon-btn danger" onClick={() => remove(t)}><Trash2 size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {tiers.length === 0 && (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Aucun palier configuré</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Modifier le palier' : 'Nouveau palier'} maxWidth="420px">
                <div className="repost-form">
                    <label>Libellé</label>
                    <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Ex: 1k-5k abonnés" />
                    <div className="repost-form-row">
                        <div>
                            <label>Abonnés min</label>
                            <input type="number" value={form.min_followers} onChange={e => setForm({ ...form, min_followers: e.target.value })} placeholder="1000" />
                        </div>
                        <div>
                            <label>Abonnés max (optionnel)</label>
                            <input type="number" value={form.max_followers} onChange={e => setForm({ ...form, max_followers: e.target.value })} placeholder="5000" />
                        </div>
                    </div>
                    <label>Montant de base par repost validé (€)</label>
                    <input type="number" step="0.01" value={form.amount_cents} onChange={e => setForm({ ...form, amount_cents: e.target.value })} placeholder="5.00" />
                    <button className="repost-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }} onClick={save} disabled={saving}>
                        {saving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                </div>
            </Modal>

            {viewTiersForTier && (
                <ViewTiersModal tier={viewTiersForTier} onClose={() => setViewTiersForTier(null)} />
            )}
        </div>
    );
};

const ViewTiersModal: React.FC<{ tier: RepostTier; onClose: () => void }> = ({ tier, onClose }) => {
    const [viewTiers, setViewTiers] = useState<RepostViewTier[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<RepostViewTier | null>(null);
    const [form, setForm] = useState({ label: '', min_views: '', max_views: '', amount_cents: '' });
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setViewTiers(await adminViewTiersApi.list(tier.id, true));
        } catch {
            showError('Erreur', 'Impossible de charger les paliers de vues');
        } finally {
            setLoading(false);
        }
    }, [tier.id]);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => {
        setEditing(null);
        setForm({ label: '', min_views: '', max_views: '', amount_cents: '' });
        setShowForm(true);
    };

    const openEdit = (vt: RepostViewTier) => {
        setEditing(vt);
        setForm({
            label: vt.label,
            min_views: String(vt.min_views),
            max_views: vt.max_views !== null ? String(vt.max_views) : '',
            amount_cents: (vt.amount_cents / 100).toString(),
        });
        setShowForm(true);
    };

    const save = async () => {
        if (!form.label.trim() || form.min_views === '' || form.amount_cents === '') {
            showError('Champs requis', 'Libellé, vues minimum et montant sont obligatoires');
            return;
        }
        setSaving(true);
        try {
            const input = {
                label: form.label.trim(),
                min_views: parseInt(form.min_views, 10),
                max_views: form.max_views === '' ? null : parseInt(form.max_views, 10),
                amount_cents: Math.round(parseFloat(form.amount_cents) * 100),
            };
            if (editing) {
                await adminViewTiersApi.update(editing.id, input);
            } else {
                await adminViewTiersApi.create({ ...input, subscriber_tier_id: tier.id });
            }
            showSuccess('Palier de vues enregistré');
            setShowForm(false);
            load();
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || 'Impossible d\'enregistrer');
        } finally {
            setSaving(false);
        }
    };

    const remove = async (vt: RepostViewTier) => {
        const r = await showConfirm('Supprimer ce palier de vues ?', vt.label);
        if (!r.isConfirmed) return;
        try {
            await adminViewTiersApi.remove(vt.id);
            load();
        } catch {
            showError('Erreur', 'Impossible de supprimer');
        }
    };

    return (
        <Modal isOpen onClose={onClose} title={`Paliers de vues — ${tier.label}`} maxWidth="560px">
            {loading ? <LoadingSpinner text="Chargement..." /> : (
                <div>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 1rem' }}>
                        Bonus crédité en plus du montant de base ({centsToEuros(tier.amount_cents)}), selon le nombre de vues obtenues par le repost.
                    </p>
                    <div className="repost-guide-list">
                        {viewTiers.map(vt => (
                            <div key={vt.id} className="repost-guide-list-item">
                                <div>
                                    <div style={{ fontWeight: 700 }}>{vt.label}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                        {vt.min_views.toLocaleString('fr-FR')} {vt.max_views !== null ? `– ${vt.max_views.toLocaleString('fr-FR')}` : '+'} vues → {centsToEuros(vt.amount_cents)}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <button className="repost-icon-btn" onClick={() => openEdit(vt)}><Pencil size={14} /></button>
                                    <button className="repost-icon-btn danger" onClick={() => remove(vt)}><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                        {viewTiers.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>Aucun palier de vues pour ce palier d'abonnés</div>
                        )}
                    </div>
                    <button className="repost-btn-primary" style={{ marginTop: '1rem' }} onClick={openCreate}><Plus size={16} /> Ajouter un palier de vues</button>

                    {showForm && (
                        <div className="repost-form" style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                            <label>Libellé</label>
                            <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Ex: 1000-5000 vues" />
                            <div className="repost-form-row">
                                <div>
                                    <label>Vues min</label>
                                    <input type="number" value={form.min_views} onChange={e => setForm({ ...form, min_views: e.target.value })} placeholder="1000" />
                                </div>
                                <div>
                                    <label>Vues max (optionnel)</label>
                                    <input type="number" value={form.max_views} onChange={e => setForm({ ...form, max_views: e.target.value })} placeholder="5000" />
                                </div>
                            </div>
                            <label>Montant bonus (€)</label>
                            <input type="number" step="0.01" value={form.amount_cents} onChange={e => setForm({ ...form, amount_cents: e.target.value })} placeholder="3.00" />
                            <button className="repost-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }} onClick={save} disabled={saving}>
                                {saving ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
};

// ========================================================================
// Vidéothèque
// ========================================================================
const VideosTab: React.FC = () => {
    const [videos, setVideos] = useState<RepostVideo[]>([]);
    const [tiers, setTiers] = useState<RepostTier[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<RepostVideo | null>(null);
    const [form, setForm] = useState({ title: '', description: '', video_url: '', thumbnail_url: '', platforms: '', min_tier_id: '' });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [v, t] = await Promise.all([adminVideosApi.list(true), adminTiersApi.list(true)]);
            setVideos(v);
            setTiers(t);
        } catch {
            showError('Erreur', 'Impossible de charger la vidéothèque');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => {
        setEditing(null);
        setForm({ title: '', description: '', video_url: '', thumbnail_url: '', platforms: '', min_tier_id: '' });
        setShowModal(true);
    };

    const openEdit = (v: RepostVideo) => {
        setEditing(v);
        setForm({
            title: v.title,
            description: v.description || '',
            video_url: v.video_url,
            thumbnail_url: v.thumbnail_url || '',
            platforms: v.platforms || '',
            min_tier_id: v.min_tier_id || '',
        });
        setShowModal(true);
    };

    const save = async () => {
        if (!form.title.trim() || !form.video_url.trim()) {
            showError('Champs requis', 'Titre et lien Drive de la vidéo sont obligatoires');
            return;
        }
        setSaving(true);
        try {
            const input = {
                title: form.title.trim(),
                description: form.description.trim() || undefined,
                video_url: form.video_url.trim(),
                thumbnail_url: form.thumbnail_url.trim() || undefined,
                platforms: form.platforms.trim() || undefined,
                min_tier_id: form.min_tier_id || null,
            };
            if (editing) {
                await adminVideosApi.update(editing.id, input);
                showSuccess('Vidéo mise à jour');
            } else {
                await adminVideosApi.create(input);
                showSuccess('Vidéo ajoutée');
            }
            setShowModal(false);
            load();
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || 'Impossible d\'enregistrer la vidéo');
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (v: RepostVideo) => {
        try {
            await adminVideosApi.update(v.id, { is_active: !v.is_active });
            load();
        } catch {
            showError('Erreur', 'Impossible de changer le statut');
        }
    };

    const remove = async (v: RepostVideo) => {
        const r = await showConfirm('Supprimer cette vidéo ?', `"${v.title}" ne sera plus visible des guides.`);
        if (!r.isConfirmed) return;
        try {
            await adminVideosApi.remove(v.id);
            showSuccess('Vidéo supprimée');
            load();
        } catch {
            showError('Erreur', 'Impossible de supprimer la vidéo');
        }
    };

    const [notifyingId, setNotifyingId] = useState<string | null>(null);

    const notifyGuides = async (v: RepostVideo) => {
        const r = await showConfirm(
            'Lancer la campagne email ?',
            `Jusqu'à 100 guides actifs (connectés < 3 mois, ayant déjà soumis des avis) recevront un email pour "${v.title}". Un guide déjà notifié pour cette vidéo ne recevra jamais de doublon — relancer enverra aux 100 suivants.`
        );
        if (!r.isConfirmed) return;
        setNotifyingId(v.id);
        try {
            const result = await adminVideosApi.notifyGuides(v.id);
            if (result.sent === 0) {
                showSuccess('Aucun envoi', `Tous les guides actifs éligibles ont déjà été notifiés (${result.already_notified} au total).`);
            } else {
                showSuccess(
                    `${result.sent} email${result.sent > 1 ? 's' : ''} envoyé${result.sent > 1 ? 's' : ''}`,
                    result.remaining > 0
                        ? `${result.remaining} guides actifs restants — relancez pour notifier les 100 suivants.`
                        : 'Tous les guides actifs éligibles sont maintenant notifiés.'
                );
            }
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || 'Impossible d\'envoyer la campagne');
        } finally {
            setNotifyingId(null);
        }
    };

    if (loading) return <div style={{ padding: '3rem 0' }}><LoadingSpinner text="Chargement de la vidéothèque..." /></div>;

    return (
        <div>
            <div className="repost-toolbar">
                <p className="repost-toolbar-hint">Vidéos hébergées sur Drive, visibles uniquement par les comptes approuvés. La description est une légende suggérée — le guide doit l'adapter avant de poster.</p>
                <button className="repost-btn-primary" onClick={openCreate}><Plus size={16} /> Ajouter une vidéo</button>
            </div>

            <div className="repost-table-wrap">
                <table className="admin-modern-table">
                    <thead>
                        <tr>
                            <th>Titre</th>
                            <th>Plateformes</th>
                            <th>Palier min.</th>
                            <th>Statut</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {videos.map(v => {
                            const tier = tiers.find(t => t.id === v.min_tier_id);
                            return (
                                <tr key={v.id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{v.title}</div>
                                        <CopyLinkButton url={v.video_url} label="Lien Drive" size="sm" />
                                    </td>
                                    <td>{v.platforms || 'Toutes'}</td>
                                    <td>{tier ? tier.label : 'Tous paliers'}</td>
                                    <td>
                                        <button className={`repost-status-toggle ${v.is_active ? 'active' : ''}`} onClick={() => toggleActive(v)}>
                                            {v.is_active ? 'Active' : 'Inactive'}
                                        </button>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            {v.is_active && (
                                                <button
                                                    className="repost-icon-btn"
                                                    title="Notifier les guides actifs (max 100 par envoi)"
                                                    onClick={() => notifyGuides(v)}
                                                    disabled={notifyingId === v.id}
                                                    style={{ color: '#059669', opacity: notifyingId === v.id ? 0.5 : 1 }}
                                                >
                                                    <Send size={14} />
                                                </button>
                                            )}
                                            <button className="repost-icon-btn" onClick={() => openEdit(v)}><Pencil size={14} /></button>
                                            <button className="repost-icon-btn danger" onClick={() => remove(v)}><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {videos.length === 0 && (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Aucune vidéo dans la vidéothèque</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Modifier la vidéo' : 'Nouvelle vidéo'} maxWidth="480px">
                <div className="repost-form">
                    <label>Titre</label>
                    <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Campagne été 2026" />
                    <label>Description / légende suggérée (le guide devra la modifier)</label>
                    <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                    <label>Lien Drive de la vidéo</label>
                    <input value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} placeholder="https://drive.google.com/..." />
                    <label>Miniature (optionnel)</label>
                    <input value={form.thumbnail_url} onChange={e => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="https://..." />
                    <label>Plateformes ciblées (optionnel)</label>
                    <input value={form.platforms} onChange={e => setForm({ ...form, platforms: e.target.value })} placeholder="TikTok, Instagram" />
                    <label>Palier minimum requis (optionnel)</label>
                    <select value={form.min_tier_id} onChange={e => setForm({ ...form, min_tier_id: e.target.value })}>
                        <option value="">Tous paliers éligibles</option>
                        {tiers.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                    <button className="repost-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }} onClick={save} disabled={saving}>
                        {saving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

const ScreenshotPreview: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => (
    <div className="repost-preview-overlay" onClick={onClose}>
        <div className="repost-preview-box" onClick={e => e.stopPropagation()}>
            <img src={url} alt="Capture d'écran" />
            <button onClick={onClose}>✕</button>
        </div>
    </div>
);

export default AdminRepost;
