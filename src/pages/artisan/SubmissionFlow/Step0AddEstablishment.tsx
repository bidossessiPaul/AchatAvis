import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { artisanService } from '../../../services/artisanService';
import { ArrowLeft, HelpCircle, Info } from 'lucide-react';
import { format } from 'date-fns';
import './SubmissionFlow.css';

interface Step0AddEstProps {
    platformId: string;
    onNext: (establishment: any) => void;
    onBack: () => void;
    initialData?: any;
    orderInitialData?: any;
}

export const Step0AddEstablishment: React.FC<Step0AddEstProps> = ({ platformId, onNext, onBack, initialData, orderInitialData }) => {
    const [sectors, setSectors] = useState<any[]>([]);
    const [availablePacks, setAvailablePacks] = useState<any[]>([]);
    const [isLoadingPacks, setIsLoadingPacks] = useState(true);

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
        }),
        // Pack data
        payment_id: orderInitialData?.payment_id || '',
        quantity: orderInitialData?.quantity || 10,
        initial_review_count: initialData?.initial_review_count || 0
    });

    // Deep persistence sync
    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                ...initialData,
                payment_id: prev.payment_id || orderInitialData?.payment_id || '',
                quantity: prev.quantity || orderInitialData?.quantity || 10,
                initial_review_count: prev.initial_review_count || initialData?.initial_review_count || 0
            }));
        }
    }, [initialData, orderInitialData]);

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

        const fetchPacks = async () => {
            setIsLoadingPacks(true);
            try {
                const packs = await artisanService.getAvailablePacks(orderInitialData?.payment_id);
                setAvailablePacks(packs);

                if (packs.length > 0 && !formData.payment_id) {
                    setFormData(prev => ({
                        ...prev,
                        payment_id: packs[0].id,
                        quantity: packs[0].review_quantity || 10
                    }));
                }
            } catch (err) {
                console.error('Failed to fetch packs', err);
            } finally {
                setIsLoadingPacks(false);
            }
        };

        fetchSectors();
        fetchPacks();
    }, [orderInitialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Find the selected sector to get full details
        const selectedSector = sectors.find(s => s.sector_slug === formData.sector_slug);

        // Date Strategy: [Company Name] - DD/MM/YYYY
        const today = format(new Date(), 'dd/MM/yyyy');
        const generatedFicheName = `${formData.name} - ${today}`;

        // Enrich formData with complete information
        const enrichedData = {
            ...formData,
            fiche_name: generatedFicheName,
            sector_id: selectedSector?.id || null,
            sector_name: selectedSector?.sector_name || '',
            sector_difficulty: selectedSector?.difficulty || 'easy'
        };

        onNext(enrichedData);
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

                <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        Niveau d'avis actuel *
                        <div className="info-tooltip-container">
                            <HelpCircle size={14} />
                            <span className="info-tooltip-text">
                                Le nombre d'avis actuellement visibles sur votre fiche avant le début de cette mission.
                            </span>
                        </div>
                    </label>
                    <input
                        type="number"
                        className="form-input"
                        placeholder="Ex: 12"
                        min="0"
                        value={formData.initial_review_count}
                        onChange={(e) => setFormData({ ...formData, initial_review_count: parseInt(e.target.value) || 0 })}
                        required
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

                {/* Pack Selection Integration */}
                <div className="form-group full-width" style={{ marginTop: '1rem' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <Info size={16} style={{ color: 'var(--primary-brand)' }} />
                        Pack utilisé pour cette mission *
                    </label>

                    {isLoadingPacks ? (
                        <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Chargement de vos packs...</div>
                    ) : availablePacks.length > 0 ? (
                        <>
                            {availablePacks.length > 1 && (
                                <select
                                    className="form-input"
                                    style={{ marginBottom: '1rem' }}
                                    value={formData.payment_id}
                                    onChange={(e) => {
                                        const pack = availablePacks.find(p => p.id === e.target.value);
                                        setFormData({
                                            ...formData,
                                            payment_id: e.target.value,
                                            quantity: pack?.review_quantity || 10
                                        });
                                    }}
                                    required
                                >
                                    {availablePacks.map(pack => (
                                        <option key={pack.id} value={pack.id}>
                                            {pack.pack_name || pack.description} ({pack.fiches_used}/{pack.fiches_quota} mission{pack.fiches_quota > 1 ? 's' : ''})
                                        </option>
                                    ))}
                                </select>
                            )}

                            {formData.payment_id && (
                                <div className="pack-recap-card">
                                    <div className="pack-info">
                                        <div className="pack-name" style={{ color: '#37352f' }}>
                                            {availablePacks.find(p => p.id === formData.payment_id)?.pack_name || 'Pack Sélectionné'}
                                        </div>
                                        <div className="pack-stats">
                                            <span>{formData.quantity} Avis</span>
                                            <span className="divider">|</span>
                                            <span>{availablePacks.find(p => p.id === formData.payment_id)?.amount} €</span>
                                        </div>
                                    </div>
                                    <div className="pack-status">
                                        <div className="status-dot"></div>
                                        mission active
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
                            Aucun pack disponible. Veuillez en acheter un pour continuer.
                        </div>
                    )}
                </div>
            </div>

            <div className="submission-actions">
                <button
                    type="submit"
                    className="btn-next"
                    disabled={!formData.name || !formData.sector_slug || !formData.city || !formData.platform_links[platformId]?.url || !formData.payment_id || formData.initial_review_count === undefined || isLoadingPacks}
                >
                    Suivant (Instruction des avis)
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
                
                /* Pack recap styles copied from Step1Initial */
                .pack-recap-card {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.875rem 1.25rem;
                    background: #fff8e1;
                    border-radius: 1rem;
                    border: 1px solid #FFE6A5;
                    box-shadow: 0 2px 8px rgba(255, 230, 165, 0.2);
                }
                .pack-name { font-weight: 800; color: #37352f; font-size: 0.925rem; }
                .pack-stats {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    color: #FF991F;
                    font-weight: bold;
                    background: rgba(255, 255, 255, 0.5);
                    padding: 4px 12px;
                    border-radius: 2rem;
                    font-size: 0.8rem;
                    margin-top: 4px;
                }
                .pack-status { color: #FF991F; font-weight: 800; display: flex; align-items: center; gap: 4px; font-size: 0.85rem; }
                .status-dot { width: 6px; height: 6px; background: #FF991F; border-radius: 50%; }
                .divider { opacity: 0.3; }
            `}</style>
        </form>
    );
};
