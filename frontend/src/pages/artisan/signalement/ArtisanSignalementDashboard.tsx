import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { Flag, Plus, RefreshCw, ExternalLink, Lock } from 'lucide-react';
import { showSuccess, showError, showConfirm } from '../../../utils/Swal';
import { artisanSignalementApi } from '../../../services/signalement';
import { artisanService } from '../../../services/artisanService';
import type { ArtisanSignalementSummary, SignalementAvis } from '../../../types/signalement';
import type { ReviewOrder } from '../../../types';
import { SIGNALEMENT_RAISONS, SIGNALEMENT_RAISONS_DESCRIPTIONS } from '../../../constants/signalementRaisons';
import './ArtisanSignalementDashboard.css';

const STATUS_LABELS: Record<string, string> = {
    active: 'En cours',
    terminated_success: 'Succès — avis supprimé',
    terminated_inconclusive: 'Non concluant',
    cancelled_by_admin: 'Annulé',
};

export const ArtisanSignalementDashboard = () => {
    const navigate = useNavigate();
    const [summary, setSummary] = useState<ArtisanSignalementSummary | null>(null);
    const [avis, setAvis] = useState<SignalementAvis[]>([]);
    const [fiches, setFiches] = useState<ReviewOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ google_review_url: '', raison: 'HORS_SUJET', raison_details: '', order_id: '' });

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const [s, a, f] = await Promise.all([
                artisanSignalementApi.summary(),
                artisanSignalementApi.listMyAvis(),
                artisanService.getMyOrders(),
            ]);
            setSummary(s);
            setAvis(a);
            setFiches(f.filter((o: ReviewOrder) => !['cancelled', 'draft'].includes(o.status)));
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    };

    const submit = async () => {
        if (!form.google_review_url.trim()) return showError('Erreur', 'URL Google requise');
        setSubmitting(true);
        try {
            await artisanSignalementApi.submit({
                google_review_url: form.google_review_url.trim(),
                raison: form.raison,
                raison_details: form.raison_details.trim() || undefined,
                order_id: form.order_id || null,
            });
            showSuccess('Avis soumis — les guides vont commencer le signalement');
            setModalOpen(false);
            setForm({ google_review_url: '', raison: 'HORS_SUJET', raison_details: '', order_id: '' });
            load();
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const relaunch = async (a: SignalementAvis) => {
        const ok = await showConfirm('Relancer cet avis ?', 'Cela consomme 1 slot de votre pack et remet l\'avis en file pour les guides.');
        if (!ok.isConfirmed) return;
        try {
            await artisanSignalementApi.relaunch(a.id);
            showSuccess('Avis relancé');
            load();
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        }
    };

    if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

    const noPack = !summary?.has_active_pack;

    // Page bloquée si pas de pack 499
    if (noPack) {
        return (
            <DashboardLayout>
                <div style={{ maxWidth: 520, margin: '4rem auto', textAlign: 'center', padding: '2.5rem', background: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                        <Lock size={26} color="#d97706" />
                    </div>
                    <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', color: '#0f172a' }}>Fonctionnalité réservée au pack 499€</h2>
                    <p style={{ color: '#64748b', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
                        Le signalement d'avis Google est inclus dans le <strong>pack 499€ (90 avis)</strong>.
                        Chaque pack vous donne <strong>5 signalements</strong> pour faire retirer des avis diffamatoires ou abusifs.
                    </p>
                    <button
                        onClick={() => navigate('/artisan/billing')}
                        style={{ background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', border: 'none', padding: '0.7rem 1.5rem', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}
                    >
                        Voir les packs disponibles
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="art-sig-page">
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Flag size={22} /> Signalement d'avis Google
                </h1>
                <p style={{ color: '#64748b', marginTop: 4, marginBottom: 24 }}>
                    Faites signaler les avis Google diffamatoires ou abusifs sur vos fiches.
                </p>

                {summary && (
                    <div className="art-sig-stats">
                        <div className="art-sig-stat">
                            <div className="label">Signalements restants</div>
                            <div className="value">{summary.avis_remaining} / {summary.avis_quota_total}</div>
                        </div>
                        <div className="art-sig-stat alt-blue"><div className="label">En cours</div><div className="value">{summary.avis_in_progress}</div></div>
                        <div className="art-sig-stat alt-purple"><div className="label">Succès Google</div><div className="value">{summary.avis_terminated_success}</div></div>
                        <div className="art-sig-stat alt-orange"><div className="label">Non concluants</div><div className="value">{summary.avis_terminated_inconclusive}</div></div>
                    </div>
                )}

                {summary && summary.avis_remaining > 0 && (
                    <div className="art-sig-cta">
                        <h2>Signaler un avis Google</h2>
                        <p>Collez l'URL d'un avis Google négatif et choisissez la raison du signalement.</p>
                        <button onClick={() => setModalOpen(true)}>
                            <Plus size={16} /> Soumettre un avis à signaler
                        </button>
                    </div>
                )}

                <h2 style={{ fontSize: '1.1rem', marginTop: 24, marginBottom: 12 }}>Mes avis soumis</h2>

                {avis.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                        Vous n'avez encore soumis aucun avis à signaler.
                    </div>
                ) : (
                    <div className="art-sig-table-wrap">
                        <table className="art-sig-table">
                            <thead>
                                <tr>
                                    <th>URL</th>
                                    <th>Raison</th>
                                    <th>Compteur</th>
                                    <th>Statut</th>
                                    <th>Soumis</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {avis.map(a => (
                                    <tr key={a.id}>
                                        <td><a href={a.google_review_url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Lien</a></td>
                                        <td>{SIGNALEMENT_RAISONS[a.raison] || a.raison}</td>
                                        <td>{a.nb_signalements_validated} / {a.nb_signalements_target}</td>
                                        <td>{STATUS_LABELS[a.status] || a.status}</td>
                                        <td>{new Date(a.created_at).toLocaleDateString('fr-FR')}</td>
                                        <td>
                                            {a.status === 'terminated_inconclusive' && summary && summary.avis_remaining > 0 && (
                                                <button className="art-sig-relaunch-btn" onClick={() => relaunch(a)}>
                                                    <RefreshCw size={12} /> Relancer
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {modalOpen && (
                    <div className="art-sig-modal-overlay" onClick={() => setModalOpen(false)}>
                        <div className="art-sig-modal" onClick={e => e.stopPropagation()}>
                            <h2>Signaler un avis Google</h2>
                            {fiches.length > 0 && (
                                <>
                                    <label>Fiche concernée (optionnel)</label>
                                    <select value={form.order_id} onChange={e => setForm({...form, order_id: e.target.value})}>
                                        <option value="">— Aucune fiche associée —</option>
                                        {fiches.map(f => (
                                            <option key={f.id} value={f.id}>
                                                {f.fiche_name || f.company_name}{f.city ? ` — ${f.city}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <small style={{ marginBottom: 12, display: 'block' }}>En associant une fiche, les guides verront cet avis directement sur la page de la fiche.</small>
                                </>
                            )}
                            <label>URL de l'avis Google</label>
                            <input value={form.google_review_url} onChange={e => setForm({...form, google_review_url: e.target.value})} placeholder="https://www.google.com/maps/..." />

                            <label>Raison du signalement</label>
                            <select value={form.raison} onChange={e => setForm({...form, raison: e.target.value})}>
                                {Object.entries(SIGNALEMENT_RAISONS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                            <small>{SIGNALEMENT_RAISONS_DESCRIPTIONS[form.raison as keyof typeof SIGNALEMENT_RAISONS_DESCRIPTIONS]}</small>

                            <label>Précisions (optionnel)</label>
                            <textarea value={form.raison_details} onChange={e => setForm({...form, raison_details: e.target.value})} rows={3} placeholder="Contexte ou précision pour aider les guides…" />

                            <div className="art-sig-modal-actions">
                                <button onClick={() => setModalOpen(false)} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '0.6rem 1.2rem', borderRadius: 8, cursor: 'pointer' }}>Annuler</button>
                                <button onClick={submit} disabled={submitting}
                                    style={{ background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                                    {submitting ? 'Envoi…' : 'Soumettre'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default ArtisanSignalementDashboard;
