import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import {
    CheckCircle2,
    XCircle,
    Search,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    DollarSign,
    Filter,
    X,
    RefreshCw,
    Users,
    Globe,
} from 'lucide-react';
import { showSuccess, showError } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import api from '../../services/api';

interface GeoSubmission {
    id: number;
    guide_id: string;
    guide_name: string;
    guide_email: string;
    platform_id: number;
    platform_name: string;
    platform_category: string;
    mission_id: number;
    mission_name: string;
    submission_url: string;
    screenshot_url: string | null;
    status: 'pending' | 'validated' | 'rejected';
    rejection_reason: string | null;
    earnings: number;
    submitted_at: string;
    validated_at: string | null;
}

interface Mission {
    id: number;
    name: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
    annuaire: { bg: '#dbeafe', color: '#1e40af' },
    forum: { bg: '#ede9fe', color: '#6d28d9' },
    social: { bg: '#fce7f3', color: '#9d174d' },
    blog: { bg: '#d1fae5', color: '#065f46' },
};

const CATEGORY_LABELS: Record<string, string> = {
    annuaire: 'Annuaire',
    forum: 'Forum',
    social: 'Social',
    blog: 'Blog',
};

export const AdminGeoSubmissions: React.FC = () => {
    const [submissions, setSubmissions] = useState<GeoSubmission[]>([]);
    const [missions, setMissions] = useState<Mission[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [missionFilter, setMissionFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);

    useEffect(() => {
        fetchSubmissions();
        fetchMissions();
    }, []);

    const fetchSubmissions = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data } = await api.get('/geo/admin/submissions');
            setSubmissions(data);
        } catch {
            showError('Chargement impossible', 'Erreur lors du chargement des soumissions');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const fetchMissions = async () => {
        try {
            const { data } = await api.get('/geo/admin/missions');
            setMissions(data);
        } catch {
            // Silencieux
        }
    };

    const handleValidate = async (id: number) => {
        setIsActionLoading(true);
        try {
            await api.put(`/geo/admin/submissions/${id}`, { status: 'validated' });
            showSuccess('Soumission validée');
            fetchSubmissions(true);
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || 'Impossible de valider cette soumission');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleOpenRejectModal = (id: number) => {
        setSelectedId(id);
        setRejectionReason('');
        setShowRejectModal(true);
    };

    const handleConfirmReject = async () => {
        if (!selectedId || !rejectionReason.trim()) return;
        setIsActionLoading(true);
        try {
            // Le backend attend rejectionReason (camelCase) — snake_case renvoyait un 400
            await api.put(`/geo/admin/submissions/${selectedId}`, { status: 'rejected', rejectionReason: rejectionReason.trim() });
            showSuccess('Soumission rejetée');
            setShowRejectModal(false);
            setRejectionReason('');
            setSelectedId(null);
            fetchSubmissions(true);
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || 'Impossible de rejeter cette soumission');
        } finally {
            setIsActionLoading(false);
        }
    };

    const filtered = submissions.filter(s => {
        const term = searchTerm.toLowerCase().trim();
        const matchSearch = !term || s.guide_name.toLowerCase().includes(term) || s.guide_email.toLowerCase().includes(term) || s.platform_name.toLowerCase().includes(term) || s.mission_name.toLowerCase().includes(term);
        const matchStatus = statusFilter === 'all' || s.status === statusFilter;
        const matchMission = missionFilter === 'all' || String(s.mission_id) === missionFilter;
        return matchSearch && matchStatus && matchMission;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, missionFilter]);

    const totalEarnings = submissions.filter(s => s.status === 'validated').reduce((sum, s) => sum + s.earnings, 0);

    const stats = {
        total: submissions.length,
        pending: submissions.filter(s => s.status === 'pending').length,
        validated: submissions.filter(s => s.status === 'validated').length,
        rejected: submissions.filter(s => s.status === 'rejected').length,
        totalEarnings,
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.65rem 0.85rem',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        fontSize: '0.875rem',
        outline: 'none',
        boxSizing: 'border-box',
    };

    return (
        <DashboardLayout title="Soumissions GEO">
            <div style={{ padding: '0 0 3rem' }}>
                {/* Stats bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    {[
                        { label: 'Total', value: stats.total, color: '#2383e2', bg: '#eff6ff' },
                        { label: 'En attente', value: stats.pending, color: '#d97706', bg: '#fffbeb' },
                        { label: 'Validées', value: stats.validated, color: '#059669', bg: '#f0fdf4' },
                        { label: 'Rejetées', value: stats.rejected, color: '#dc2626', bg: '#fef2f2' },
                        { label: 'Gains versés', value: `${Number(stats.totalEarnings).toFixed(2)} €`, color: '#7c3aed', bg: '#ede9fe' },
                    ].map(stat => (
                        <div key={stat.label} style={{ background: stat.bg, borderRadius: '1rem', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: typeof stat.value === 'string' ? '1.2rem' : '1.75rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginTop: '2px' }}>{stat.label}</div>
                        </div>
                    ))}
                </div>

                <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Soumissions de citations</h2>
                            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748b' }}>{filtered.length} soumission{filtered.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input type="text" placeholder="Guide, plateforme, mission..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...inputStyle, paddingLeft: '2rem', width: '260px' }} />
                            </div>
                            <div style={{ position: 'relative' }}>
                                <Filter size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 'auto', paddingLeft: '2rem', cursor: 'pointer' }}>
                                    <option value="all">Tous statuts</option>
                                    <option value="pending">En attente</option>
                                    <option value="validated">Validées</option>
                                    <option value="rejected">Rejetées</option>
                                </select>
                            </div>
                            <select value={missionFilter} onChange={e => setMissionFilter(e.target.value)} style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}>
                                <option value="all">Toutes missions</option>
                                {missions.map(m => (
                                    <option key={m.id} value={String(m.id)}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center' }}>
                            <LoadingSpinner size="lg" text="Chargement..." />
                        </div>
                    ) : paginated.length === 0 ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                            <Globe size={48} style={{ opacity: 0.2, margin: '0 auto 1rem', display: 'block' }} />
                            <p style={{ fontWeight: 500 }}>Aucune soumission trouvée</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        {['Guide', 'Plateforme', 'Mission', 'URL soumise', 'Capture', 'Date', 'Statut', 'Actions'].map(h => (
                                            <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map(s => {
                                        const catColor = CATEGORY_COLORS[s.platform_category] ?? { bg: '#f1f5f9', color: '#64748b' };
                                        return (
                                            <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '0.875rem 1rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Users size={14} color="#64748b" />
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>{s.guide_name}</div>
                                                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{s.guide_email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '0.875rem 1rem' }}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>{s.platform_name}</div>
                                                    <span style={{ padding: '0.15rem 0.5rem', borderRadius: '1rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', background: catColor.bg, color: catColor.color }}>
                                                        {CATEGORY_LABELS[s.platform_category] ?? s.platform_category}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '0.875rem 1rem', maxWidth: '180px' }}>
                                                    <div style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.mission_name}>
                                                        {s.mission_name}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '0.875rem 1rem' }}>
                                                    <a href={s.submission_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#2383e2', fontSize: '0.8rem', textDecoration: 'none', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.submission_url}>
                                                        <ExternalLink size={12} />
                                                        {s.submission_url.replace(/^https?:\/\//, '').slice(0, 35)}{s.submission_url.length > 40 ? '…' : ''}
                                                    </a>
                                                </td>
                                                <td style={{ padding: '0.875rem 1rem' }}>
                                                    {s.screenshot_url ? (
                                                        <a href={s.screenshot_url} target="_blank" rel="noopener noreferrer">
                                                            <img
                                                                src={s.screenshot_url}
                                                                alt="Capture preuve"
                                                                style={{ width: '64px', height: '44px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'block' }}
                                                            />
                                                        </a>
                                                    ) : (
                                                        <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>—</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '0.875rem 1rem' }}>
                                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                                                        {new Date(s.submitted_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                                        {new Date(s.submitted_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '0.875rem 1rem' }}>
                                                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', background: s.status === 'validated' ? '#dcfce7' : s.status === 'rejected' ? '#fee2e2' : '#fef3c7', color: s.status === 'validated' ? '#166534' : s.status === 'rejected' ? '#991b1b' : '#92400e' }}>
                                                        {s.status === 'pending' ? 'En attente' : s.status === 'validated' ? 'Validée' : 'Rejetée'}
                                                    </span>
                                                    {s.status === 'validated' && s.earnings > 0 && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px', fontSize: '0.7rem', fontWeight: 700, color: '#7c3aed' }}>
                                                            <DollarSign size={10} />
                                                            {Number(s.earnings).toFixed(2)} €
                                                        </div>
                                                    )}
                                                    {s.status === 'rejected' && s.rejection_reason && (
                                                        <div style={{ fontSize: '0.65rem', color: '#dc2626', marginTop: '3px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.rejection_reason}>
                                                            {s.rejection_reason}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '0.875rem 1rem' }}>
                                                    {s.status === 'pending' && (
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <button onClick={() => handleValidate(s.id)} disabled={isActionLoading} title="Valider" style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#f0fdf4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isActionLoading ? 0.6 : 1 }}>
                                                                <CheckCircle2 size={16} color="#16a34a" />
                                                            </button>
                                                            <button onClick={() => handleOpenRejectModal(s.id)} disabled={isActionLoading} title="Rejeter" style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#fff1f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isActionLoading ? 0.6 : 1 }}>
                                                                <XCircle size={16} color="#dc2626" />
                                                            </button>
                                                        </div>
                                                    )}
                                                    {s.status !== 'pending' && s.validated_at && (
                                                        <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                                            {new Date(s.validated_at).toLocaleDateString('fr-FR')}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && filtered.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>{startIndex + 1}–{Math.min(startIndex + itemsPerPage, filtered.length)} sur {filtered.length}</span>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: currentPage === 1 ? '#f1f5f9' : 'white', color: currentPage === 1 ? '#94a3b8' : '#374151', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 600 }}>
                                    <ChevronLeft size={16} />Précédent
                                </button>
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', padding: '0 0.5rem' }}>Page {currentPage} / {totalPages}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: currentPage === totalPages ? '#f1f5f9' : 'white', color: currentPage === totalPages ? '#94a3b8' : '#374151', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 600 }}>
                                    Suivant<ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal rejet */}
            {showRejectModal && (
                <div onClick={() => setShowRejectModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '1.25rem', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '0.75rem', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <XCircle size={20} color="#dc2626" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Rejeter la soumission</h3>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Précisez le motif pour le guide</p>
                                </div>
                            </div>
                            <button onClick={() => setShowRejectModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                <X size={22} />
                            </button>
                        </div>
                        <div style={{ padding: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                                Motif du rejet *
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                                placeholder="Ex: URL incorrecte, citation introuvable sur la plateforme..."
                                rows={4}
                                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1.25rem 1.5rem', borderTop: '1px solid #f1f5f9' }}>
                            <button onClick={() => setShowRejectModal(false)} style={{ padding: '0.65rem 1.25rem', borderRadius: '0.625rem', border: '1px solid #e2e8f0', background: 'white', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
                                Annuler
                            </button>
                            <button onClick={handleConfirmReject} disabled={!rejectionReason.trim() || isActionLoading} style={{ padding: '0.65rem 1.5rem', borderRadius: '0.625rem', border: 'none', background: '#dc2626', color: 'white', fontWeight: 700, cursor: !rejectionReason.trim() || isActionLoading ? 'not-allowed' : 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px', opacity: !rejectionReason.trim() || isActionLoading ? 0.6 : 1 }}>
                                {isActionLoading && <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                                Confirmer le rejet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};
