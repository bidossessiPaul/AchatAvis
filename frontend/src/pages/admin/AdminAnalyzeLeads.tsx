import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Search, ExternalLink, Globe, AlertTriangle, TrendingUp, Calendar, Star } from 'lucide-react';
import api from '../../services/api';

interface AnalyzeLead {
    id: string;
    business_name: string;
    address: string;
    rating: number;
    review_count: number;
    category_label: string;
    verdict: string;
    scores_validation: number;
    scores_seo: number;
    scores_difficulty: number;
    has_website: number;
    has_spike: number;
    ip_address: string;
    created_at: string;
}

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'https://achat-avis-fondend.vercel.app';

const verdictColor: Record<string, { bg: string; color: string }> = {
    Facile:   { bg: '#dcfce7', color: '#166534' },
    Modéré:   { bg: '#fef3c7', color: '#92400e' },
    Difficile:{ bg: '#fee2e2', color: '#991b1b' },
    Expert:   { bg: '#ede9fe', color: '#6d28d9' },
};

export const AdminAnalyzeLeads: React.FC = () => {
    const [rows, setRows]     = useState<AnalyzeLead[]>([]);
    const [total, setTotal]   = useState(0);
    const [page, setPage]     = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const limit = 20;

    const load = useCallback(async (p: number, q: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(p), limit: String(limit) });
            if (q) params.set('search', q);
            const res = await api.get(`/admin/analyze-leads?${params}`);
            setRows(res.data.rows);
            setTotal(res.data.total);
        } catch {
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(page, search); }, [page, search, load]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const openReport = (id: string) => {
        window.open(`${FRONTEND_URL}/analyseur-de-fiche-google.html?report_id=${id}`, '_blank');
    };

    const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const totalPages = Math.ceil(total / limit);

    return (
        <DashboardLayout>
            <div style={{ padding: '2rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Analyses de fiches Google</h1>
                        <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '0.9rem' }}>{total} analyse{total !== 1 ? 's' : ''} enregistrée{total !== 1 ? 's' : ''}</p>
                    </div>
                </div>

                {/* KPI cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    {[
                        { label: 'Total analyses', value: total, icon: <TrendingUp size={20} />, color: '#059669' },
                        { label: 'Avec pic suspect', value: rows.filter(r => r.has_spike).length, icon: <AlertTriangle size={20} />, color: '#d97706' },
                        { label: 'Sans site web', value: rows.filter(r => !r.has_website).length, icon: <Globe size={20} />, color: '#2563eb' },
                    ].map(k => (
                        <div key={k.label} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ background: k.color + '18', borderRadius: '0.625rem', padding: '0.5rem', color: k.color }}>{k.icon}</div>
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{k.value}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{k.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Recherche */}
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Search size={16} color="#94a3b8" />
                    <input
                        type="text"
                        placeholder="Rechercher par nom ou adresse…"
                        value={search}
                        onChange={handleSearch}
                        style={{ border: 'none', outline: 'none', flex: 1, fontSize: '0.9rem', color: '#0f172a', background: 'transparent' }}
                    />
                </div>

                {/* Table */}
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '1rem', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                {['Fiche', 'Note / Avis', 'Scores', 'Verdict', 'IP', 'Date', ''].map(h => (
                                    <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Chargement…</td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Aucune analyse trouvée</td></tr>
                            ) : rows.map(r => {
                                const vc = verdictColor[r.verdict] || { bg: '#f1f5f9', color: '#475569' };
                                return (
                                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }} onMouseEnter={e => (e.currentTarget.style.background = '#fafbfc')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                                        <td style={{ padding: '0.875rem 1.25rem', maxWidth: '220px' }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.business_name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.category_label}</div>
                                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                                                {!!r.has_website && <span style={{ color: '#059669', marginRight: '6px' }}>Site web</span>}
                                                {!!r.has_spike && <span style={{ color: '#d97706' }}>Pic suspect</span>}
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.875rem 1.25rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                                                <Star size={13} color="#f59e0b" fill="#f59e0b" />{Number(r.rating).toFixed(1)}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{r.review_count} avis</div>
                                        </td>
                                        <td style={{ padding: '0.875rem 1.25rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Validation <strong style={{ color: '#059669' }}>{r.scores_validation}%</strong></div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SEO <strong style={{ color: '#2563eb' }}>{r.scores_seo}/100</strong></div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Difficulté <strong style={{ color: '#f97316' }}>{r.scores_difficulty}/100</strong></div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.875rem 1.25rem' }}>
                                            <span style={{ background: vc.bg, color: vc.color, padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>{r.verdict}</span>
                                        </td>
                                        <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>{r.ip_address || '—'}</td>
                                        <td style={{ padding: '0.875rem 1.25rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b' }}>
                                                <Calendar size={12} />{formatDate(r.created_at)}
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.875rem 1.25rem' }}>
                                            <button
                                                onClick={() => openReport(r.id)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.45rem 0.85rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                            >
                                                <ExternalLink size={13} />Voir rapport
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} sur {total}
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                style={{ padding: '0.4rem 0.9rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: 'white', cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? '#94a3b8' : '#0f172a', fontWeight: 600, fontSize: '0.85rem' }}>
                                Précédent
                            </button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                style={{ padding: '0.4rem 0.9rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: 'white', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: page === totalPages ? '#94a3b8' : '#0f172a', fontWeight: 600, fontSize: '0.85rem' }}>
                                Suivant
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};
