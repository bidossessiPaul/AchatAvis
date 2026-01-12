import React, { useState, useEffect } from 'react';
import { ReviewOrder, Establishment } from '../../../types';
import { useAuthStore } from '../../../context/authStore';
import { artisanService } from '../../../services/artisanService';
import { PlusCircle, BookOpen, Info, HelpCircle } from 'lucide-react';

interface Step1Props {
    initialData: Partial<ReviewOrder> | null;
    onNext: (data: Partial<ReviewOrder>) => void;
    onBack: () => void;
    fixedEstablishment?: Establishment | null;
}

export const Step1Initial: React.FC<Step1Props> = ({ initialData, onNext, onBack, fixedEstablishment }) => {
    const { user } = useAuthStore();
    const [availablePacks, setAvailablePacks] = useState<any[]>([]);
    const [isLoadingPacks, setIsLoadingPacks] = useState(true);

    const [formData, setFormData] = useState({
        establishment_id: initialData?.establishment_id || (fixedEstablishment as any)?.establishment_id || fixedEstablishment?.id || '',
        mission_name: initialData?.mission_name || '',
        company_name: initialData?.company_name || fixedEstablishment?.name || '',
        google_business_url: initialData?.google_business_url || fixedEstablishment?.google_business_url || fixedEstablishment?.platform_links?.google?.url || '',
        company_context: initialData?.company_context || fixedEstablishment?.company_context || '',
        sector: initialData?.sector || fixedEstablishment?.sector_name || '',
        sector_id: initialData?.sector_id || fixedEstablishment?.sector_id || null,
        sector_slug: initialData?.sector_slug || fixedEstablishment?.sector_slug || '',
        sector_difficulty: initialData?.sector_difficulty || fixedEstablishment?.sector_difficulty || 'easy',
        city: initialData?.city || fixedEstablishment?.city || '',
        quantity: user?.monthly_reviews_quota || 10,
        payment_id: initialData?.payment_id || ''
    });

    useEffect(() => {
        const fetchData = async () => {
            setIsLoadingPacks(true);
            try {
                const packs = await artisanService.getAvailablePacks(initialData?.payment_id);
                setAvailablePacks(packs);

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
                console.error("Failed to fetch packs", error);
            } finally {
                setIsLoadingPacks(false);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onNext(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="step-container">
            <h2 className="submission-card-title">Configuration de la mission</h2>

            <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <PlusCircle size={18} style={{ color: '#ff3b6a' }} />
                    Nom de la collaboration
                    <div className="info-tooltip-container">
                        <HelpCircle size={16} />
                        <span className="info-tooltip-text">
                            Utilisez un nom clair pour identifier cette mission dans votre tableau de bord (ex: "Booster Clients Été", "Campagne Plomberie").
                        </span>
                    </div>
                </label>
                <input
                    type="text"
                    className="form-input"
                    value={formData.mission_name}
                    onChange={(e) => setFormData({ ...formData, mission_name: e.target.value })}
                    placeholder="Ex: Pose de climatisation, Rénovation salle de bain, Installation pompe à chaleur..."
                    required
                />
            </div>

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
                                    {pack.pack_name || pack.description} ({pack.missions_used}/{pack.missions_quota} Mission{pack.missions_quota > 1 ? 's' : ''})
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
                <button type="button" onClick={onBack} className="btn-back">
                    Retour
                </button>
                <button
                    type="submit"
                    className="btn-next"
                    disabled={!formData.mission_name || !formData.company_context || !formData.payment_id || isLoadingPacks}
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
                @media (max-width: 640px) {
                    .pack-recap-card {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1rem;
                    }
                    .pack-status {
                        width: 100%;
                        justify-content: flex-end;
                    }
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
                .pack-status { color: #ff3b6a; font-weight: 800; display: flex; align-items: center; gap: 4px; font-size: 0.85rem; }
                .status-dot { width: 6px; height: 6px; background: #ff3b6a; border-radius: 50%; }
            `}</style>
        </form>
    );
};
