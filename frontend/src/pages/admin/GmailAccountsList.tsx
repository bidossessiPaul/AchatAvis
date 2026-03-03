import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminService } from '../../services/adminService';
import {
    Search,
    User,
    ChevronLeft,
    ChevronRight,
    Shield,
    ShieldOff,
    Eye,
    Download,
    Mail,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getFileUrl } from '../../utils/url';
import { showConfirm, showSuccess, showError } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './AdminLists.css';

interface GmailAccount {
    id: number;
    user_id: string;
    email: string;
    maps_profile_url: string | null;
    local_guide_level: number;
    is_verified: boolean;
    is_active: boolean;
    is_blocked: boolean;
    trust_level: string;
    monthly_reviews_posted: number;
    monthly_quota_limit: number;
    total_reviews_posted: number;
    last_review_posted_at: string | null;
    created_at: string;
    guide_name: string;
    guide_account_email: string;
    guide_avatar: string | null;
    guide_status: string;
    guide_phone: string;
    guide_city: string;
}

type StatusFilter = 'all' | 'active' | 'blocked';

export const GmailAccountsList: React.FC = () => {
    const [accounts, setAccounts] = useState<GmailAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);
    const [reviewsSort, setReviewsSort] = useState<'none' | 'asc' | 'desc'>('none');
    const [lgSort, setLgSort] = useState<'none' | 'asc' | 'desc'>('none');
    const [showBlockModal, setShowBlockModal] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<GmailAccount | null>(null);
    const [blockReason, setBlockReason] = useState('');
    const [isBlocking, setIsBlocking] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const data = await adminService.getGmailAccounts();
            setAccounts(data);
        } catch (error) {
            showError('Erreur', 'Erreur lors du chargement des comptes Gmail');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const openBlockModal = (account: GmailAccount) => {
        setSelectedAccount(account);
        setBlockReason('');
        setShowBlockModal(true);
    };

    const handleBlock = async () => {
        if (!selectedAccount || !blockReason.trim()) return;

        setIsBlocking(true);
        try {
            await adminService.toggleGmailBlock(selectedAccount.id, true, blockReason.trim());
            showSuccess('Compte bloqué', `${selectedAccount.email} a été bloqué. Les emails de notification ont été envoyés.`);
            setShowBlockModal(false);
            setSelectedAccount(null);
            loadAccounts(true);
        } catch (error) {
            showError('Erreur', 'Erreur lors du blocage');
        } finally {
            setIsBlocking(false);
        }
    };

    const handleUnblock = async (account: GmailAccount) => {
        const result = await showConfirm(
            'Débloquer ce compte ?',
            `Voulez-vous débloquer le compte ${account.email} ? Ce compte pourra à nouveau soumettre des avis.`
        );
        if (!result.isConfirmed) return;

        try {
            await adminService.toggleGmailBlock(account.id, false);
            showSuccess('Succès', 'Compte Gmail débloqué');
            loadAccounts(true);
        } catch (error) {
            showError('Erreur', 'Erreur lors du déblocage');
        }
    };

    const isBlocked = (account: GmailAccount) =>
        account.is_blocked === true || Number(account.is_blocked) === 1 || account.trust_level === 'BLOCKED';

    const isActive = (account: GmailAccount) =>
        !isBlocked(account) && (account.is_active === true || Number(account.is_active) === 1);

    const filteredAccounts = accounts.filter(a => {
        const matchesSearch =
            a.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.guide_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.guide_account_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.guide_phone?.includes(searchTerm);

        if (!matchesSearch) return false;

        if (statusFilter === 'blocked') return isBlocked(a);
        if (statusFilter === 'active') return isActive(a);
        return true;
    });

    const sortedAccounts = (() => {
        let result = filteredAccounts;
        if (reviewsSort !== 'none') {
            result = [...result].sort((a, b) =>
                reviewsSort === 'asc'
                    ? Number(a.total_reviews_posted || 0) - Number(b.total_reviews_posted || 0)
                    : Number(b.total_reviews_posted || 0) - Number(a.total_reviews_posted || 0)
            );
        } else if (lgSort !== 'none') {
            result = [...result].sort((a, b) =>
                lgSort === 'asc'
                    ? Number(a.local_guide_level || 0) - Number(b.local_guide_level || 0)
                    : Number(b.local_guide_level || 0) - Number(a.local_guide_level || 0)
            );
        }
        return result;
    })();

    const totalPages = Math.ceil(sortedAccounts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedAccounts = sortedAccounts.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    // Stats
    const totalAccounts = accounts.length;
    const activeAccounts = accounts.filter(a => isActive(a)).length;
    const blockedAccounts = accounts.filter(a => isBlocked(a)).length;
    const totalReviews = accounts.reduce((sum, a) => sum + Number(a.total_reviews_posted || 0), 0);

    const getTrustBadge = (level: string) => {
        const styles: Record<string, { bg: string; color: string }> = {
            PLATINUM: { bg: '#f3e8ff', color: '#7c3aed' },
            GOLD: { bg: '#fef3c7', color: '#b45309' },
            SILVER: { bg: '#f1f5f9', color: '#475569' },
            BRONZE: { bg: '#fed7aa', color: '#c2410c' },
            BLOCKED: { bg: '#fee2e2', color: '#dc2626' },
        };
        const s = styles[level] || styles.BRONZE;
        return (
            <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: s.bg, color: s.color }}>
                {level || 'N/A'}
            </span>
        );
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Jamais';
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const exportCSV = () => {
        const headers = ['Guide', 'Email Gmail', 'Niveau LG', 'Trust Level', 'Avis Postés', 'Avis Mensuel', 'Quota Mensuel', 'Dernier Avis', 'Statut'];

        const escapeCSV = (value: string) => {
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        };

        const rows = sortedAccounts.map(a => [
            escapeCSV(a.guide_name || ''),
            escapeCSV(a.email || ''),
            String(a.local_guide_level || 0),
            escapeCSV(a.trust_level || ''),
            String(a.total_reviews_posted || 0),
            String(a.monthly_reviews_posted || 0),
            String(a.monthly_quota_limit || 0),
            escapeCSV(formatDate(a.last_review_posted_at)),
            isBlocked(a) ? 'Bloqué' : isActive(a) ? 'Actif' : 'Inactif',
        ].join(','));

        const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `comptes-gmail-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <DashboardLayout title="Comptes Gmail des Guides">
            <div className="admin-dashboard revamped">
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <div
                        onClick={() => setStatusFilter(statusFilter === 'all' ? 'all' : 'all')}
                        style={{
                            background: 'linear-gradient(135deg, #475569, #334155)',
                            borderRadius: '1rem',
                            padding: '1.25rem 1.5rem',
                            color: 'white',
                            flex: 1,
                            minWidth: '180px',
                            cursor: 'pointer',
                            opacity: statusFilter === 'all' ? 1 : 0.7,
                            border: statusFilter === 'all' ? '2px solid white' : '2px solid transparent',
                            transition: 'all 0.2s'
                        }}
                    >
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{totalAccounts}</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 600 }}>Total Comptes Gmail</div>
                    </div>
                    <div
                        onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
                        style={{
                            background: 'linear-gradient(135deg, #059669, #047857)',
                            borderRadius: '1rem',
                            padding: '1.25rem 1.5rem',
                            color: 'white',
                            flex: 1,
                            minWidth: '180px',
                            cursor: 'pointer',
                            opacity: statusFilter === 'active' ? 1 : 0.7,
                            border: statusFilter === 'active' ? '2px solid white' : '2px solid transparent',
                            transition: 'all 0.2s'
                        }}
                    >
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{activeAccounts}</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 600 }}>Comptes Actifs</div>
                    </div>
                    <div
                        onClick={() => setStatusFilter(statusFilter === 'blocked' ? 'all' : 'blocked')}
                        style={{
                            background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                            borderRadius: '1rem',
                            padding: '1.25rem 1.5rem',
                            color: 'white',
                            flex: 1,
                            minWidth: '180px',
                            cursor: 'pointer',
                            opacity: statusFilter === 'blocked' ? 1 : 0.7,
                            border: statusFilter === 'blocked' ? '2px solid white' : '2px solid transparent',
                            transition: 'all 0.2s'
                        }}
                    >
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{blockedAccounts}</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 600 }}>Comptes Bloqués</div>
                    </div>
                    <div style={{
                        background: 'linear-gradient(135deg, #0369a1, #0284c7)',
                        borderRadius: '1rem',
                        padding: '1.25rem 1.5rem',
                        color: 'white',
                        flex: 1,
                        minWidth: '180px'
                    }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{totalReviews}</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 600 }}>Avis Postés Total</div>
                    </div>
                </div>

                <div className="admin-main-card">
                    <div className="admin-card-header">
                        <h2 className="card-title">Comptes Gmail des Guides</h2>
                        <div className="admin-controls">
                            <div className="search-box">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Rechercher par email, nom ou téléphone..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={exportCSV}
                                disabled={isLoading || sortedAccounts.length === 0}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '0.5rem 1rem',
                                    background: 'linear-gradient(135deg, #0369a1, #0284c7)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    cursor: isLoading || sortedAccounts.length === 0 ? 'not-allowed' : 'pointer',
                                    opacity: isLoading || sortedAccounts.length === 0 ? 0.5 : 1,
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <Download size={16} />
                                Exporter CSV
                            </button>
                        </div>
                    </div>

                    <div className="admin-table-container">
                        {isLoading ? (
                            <div className="admin-loading">
                                <LoadingSpinner size="lg" text="Chargement des comptes Gmail..." />
                            </div>
                        ) : (
                            <table className="admin-modern-table">
                                <thead>
                                    <tr>
                                        <th>Guide</th>
                                        <th>Email Gmail</th>
                                        <th
                                            onClick={() => { setLgSort(prev => prev === 'none' ? 'desc' : prev === 'desc' ? 'asc' : 'none'); setReviewsSort('none'); }}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                Niveau LG
                                                {lgSort === 'none' && <ArrowUpDown size={14} style={{ opacity: 0.4 }} />}
                                                {lgSort === 'desc' && <ArrowDown size={14} style={{ color: '#059669' }} />}
                                                {lgSort === 'asc' && <ArrowUp size={14} style={{ color: '#059669' }} />}
                                            </div>
                                        </th>
                                        <th>Trust Level</th>
                                        <th
                                            onClick={() => { setReviewsSort(prev => prev === 'none' ? 'desc' : prev === 'desc' ? 'asc' : 'none'); setLgSort('none'); }}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                Avis Postés
                                                {reviewsSort === 'none' && <ArrowUpDown size={14} style={{ opacity: 0.4 }} />}
                                                {reviewsSort === 'desc' && <ArrowDown size={14} style={{ color: '#059669' }} />}
                                                {reviewsSort === 'asc' && <ArrowUp size={14} style={{ color: '#059669' }} />}
                                            </div>
                                        </th>
                                        <th>Dernier Avis</th>
                                        <th>Statut</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedAccounts.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
                                                Aucun compte Gmail trouvé
                                            </td>
                                        </tr>
                                    ) : paginatedAccounts.map(account => (
                                        <tr key={account.id}>
                                            <td className="font-medium">
                                                <div
                                                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}
                                                    onClick={() => navigate(`/admin/guides/${account.user_id}`)}
                                                >
                                                    {account.guide_avatar ? (
                                                        <img src={getFileUrl(account.guide_avatar)} alt="" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>
                                                            <User size={16} />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: '#0369a1', textDecoration: 'underline' }}>
                                                            {account.guide_name || account.guide_account_email}
                                                        </div>
                                                        {account.guide_city && (
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>{account.guide_city}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Mail size={14} style={{ color: 'var(--gray-400)' }} />
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{account.email}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '0.25rem 0.6rem',
                                                    backgroundColor: '#f0f9ff',
                                                    borderRadius: '8px',
                                                    fontWeight: 700,
                                                    color: '#0369a1',
                                                    fontSize: '0.85rem'
                                                }}>
                                                    {account.local_guide_level || 0}
                                                </span>
                                            </td>
                                            <td>{getTrustBadge(account.trust_level)}</td>
                                            <td>
                                                <div>
                                                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gray-700)' }}>
                                                        {account.total_reviews_posted || 0}
                                                    </span>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>
                                                        {account.monthly_reviews_posted || 0}/{account.monthly_quota_limit || 20} ce mois
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                                                {formatDate(account.last_review_posted_at)}
                                            </td>
                                            <td>
                                                {isBlocked(account) ? (
                                                    <span style={{
                                                        padding: '0.3rem 0.7rem',
                                                        backgroundColor: '#fee2e2',
                                                        borderRadius: '6px',
                                                        fontWeight: 700,
                                                        color: '#dc2626',
                                                        fontSize: '0.75rem'
                                                    }}>
                                                        Bloqué
                                                    </span>
                                                ) : isActive(account) ? (
                                                    <span style={{
                                                        padding: '0.3rem 0.7rem',
                                                        backgroundColor: '#ecfdf5',
                                                        borderRadius: '6px',
                                                        fontWeight: 700,
                                                        color: '#059669',
                                                        fontSize: '0.75rem'
                                                    }}>
                                                        Actif
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        padding: '0.3rem 0.7rem',
                                                        backgroundColor: 'var(--gray-100)',
                                                        borderRadius: '6px',
                                                        fontWeight: 700,
                                                        color: 'var(--gray-500)',
                                                        fontSize: '0.75rem'
                                                    }}>
                                                        Inactif
                                                    </span>
                                                )}
                                            </td>
                                            <td className="actions-cell">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <button
                                                        onClick={() => navigate(`/admin/guides/${account.user_id}`)}
                                                        title="Voir le guide"
                                                        style={{
                                                            padding: '0.4rem',
                                                            background: 'var(--gray-100)',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        <Eye size={16} color="var(--gray-600)" />
                                                    </button>
                                                    {isBlocked(account) ? (
                                                        <button
                                                            onClick={() => handleUnblock(account)}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                padding: '0.4rem 0.8rem',
                                                                background: 'linear-gradient(135deg, #059669, #047857)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                fontWeight: 700,
                                                                fontSize: '0.75rem',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            <Shield size={14} />
                                                            Débloquer
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => openBlockModal(account)}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                padding: '0.4rem 0.8rem',
                                                                background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                fontWeight: 700,
                                                                fontSize: '0.75rem',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            <ShieldOff size={14} />
                                                            Bloquer
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {!isLoading && sortedAccounts.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--gray-50)', borderRadius: '12px', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)', fontWeight: 500 }}>Afficher :</span>
                                <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--gray-300)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', backgroundColor: 'white' }}>
                                    <option value={20}>20 comptes</option>
                                    <option value={50}>50 comptes</option>
                                    <option value={100}>100 comptes</option>
                                    <option value={200}>200 comptes</option>
                                </select>
                                <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>{startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedAccounts.length)} sur {sortedAccounts.length}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--gray-300)', backgroundColor: currentPage === 1 ? 'var(--gray-100)' : 'white', color: currentPage === 1 ? 'var(--gray-400)' : 'var(--gray-700)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s' }}><ChevronLeft size={16} />Précédent</button>
                                <span style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)' }}>Page {currentPage} / {totalPages}</span>
                                <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--gray-300)', backgroundColor: currentPage === totalPages ? 'var(--gray-100)' : 'white', color: currentPage === totalPages ? 'var(--gray-400)' : 'var(--gray-700)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s' }}>Suivant<ChevronRight size={16} /></button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showBlockModal && selectedAccount && (
                <div className="modal-overlay" onClick={() => setShowBlockModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                                <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #dc2626, #b91c1c)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                    <ShieldOff size={24} strokeWidth={3} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Bloquer un compte Gmail</h2>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gray-500)' }}>Ce compte ne pourra plus soumettre d'avis</p>
                                </div>
                            </div>
                            <button onClick={() => setShowBlockModal(false)} className="modal-close">
                                <X size={20} color="var(--gray-400)" />
                            </button>
                        </div>

                        <div className="modal-body" style={{ padding: '2rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ background: 'var(--gray-50)', borderRadius: '12px', padding: '1.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                                        {selectedAccount.guide_avatar ? (
                                            <img src={getFileUrl(selectedAccount.guide_avatar)} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <User size={20} color="var(--gray-500)" />
                                            </div>
                                        )}
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedAccount.guide_name || selectedAccount.guide_account_email}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Guide</div>
                                        </div>
                                    </div>
                                    <div style={{ background: 'white', borderRadius: '8px', padding: '0.75rem', textAlign: 'center', border: '1px solid var(--gray-200)' }}>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 600, marginBottom: '2px' }}>Compte à bloquer</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                            <Mail size={16} />
                                            {selectedAccount.email}
                                        </div>
                                    </div>
                                </div>

                                <div style={{
                                    background: '#fef2f2',
                                    borderRadius: '12px',
                                    padding: '1rem',
                                    fontSize: '0.8rem',
                                    color: '#991b1b',
                                    fontWeight: 500,
                                    lineHeight: 1.5
                                }}>
                                    Deux emails seront envoyés : un à l'adresse Gmail bloquée et un au compte du guide.
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                                        Raison du blocage *
                                    </label>
                                    <textarea
                                        value={blockReason}
                                        onChange={(e) => setBlockReason(e.target.value)}
                                        placeholder="Ex: Compte utilisé pour des avis frauduleux, suspicion de multi-compte..."
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--gray-300)',
                                            fontSize: '0.875rem',
                                            minHeight: '100px',
                                            resize: 'vertical',
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button onClick={() => setShowBlockModal(false)} className="btn-secondary">
                                Annuler
                            </button>
                            <button
                                onClick={handleBlock}
                                className="admin-btn-primary"
                                style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
                                disabled={isBlocking || !blockReason.trim()}
                            >
                                {isBlocking ? 'Blocage en cours...' : 'Confirmer le blocage'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};
