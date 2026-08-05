import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminService } from '../../services/adminService';
import {
    History,
    CheckCircle,
    XCircle,
    Clock,
    Wallet,
    ChevronLeft,
    Users,
    Download,
    Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showError } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './AdminLists.css';

interface SessionResume {
    id: string;
    label: string | null;
    status: 'open' | 'closed';
    opened_at: string;
    closed_at: string | null;
    opened_by_name: string | null;
    closed_by_name: string | null;
    // Statistiques figées à la fermeture
    stats_guides_total: number;
    stats_paid_count: number;
    stats_failed_count: number;
    stats_pending_count: number;
    stats_amount_due: number;
    stats_amount_paid: number;
    // Compteurs recalculés en direct — seuls pertinents pour une session ouverte
    live_paid_count: number;
    live_failed_count: number;
    live_pending_count: number;
    live_amount_due: number;
    live_amount_paid: number;
}

interface SessionLine {
    id: string;
    guide_id: string;
    guide_name: string | null;
    guide_name_snapshot: string | null;
    google_email: string | null;
    amount_due: number;
    amount_paid: number;
    status: 'pending' | 'paid' | 'partial' | 'failed';
    failure_reason_label: string | null;
    failure_note: string | null;
    processed_at: string | null;
    payout_method_snapshot: string | null;
}

const STATUT_STYLES: Record<string, { bg: string; color: string; texte: string }> = {
    pending: { bg: '#fef3c7', color: '#92400e', texte: 'Non traité' },
    paid: { bg: '#dcfce7', color: '#166534', texte: 'Payé' },
    partial: { bg: '#ede9fe', color: '#6d28d9', texte: 'Partiel' },
    failed: { bg: '#fee2e2', color: '#991b1b', texte: 'Non payé' },
};

const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

export const PaymentSessions: React.FC = () => {
    const [sessions, setSessions] = useState<SessionResume[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [detail, setDetail] = useState<any | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        setIsLoading(true);
        try {
            setSessions(await adminService.listPaymentSessions());
        } catch {
            showError('Chargement impossible', 'Impossible de charger l\'historique des paiements.');
        } finally {
            setIsLoading(false);
        }
    };

    const ouvrirDetail = async (sessionId: string) => {
        setIsLoadingDetail(true);
        try {
            setDetail(await adminService.getPaymentSession(sessionId));
        } catch {
            showError('Chargement impossible', 'Impossible de charger le détail de cette session.');
        } finally {
            setIsLoadingDetail(false);
        }
    };

    // Une session ouverte n'a pas encore de statistiques figées : on lit les
    // compteurs recalculés à la volée.
    const stats = (s: SessionResume) => s.status === 'closed'
        ? {
            total: s.stats_guides_total,
            payes: s.stats_paid_count,
            echecs: s.stats_failed_count,
            nonTraites: s.stats_pending_count,
            du: Number(s.stats_amount_due),
            verse: Number(s.stats_amount_paid),
        }
        : {
            total: Number(s.live_paid_count) + Number(s.live_failed_count) + Number(s.live_pending_count),
            payes: Number(s.live_paid_count),
            echecs: Number(s.live_failed_count),
            nonTraites: Number(s.live_pending_count),
            du: Number(s.live_amount_due),
            verse: Number(s.live_amount_paid),
        };

    const exportDetailCSV = () => {
        if (!detail) return;
        const headers = ['Guide', 'Email', 'Moyen', 'Montant dû (€)', 'Montant payé (€)', 'Statut', 'Raison', 'Précision', 'Traité le'];
        const escape = (v: string) => {
            const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
            return (safe.includes(',') || safe.includes('"') || safe.includes('\n'))
                ? `"${safe.replace(/"/g, '""')}"`
                : safe;
        };
        const rows = (detail.lines as SessionLine[]).map(l => [
            escape(l.guide_name || l.guide_name_snapshot || ''),
            escape(l.google_email || ''),
            escape(l.payout_method_snapshot || ''),
            Number(l.amount_due).toFixed(2),
            Number(l.amount_paid).toFixed(2),
            escape(STATUT_STYLES[l.status]?.texte || l.status),
            escape(l.failure_reason_label || ''),
            escape(l.failure_note || ''),
            escape(l.processed_at ? new Date(l.processed_at).toLocaleString('fr-FR') : ''),
        ].join(','));

        const csv = '﻿' + [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `session-paiement-${(detail.opened_at || '').slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // --- Vue détail d'une session ---
    if (detail) {
        const lignes: SessionLine[] = detail.lines || [];
        const payes = lignes.filter(l => l.status === 'paid' || l.status === 'partial');
        const echecs = lignes.filter(l => l.status === 'failed');
        const nonTraites = lignes.filter(l => l.status === 'pending');
        const verse = lignes.reduce((s, l) => s + Number(l.amount_paid), 0);
        const du = lignes.reduce((s, l) => s + Number(l.amount_due), 0);

        return (
            <DashboardLayout title="Détail de la session de paiement">
                <div className="admin-dashboard revamped">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => setDetail(null)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '0.5rem 1rem', borderRadius: '8px',
                                border: '1px solid var(--gray-300)', background: 'white',
                                fontWeight: 700, fontSize: '0.85rem', color: 'var(--gray-700)', cursor: 'pointer'
                            }}
                        >
                            <ChevronLeft size={16} />
                            Retour à l'historique
                        </button>
                        <button
                            onClick={exportDetailCSV}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
                                background: 'linear-gradient(135deg, #0369a1, #0284c7)',
                                color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                            }}
                        >
                            <Download size={16} />
                            Exporter CSV
                        </button>
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                            {detail.label || 'Session de paiement'}
                        </h2>
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                            Ouverte le {formatDate(detail.opened_at)}
                            {detail.opened_by_name ? ` par ${detail.opened_by_name}` : ''}
                            {detail.status === 'closed'
                                ? ` · fermée le ${formatDate(detail.closed_at)}${detail.closed_by_name ? ` par ${detail.closed_by_name}` : ''}`
                                : ' · encore ouverte'}
                        </p>
                    </div>

                    {/* Statistiques */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                        {[
                            { valeur: lignes.length, label: 'Guides dans la liste', gradient: 'linear-gradient(135deg, #475569, #334155)' },
                            { valeur: payes.length, label: 'Payés', gradient: 'linear-gradient(135deg, #059669, #047857)' },
                            { valeur: echecs.length, label: 'Non payés', gradient: 'linear-gradient(135deg, #dc2626, #b91c1c)' },
                            { valeur: nonTraites.length, label: 'Non traités', gradient: 'linear-gradient(135deg, #d97706, #b45309)' },
                        ].map(kpi => (
                            <div key={kpi.label} style={{
                                background: kpi.gradient, borderRadius: '1rem',
                                padding: '1.25rem 1.5rem', color: 'white', flex: 1, minWidth: '150px'
                            }}>
                                <div style={{ fontSize: '2rem', fontWeight: 800 }}>{kpi.valeur}</div>
                                <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 600 }}>{kpi.label}</div>
                            </div>
                        ))}
                        <div style={{
                            background: 'linear-gradient(135deg, #0891b2, #0e7490)', borderRadius: '1rem',
                            padding: '1.25rem 1.5rem', color: 'white', flex: 1, minWidth: '190px'
                        }}>
                            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{verse.toFixed(2)}€</div>
                            <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 600 }}>
                                Versé sur {du.toFixed(2)}€ dus
                            </div>
                        </div>
                    </div>

                    <div className="admin-table-container">
                        <table className="admin-modern-table">
                            <thead>
                                <tr>
                                    <th>Guide</th>
                                    <th>Moyen</th>
                                    <th>Montant dû</th>
                                    <th>Montant payé</th>
                                    <th>Statut</th>
                                    <th>Raison</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lignes.map(l => {
                                    const s = STATUT_STYLES[l.status];
                                    return (
                                        <tr key={l.id}>
                                            <td>
                                                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                                                    {l.guide_name || l.guide_name_snapshot || 'Guide supprimé'}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                                                    {l.google_email || '—'}
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>
                                                {l.payout_method_snapshot || '—'}
                                            </td>
                                            <td style={{ fontWeight: 700 }}>{Number(l.amount_due).toFixed(2)}€</td>
                                            <td style={{ fontWeight: 800, color: Number(l.amount_paid) > 0 ? '#059669' : 'var(--gray-400)' }}>
                                                {Number(l.amount_paid).toFixed(2)}€
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '0.2rem 0.6rem', borderRadius: '1rem',
                                                    fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                                                    backgroundColor: s.bg, color: s.color
                                                }}>
                                                    {s.texte}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.8rem', color: 'var(--gray-600)', maxWidth: '260px' }}>
                                                {l.failure_reason_label || '—'}
                                                {l.failure_note && (
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: '2px', fontStyle: 'italic' }}>
                                                        {l.failure_note}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    // --- Liste des sessions ---
    return (
        <DashboardLayout title="Historique des paiements">
            <div className="admin-dashboard revamped">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                        Chaque session correspond à une vague de virements. Clique sur une ligne pour voir qui a été payé et pourquoi certains ne l'ont pas été.
                    </p>
                    <button
                        onClick={() => navigate('/admin/guides-balances')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '0.5rem 1rem', borderRadius: '8px',
                            border: '1px solid var(--gray-300)', background: 'white',
                            fontWeight: 700, fontSize: '0.85rem', color: 'var(--gray-700)', cursor: 'pointer'
                        }}
                    >
                        <Wallet size={16} />
                        Soldes des guides
                    </button>
                </div>

                <div className="admin-table-container">
                    {isLoading || isLoadingDetail ? (
                        <div className="admin-loading">
                            <LoadingSpinner size="lg" text="Chargement de l'historique..." />
                        </div>
                    ) : sessions.length === 0 ? (
                        <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                            <History size={40} style={{ color: 'var(--gray-300)' }} />
                            <p style={{ marginTop: '0.75rem', fontWeight: 700, color: 'var(--gray-700)' }}>
                                Aucune session de paiement
                            </p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                                Ouvre ta première session depuis l'écran des soldes guides.
                            </p>
                        </div>
                    ) : (
                        <table className="admin-modern-table">
                            <thead>
                                <tr>
                                    <th>Session</th>
                                    <th>Guides</th>
                                    <th>Payés</th>
                                    <th>Non payés</th>
                                    <th>Montant versé</th>
                                    <th>État</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map(s => {
                                    const st = stats(s);
                                    return (
                                        <tr
                                            key={s.id}
                                            onClick={() => ouvrirDetail(s.id)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td>
                                                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                                                    {s.label || 'Session de paiement'}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                                                    {formatDate(s.opened_at)}
                                                    {s.closed_at ? ` → ${formatDate(s.closed_at)}` : ''}
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}>
                                                    <Users size={14} style={{ color: 'var(--gray-400)' }} />
                                                    {st.total}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#166534', fontWeight: 700 }}>
                                                    <CheckCircle size={14} />
                                                    {st.payes}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: st.echecs > 0 ? '#991b1b' : 'var(--gray-400)', fontWeight: 700 }}>
                                                    <XCircle size={14} />
                                                    {st.echecs}
                                                    {st.nonTraites > 0 && (
                                                        <span style={{ fontSize: '0.7rem', color: '#92400e', fontWeight: 600 }}>
                                                            (+{st.nonTraites} non traités)
                                                        </span>
                                                    )}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 800, color: '#059669' }}>{st.verse.toFixed(2)}€</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>
                                                    sur {st.du.toFixed(2)}€
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                    padding: '0.2rem 0.6rem', borderRadius: '1rem',
                                                    fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                                                    backgroundColor: s.status === 'open' ? '#fef3c7' : '#dcfce7',
                                                    color: s.status === 'open' ? '#92400e' : '#166534'
                                                }}>
                                                    {s.status === 'open' ? <Clock size={12} /> : <Lock size={12} />}
                                                    {s.status === 'open' ? 'En cours' : 'Fermée'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};
