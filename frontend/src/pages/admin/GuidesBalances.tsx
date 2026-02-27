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
    DollarSign
} from 'lucide-react';
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
    const [isPaying, setIsPaying] = useState(false);

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
        setShowPayModal(true);
    };

    const handleForcePay = async () => {
        if (!selectedGuide) return;

        const result = await showConfirm(
            'Confirmer le paiement',
            `Payer ${Number(selectedGuide.balance).toFixed(2)}€ à ${selectedGuide.full_name || selectedGuide.google_email} ?`
        );
        if (!result.isConfirmed) return;

        setIsPaying(true);
        try {
            await adminService.forcePayGuide(
                selectedGuide.id,
                Number(selectedGuide.balance),
                adminNote || undefined
            );
            showSuccess('Paiement effectué', `${Number(selectedGuide.balance).toFixed(2)}€ payé avec succès. Le guide verra ce paiement dans son historique.`);
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

    // Stats
    const totalBalance = guides.reduce((sum, g) => sum + Number(g.balance), 0);
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
                        minWidth: '200px'
                    }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{guidesWithBalance}</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 600 }}>Guides avec solde &gt; 0</div>
                    </div>
                    <div style={{
                        background: 'linear-gradient(135deg, #0369a1, #0284c7)',
                        borderRadius: '1rem',
                        padding: '1.25rem 1.5rem',
                        color: 'white',
                        flex: 1,
                        minWidth: '200px'
                    }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{totalBalance.toFixed(2)}€</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 600 }}>Total des soldes</div>
                    </div>
                    <div style={{
                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        borderRadius: '1rem',
                        padding: '1.25rem 1.5rem',
                        color: 'white',
                        flex: 1,
                        minWidth: '200px'
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
                                        <th>Email Compte</th>
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
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                                    {guide.avatar_url ? (
                                                        <img src={getFileUrl(guide.avatar_url)} alt="" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>
                                                            <User size={16} />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>{guide.google_email}</div>
                                                        {guide.full_name && (
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{guide.full_name}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-gray-500">{guide.email}</td>
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
                                                    backgroundColor: Number(guide.balance) > 0 ? '#ecfdf5' : 'var(--gray-50)',
                                                    borderRadius: '10px',
                                                    width: 'fit-content'
                                                }}>
                                                    <Wallet size={14} style={{ color: Number(guide.balance) > 0 ? '#059669' : 'var(--gray-400)' }} />
                                                    <span style={{
                                                        fontSize: '1.1rem',
                                                        fontWeight: 800,
                                                        color: Number(guide.balance) > 0 ? '#059669' : 'var(--gray-400)'
                                                    }}>
                                                        {Number(guide.balance).toFixed(2)}€
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="actions-cell">
                                                {Number(guide.balance) > 0 ? (
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
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                                <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #059669, #047857)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                    <DollarSign size={24} strokeWidth={3} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Paiement Encouragement</h2>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gray-500)' }}>Payer le solde du guide directement</p>
                                </div>
                            </div>
                            <button onClick={() => setShowPayModal(false)} className="modal-close">
                                <X size={20} color="var(--gray-400)" />
                            </button>
                        </div>

                        <div className="modal-body" style={{ padding: '2rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {/* Guide info */}
                                <div style={{ background: 'var(--gray-50)', borderRadius: '12px', padding: '1.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                                        {selectedGuide.avatar_url ? (
                                            <img src={getFileUrl(selectedGuide.avatar_url)} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <User size={20} color="var(--gray-500)" />
                                            </div>
                                        )}
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedGuide.full_name || selectedGuide.google_email}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{selectedGuide.email}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div style={{ padding: '0.75rem', background: 'white', borderRadius: '8px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 600, marginBottom: '2px' }}>Avis validés</div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0369a1' }}>{selectedGuide.validated_reviews_count}</div>
                                        </div>
                                        <div style={{ padding: '0.75rem', background: 'white', borderRadius: '8px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 600, marginBottom: '2px' }}>Total gagné</div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gray-700)' }}>{Number(selectedGuide.total_earned).toFixed(2)}€</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Amount display */}
                                <div style={{
                                    background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                                    borderRadius: '12px',
                                    padding: '1.5rem',
                                    textAlign: 'center',
                                    border: '2px solid #a7f3d0'
                                }}>
                                    <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600, marginBottom: '4px' }}>Montant à payer</div>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#059669' }}>{Number(selectedGuide.balance).toFixed(2)}€</div>
                                    <div style={{ fontSize: '0.75rem', color: '#065f46', marginTop: '4px' }}>Le solde du guide passera à 0.00€</div>
                                </div>

                                {/* Admin note */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                                        Note admin (optionnel)
                                    </label>
                                    <textarea
                                        value={adminNote}
                                        onChange={(e) => setAdminNote(e.target.value)}
                                        placeholder="Ex: Encouragement suite aux avis supprimés..."
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--gray-300)',
                                            fontSize: '0.875rem',
                                            minHeight: '80px',
                                            resize: 'vertical',
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                    <p style={{ fontSize: '0.7rem', color: 'var(--gray-500)', marginTop: '4px' }}>
                                        Cette note sera visible dans l'historique des paiements du guide.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button onClick={() => setShowPayModal(false)} className="btn-secondary">
                                Annuler
                            </button>
                            <button
                                onClick={handleForcePay}
                                className="admin-btn-primary"
                                style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                                disabled={isPaying}
                            >
                                {isPaying ? 'Paiement en cours...' : `Confirmer le paiement de ${Number(selectedGuide.balance).toFixed(2)}€`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};
