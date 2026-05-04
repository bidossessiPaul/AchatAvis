import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminService } from '../../services/adminService';
import {
    Search,
    User,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Wallet,
    CheckCircle,
    X,
    DollarSign,
    Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getFileUrl } from '../../utils/url';
import { showConfirm, showSuccess, showError } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './AdminLists.css';

interface GuideBalance {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    status: string;
    google_email: string;
    phone: string;
    preferred_payout_method: string;
    payout_details: any;
    validated_reviews_count: number;
    total_earned: number;
    total_paid: number;
    total_pending: number;
    balance: number;
}

export const GuidesBalances: React.FC = () => {
    const [guides, setGuides] = useState<GuideBalance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);
    const [balanceSort, setBalanceSort] = useState<'none' | 'asc' | 'desc'>('desc');
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedGuide, setSelectedGuide] = useState<GuideBalance | null>(null);
    const [adminNote, setAdminNote] = useState('');
    const [amountToPay, setAmountToPay] = useState<string>('');
    const [isPaying, setIsPaying] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        loadGuides();
    }, []);

    const loadGuides = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const data = await adminService.getGuidesBalances();
            setGuides(data);
        } catch (error) {
            showError('Erreur', 'Erreur lors du chargement des soldes');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const openPayModal = (guide: GuideBalance) => {
        setSelectedGuide(guide);
        setAdminNote('');
        // Pré-remplir avec le solde actuel ; l'admin peut modifier si le paiement
        // réel diffère (ex: entre l'export CSV et le virement, de nouveaux avis
        // ont pu être validés).
        setAmountToPay(Number(guide.balance).toFixed(2));
        setShowPayModal(true);
    };

    const handleForcePay = async () => {
        if (!selectedGuide) return;

        const amount = Number(amountToPay);
        if (!Number.isFinite(amount) || amount <= 0) {
            showError('Montant invalide', 'Veuillez saisir un montant supérieur à 0.');
            return;
        }

        const remaining = Number(selectedGuide.balance) - amount;
        const isAdvance = remaining < -0.01;

        const confirmMessage = isAdvance
            ? `Enregistrer une avance de ${amount.toFixed(2)}€ à ${selectedGuide.full_name || selectedGuide.google_email} ?\n\nLe solde du guide passera à ${remaining.toFixed(2)}€ (négatif). Les prochains avis validés rembourseront automatiquement cette avance.`
            : `Enregistrer un paiement de ${amount.toFixed(2)}€ à ${selectedGuide.full_name || selectedGuide.google_email} ?\n\nNouveau solde du guide : ${remaining.toFixed(2)}€`;

        const result = await showConfirm('Confirmer le paiement', confirmMessage);
        if (!result.isConfirmed) return;

        setIsPaying(true);
        try {
            await adminService.forcePayGuide(
                selectedGuide.id,
                amount,
                adminNote || undefined
            );
            showSuccess(
                'Paiement enregistré',
                `${amount.toFixed(2)}€ payé. Nouveau solde du guide : ${remaining.toFixed(2)}€. Le guide verra ce paiement dans son historique.`
            );
            setShowPayModal(false);
            setSelectedGuide(null);
            loadGuides(true);
        } catch (error: any) {
            showError('Erreur', error.response?.data?.error || 'Erreur lors du paiement');
        } finally {
            setIsPaying(false);
        }
    };

    const filteredGuides = guides.filter(g =>
        g.google_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.phone?.includes(searchTerm)
    );

    const sortedGuides = balanceSort === 'none'
        ? filteredGuides
        : [...filteredGuides].sort((a, b) =>
            balanceSort === 'asc'
                ? Number(a.balance) - Number(b.balance)
                : Number(b.balance) - Number(a.balance)
        );

    const totalPages = Math.ceil(sortedGuides.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedGuides = sortedGuides.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const exportCSV = () => {
        const dataToExport = sortedGuides;
        const headers = ['Nom', 'Email', 'Téléphone', 'Moyen de paiement', 'Coordonnées Paiement', 'Avis Validés', 'Total Gagné (€)', 'Déjà Payé (€)', 'Solde (€)'];

        const escapeCSV = (value: string) => {
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        };

        const getPayoutDetailsText = (guide: GuideBalance): string => {
            const details = typeof guide.payout_details === 'string'
                ? (() => { try { return JSON.parse(guide.payout_details); } catch { return null; } })()
                : guide.payout_details;
            if (!details || Object.keys(details).length === 0) return '';
            const method = guide.preferred_payout_method;
            if (method === 'bank_transfer') {
                const parts = [];
                if (details.account_name) parts.push(details.account_name);
                if (details.iban) parts.push(`IBAN: ${details.iban}`);
                if (details.bic) parts.push(`BIC: ${details.bic}`);
                return parts.join(' | ');
            }
            if (method === 'paypal') return details.email || details.paypal_email || '';
            if (method === 'mobile_money' || method === 'wave') {
                const parts = [];
                if (details.full_name) parts.push(details.full_name);
                if (details.phone || details.phone_number) parts.push(details.phone || details.phone_number);
                return parts.join(' | ');
            }
            return Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(' | ');
        };

        const getMethodLabel = (method: string): string => {
            if (method === 'bank_transfer') return 'Virement';
            if (method === 'paypal') return 'PayPal';
            if (method === 'mobile_money') return 'Mobile Money';
            if (method === 'wave') return 'Wave';
            return method || '';
        };

        const rows = dataToExport.map(guide => [
            escapeCSV(guide.full_name || ''),
            escapeCSV(guide.google_email || guide.email || ''),
            escapeCSV(guide.phone || ''),
            escapeCSV(getMethodLabel(guide.preferred_payout_method)),
            escapeCSV(getPayoutDetailsText(guide)),
            String(guide.validated_reviews_count),
            Number(guide.total_earned).toFixed(2),
            Number(guide.total_paid).toFixed(2),
            Number(guide.balance).toFixed(2),
        ].join(','));

        const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `soldes-guides-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Stats
    const totalBalance = guides.reduce((sum, g) => sum + Number(g.balance), 0);
    const totalEarned = guides.reduce((sum, g) => sum + Number(g.total_earned), 0);
    const totalPaid = guides.reduce((sum, g) => sum + Number(g.total_paid), 0);
    const guidesWithBalance = guides.filter(g => Number(g.balance) > 0).length;
    const totalValidatedReviews = guides.reduce((sum, g) => sum + Number(g.validated_reviews_count), 0);

    return (
        <DashboardLayout title="Soldes des Guides">
            <div className="admin-dashboard revamped">
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #059669, #047857)',
                        borderRadius: '1rem',
                        padding: '1.25rem 1.5rem',
                        color: 'white',
                        flex: 1,
                        minWidth: '160px'
                    }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{guidesWithBalance}</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 600 }}>Guides avec solde &gt; 0</div>
                    </div>
                    <div style={{
                        background: 'linear-gradient(135deg, #475569, #334155)',
                        borderRadius: '1rem',
                        padding: '1.25rem 1.5rem',
                        color: 'white',
                        flex: 1,
                        minWidth: '160px'
                    }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{totalEarned.toFixed(2)}€</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 600 }}>Total gagné (validé)</div>
                    </div>
                    <div style={{
                        background: 'linear-gradient(135deg, #0369a1, #0284c7)',
                        borderRadius: '1rem',
                        padding: '1.25rem 1.5rem',
                        color: 'white',
                        flex: 1,
                        minWidth: '160px'
                    }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{totalPaid.toFixed(2)}€</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 600 }}>Déjà payé</div>
                    </div>
                    <div style={{
                        background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                        borderRadius: '1rem',
                        padding: '1.25rem 1.5rem',
                        color: 'white',
                        flex: 1,
                        minWidth: '160px'
                    }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{totalBalance.toFixed(2)}€</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 600 }}>Reste à payer</div>
                    </div>
                    <div style={{
                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        borderRadius: '1rem',
                        padding: '1.25rem 1.5rem',
                        color: 'white',
                        flex: 1,
                        minWidth: '160px'
                    }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{totalValidatedReviews}</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 600 }}>Avis validés total</div>
                    </div>
                </div>

                <div className="admin-main-card">
                    <div className="admin-card-header">
                        <h2 className="card-title">Soldes des Guides</h2>
                        <div className="admin-controls">
                            <div className="search-box">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Rechercher par nom, email ou téléphone..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={exportCSV}
                                disabled={isLoading || sortedGuides.length === 0}
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
                                    cursor: isLoading || sortedGuides.length === 0 ? 'not-allowed' : 'pointer',
                                    opacity: isLoading || sortedGuides.length === 0 ? 0.5 : 1,
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
                                <LoadingSpinner size="lg" text="Chargement des soldes..." />
                            </div>
                        ) : (
                            <table className="admin-modern-table">
                                <thead>
                                    <tr>
                                        <th>Guide</th>
                                        <th>Coordonnées Paiement</th>
                                        <th>Avis Validés</th>
                                        <th>Total Gagné</th>
                                        <th>Déjà Payé</th>
                                        <th>Moyen de paiement</th>
                                        <th
                                            onClick={() => setBalanceSort(prev => prev === 'none' ? 'desc' : prev === 'desc' ? 'asc' : 'none')}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                Solde
                                                {balanceSort === 'none' && <ArrowUpDown size={14} style={{ opacity: 0.4 }} />}
                                                {balanceSort === 'desc' && <ArrowDown size={14} style={{ color: '#059669' }} />}
                                                {balanceSort === 'asc' && <ArrowUp size={14} style={{ color: '#059669' }} />}
                                            </div>
                                        </th>
                                        <th className="text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedGuides.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
                                                Aucun guide avec des avis validés trouvé
                                            </td>
                                        </tr>
                                    ) : paginatedGuides.map(guide => (
                                        <tr key={guide.id}>
                                            <td className="font-medium">
                                                <div
                                                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}
                                                    onClick={() => navigate(`/admin/guides/${guide.id}`)}
                                                >
                                                    {guide.avatar_url ? (
                                                        <img src={getFileUrl(guide.avatar_url)} alt="" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>
                                                            <User size={16} />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: '#0369a1', textDecoration: 'underline' }}>{guide.google_email}</div>
                                                        {guide.full_name && (
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{guide.full_name}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                {(() => {
                                                    const details = typeof guide.payout_details === 'string'
                                                        ? (() => { try { return JSON.parse(guide.payout_details); } catch { return null; } })()
                                                        : guide.payout_details;
                                                    if (!details || Object.keys(details).length === 0) {
                                                        return <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>Non renseigné</span>;
                                                    }
                                                    const method = guide.preferred_payout_method;
                                                    if (method === 'bank_transfer') {
                                                        return (
                                                            <div style={{ fontSize: '0.75rem', lineHeight: 1.6 }}>
                                                                {details.account_name && <div style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{details.account_name}</div>}
                                                                {details.iban && <div style={{ color: 'var(--gray-600)' }}>IBAN: <span style={{ fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.5px' }}>{details.iban}</span></div>}
                                                                {details.bic && <div style={{ color: 'var(--gray-500)' }}>BIC: <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{details.bic}</span></div>}
                                                            </div>
                                                        );
                                                    }
                                                    if (method === 'paypal') {
                                                        return (
                                                            <div style={{ fontSize: '0.75rem', lineHeight: 1.6 }}>
                                                                <div style={{ color: 'var(--gray-600)' }}>{details.email || details.paypal_email}</div>
                                                            </div>
                                                        );
                                                    }
                                                    if (method === 'mobile_money' || method === 'wave') {
                                                        return (
                                                            <div style={{ fontSize: '0.75rem', lineHeight: 1.6 }}>
                                                                {details.full_name && <div style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{details.full_name}</div>}
                                                                {(details.phone || details.phone_number) && <div style={{ color: 'var(--gray-600)', fontFamily: 'monospace' }}>{details.phone || details.phone_number}</div>}
                                                            </div>
                                                        );
                                                    }
                                                    // Fallback: show raw keys
                                                    return (
                                                        <div style={{ fontSize: '0.75rem', lineHeight: 1.6, color: 'var(--gray-600)' }}>
                                                            {Object.entries(details).map(([key, val]) => (
                                                                <div key={key}>{key}: {String(val)}</div>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '0.3rem 0.7rem',
                                                    backgroundColor: '#f0f9ff',
                                                    borderRadius: '8px',
                                                    fontWeight: 700,
                                                    color: '#0369a1',
                                                    fontSize: '0.9rem'
                                                }}>
                                                    {guide.validated_reviews_count}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 600, color: 'var(--gray-700)' }}>
                                                {Number(guide.total_earned).toFixed(2)}€
                                            </td>
                                            <td style={{ color: 'var(--gray-500)' }}>
                                                {Number(guide.total_paid).toFixed(2)}€
                                            </td>
                                            <td>
                                                {guide.preferred_payout_method ? (
                                                    <span style={{
                                                        padding: '0.3rem 0.6rem',
                                                        borderRadius: '6px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        backgroundColor: guide.preferred_payout_method === 'bank_transfer' ? '#eff6ff' :
                                                            guide.preferred_payout_method === 'paypal' ? '#fef3c7' :
                                                            guide.preferred_payout_method === 'mobile_money' ? '#ecfdf5' :
                                                            guide.preferred_payout_method === 'wave' ? '#f0f9ff' : '#f3f4f6',
                                                        color: guide.preferred_payout_method === 'bank_transfer' ? '#1d4ed8' :
                                                            guide.preferred_payout_method === 'paypal' ? '#b45309' :
                                                            guide.preferred_payout_method === 'mobile_money' ? '#047857' :
                                                            guide.preferred_payout_method === 'wave' ? '#0369a1' : '#4b5563'
                                                    }}>
                                                        {guide.preferred_payout_method === 'bank_transfer' ? 'Virement' :
                                                         guide.preferred_payout_method === 'paypal' ? 'PayPal' :
                                                         guide.preferred_payout_method === 'mobile_money' ? 'Mobile Money' :
                                                         guide.preferred_payout_method === 'wave' ? 'Wave' :
                                                         guide.preferred_payout_method}
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>
                                                        Non défini
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '0.4rem 0.8rem',
                                                    backgroundColor: Number(guide.balance) > 0 ? '#ecfdf5' : Number(guide.balance) < 0 ? '#fef2f2' : 'var(--gray-50)',
                                                    borderRadius: '10px',
                                                    width: 'fit-content'
                                                }}>
                                                    <Wallet size={14} style={{ color: Number(guide.balance) > 0 ? '#059669' : Number(guide.balance) < 0 ? '#dc2626' : 'var(--gray-400)' }} />
                                                    <span style={{
                                                        fontSize: '1.1rem',
                                                        fontWeight: 800,
                                                        color: Number(guide.balance) > 0 ? '#059669' : Number(guide.balance) < 0 ? '#dc2626' : 'var(--gray-400)'
                                                    }}>
                                                        {Number(guide.balance).toFixed(2)}€
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="actions-cell">
                                                {Number(guide.balance) !== 0 ? (
                                                    <button
                                                        onClick={() => openPayModal(guide)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '0.5rem 1rem',
                                                            background: 'linear-gradient(135deg, #059669, #047857)',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            fontWeight: 700,
                                                            fontSize: '0.8rem',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        <DollarSign size={14} />
                                                        Payer
                                                    </button>
                                                ) : (
                                                    <span style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        color: 'var(--gray-400)',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 600
                                                    }}>
                                                        <CheckCircle size={14} />
                                                        Soldé
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {!isLoading && sortedGuides.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--gray-50)', borderRadius: '12px', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)', fontWeight: 500 }}>Afficher :</span>
                                <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--gray-300)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', backgroundColor: 'white' }}>
                                    <option value={20}>20 guides</option>
                                    <option value={50}>50 guides</option>
                                    <option value={100}>100 guides</option>
                                    <option value={200}>200 guides</option>
                                </select>
                                <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>{startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedGuides.length)} sur {sortedGuides.length}</span>
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

            {/* Pay Modal */}
            {showPayModal && selectedGuide && (
                <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                                <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #059669, #047857)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                    <DollarSign size={24} strokeWidth={3} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Enregistrer un paiement</h2>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gray-500)' }}>Saisis le montant réellement versé — le solde sera recalculé</p>
                                </div>
                            </div>
                            <button onClick={() => setShowPayModal(false)} className="modal-close">
                                <X size={20} color="var(--gray-400)" />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                                {/* Guide info — compact row */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem',
                                    background: 'var(--gray-50)',
                                    borderRadius: '10px'
                                }}>
                                    {selectedGuide.avatar_url ? (
                                        <img src={getFileUrl(selectedGuide.avatar_url)} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                    ) : (
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <User size={18} color="var(--gray-500)" />
                                        </div>
                                    )}
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {selectedGuide.full_name || selectedGuide.google_email}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {selectedGuide.validated_reviews_count} avis · {Number(selectedGuide.total_earned).toFixed(2)}€ gagnés
                                        </div>
                                    </div>
                                </div>

                                {/* Soldes côte à côte — compacts */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    <div style={{
                                        background: '#f0f9ff',
                                        borderRadius: '8px',
                                        padding: '0.625rem',
                                        border: '1px solid #bae6fd',
                                        textAlign: 'center'
                                    }}>
                                        <div style={{ fontSize: '0.65rem', color: '#0369a1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Solde actuel</div>
                                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0c4a6e', marginTop: '2px' }}>
                                            {Number(selectedGuide.balance).toFixed(2)}€
                                        </div>
                                    </div>
                                    {(() => {
                                        const amt = Number(amountToPay);
                                        const remaining = Number(selectedGuide.balance) - (Number.isFinite(amt) ? amt : 0);
                                        const isSoldé = Math.abs(remaining) < 0.01;
                                        const isAdvance = remaining < -0.01;
                                        const bg = isAdvance ? '#fef2f2' : isSoldé ? '#ecfdf5' : '#fffbeb';
                                        const border = isAdvance ? '1px solid #fecaca' : isSoldé ? '1px solid #a7f3d0' : '1px solid #fde68a';
                                        const labelColor = isAdvance ? '#b91c1c' : isSoldé ? '#047857' : '#b45309';
                                        const valueColor = isAdvance ? '#7f1d1d' : isSoldé ? '#065f46' : '#78350f';
                                        const labelText = isAdvance ? 'Avance — solde négatif' : 'Nouveau solde';
                                        return (
                                            <div style={{
                                                background: bg,
                                                borderRadius: '8px',
                                                padding: '0.625rem',
                                                border,
                                                textAlign: 'center'
                                            }}>
                                                <div style={{ fontSize: '0.65rem', color: labelColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                                    {labelText}
                                                </div>
                                                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: valueColor, marginTop: '2px' }}>
                                                    {remaining.toFixed(2)}€
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Montant payé (éditable) */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)' }}>
                                            Montant réellement payé *
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setAmountToPay(Number(selectedGuide.balance).toFixed(2))}
                                            style={{
                                                padding: '0.2rem 0.55rem',
                                                borderRadius: '6px',
                                                border: '1px solid #e5e7eb',
                                                background: 'white',
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                color: '#059669',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Tout le solde
                                        </button>
                                    </div>
                                    {(() => {
                                        const amt = Number(amountToPay);
                                        const isAdvance = Number.isFinite(amt) && amt > Number(selectedGuide.balance);
                                        return (
                                            <>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={amountToPay}
                                                        onChange={(e) => setAmountToPay(e.target.value)}
                                                        placeholder="0.00"
                                                        autoFocus
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.65rem 2.2rem 0.65rem 0.85rem',
                                                            borderRadius: '8px',
                                                            border: '2px solid #059669',
                                                            fontSize: '1.2rem',
                                                            fontWeight: 800,
                                                            color: '#059669',
                                                            outline: 'none',
                                                            fontFamily: 'inherit',
                                                            boxSizing: 'border-box'
                                                        }}
                                                    />
                                                    <span style={{
                                                        position: 'absolute',
                                                        right: '0.85rem',
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        fontSize: '1rem',
                                                        fontWeight: 700,
                                                        color: '#059669',
                                                        pointerEvents: 'none'
                                                    }}>€</span>
                                                </div>
                                                {isAdvance ? (
                                                    <p style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600, marginTop: '0.4rem', lineHeight: 1.35, background: '#fffbeb', padding: '0.5rem 0.625rem', borderRadius: '6px', border: '1px solid #fde68a' }}>
                                                        ⚠ Avance : le solde du guide passera en négatif. Les prochains avis validés rembourseront automatiquement la dette.
                                                    </p>
                                                ) : (
                                                    <p style={{ fontSize: '0.7rem', color: 'var(--gray-500)', marginTop: '0.4rem', lineHeight: 1.35 }}>
                                                        Si de nouveaux avis ont été validés depuis l'export, le reste non payé sera conservé pour le prochain cycle.
                                                    </p>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>

                                {/* Admin note */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.4rem' }}>
                                        Note (optionnel)
                                    </label>
                                    <textarea
                                        value={adminNote}
                                        onChange={(e) => setAdminNote(e.target.value)}
                                        placeholder="Ex: Virement bancaire du 21/04..."
                                        style={{
                                            width: '100%',
                                            padding: '0.6rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--gray-300)',
                                            fontSize: '0.85rem',
                                            minHeight: '56px',
                                            resize: 'vertical',
                                            fontFamily: 'inherit',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                onClick={() => setShowPayModal(false)}
                                className="btn-secondary"
                                style={{ padding: '0.6rem 1.25rem', fontSize: '0.875rem' }}
                            >
                                Annuler
                            </button>
                            {(() => {
                                const amt = Number(amountToPay);
                                const isInvalid = !amountToPay || !Number.isFinite(amt) || amt <= 0;
                                return (
                                    <button
                                        onClick={handleForcePay}
                                        className="admin-btn-primary"
                                        style={{
                                            background: 'linear-gradient(135deg, #059669, #047857)',
                                            padding: '0.6rem 1.25rem',
                                            fontSize: '0.875rem',
                                            justifyContent: 'center',
                                            opacity: isInvalid ? 0.5 : 1,
                                            cursor: isInvalid ? 'not-allowed' : 'pointer'
                                        }}
                                        disabled={isPaying || isInvalid}
                                    >
                                        {isPaying
                                            ? 'Paiement...'
                                            : `Confirmer ${(Number(amountToPay) || 0).toFixed(2)}€`}
                                    </button>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};
