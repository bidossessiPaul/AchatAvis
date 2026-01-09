import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReviewOrder, Establishment } from '../../../types';
import { useAuthStore } from '../../../context/authStore';
import { artisanService } from '../../../services/artisanService';
import { establishmentApi } from '../../../services/api';
import { Globe, BookOpen, Info, PlusCircle, Building2, ChevronRight, AlertCircle } from 'lucide-react';

interface Step1Props {
    initialData: Partial<ReviewOrder> | null;
    onNext: (data: Partial<ReviewOrder>) => void;
}

export const Step1Initial: React.FC<Step1Props> = ({ initialData, onNext }) => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [availablePacks, setAvailablePacks] = useState<any[]>([]);
    const [isLoadingPacks, setIsLoadingPacks] = useState(true);
    const [establishments, setEstablishments] = useState<Establishment[]>([]);
    const [isLoadingEst, setIsLoadingEst] = useState(true);

    const [formData, setFormData] = useState({
        establishment_id: initialData?.establishment_id || '',
        company_name: initialData?.company_name || '',
        google_business_url: initialData?.google_business_url || '',
        company_context: initialData?.company_context || '',
        sector: initialData?.sector || '',
        sector_id: initialData?.sector_id || null,
        sector_slug: initialData?.sector_slug || '',
        sector_difficulty: initialData?.sector_difficulty || 'easy',
        city: initialData?.city || '',
        quantity: user?.monthly_reviews_quota || 10,
        payment_id: initialData?.payment_id || ''
    });

    // Sync establishment data whenever establishment_id or establishments list changes
    useEffect(() => {
        if (formData.establishment_id && establishments.length > 0) {
            const est = establishments.find(e => e.id === formData.establishment_id);
            if (est) {
                // Determine if we should update (only if fields are currently empty or it's a new establishment selection)
                const shouldSync = !formData.sector_slug || !formData.city || !formData.company_name;

                if (shouldSync) {
                    setFormData(prev => ({
                        ...prev,
                        company_name: est.name,
                        google_business_url: est.google_business_url || est.platform_links?.google?.url || prev.google_business_url,
                        company_context: est.company_context || prev.company_context,
                        sector: est.sector_name || prev.sector,
                        sector_id: est.sector_id || prev.sector_id,
                        sector_slug: est.sector_slug || prev.sector_slug,
                        sector_difficulty: est.sector_difficulty || prev.sector_difficulty,
                        city: est.city || prev.city
                    }));
                }
            }
        }
    }, [formData.establishment_id, establishments]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoadingPacks(true);
            setIsLoadingEst(true);
            try {
                const [packs, estResults] = await Promise.all([
                    artisanService.getAvailablePacks(initialData?.payment_id),
                    establishmentApi.getMyEstablishments()
                ]);

                const fetchedEsts = estResults.data || [];
                setEstablishments(fetchedEsts);
                setAvailablePacks(packs);

                // If only one establishment and none selected, select it
                if (fetchedEsts.length === 1 && !formData.establishment_id) {
                    const est = fetchedEsts[0];
                    setFormData(prev => ({
                        ...prev,
                        establishment_id: est.id,
                        company_name: est.name,
                        google_business_url: est.google_business_url || est.platform_links?.google?.url || '',
                        company_context: est.company_context || '',
                        sector: est.sector_name || '',
                        sector_id: est.sector_id || null,
                        sector_slug: est.sector_slug || '',
                        sector_difficulty: est.sector_difficulty || 'easy',
                        city: est.city || ''
                    }));
                }

                // Auto-sync pack data
                if (packs.length > 0) {
                    setFormData(prev => {
                        const currentPaymentId = initialData?.payment_id || prev.payment_id;

                        if (currentPaymentId) {
                            const selectedPack = packs.find(p => p.id === currentPaymentId);
                            if (selectedPack) {
                                return {
                                    ...prev,
                                    payment_id: currentPaymentId,
                                    quantity: selectedPack.review_quantity || 10
                                };
                            }
                        }

                        return {
                            ...prev,
                            payment_id: packs[0].id,
                            quantity: packs[0].review_quantity || 10
                        };
                    });
                }
            } catch (error) {
                console.error("Failed to fetch packs or establishments", error);
            } finally {
                setIsLoadingPacks(false);
                setIsLoadingEst(false);
            }
        };
        fetchData();
    }, []);

    const handleEstablishmentChange = (estId: string) => {
        const est = establishments.find(e => e.id === estId);
        if (est) {
            setFormData({
                ...formData,
                establishment_id: est.id,
                company_name: est.name,
                google_business_url: est.google_business_url || est.platform_links?.google?.url || '',
                company_context: est.company_context || formData.company_context,
                sector: est.sector_name || '',
                sector_id: est.sector_id || null,
                sector_slug: est.sector_slug || '',
                sector_difficulty: est.sector_difficulty || 'easy',
                city: est.city || ''
            });
        } else {
            setFormData({
                ...formData,
                establishment_id: '',
                company_name: '',
                google_business_url: '',
                sector: '',
                sector_id: null,
                sector_slug: '',
                sector_difficulty: 'easy',
                city: ''
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onNext(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="step-container">
            <h2 className="submission-card-title">Informations de la mission</h2>

            <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <Building2 size={18} style={{ color: '#ff3b6a' }} />
                        Établissement cible
                    </label>
                    <button
                        type="button"
                        className="text-btn"
                        onClick={() => navigate('/artisan/establishments/add')}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ff3b6a', fontSize: '0.85rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        <PlusCircle size={14} />
                        Ajouter nouveau
                    </button>
                </div>

                {isLoadingEst ? (
                    <div className="skeleton-line" style={{ height: '48px' }}></div>
                ) : establishments.length > 0 ? (
                    <select
                        className="form-input"
                        value={formData.establishment_id}
                        onChange={(e) => handleEstablishmentChange(e.target.value)}
                        required
                    >
                        <option value="">Sélectionnez un établissement...</option>
                        {establishments.map(est => (
                            <option key={est.id} value={est.id}>
                                {est.name} ({est.city})
                            </option>
                        ))}
                    </select>
                ) : (
                    <div className="empty-est-notice" onClick={() => navigate('/artisan/establishments/add')}>
                        <div className="icon-circle">
                            <PlusCircle size={24} />
                        </div>
                        <div className="text-content">
                            <h4>Aucun établissement enregistré</h4>
                            <p>Vous devez ajouter un établissement avant de pouvoir lancer une campagne.</p>
                        </div>
                        <ChevronRight size={20} className="arrow" />
                    </div>
                )}
            </div>

            {formData.establishment_id && (
                <div className="est-preview-card animate-in">
                    <div className="info-row">
                        <Globe size={16} />
                        <span>Google Business : <strong>{formData.google_business_url ? 'Connecté' : 'Non renseigné'}</strong></span>
                    </div>
                    {establishments.find(e => e.id === formData.establishment_id)?.verification_status === 'pending' && (
                        <div className="status-badge pending">
                            <AlertCircle size={14} />
                            En attente de validation admin
                        </div>
                    )}
                </div>
            )}

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BookOpen size={18} style={{ color: '#ff3b6a' }} />
                    Contexte général de la mission
                </label>
                <textarea
                    className="form-textarea"
                    value={formData.company_context}
                    onChange={(e) => setFormData({ ...formData, company_context: e.target.value })}
                    placeholder="Décrivez brièvement votre activité. Si vous avez sélectionné un établissement, ce champ est pré-rempli mais reste modifiable pour cette campagne spécifique..."
                    required
                />
            </div>

            {isLoadingPacks ? (
                <div style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Chargement de vos packs...</div>
            ) : availablePacks.length > 0 && (
                <div className="form-group" style={{ marginBottom: '2rem' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <Info size={18} style={{ color: '#ff3b6a' }} />
                        Pack utilisé
                    </label>

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
                        >
                            {availablePacks.map(pack => (
                                <option key={pack.id} value={pack.id}>
                                    {pack.pack_name || pack.description} ({pack.missions_used}/{pack.missions_allowed})
                                </option>
                            ))}
                        </select>
                    )}

                    {formData.payment_id && (
                        <div className="pack-recap-card">
                            <div className="pack-info">
                                <div className="pack-name">
                                    {availablePacks.find(p => p.id === formData.payment_id)?.pack_name || 'Pack Selectionné'}
                                </div>
                                <div className="pack-stats">
                                    <span>{formData.quantity} Avis</span>
                                    <span className="divider">|</span>
                                    <span>{availablePacks.find(p => p.id === formData.payment_id)?.amount} €</span>
                                </div>
                            </div>
                            <div className="pack-status">
                                <div className="status-dot"></div>
                                Mission active
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="submission-actions">
                <button
                    type="submit"
                    className="btn-next"
                    disabled={!formData.establishment_id || isLoadingPacks}
                >
                    Suivant
                </button>
            </div>

            <style>{`
                .empty-est-notice {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1.5rem;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px dashed rgba(255, 59, 106, 0.3);
                    border-radius: 1rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .empty-est-notice:hover {
                    background: rgba(255, 59, 106, 0.05);
                    border-color: #ff3b6a;
                }
                .icon-circle {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: #fff1f2;
                    color: #ff3b6a;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .text-content h4 {
                    margin: 0;
                    font-size: 1rem;
                    color: #fff;
                }
                .text-content p {
                    margin: 4px 0 0;
                    font-size: 0.85rem;
                    color: #94a3b8;
                }
                .arrow { color: #475569; margin-left: auto; }
                
                .est-preview-card {
                    margin-top: 1rem;
                    padding: 1rem;
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 0.75rem;
                }
                .info-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.85rem;
                    color: #94a3b8;
                }
                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    margin-top: 8px;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                .status-badge.pending {
                    background: rgba(245, 158, 11, 0.1);
                    color: #f59e0b;
                }
                
                .pack-recap-card {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.875rem 1.25rem;
                    background: #fff;
                    border-radius: 1rem;
                    border: 1px solid #ff3b6a;
                    box-shadow: 0 4px 12px rgba(255, 59, 106, 0.1);
                }
                .pack-name { font-weight: 800; color: #1e293b; font-size: 0.925rem; }
                .pack-stats {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    color: #ff3b6a;
                    font-weight: bold;
                    background: #fff1f2;
                    padding: 4px 12px;
                    border-radius: 2rem;
                    font-size: 0.8rem;
                    margin-top: 4px;
                }
                .pack-status { color: #ff3b6a; font-weight: 800; display: flex; alignItems: center; gap: 4px; font-size: 0.85rem; }
                .status-dot { width: 6px; height: 6px; background: #ff3b6a; border-radius: 50%; }
            `}</style>
        </form>
    );
};
