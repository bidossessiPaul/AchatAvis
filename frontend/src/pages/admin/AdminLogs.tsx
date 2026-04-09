import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminApi } from '../../services/api';
import { ChevronLeft, ChevronRight, Activity, Filter, CheckCircle, XCircle, UserCog, Unlock, Trash2, Award, XOctagon, RefreshCw, Sparkles } from 'lucide-react';

interface AdminLog {
    id: number;
    admin_id: number;
    action: string;
    target_type: string;
    target_id?: string;
    details?: any;
    ip_address?: string;
    created_at: string;
    admin_name?: string;
    admin_email?: string;
}

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    VALIDATE_SUBMISSION: { label: 'Avis validé', color: '#166534', bg: '#dcfce7', icon: <CheckCircle size={14} /> },
    REJECT_SUBMISSION: { label: 'Avis rejeté', color: '#991b1b', bg: '#fee2e2', icon: <XCircle size={14} /> },
    UPDATE_USER_STATUS: { label: 'Statut modifié', color: '#92400e', bg: '#fef3c7', icon: <UserCog size={14} /> },
    UNBLOCK_GUIDE: { label: 'Guide débloqué', color: '#0e7490', bg: '#cffafe', icon: <Unlock size={14} /> },
    DELETE_USER: { label: 'Compte supprimé', color: '#991b1b', bg: '#fee2e2', icon: <Trash2 size={14} /> },
    APPROVE_LEVEL: { label: 'Niveau approuvé', color: '#166534', bg: '#dcfce7', icon: <Award size={14} /> },
    REJECT_LEVEL: { label: 'Niveau refusé', color: '#991b1b', bg: '#fee2e2', icon: <XOctagon size={14} /> },
    BULK_REVALIDATE: { label: 'Revalidation masse', color: '#5b21b6', bg: '#ede9fe', icon: <RefreshCw size={14} /> },
    REGENERATE_PROPOSAL: { label: 'Régénération IA', color: '#7c3aed', bg: '#ede9fe', icon: <Sparkles size={14} /> },
};

const ALL_ACTIONS = Object.keys(ACTION_CONFIG);

const formatDetails = (action: string, details: any): React.ReactNode => {
    if (!details || Object.keys(details).length === 0) return null;
    try {
        const d = typeof details === 'string' ? JSON.parse(details) : details;
        switch (action) {
            case 'REJECT_SUBMISSION':
                return d.rejectionReason ? d.rejectionReason : null;
            case 'UPDATE_USER_STATUS':
                return (
                    <span>
                        <strong>{d.status}</strong>
                        {d.reason && <span style={{ color: '#64748b' }}> — {d.reason}</span>}
                    </span>
                );
            case 'APPROVE_LEVEL':
            case 'REJECT_LEVEL':
                return d.admin_notes || null;
            case 'BULK_REVALIDATE':
                return <span><strong>{d.count}</strong> avis revalidés</span>;
            default:
                return null;
        }
    } catch {
        return null;
    }
};

const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);

    if (diffMin < 1) return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin}min`;
    if (diffH < 24) return `il y a ${diffH}h`;
    if (diffD < 7) return `il y a ${diffD}j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

const formatFullDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
};

export const AdminLogs: React.FC = () => {
    const [logs, setLogs] = useState<AdminLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [filterAction, setFilterAction] = useState('');
    const limit = 50;
    const totalPages = Math.ceil(total / limit);

    useEffect(() => {
        fetchLogs();
    }, [page, filterAction]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const filters: any = {};
            if (filterAction) filters.action = filterAction;
            const data = await adminApi.getLogs(page, filters);
            setLogs(data.logs);
            setTotal(data.total);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getConfig = (action: string) => {
        return ACTION_CONFIG[action] || { label: action, color: '#374151', bg: '#f3f4f6', icon: null };
    };

    return (
        <DashboardLayout title="Logs d'Activité">
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                            Journal d'activité
                        </h2>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                            {total} action{total !== 1 ? 's' : ''} enregistrée{total !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.625rem',
                            padding: '0.35rem 0.6rem'
                        }}>
                            <Filter size={14} style={{ color: '#94a3b8' }} />
                            <select
                                value={filterAction}
                                onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
                                style={{
                                    border: 'none', fontSize: '0.8rem', color: '#0f172a',
                                    background: 'transparent', cursor: 'pointer', outline: 'none'
                                }}
                            >
                                <option value="">Toutes les actions</option>
                                {ALL_ACTIONS.map(a => (
                                    <option key={a} value={a}>{ACTION_CONFIG[a].label}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={fetchLogs}
                            disabled={loading}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.35rem',
                                padding: '0.45rem 0.85rem', borderRadius: '0.625rem',
                                border: '1px solid #e2e8f0', background: 'white',
                                fontSize: '0.8rem', fontWeight: 600, color: '#374151',
                                cursor: 'pointer'
                            }}
                        >
                            <Activity size={14} /> Actualiser
                        </button>
                    </div>
                </div>

                {/* Log list */}
                <div style={{
                    background: 'white', borderRadius: '1rem', border: '1px solid #f1f5f9',
                    overflow: 'hidden'
                }}>
                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Chargement...</div>
                    ) : logs.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                            Aucun log enregistré.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {logs.map((log, i) => {
                                const config = getConfig(log.action);
                                const details = formatDetails(log.action, log.details);
                                return (
                                    <div
                                        key={log.id}
                                        style={{
                                            display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
                                            padding: '0.875rem 1.25rem',
                                            borderBottom: i < logs.length - 1 ? '1px solid #f8fafc' : 'none',
                                            transition: 'background 0.15s'
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#fafbfc')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        {/* Icon */}
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '0.5rem',
                                            background: config.bg, color: config.color,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0, marginTop: '0.1rem'
                                        }}>
                                            {config.icon}
                                        </div>

                                        {/* Content */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                                                    {log.admin_name || 'Système'}
                                                </span>
                                                <span style={{
                                                    fontSize: '0.7rem', fontWeight: 700,
                                                    color: config.color, background: config.bg,
                                                    padding: '0.1rem 0.45rem', borderRadius: '0.375rem'
                                                }}>
                                                    {config.label}
                                                </span>
                                                {log.target_id && (
                                                    <span style={{
                                                        fontSize: '0.65rem', color: '#94a3b8',
                                                        fontFamily: 'monospace', background: '#f8fafc',
                                                        padding: '0.1rem 0.35rem', borderRadius: '0.25rem',
                                                        maxWidth: '180px', overflow: 'hidden',
                                                        textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                                    }}
                                                    title={log.target_id}
                                                    >
                                                        {log.target_id}
                                                    </span>
                                                )}
                                            </div>
                                            {details && (
                                                <div style={{
                                                    fontSize: '0.8rem', color: '#475569', marginTop: '0.25rem',
                                                    lineHeight: 1.4
                                                }}>
                                                    {details}
                                                </div>
                                            )}
                                        </div>

                                        {/* Time */}
                                        <div style={{
                                            flexShrink: 0, textAlign: 'right', minWidth: '70px'
                                        }}>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}
                                                title={formatFullDate(log.created_at)}
                                            >
                                                {formatTimeAgo(log.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        marginTop: '1rem', padding: '0 0.25rem'
                    }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            Page {page} / {totalPages}
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                disabled={page === 1 || loading}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                style={{
                                    padding: '0.4rem 0.6rem', borderRadius: '0.5rem',
                                    border: '1px solid #e2e8f0', background: 'white',
                                    cursor: page === 1 ? 'default' : 'pointer',
                                    opacity: page === 1 ? 0.4 : 1
                                }}
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                disabled={page >= totalPages || loading}
                                onClick={() => setPage(p => p + 1)}
                                style={{
                                    padding: '0.4rem 0.6rem', borderRadius: '0.5rem',
                                    border: '1px solid #e2e8f0', background: 'white',
                                    cursor: page >= totalPages ? 'default' : 'pointer',
                                    opacity: page >= totalPages ? 0.4 : 1
                                }}
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};
