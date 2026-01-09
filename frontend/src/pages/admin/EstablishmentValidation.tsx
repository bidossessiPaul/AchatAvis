import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminApi } from '../../services/api';
import {
    Search,
    Building2,
    CheckCircle2,
    XCircle,
    MapPin,
    ExternalLink,
    User
} from 'lucide-react';
import { showSuccess, showError } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Establishment } from '../../types';
import './AdminLists.css';

interface EstablishmentWithArtisan extends Establishment {
    artisan_name: string;
}

export const EstablishmentValidation: React.FC = () => {
    const [establishments, setEstablishments] = useState<EstablishmentWithArtisan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Rejection state
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [selectedEstId, setSelectedEstId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const data = await adminApi.getPendingEstablishments();
            setEstablishments(data);
        } catch (error) {
            showError('Erreur', 'Erreur lors du chargement des établissements');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const handleVerify = async (id: string, status: 'verified' | 'rejected', notes?: string) => {
        setIsActionLoading(true);
        try {
            await adminApi.verifyEstablishment(id, { status, notes });
            showSuccess(status === 'verified' ? 'Établissement validé !' : 'Établissement rejeté.');
            setShowRejectModal(false);
            setRejectionReason('');
            fetchData(true);
        } catch (error) {
            showError('Erreur', 'Erreur lors de la validation');
        } finally {
            setIsActionLoading(false);
        }
    };

    const getPlatformBadge = (links: any) => {
        let platformLinks = links;
        if (typeof links === 'string') {
            try {
                platformLinks = JSON.parse(links);
            } catch (e) {
                platformLinks = null;
            }
        }

        if (!platformLinks || typeof platformLinks !== 'object' || Object.keys(platformLinks).length === 0) {
            return (
                <span className="admin-badge" style={{ backgroundColor: 'rgba(66, 133, 244, 0.1)', color: '#4285F4', border: 'none' }}>
                    Google Maps
                </span>
            );
        }

        const platforms = Object.keys(platformLinks);
        const platform = platforms[0];
        const config = {
            google: { label: 'Google Maps', color: '#4285F4', bg: 'rgba(66, 133, 244, 0.1)' },
            trustpilot: { label: 'Trustpilot', color: '#00B67A', bg: 'rgba(0, 182, 122, 0.1)' },
            pagesjaunes: { label: 'Pages Jaunes', color: '#FFD700', bg: 'rgba(255, 215, 0, 0.2)' },
            other: { label: 'Autre', color: '#6366F1', bg: 'rgba(99, 102, 241, 0.1)' }
        }[platform] || { label: platform, color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)' };

        return (
            <span
                className="admin-badge"
                style={{ backgroundColor: config.bg, color: config.color, border: 'none' }}
            >
                {config.label}
            </span>
        );
    };

    const filtered = establishments.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.artisan_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout title="Validation Établissements">
            <div className="admin-dashboard revamped">
                <div className="admin-main-card">
                    <div className="admin-card-header">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <h2 className="card-title">En attente de validation</h2>
                            <div className="admin-controls">
                                <div className="search-box">
                                    <Search size={18} />
                                    <input
                                        type="text"
                                        placeholder="Nom, ville, artisan..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="admin-table-container">
                        {isLoading ? (
                            <div className="admin-loading">
                                <LoadingSpinner size="lg" text="Chargement..." />
                            </div>
                        ) : (
                            <table className="admin-modern-table">
                                <thead>
                                    <tr>
                                        <th>Établissement</th>
                                        <th>Artisan</th>
                                        <th>Localisation</th>
                                        <th>Source</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length > 0 ? filtered.map((est) => (
                                        <tr key={est.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div className="icon-badge">
                                                        <Building2 size={16} />
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span className="font-bold">{est.name}</span>
                                                        <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                                                            {est.sector_name || est.sector_slug}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <User size={14} className="text-gray-400" />
                                                    {est.artisan_name}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                                                        <MapPin size={12} /> {est.city}
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: 'var(--gray-500)', marginLeft: '16px' }}>
                                                        {est.postal_code}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {getPlatformBadge(est.platform_links)}
                                                    {(() => {
                                                        let links = est.platform_links;
                                                        if (typeof links === 'string') {
                                                            try { links = JSON.parse(links); } catch (e) { links = null; }
                                                        }
                                                        const firstPlatform = links ? Object.keys(links)[0] : null;
                                                        const url = est.google_business_url || (links && firstPlatform ? links[firstPlatform]?.url : null);

                                                        return url ? (
                                                            <a href={url} target="_blank" rel="noopener noreferrer" className="review-link-simple">
                                                                <ExternalLink size={12} />
                                                            </a>
                                                        ) : null;
                                                    })()}
                                                </div>
                                            </td>
                                            <td className="actions-cell">
                                                <div className="action-buttons">
                                                    <button
                                                        className="action-btn active-btn"
                                                        title="Valider"
                                                        onClick={() => handleVerify(est.id, 'verified')}
                                                        disabled={isActionLoading}
                                                    >
                                                        <CheckCircle2 size={18} />
                                                    </button>
                                                    <button
                                                        className="action-btn block-btn"
                                                        title="Rejeter"
                                                        onClick={() => {
                                                            setSelectedEstId(est.id);
                                                            setShowRejectModal(true);
                                                        }}
                                                        disabled={isActionLoading}
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="text-center" style={{ padding: '40px', color: 'var(--gray-500)' }}>
                                                Aucun établissement en attente.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Rejection Modal */}
                {showRejectModal && (
                    <div className="rejection-modal-overlay">
                        <div className="rejection-modal">
                            <div className="modal-header">
                                <h3>Motif du rejet</h3>
                                <button className="close-modal-btn" onClick={() => setShowRejectModal(false)}>
                                    <XCircle size={20} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <label>Expliquez à l'artisan pourquoi son établissement est refusé :</label>
                                <textarea
                                    placeholder="Ex: Informations incomplètes, établissement fictif..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    autoFocus
                                ></textarea>
                            </div>
                            <div className="modal-footer">
                                <button className="cancel-btn" onClick={() => setShowRejectModal(false)}>Annuler</button>
                                <button
                                    className="confirm-btn"
                                    disabled={!rejectionReason.trim() || isActionLoading}
                                    onClick={() => handleVerify(selectedEstId!, 'rejected', rejectionReason)}
                                >
                                    Confirmer le rejet
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .icon-badge {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    background: var(--primary-light, #fff1f2);
                    color: var(--primary-color, #ff3b6a);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
            `}</style>
        </DashboardLayout>
    );
};
