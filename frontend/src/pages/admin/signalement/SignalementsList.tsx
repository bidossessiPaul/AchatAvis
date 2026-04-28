import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import {
    Flag, ExternalLink, CheckCircle2, XCircle, RefreshCw, Edit3,
} from 'lucide-react';
import { showSuccess, showError, showConfirm } from '../../../utils/Swal';
import Swal from 'sweetalert2';
import { adminAvisApi, adminValidationsApi } from '../../../services/signalement';
import type { SignalementAvis, GlobalSignalementStats } from '../../../types/signalement';
import { SIGNALEMENT_RAISONS } from '../../../constants/signalementRaisons';
import './signalement-admin.css';

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
    active: { label: 'En cours', cls: 'sig-badge-active' },
    terminated_success: { label: 'Succès Google', cls: 'sig-badge-success' },
    terminated_inconclusive: { label: 'Non concluant', cls: 'sig-badge-inconclusive' },
    cancelled_by_admin: { label: 'Annulé', cls: 'sig-badge-cancelled' },
};

export const SignalementsList: React.FC = () => {
    const [avis, setAvis] = useState<SignalementAvis[]>([]);
    const [stats, setStats] = useState<GlobalSignalementStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });

    useEffect(() => { load(); }, [statusFilter, page]);

    const load = async () => {
        setLoading(true);
        try {
            const [list, s] = await Promise.all([
                adminAvisApi.list({ status: statusFilter || undefined, page, limit: 50 }),
                adminValidationsApi.stats(),
            ]);
            setAvis(list.avis);
            setPagination(list.pagination);
            setStats(s);
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    };

    const editPayout = async (a: SignalementAvis) => {
        const { value } = await Swal.fire({
            title: 'Modifier le payout',
            input: 'number',
            inputLabel: 'Payout par signalement (€)',
            inputValue: (a.payout_per_signalement_cents / 100).toFixed(2),
            inputAttributes: { min: '0', step: '0.01' },
            showCancelButton: true,
            confirmButtonText: 'Enregistrer',
            cancelButtonText: 'Annuler',
        });
        if (value === undefined || value === '') return;
        const cents = Math.round(parseFloat(value) * 100);
        try {
            await adminAvisApi.updatePayout(a.id, cents);
            showSuccess('Payout mis à jour');
            load();
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        }
    };

    const markGoogleDeleted = async (a: SignalementAvis) => {
        const ok = await showConfirm('Marquer comme supprimé ?', 'Cet avis sera fermé en succès. Les slots restants ne seront plus signalables.');
        if (!ok.isConfirmed) return;
        try {
            await adminAvisApi.markGoogleDeleted(a.id);
            showSuccess('Avis fermé en succès');
            load();
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        }
    };

    const cancelAvis = async (a: SignalementAvis) => {
        const result = await Swal.fire({
            title: 'Annuler cet avis ?',
            html: 'Voulez-vous <strong>restituer 1 slot</strong> à l\'artisan ?',
            icon: 'warning',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Annuler + restituer slot',
            denyButtonText: 'Annuler sans restituer',
            cancelButtonText: 'Ne rien faire',
        });
        if (result.isDismissed) return;
        const refund = result.isConfirmed;
        try {
            await adminAvisApi.cancel(a.id, refund);
            showSuccess('Avis annulé');
            load();
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        }
    };

    return (
        <DashboardLayout>
            <div className="sig-admin-page">
                <div className="sig-admin-header">
                    <div>
                        <h1><Flag size={20} /> Avis à signaler</h1>
                        <p>Vue globale des avis Google soumis par les artisans.</p>
                    </div>
                </div>

                {stats && (
                    <div className="sig-stats-bar">
                        <div className="sig-stat-card"><div className="label">Avis actifs</div><div className="value">{stats.avis_active}</div></div>
                        <div className="sig-stat-card alt-blue"><div className="label">Succès Google</div><div className="value">{stats.avis_terminated_success}</div></div>
                        <div className="sig-stat-card alt-orange"><div className="label">Non concluants</div><div className="value">{stats.avis_terminated_inconclusive}</div></div>
                        <div className="sig-stat-card alt-purple"><div className="label">Validés ce mois</div><div className="value">{stats.signalements_validated_this_month}</div></div>
                    </div>
                )}

                <div className="sig-filters">
                    <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                        <option value="">Tous statuts</option>
                        <option value="active">En cours</option>
                        <option value="terminated_success">Succès Google</option>
                        <option value="terminated_inconclusive">Non concluant</option>
                        <option value="cancelled_by_admin">Annulé</option>
                    </select>
                </div>

                {loading ? <LoadingSpinner /> : avis.length === 0 ? (
                    <div className="sig-empty">Aucun avis à signaler.</div>
                ) : (
                    <div className="sig-table-wrap">
                        <table className="sig-table">
                            <thead>
                                <tr>
                                    <th>Artisan</th>
                                    <th>URL Google</th>
                                    <th>Raison</th>
                                    <th>Compteur</th>
                                    <th>Payout</th>
                                    <th>Statut</th>
                                    <th>Créé</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {avis.map(a => {
                                    const st = STATUS_LABELS[a.status] || { label: a.status, cls: '' };
                                    return (
                                        <tr key={a.id}>
                                            <td><Link to={`/admin/artisans/${a.artisan_id}`}>{a.artisan_id.slice(0, 8)}…</Link></td>
                                            <td>
                                                <a href={a.google_review_url} target="_blank" rel="noreferrer" title={a.google_review_url}>
                                                    <ExternalLink size={14} /> Lien
                                                </a>
                                            </td>
                                            <td><span className="sig-badge sig-badge-pending">{SIGNALEMENT_RAISONS[a.raison] || a.raison}</span></td>
                                            <td>{a.nb_signalements_validated} / {a.nb_signalements_target}</td>
                                            <td>
                                                {(a.payout_per_signalement_cents / 100).toFixed(2)} €
                                                <button className="sig-btn sig-btn-ghost" onClick={() => editPayout(a)} title="Éditer payout">
                                                    <Edit3 size={12} />
                                                </button>
                                            </td>
                                            <td><span className={`sig-badge ${st.cls}`}>{st.label}</span></td>
                                            <td>{new Date(a.created_at).toLocaleDateString('fr-FR')}</td>
                                            <td>
                                                {a.status === 'active' && (
                                                    <>
                                                        <button className="sig-btn sig-btn-ghost" onClick={() => markGoogleDeleted(a)} title="Google a supprimé">
                                                            <CheckCircle2 size={14} color="#059669" />
                                                        </button>
                                                        <button className="sig-btn sig-btn-ghost" onClick={() => cancelAvis(a)} title="Annuler">
                                                            <XCircle size={14} color="#dc2626" />
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {pagination.total_pages > 1 && (
                    <div className="sig-pagination">
                        <span>{((page - 1) * 50) + 1}–{Math.min(page * 50, pagination.total)} sur {pagination.total}</span>
                        <div>
                            <button className="sig-btn sig-btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Précédent</button>
                            <button className="sig-btn sig-btn-secondary" disabled={page >= pagination.total_pages} onClick={() => setPage(page + 1)} style={{ marginLeft: 8 }}>
                                Suivant <RefreshCw size={12} style={{ display: 'none' }} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default SignalementsList;
