import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import './SubmissionFlow.css';

interface Step0AddEstProps {
    platformId: string;
    onNext: (establishment: any) => void;
    onBack: () => void;
    initialData?: any;
}

export const Step0AddEstablishment: React.FC<Step0AddEstProps> = ({ platformId, onNext, onBack, initialData }) => {
    const [sectors, setSectors] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        city: initialData?.city || '',
        address_line1: initialData?.address_line1 || '',
        postal_code: initialData?.postal_code || '',
        sector_slug: initialData?.sector_slug || '',
        platform_links: initialData?.platform_links || (initialData?.google_business_url ? {
            google: { url: initialData.google_business_url, verified: false }
        } : {
            [platformId || 'google']: { url: '', verified: false }
        })
    });

    // Deep persistence sync
    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                ...initialData
            }));
        }
    }, [initialData]);

    useEffect(() => {
        const fetchSectors = async () => {
            try {
                const response = await api.get('/anti-detection/sectors');
                const data = response.data.data;
                if (data && typeof data === 'object' && !Array.isArray(data)) {
                    setSectors([...(data.easy || []), ...(data.medium || []), ...(data.hard || [])]);
                } else {
                    setSectors(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error('Failed to fetch sectors', err);
            }
        };
        fetchSectors();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onNext(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="step-content animate-in">
            <div className="step-header-with-back">
                <button type="button" onClick={onBack} className="back-btn-minimal">
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h2 className="submission-card-title">Ajouter votre fiche</h2>
                    <p className="submission-card-subtitle">
                        Complétez les informations pour la fiche {platformId.toUpperCase()}
                    </p>
                </div>
            </div>

            <div className="form-grid-minimal">
                <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        Nom de l'entreprise *
                        <div className="info-tooltip-container">
                            <HelpCircle size={14} />
                            <span className="info-tooltip-text">
                                Le nom exact tel qu'il apparaît sur votre fiche (Google, Trustpilot, etc.).
                            </span>
                        </div>
                    </label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Ex: Ma Super Entreprise"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        Secteur d'activité *
                        <div className="info-tooltip-container">
                            <HelpCircle size={14} />
                            <span className="info-tooltip-text">
                                Le domaine d'activité principal de votre entreprise (ex: Plomberie, Coiffure).
                            </span>
                        </div>
                    </label>
                    <select
                        className="form-input"
                        value={formData.sector_slug}
                        onChange={(e) => setFormData({ ...formData, sector_slug: e.target.value })}
                        required
                    >
                        <option value="">Sélectionnez un secteur</option>
                        {sectors.map(s => (
                            <option key={s.id} value={s.sector_slug}>{s.sector_name}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        Ville *
                        <div className="info-tooltip-container">
                            <HelpCircle size={14} />
                            <span className="info-tooltip-text">
                                La ville principale où est situé votre établissement.
                            </span>
                        </div>
                    </label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Ex: Paris"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        Code Postal
                        <div className="info-tooltip-container">
                            <HelpCircle size={14} />
                            <span className="info-tooltip-text">
                                Le code postal de la ville de votre établissement.
                            </span>
                        </div>
                    </label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="75000"
                        value={formData.postal_code}
                        onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    />
                </div>

                <div className="form-group full-width">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        Lien de la fiche {platformId.toUpperCase()} *
                        <div className="info-tooltip-container">
                            <HelpCircle size={14} />
                            <span className="info-tooltip-text">
                                L'adresse URL directe de votre fiche sur la plateforme pour que nous puissions la trouver.
                            </span>
                        </div>
                    </label>
                    <input
                        type="url"
                        className="form-input"
                        placeholder="https://..."
                        value={formData.platform_links[platformId]?.url || ''}
                        onChange={(e) => setFormData({
                            ...formData,
                            platform_links: {
                                ...formData.platform_links,
                                [platformId]: { url: e.target.value, verified: false }
                            }
                        })}
                        required
                    />
                </div>
            </div>

            <div className="submission-actions">
                <button type="submit" className="btn-next">
                    Suivant
                </button>
            </div>

            <style>{`
                .step-header-with-back {
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                    margin-bottom: 2rem;
                }
                .back-btn-minimal {
                    background: #f1f5f9;
                    border: none;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #64748b;
                    transition: all 0.2s;
                    flex-shrink: 0;
                    margin-top: 4px;
                }
                .back-btn-minimal:hover {
                    background: #e2e8f0;
                    color: #0f172a;
                }
                .form-grid-minimal {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.25rem;
                }
                .form-grid-minimal .full-width {
                    grid-column: 1 / -1;
                }
                @media (max-width: 640px) {
                    .form-grid-minimal {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </form>
    );
};
