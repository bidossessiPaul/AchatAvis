import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { Modal } from '../../../components/common/Modal';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { guideRepostApi } from '../../../services/repost';
import { RepostAccount, RepostVideo, RepostSubmission, RepostViewUpdate, RepostGuideStats, REPOST_PLATFORMS } from '../../../types/repost';
import { Layers, Video, Send, CheckCircle2, XCircle, Clock, Wallet, Upload, PlayCircle, AlertTriangle, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { showSuccess, showError } from '../../../utils/Swal';
import './RepostSocial.css';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    pending: { label: 'En attente', color: '#92400e', bg: '#fef3c7', icon: <Clock size={13} /> },
    approved: { label: 'Approuvé', color: '#166534', bg: '#dcfce7', icon: <CheckCircle2 size={13} /> },
    rejected: { label: 'Rejeté', color: '#991b1b', bg: '#fee2e2', icon: <XCircle size={13} /> },
};

const centsToEuros = (cents: number): string => (cents / 100).toFixed(2).replace('.', ',') + ' €';

type Tab = 'accounts' | 'videos' | 'submissions';

export const RepostSocial: React.FC = () => {
    const [tab, setTab] = useState<Tab>('accounts');
    const [accounts, setAccounts] = useState<RepostAccount[]>([]);
    const [stats, setStats] = useState<RepostGuideStats | null>(null);

    const refresh = useCallback(() => {
        guideRepostApi.myAccounts().then(setAccounts).catch(() => {});
        guideRepostApi.myStats().then(setStats).catch(() => {});
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    const approvedAccounts = accounts.filter(a => a.status === 'approved');

    return (
        <DashboardLayout title="Repost Social">
            {stats && (
                <div className="repost-guide-stats">
                    <div className="repost-guide-stat-card highlight">
                        <Wallet size={20} />
                        <div>
                            <div className="repost-guide-stat-value">{centsToEuros(stats.total_earnings_cents)}</div>
                            <div className="repost-guide-stat-label">Solde repost (base + vues)</div>
                        </div>
                    </div>
                    <div className="repost-guide-stat-card">
                        <div className="repost-guide-stat-value">{stats.approved_submissions_count}</div>
                        <div className="repost-guide-stat-label">Reposts validés</div>
                    </div>
                    <div className="repost-guide-stat-card">
                        <div className="repost-guide-stat-value">{stats.pending_submissions_count + stats.pending_view_updates_count}</div>
                        <div className="repost-guide-stat-label">En attente de validation</div>
                    </div>
                </div>
            )}

            <div className="repost-guide-tabs">
                <button className={`repost-guide-tab ${tab === 'accounts' ? 'active' : ''}`} onClick={() => setTab('accounts')}>
                    <Layers size={16} /> Mes comptes
                </button>
                <button className={`repost-guide-tab ${tab === 'videos' ? 'active' : ''}`} onClick={() => setTab('videos')} disabled={approvedAccounts.length === 0}>
                    <Video size={16} /> Vidéos à reposter
                </button>
                <button className={`repost-guide-tab ${tab === 'submissions' ? 'active' : ''}`} onClick={() => setTab('submissions')}>
                    <Send size={16} /> Mes reposts
                </button>
            </div>

            {tab === 'accounts' && <AccountsTab accounts={accounts} onChanged={refresh} />}
            {tab === 'videos' && <VideosTab approvedAccounts={approvedAccounts} onSubmitted={refresh} />}
            {tab === 'submissions' && <SubmissionsTab onChanged={refresh} />}
        </DashboardLayout>
    );
};

// ========================================================================
// Onglet Mes comptes
// ========================================================================
const AccountsTab: React.FC<{ accounts: RepostAccount[]; onChanged: () => void }> = ({ accounts, onChanged }) => {
    const [showForm, setShowForm] = useState(false);
    const [platform, setPlatform] = useState(REPOST_PLATFORMS[0]);
    const [profileLink, setProfileLink] = useState('');
    const [followers, setFollowers] = useState('');
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (!profileLink.trim() || !followers || !screenshot) {
            showError('Champs requis', 'Lien de profil, nombre d\'abonnés et capture d\'écran sont obligatoires');
            return;
        }
        setSaving(true);
        try {
            await guideRepostApi.submitAccount(platform, profileLink.trim(), parseInt(followers, 10), screenshot);
            showSuccess('Compte envoyé', 'Un admin va vérifier votre profil.');
            setShowForm(false);
            setProfileLink('');
            setFollowers('');
            setScreenshot(null);
            onChanged();
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || 'Impossible d\'envoyer le compte');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div className="repost-guide-card">
                <h3>Déclarer un compte réseau social</h3>
                <p>Vous pouvez déclarer plusieurs comptes (un par plateforme, ou plusieurs comptes sur la même). Chaque compte validé par l'admin obtient son propre palier et débloque la vidéothèque.</p>
                <button className="repost-guide-btn-primary" onClick={() => setShowForm(true)}><Upload size={16} /> Ajouter un compte</button>
            </div>

            {accounts.length > 0 && (
                <div className="repost-guide-list">
                    {accounts.map(a => (
                        <div key={a.id} className="repost-guide-list-item">
                            <div>
                                <div style={{ fontWeight: 700 }}>{a.platform}</div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{a.claimed_followers_count.toLocaleString('fr-FR')} abonnés déclarés</div>
                                {a.status === 'rejected' && a.admin_notes && (
                                    <div style={{ fontSize: '0.8rem', color: '#991b1b', marginTop: '0.3rem' }}>Raison : {a.admin_notes}</div>
                                )}
                            </div>
                            <span className="repost-badge" style={{ background: statusConfig[a.status].bg, color: statusConfig[a.status].color }}>
                                {statusConfig[a.status].icon} {statusConfig[a.status].label}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nouveau compte réseau social" maxWidth="440px">
                <div className="repost-guide-form">
                    <label>Plateforme</label>
                    <select value={platform} onChange={e => setPlatform(e.target.value)}>
                        {REPOST_PLATFORMS.map(p => (
                            <option key={p} value={p} disabled={p !== 'TikTok'}>
                                {p}{p !== 'TikTok' ? ' (bientôt disponible)' : ''}
                            </option>
                        ))}
                    </select>
                    <label>Lien de votre profil</label>
                    <input value={profileLink} onChange={e => setProfileLink(e.target.value)} placeholder="https://..." />
                    <label>Nombre d'abonnés</label>
                    <input type="number" value={followers} onChange={e => setFollowers(e.target.value)} placeholder="Ex: 3500" />
                    <label>Capture d'écran (preuve du nombre d'abonnés)</label>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setScreenshot(e.target.files?.[0] || null)} />
                    <button className="repost-guide-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }} onClick={submit} disabled={saving}>
                        {saving ? 'Envoi...' : 'Envoyer'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

// ========================================================================
// Onglet Vidéos à reposter
// ========================================================================
const VideosTab: React.FC<{ approvedAccounts: RepostAccount[]; onSubmitted: () => void }> = ({ approvedAccounts, onSubmitted }) => {
    const [accountId, setAccountId] = useState(approvedAccounts[0]?.id || '');
    const [videos, setVideos] = useState<RepostVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<RepostVideo | null>(null);
    const [postLink, setPostLink] = useState('');
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!accountId && approvedAccounts[0]) setAccountId(approvedAccounts[0].id);
    }, [approvedAccounts, accountId]);

    const load = useCallback(async (accId: string) => {
        if (!accId) return;
        setLoading(true);
        try {
            setVideos(await guideRepostApi.listAvailableVideos(accId));
        } catch {
            showError('Erreur', 'Impossible de charger les vidéos');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(accountId); }, [accountId, load]);

    const submit = async () => {
        if (!selected || !postLink.trim() || !screenshot) {
            showError('Champs requis', 'Lien du repost et capture d\'écran sont obligatoires');
            return;
        }
        setSaving(true);
        try {
            await guideRepostApi.submitProof(accountId, selected.id, postLink.trim(), screenshot);
            showSuccess('Preuve envoyée', 'Un admin va valider votre repost.');
            setSelected(null);
            setPostLink('');
            setScreenshot(null);
            onSubmitted();
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || 'Impossible d\'envoyer la preuve');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            {approvedAccounts.length > 1 && (
                <div className="repost-guide-card" style={{ padding: '1rem 1.25rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Poster depuis le compte</label>
                    <select value={accountId} onChange={e => setAccountId(e.target.value)} style={{ marginTop: '0.4rem' }}>
                        {approvedAccounts.map(a => <option key={a.id} value={a.id}>{a.platform} — {a.claimed_followers_count.toLocaleString('fr-FR')} abonnés</option>)}
                    </select>
                </div>
            )}

            {loading ? <div style={{ padding: '3rem 0' }}><LoadingSpinner text="Chargement des vidéos..." /></div> : (
                videos.length === 0 ? (
                    <div className="repost-guide-empty">
                        <PlayCircle size={40} color="#94a3b8" />
                        <p>Aucune vidéo disponible pour ce compte pour le moment.</p>
                    </div>
                ) : (
                    <div className="repost-guide-video-grid">
                        {videos.map(v => (
                            <div key={v.id} className="repost-guide-video-card">
                                {v.thumbnail_url ? (
                                    <img src={v.thumbnail_url} alt={v.title} />
                                ) : (
                                    <div className="repost-guide-video-placeholder"><PlayCircle size={32} color="#94a3b8" /></div>
                                )}
                                <div className="repost-guide-video-body">
                                    <div style={{ fontWeight: 700 }}>{v.title}</div>
                                    {v.description && (
                                        <div className="repost-guide-video-caption">
                                            <div className="repost-guide-caption-warning">
                                                <AlertTriangle size={13} /> À adapter obligatoirement avant de poster
                                            </div>
                                            <p>{v.description}</p>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        <a href={v.video_url} target="_blank" rel="noopener noreferrer" className="repost-guide-btn-secondary">Télécharger (Drive)</a>
                                        <button className="repost-guide-btn-primary" onClick={() => setSelected(v)}>J'ai reposté</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Preuve de repost — ${selected?.title || ''}`} maxWidth="440px">
                <div className="repost-guide-form">
                    <label>Lien de votre repost</label>
                    <input value={postLink} onChange={e => setPostLink(e.target.value)} placeholder="https://..." />
                    <label>Capture d'écran du post</label>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setScreenshot(e.target.files?.[0] || null)} />
                    <button className="repost-guide-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }} onClick={submit} disabled={saving}>
                        {saving ? 'Envoi...' : 'Envoyer la preuve'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

// ========================================================================
// Onglet Mes reposts (soumissions + déclaration de vues)
// ========================================================================
const SubmissionsTab: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
    const [submissions, setSubmissions] = useState<RepostSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [viewUpdates, setViewUpdates] = useState<Record<string, RepostViewUpdate[]>>({});
    const [declaringFor, setDeclaringFor] = useState<RepostSubmission | null>(null);
    const [declaredViews, setDeclaredViews] = useState('');
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setSubmissions(await guideRepostApi.mySubmissions());
        } catch {
            showError('Erreur', 'Impossible de charger vos reposts');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const toggleExpand = async (s: RepostSubmission) => {
        if (expandedId === s.id) {
            setExpandedId(null);
            return;
        }
        setExpandedId(s.id);
        if (!viewUpdates[s.id]) {
            try {
                const updates = await guideRepostApi.listViewUpdatesForSubmission(s.id);
                setViewUpdates(prev => ({ ...prev, [s.id]: updates }));
            } catch {
                showError('Erreur', 'Impossible de charger l\'historique des vues');
            }
        }
    };

    const submitViews = async () => {
        if (!declaringFor || !declaredViews || !screenshot) {
            showError('Champs requis', 'Nombre de vues et capture d\'écran sont obligatoires');
            return;
        }
        setSaving(true);
        try {
            await guideRepostApi.submitViewUpdate(declaringFor.id, parseInt(declaredViews, 10), screenshot);
            showSuccess('Déclaration envoyée', 'Un admin va valider votre nombre de vues.');
            setDeclaringFor(null);
            setDeclaredViews('');
            setScreenshot(null);
            setViewUpdates(prev => { const copy = { ...prev }; delete copy[declaringFor.id]; return copy; });
            load();
            onChanged();
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || 'Impossible d\'envoyer la déclaration');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: '3rem 0' }}><LoadingSpinner text="Chargement..." /></div>;

    if (submissions.length === 0) {
        return (
            <div className="repost-guide-empty">
                <Send size={40} color="#94a3b8" />
                <p>Vous n'avez pas encore soumis de repost.</p>
            </div>
        );
    }

    return (
        <div className="repost-guide-list">
            {submissions.map(s => (
                <div key={s.id} className="repost-guide-submission-card">
                    <div className="repost-guide-list-item" style={{ border: 'none', padding: 0 }}>
                        <div>
                            <div style={{ fontWeight: 700 }}>{s.video_title} — {s.platform}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                Base : {centsToEuros(s.base_earnings_cents)}
                                {s.view_earnings_cents > 0 && <> · Bonus vues : {centsToEuros(s.view_earnings_cents)}</>}
                            </div>
                            {s.status === 'rejected' && s.rejection_reason && (
                                <div style={{ fontSize: '0.8rem', color: '#991b1b', marginTop: '0.3rem' }}>Raison : {s.rejection_reason}</div>
                            )}
                        </div>
                        <span className="repost-badge" style={{ background: statusConfig[s.status].bg, color: statusConfig[s.status].color }}>
                            {statusConfig[s.status].icon} {statusConfig[s.status].label}
                        </span>
                    </div>

                    {s.status === 'approved' && (
                        <div className="repost-guide-submission-actions">
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                Vues déclarées : <strong>{s.latest_declared_views.toLocaleString('fr-FR')}</strong>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="repost-guide-btn-secondary" onClick={() => toggleExpand(s)}>
                                    <Eye size={14} /> Historique {expandedId === s.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                                <button className="repost-guide-btn-primary" onClick={() => setDeclaringFor(s)}>Déclarer mes vues</button>
                            </div>
                        </div>
                    )}

                    {expandedId === s.id && (
                        <div className="repost-guide-view-history">
                            {(viewUpdates[s.id] || []).length === 0 ? (
                                <div style={{ color: '#94a3b8', fontSize: '0.8rem', padding: '0.5rem 0' }}>Aucune déclaration envoyée</div>
                            ) : (
                                (viewUpdates[s.id] || []).map(u => (
                                    <div key={u.id} className="repost-guide-view-history-item">
                                        <span>{u.declared_views.toLocaleString('fr-FR')} vues</span>
                                        <span className="repost-badge" style={{ background: statusConfig[u.status].bg, color: statusConfig[u.status].color }}>
                                            {statusConfig[u.status].icon} {statusConfig[u.status].label}
                                        </span>
                                        {u.status === 'approved' && <span style={{ color: '#059669', fontWeight: 700 }}>+{centsToEuros(u.credited_amount_cents)}</span>}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            ))}

            <Modal isOpen={!!declaringFor} onClose={() => setDeclaringFor(null)} title="Déclarer mes vues" maxWidth="420px">
                <div className="repost-guide-form">
                    <label>Nombre de vues actuel</label>
                    <input type="number" value={declaredViews} onChange={e => setDeclaredViews(e.target.value)} placeholder="Ex: 4200" />
                    <label>Capture d'écran du compteur de vues</label>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setScreenshot(e.target.files?.[0] || null)} />
                    <button className="repost-guide-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }} onClick={submitViews} disabled={saving}>
                        {saving ? 'Envoi...' : 'Envoyer la déclaration'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default RepostSocial;
