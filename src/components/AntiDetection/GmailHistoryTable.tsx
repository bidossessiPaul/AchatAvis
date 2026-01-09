import React, { useState } from 'react';
import {
    Calendar,
    CheckCircle2,
    Clock,
    XCircle,
    TrendingUp,
    Search
} from 'lucide-react';

interface HistoryItem {
    id: string;
    submitted_at: string;
    status: 'pending' | 'validated' | 'rejected';
    earnings: number;
    artisan_company: string;
    sector_id: number;
    sector_name: string;
    sector_icon: string;
}

interface GmailHistoryTableProps {
    history: HistoryItem[];
}

export const GmailHistoryTable: React.FC<GmailHistoryTableProps> = ({ history }) => {
    const [statusFilter, setStatusFilter] = useState<'all' | 'validated' | 'pending' | 'rejected'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredHistory = history.filter(item => {
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        const matchesSearch = item.artisan_company.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const totalEarnings = filteredHistory
        .filter(item => item.status === 'validated')
        .reduce((sum, item) => sum + item.earnings, 0);

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'validated':
                return {
                    bg: '#d1fae5',
                    color: '#059669',
                    label: 'Validé',
                    icon: <CheckCircle2 size={12} />
                };
            case 'rejected':
                return {
                    bg: '#fee2e2',
                    color: '#dc2626',
                    label: 'Refusé',
                    icon: <XCircle size={12} />
                };
            default:
                return {
                    bg: '#fef3c7',
                    color: '#d97706',
                    label: 'Attente',
                    icon: <Clock size={12} />
                };
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Filters & Stats Header */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                background: '#f8fafc',
                padding: '1.25rem',
                borderRadius: '1rem',
                border: '1px solid #e2e8f0'
            }}>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Rechercher un artisan..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                                borderRadius: '0.75rem',
                                border: '1px solid #e2e8f0',
                                fontSize: '0.875rem',
                                outline: 'none',
                                width: '220px'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', background: 'white', borderRadius: '0.75rem', padding: '2px', border: '1px solid #e2e8f0' }}>
                        {(['all', 'validated', 'pending', 'rejected'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                style={{
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '0.6rem',
                                    border: 'none',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    background: statusFilter === status ? '#0f172a' : 'transparent',
                                    color: statusFilter === status ? 'white' : '#64748b',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {status === 'all' ? 'Tous' : getStatusStyles(status).label}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Gains filtrés</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>{totalEarnings.toFixed(2)}€</div>
                    </div>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: '#d1fae5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#059669'
                    }}>
                        <TrendingUp size={20} />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Contribution</th>
                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Secteur</th>
                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Date</th>
                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Statut</th>
                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Gain</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredHistory.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                                    Aucun résultat correspondant à vos critères.
                                </td>
                            </tr>
                        ) : (
                            filteredHistory.map((item, idx) => {
                                const status = getStatusStyles(item.status);
                                return (
                                    <tr key={item.id} style={{ borderBottom: idx === filteredHistory.length - 1 ? 'none' : '1px solid #f1f5f9', background: 'white' }}>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.875rem' }}>{item.artisan_company}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID: {item.id.substring(0, 8)}...</div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>
                                                <span>{item.sector_icon || '🏢'}</span>
                                                {item.sector_name}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#64748b' }}>
                                                <Calendar size={14} />
                                                {new Date(item.submitted_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                padding: '0.25rem 0.6rem',
                                                borderRadius: '2rem',
                                                fontSize: '0.7rem',
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                background: status.bg,
                                                color: status.color
                                            }}>
                                                {status.icon}
                                                {status.label}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                            {Number(item.earnings || 0).toFixed(2)}€
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
