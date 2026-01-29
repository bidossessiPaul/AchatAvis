import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminApi } from '../../services/api';
import {
    Search,
    Filter,
    CheckCircle2,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    ExternalLink,
    X,
    User,
    Building2,
    Eye,
    MessageSquare,
    Star,
    Mail,
    ClipboardList,
    Clock as ClockIcon
} from 'lucide-react';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { showError } from '../../utils/Swal';
import { getFileUrl } from '../../utils/url';
import './AdminLists.css';
import './ReviewValidation.css';

interface Review360Item {
    proposal_id: string;
    proposal_content: string;
    proposal_author: string;
    proposal_status: string;
    order_id: string;
    fiche_name: string;
    artisan_name: string;
    artisan_avatar?: string;
    submission_id?: string;
    submission_status?: 'pending' | 'validated' | 'rejected';
    submitted_at?: string;
    review_url?: string;
    guide_name?: string;
    guide_google_email?: string;
}

export const ReviewTracking360: React.FC = () => {
    const [items, setItems] = useState<Review360Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [ficheFilter, setFicheFilter] = useState('all');
    const [daysFilter, setDaysFilter] = useState('all');
    const [selectedItem, setSelectedItem] = useState<Review360Item | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const data = await adminApi.getReview360();
            setItems(data);
        } catch (error) {
            showError('Erreur', 'Erreur lors du chargement des données');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusInfo = (item: Review360Item) => {
        if (!item.submission_id) {
            return {
                label: 'À poster',
                color: '#3b82f6',
                bg: '#eff6ff',
                icon: <ClipboardList size={14} />
            };
        }

        switch (item.submission_status) {
            case 'pending':
                return {
                    label: 'En attente',
                    color: '#92400e',
                    bg: '#fef3c7',
                    icon: <Clock size={14} />
                };
            case 'validated':
                return {
                    label: 'Validé',
                    color: '#166534',
                    bg: '#dcfce7',
                    icon: <CheckCircle2 size={14} />
                };
            case 'rejected':
                return {
                    label: 'Rejeté',
                    color: '#991b1b',
                    bg: '#fee2e2',
                    icon: <X size={14} />
                };
            default:
                return {
                    label: 'Inconnu',
                    color: '#4b5563',
                    bg: '#f3f4f6',
                    icon: <User size={14} />
                };
        }
    };

    // Extract unique fiches for filter
    const uniqueFiches = Array.from(new Set(items.map(item => item.fiche_name).filter(Boolean))).sort();

    const filteredItems = items.filter(item => {
        const matchesSearch =
            item.fiche_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.artisan_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.guide_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.proposal_author?.toLowerCase().includes(searchTerm.toLowerCase());

        const status = item.submission_id ? item.submission_status : 'to_post';
        const matchesStatus = statusFilter === 'all' || status === statusFilter;

        const matchesFiche = ficheFilter === 'all' || item.fiche_name === ficheFilter;

        // Filter by days (only for submitted reviews)
        let matchesDays = true;
        if (daysFilter !== 'all' && item.submitted_at) {
            const daysOld = Math.floor((Date.now() - new Date(item.submitted_at).getTime()) / (1000 * 60 * 60 * 24));
            const threshold = parseInt(daysFilter);
            matchesDays = daysOld >= threshold;
        }

        return matchesSearch && matchesStatus && matchesFiche && matchesDays;
    });

    // Pagination
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, ficheFilter, daysFilter]);

    const openModal = (item: Review360Item) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => setSelectedItem(null), 300);
    };

    return (
        <DashboardLayout title="Suivi 360 des Avis">
            <div className="admin-dashboard revamped">
                <div className="admin-main-card">
                    <div className="admin-card-header" style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', flexWrap: 'wrap', gap: '1.5rem' }}>
                            <div style={{ flex: '1 1 auto', minWidth: '250px' }}>
                                <h2 className="card-title" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.5rem)', fontWeight: 800 }}>Suivi Global des Avis</h2>
                                <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginTop: '4px' }}>
                                    Visualisation à 360° du cycle de vie des avis
                                </p>
                            </div>

                            <div className="admin-controls-premium" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div className="search-box-premium" style={{ position: 'relative', flex: '1 1 280px', minWidth: '250px' }}>
                                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                    <input
                                        type="text"
                                        placeholder="Fiche, artisan, guide..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{
                                            padding: '0.75rem 1rem 0.75rem 2.5rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--gray-200)',
                                            width: '100%',
                                            fontSize: '0.875rem'
                                        }}
                                    />
                                </div>

                                <div className="filter-group-premium" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--gray-50)', padding: '4px', borderRadius: '14px', border: '1px solid var(--gray-200)', flexWrap: 'wrap' }}>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <Filter size={16} style={{ position: 'absolute', left: '12px', color: 'var(--gray-500)', pointerEvents: 'none' }} />
                                        <select
                                            className="admin-select-premium"
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            style={{
                                                padding: '0.6rem 2rem 0.6rem 2.25rem',
                                                borderRadius: '10px',
                                                border: 'none',
                                                background: 'white',
                                                fontSize: '0.875rem',
                                                fontWeight: 600,
                                                color: 'var(--gray-700)',
                                                cursor: 'pointer',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                minWidth: '150px'
                                            }}
                                        >
                                            <option value="all">Tous les Statuts</option>
                                            <option value="to_post">À poster</option>
                                            <option value="pending">En attente</option>
                                            <option value="validated">Validés</option>
                                            <option value="rejected">Rejetés</option>
                                        </select>
                                    </div>

                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <Building2 size={16} style={{ position: 'absolute', left: '12px', color: 'var(--gray-500)', pointerEvents: 'none' }} />
                                        <select
                                            className="admin-select-premium"
                                            value={ficheFilter}
                                            onChange={(e) => setFicheFilter(e.target.value)}
                                            style={{
                                                padding: '0.6rem 2rem 0.6rem 2.25rem',
                                                borderRadius: '10px',
                                                border: 'none',
                                                background: 'white',
                                                fontSize: '0.875rem',
                                                fontWeight: 600,
                                                color: 'var(--gray-700)',
                                                cursor: 'pointer',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                minWidth: '150px'
                                            }}
                                        >
                                            <option value="all">Toutes les Fiches</option>
                                            {uniqueFiches.map(fiche => (
                                                <option key={fiche} value={fiche}>{fiche}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <ClockIcon size={16} style={{ position: 'absolute', left: '12px', color: 'var(--gray-500)', pointerEvents: 'none' }} />
                                        <select
                                            className="admin-select-premium"
                                            value={daysFilter}
                                            onChange={(e) => setDaysFilter(e.target.value)}
                                            style={{
                                                padding: '0.6rem 2rem 0.6rem 2.25rem',
                                                borderRadius: '10px',
                                                border: 'none',
                                                background: 'white',
                                                fontSize: '0.875rem',
                                                fontWeight: 600,
                                                color: 'var(--gray-700)',
                                                cursor: 'pointer',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                minWidth: '150px'
                                            }}
                                        >
                                            <option value="all">Tous les délais</option>
                                            <option value="3">+ de 3 jours</option>
                                            <option value="7">+ de 7 jours</option>
                                            <option value="14">+ de 14 jours</option>
                                            <option value="30">+ de 30 jours</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="admin-table-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        {isLoading ? (
                            <div className="admin-loading">
                                <LoadingSpinner size="lg" text="Chargement..." />
                            </div>
                        ) : (
                            <table className="admin-modern-table" style={{ borderCollapse: 'separate', borderSpacing: '0 10px', minWidth: '900px' }}>
                                <thead>
                                    <tr style={{ background: 'transparent' }}>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem', width: '60px' }}></th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Entreprise</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Avis & Auteur</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Local Guide</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Statut 360</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Dernière Action</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }} className="text-center">Détails</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedItems.length > 0 ? paginatedItems.map((item) => {
                                        const status = getStatusInfo(item);
                                        return (
                                            <tr key={item.proposal_id} style={{ backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', borderRadius: '16px', overflow: 'hidden' }}>
                                                <td style={{ padding: '1rem 0.5rem 1rem 1.5rem', border: 'none', borderRadius: '16px 0 0 16px', width: '60px' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--gray-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-brand)', boxShadow: '0 2px 5px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid var(--gray-100)' }}>
                                                        {item.artisan_avatar ? (
                                                            <img src={getFileUrl(item.artisan_avatar)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <Building2 size={20} />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="font-medium" style={{ padding: '1.25rem 1.5rem 1.25rem 0', border: 'none' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>{item.fiche_name}</div>
                                                        <div style={{ color: '#6b7280', fontSize: '13px', marginTop: '2px' }}>{item.artisan_name}</div>
                                                    </div>
                                                </td>
                                                <td style={{ border: 'none' }}>
                                                    <div style={{ maxWidth: '250px' }}>
                                                        <div style={{ fontWeight: 600, color: '#374151', fontSize: '13px' }}>{item.proposal_author}</div>
                                                        <div style={{ color: '#6b7280', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {item.proposal_content}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ border: 'none' }}>
                                                    {item.guide_name ? (
                                                        <div>
                                                            <div style={{ fontWeight: 600, color: '#111827', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <User size={14} /> {item.guide_name}
                                                            </div>
                                                            <div style={{ color: '#6b7280', fontSize: '11px' }}>{item.guide_google_email}</div>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#9ca3af', fontSize: '12px', fontStyle: 'italic' }}>Non assigné</span>
                                                    )}
                                                </td>
                                                <td style={{ border: 'none' }}>
                                                    <span
                                                        className="admin-badge"
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '0.4rem 0.8rem',
                                                            borderRadius: '10px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            textTransform: 'uppercase',
                                                            backgroundColor: status.bg,
                                                            color: status.color
                                                        }}
                                                    >
                                                        {status.icon}
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td style={{ border: 'none' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4b5563', fontSize: '12px' }}>
                                                        <Calendar size={14} />
                                                        {item.submitted_at
                                                            ? new Date(item.submitted_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                            : 'Planifié'
                                                        }
                                                    </div>
                                                </td>
                                                <td className="actions-cell" style={{ border: 'none', borderRadius: '0 16px 16px 0' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                        {item.review_url && (
                                                            <a
                                                                href={item.review_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="action-btn"
                                                                style={{ backgroundColor: '#f8fafc', borderRadius: '10px', color: 'var(--primary-brand)' }}
                                                                title="Voir la preuve"
                                                            >
                                                                <ExternalLink size={18} />
                                                            </a>
                                                        )}
                                                        <button
                                                            className="action-btn"
                                                            style={{ backgroundColor: '#f8fafc', borderRadius: '10px', color: 'var(--gray-600)' }}
                                                            title="Détails"
                                                            onClick={() => openModal(item)}
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={7} className="text-center" style={{ padding: '60px', color: '#9ca3af' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                                    <Search size={48} style={{ opacity: 0.2 }} />
                                                    <p style={{ fontSize: '1.125rem', fontWeight: 500 }}>Aucune donnée trouvée.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Pagination Controls */}
                    {!isLoading && filteredItems.length > 0 && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '2rem',
                            padding: '1.5rem',
                            backgroundColor: 'var(--gray-50)',
                            borderRadius: '12px',
                            flexWrap: 'wrap',
                            gap: '1rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)', fontWeight: 500 }}>Afficher :</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--gray-300)',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        backgroundColor: 'white'
                                    }}
                                >
                                    <option value={20}>20 avis</option>
                                    <option value={50}>50 avis</option>
                                    <option value={100}>100 avis</option>
                                    <option value={200}>200 avis</option>
                                </select>
                                <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>
                                    {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredItems.length)} sur {filteredItems.length}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--gray-300)',
                                        backgroundColor: currentPage === 1 ? 'var(--gray-100)' : 'white',
                                        color: currentPage === 1 ? 'var(--gray-400)' : 'var(--gray-700)',
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <ChevronLeft size={16} />
                                    Précédent
                                </button>

                                <span style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    color: 'var(--gray-700)'
                                }}>
                                    Page {currentPage} / {totalPages}
                                </span>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--gray-300)',
                                        backgroundColor: currentPage === totalPages ? 'var(--gray-100)' : 'white',
                                        color: currentPage === totalPages ? 'var(--gray-400)' : 'var(--gray-700)',
                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Suivant
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de détails */}
            {isModalOpen && selectedItem && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: 'clamp(0.5rem, 2vw, 1rem)'
                    }}
                    onClick={closeModal}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 'clamp(12px, 3vw, 20px)',
                            maxWidth: '700px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                            position: 'relative'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{
                            padding: 'clamp(1rem, 3vw, 2rem)',
                            borderBottom: '1px solid var(--gray-200)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            position: 'sticky',
                            top: 0,
                            backgroundColor: 'white',
                            borderRadius: 'clamp(12px, 3vw, 20px) clamp(12px, 3vw, 20px) 0 0',
                            zIndex: 1,
                            gap: '1rem'
                        }}>
                            <div style={{ flex: '1' }}>
                                <h3 style={{ fontSize: 'clamp(1.125rem, 4vw, 1.5rem)', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>
                                    Détails de l'Avis
                                </h3>
                                <p style={{ color: '#6b7280', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', wordBreak: 'break-word' }}>
                                    {selectedItem.fiche_name}
                                </p>
                            </div>
                            <button
                                onClick={closeModal}
                                style={{
                                    background: 'var(--gray-100)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    width: '40px',
                                    height: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: 'var(--gray-600)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--gray-200)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'var(--gray-100)';
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div style={{ padding: 'clamp(1rem, 3vw, 2rem)' }}>
                            {/* Status Badge */}
                            <div style={{ marginBottom: '2rem' }}>
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '0.6rem 1.2rem',
                                        borderRadius: '12px',
                                        fontSize: '0.875rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        backgroundColor: getStatusInfo(selectedItem).bg,
                                        color: getStatusInfo(selectedItem).color
                                    }}
                                >
                                    {getStatusInfo(selectedItem).icon}
                                    {getStatusInfo(selectedItem).label}
                                </span>
                            </div>

                            {/* Review Content */}
                            <div style={{ marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                    <MessageSquare size={20} style={{ color: 'var(--primary-brand)' }} />
                                    <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>Contenu de l'Avis</h4>
                                </div>
                                <div style={{
                                    backgroundColor: 'var(--gray-50)',
                                    padding: '1.5rem',
                                    borderRadius: '12px',
                                    border: '1px solid var(--gray-200)'
                                }}>
                                    <p style={{ fontSize: '0.95rem', lineHeight: '1.7', color: '#374151', margin: 0 }}>
                                        {selectedItem.proposal_content}
                                    </p>
                                </div>
                            </div>

                            {/* Author & Rating Section */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                gap: '1rem',
                                marginBottom: '2rem'
                            }}>
                                <div style={{
                                    backgroundColor: '#fef3c7',
                                    padding: '1.25rem',
                                    borderRadius: '12px',
                                    border: '1px solid #fde68a'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
                                        <User size={16} style={{ color: '#92400e' }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Auteur</span>
                                    </div>
                                    <p style={{ fontSize: '1rem', fontWeight: 600, color: '#78350f', margin: 0 }}>
                                        {selectedItem.proposal_author}
                                    </p>
                                </div>

                                <div style={{
                                    backgroundColor: '#fef3c7',
                                    padding: '1.25rem',
                                    borderRadius: '12px',
                                    border: '1px solid #fde68a'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
                                        <Star size={16} style={{ color: '#92400e' }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Note</span>
                                    </div>
                                    <p style={{ fontSize: '1rem', fontWeight: 600, color: '#78350f', margin: 0 }}>
                                        ⭐ Excellente
                                    </p>
                                </div>
                            </div>

                            {/* Artisan & Fiche Info */}
                            <div style={{ marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                    <Building2 size={20} style={{ color: 'var(--primary-brand)' }} />
                                    <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>Fiche & Artisan</h4>
                                </div>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr',
                                    gap: '0.75rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Nom de la fiche :</span>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{selectedItem.fiche_name}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Artisan :</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {selectedItem.artisan_avatar ? (
                                                <img src={getFileUrl(selectedItem.artisan_avatar)} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Building2 size={12} style={{ color: 'var(--gray-400)' }} />
                                                </div>
                                            )}
                                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{selectedItem.artisan_name}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Guide Info */}
                            {selectedItem.guide_name && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                        <User size={20} style={{ color: 'var(--primary-brand)' }} />
                                        <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>Local Guide</h4>
                                    </div>
                                    <div style={{
                                        backgroundColor: '#eff6ff',
                                        padding: '1.25rem',
                                        borderRadius: '12px',
                                        border: '1px solid #dbeafe'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                            <span style={{ fontSize: '0.875rem', color: '#1e40af' }}>Nom :</span>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e3a8a' }}>{selectedItem.guide_name}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.875rem', color: '#1e40af' }}>Email Google :</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Mail size={14} style={{ color: '#1e40af' }} />
                                                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e3a8a' }}>{selectedItem.guide_google_email}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Submission Info */}
                            {selectedItem.submitted_at && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                        <Calendar size={20} style={{ color: 'var(--primary-brand)' }} />
                                        <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>Date de Soumission</h4>
                                    </div>
                                    <div style={{
                                        backgroundColor: 'var(--gray-50)',
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        border: '1px solid var(--gray-200)',
                                        fontSize: '0.875rem',
                                        color: '#374151'
                                    }}>
                                        {new Date(selectedItem.submitted_at).toLocaleDateString('fr-FR', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Review URL */}
                            {selectedItem.review_url && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <a
                                        href={selectedItem.review_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '0.875rem 1.5rem',
                                            backgroundColor: 'var(--primary-brand)',
                                            color: 'white',
                                            borderRadius: '12px',
                                            textDecoration: 'none',
                                            fontWeight: 600,
                                            fontSize: '0.875rem',
                                            transition: 'all 0.2s',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                        }}
                                    >
                                        <ExternalLink size={18} />
                                        Voir la preuve sur Google
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};
