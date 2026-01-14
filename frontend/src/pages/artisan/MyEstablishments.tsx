import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { establishmentApi } from '../../services/api';
import {
    Building2,
    PlusCircle,
    MapPin,
    ExternalLink,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Search as SearchIcon,
    Eye
} from 'lucide-react';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import { Establishment } from '../../types';
import './ArtisanEstablishments.css';

export const MyEstablishments: React.FC = () => {
    const navigate = useNavigate();
    const [establishments, setEstablishments] = useState<Establishment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchEstablishments();
    }, []);

    const fetchEstablishments = async () => {
        setIsLoading(true);
        try {
            const response = await establishmentApi.getMyEstablishments();
            setEstablishments(response.data || []);
        } catch (error) {
            console.error('Erreur lors de la récupération des établissements:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filtered = establishments.filter(est =>
        est.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        est.city.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'verified':
                return <span className="status-badge verified"><CheckCircle2 size={12} /> Validé</span>;
            case 'rejected':
                return <span className="status-badge rejected"><XCircle size={12} /> Rejeté</span>;
            default:
                return <span className="status-badge pending"><AlertCircle size={12} /> En attente</span>;
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
                <span className="platform-type-badge" style={{ backgroundColor: 'rgba(66, 133, 244, 0.1)', color: '#4285F4' }}>
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
                className="platform-type-badge"
                style={{ backgroundColor: config.bg, color: config.color }}
            >
                {config.label}
            </span>
        );
    };

    return (
        <DashboardLayout title="Mes Établissements">
            <div className="artisan-establishments-page animate-in">
                <div className="page-header-actions">
                    <div className="search-bar">
                        <SearchIcon size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher un établissement..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="primary"
                        onClick={() => navigate('/artisan/establishments/add')}
                    >
                        <PlusCircle size={20} />
                        Ajouter un établissement
                    </Button>
                </div>

                {isLoading ? (
                    <div className="loading-container">
                        <LoadingSpinner size="lg" text="Chargement de vos établissements..." />
                    </div>
                ) : establishments.length > 0 ? (
                    <div className="establishments-grid">
                        {filtered.map((est) => (
                            <div key={est.id} className="establishment-card">
                                <div className="card-top">
                                    <div className="icon-box">
                                        <Building2 size={24} />
                                    </div>
                                    <div className="status-container">
                                        {getStatusBadge(est.verification_status)}
                                    </div>
                                </div>
                                <div className="card-content">
                                    <h3>{est.name}</h3>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                                        <p className="location" style={{ margin: 0 }}>
                                            <MapPin size={14} />
                                            {est.city}
                                        </p>
                                        {getPlatformBadge(est.platform_links)}
                                    </div>
                                    <div className="sector-badge">
                                        {est.sector_name || est.sector_slug || 'Secteur non défini'}
                                    </div>
                                </div>
                                <div className="card-footer">
                                    {(() => {
                                        let links = est.platform_links;
                                        if (typeof links === 'string') {
                                            try { links = JSON.parse(links); } catch (e) { links = null; }
                                        }
                                        const firstPlatform = links ? Object.keys(links)[0] : null;
                                        const url = est.google_business_url || (links && firstPlatform ? links[firstPlatform]?.url : null);
                                        const platformLabel = firstPlatform === 'google' || !firstPlatform ? 'Google' :
                                            firstPlatform === 'trustpilot' ? 'Trustpilot' :
                                                firstPlatform === 'pagesjaunes' ? 'Pages Jaunes' : 'Plateforme';

                                        return url ? (
                                            <a
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="link-google"
                                            >
                                                <ExternalLink size={14} /> Voir sur {platformLabel}
                                            </a>
                                        ) : (
                                            <span className="no-link">Lien non renseigné</span>
                                        );
                                    })()}
                                    <button
                                        onClick={() => navigate(`/artisan/establishments/${est.id}`)}
                                        style={{
                                            background: 'var(--primary-brand)',
                                            color: 'white',
                                            border: 'none',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '0.5rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            fontWeight: 600,
                                            fontSize: '0.875rem',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = '#FFD700', e.currentTarget.style.color = '#000')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--primary-brand)', e.currentTarget.style.color = 'white')}
                                    >
                                        <Eye size={16} />
                                        Voir détails
                                    </button>
                                </div>
                                {est.verification_status === 'rejected' && est.rejection_reason && (
                                    <div className="rejection-box">
                                        <strong>Motif du rejet :</strong> {est.rejection_reason}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <Building2 size={64} />
                        </div>
                        <h2>Aucun établissement</h2>
                        <p>Vous n'avez pas encore enregistré d'établissement. Ajoutez-en un pour commencer vos campagnes.</p>
                        <Button
                            variant="primary"
                            onClick={() => navigate('/artisan/establishments/add')}
                        >
                            Ajouter mon premier établissement
                        </Button>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};
