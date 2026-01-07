import React, { useState, useEffect } from 'react';
import { ReviewOrder } from '../../../types';
import { useAuthStore } from '../../../context/authStore';
import { artisanService } from '../../../services/artisanService';
import { Globe, BookOpen, Info } from 'lucide-react';

interface Step1Props {
    initialData: Partial<ReviewOrder> | null;
    onNext: (data: Partial<ReviewOrder>) => void;
}

export const Step1Initial: React.FC<Step1Props> = ({ initialData, onNext }) => {
    const { user } = useAuthStore();
    const [history, setHistory] = useState<string[]>([]);
    const [availablePacks, setAvailablePacks] = useState<any[]>([]);
    const [isLoadingPacks, setIsLoadingPacks] = useState(true);

    const [formData, setFormData] = useState({
        company_name: initialData?.company_name || '',
        google_business_url: initialData?.google_business_url || '',
        company_context: initialData?.company_context || '',
        quantity: user?.monthly_reviews_quota || 10,
        payment_id: initialData?.payment_id || ''
    });

    useEffect(() => {
        const fetchData = async () => {
            setIsLoadingPacks(true);
            try {
                // IMPORTANT: include the current payment_id to ensure it's visible even if quota is full
                const [urls, packs] = await Promise.all([
                    artisanService.getGoogleUrlHistory(),
                    artisanService.getAvailablePacks(initialData?.payment_id)
                ]);
                setHistory(urls);
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

                        // If no payment_id or not found, default to first pack
                        return {
                            ...prev,
                            payment_id: packs[0].id,
                            quantity: packs[0].review_quantity || 10
                        };
                    });
                }
            } catch (error) {
                console.error("Failed to fetch Google URL history or packs", error);
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
        <form onSubmit={handleSubmit}>
            <h2 className="submission-card-title">Informations essentielles</h2>

            <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BookOpen size={18} style={{ color: '#ff3b6a' }} />
                    Nom de l'entreprise (Sur Google)
                </label>
                <input
                    type="text"
                    className="form-input"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Ex: Plomberie Dupont & Co"
                    required
                />
            </div>

            <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Globe size={18} style={{ color: '#ff3b6a' }} />
                    Lien de la fiche Google Business
                </label>
                <input
                    type="url"
                    className="form-input"
                    value={formData.google_business_url}
                    onChange={(e) => setFormData({ ...formData, google_business_url: e.target.value })}
                    placeholder="https://www.google.com/maps/place/..."
                    list="google-url-history"
                    required
                />
                <datalist id="google-url-history">
                    {history.map((url, index) => (
                        <option key={index} value={url} />
                    ))}
                </datalist>
                <span style={{ fontSize: '0.8125rem', color: '#666', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Info size={14} />
                    Le lien direct vers votre fiche pour que le guide puisse la localiser.
                </span>
            </div>

            <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Info size={18} style={{ color: '#ff3b6a' }} />
                    Contexte général de votre activité
                </label>
                <textarea
                    className="form-textarea"
                    value={formData.company_context}
                    onChange={(e) => setFormData({ ...formData, company_context: e.target.value })}
                    placeholder="Décrivez brièvement votre activité et ce que vous souhaitez mettre en avant (ex: installation de pompes à chaleur, dépannage express...)"
                    required
                />
            </div>

            {isLoadingPacks ? (
                <div style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Chargement de vos packs...</div>
            ) : availablePacks.length > 0 && (
                <div className="form-group" style={{ marginBottom: '2rem' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <Info size={18} style={{ color: '#ff3b6a' }} />
                        Pack utilisé pour cette mission
                    </label>

                    {/* Show SELECT only if multiple packs */}
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
                                    {pack.pack_name || pack.description}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Compact RECAP Badge */}
                    {formData.payment_id && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.875rem 1.25rem',
                            background: '#fff',
                            borderRadius: '1rem',
                            border: '1px solid #ff3b6a',
                            boxShadow: '0 4px 12px rgba(255, 59, 106, 0.1)',
                            fontSize: '0.925rem'
                        }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div style={{ fontWeight: '800', color: '#1e293b' }}>
                                    {availablePacks.find(p => p.id === formData.payment_id)?.pack_name || 'Pack Selectionné'}
                                </div>
                                <div style={{ color: '#ff3b6a', fontWeight: 'bold', background: '#fff1f2', padding: '4px 12px', borderRadius: '2rem', fontSize: '0.8rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span>{formData.quantity} Avis</span>
                                    <span style={{ opacity: 0.3 }}>|</span>
                                    <span>{availablePacks.find(p => p.id === formData.payment_id)?.amount} €</span>
                                </div>
                            </div>
                            <div style={{ color: '#ff3b6a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div style={{ width: '6px', height: '6px', background: '#ff3b6a', borderRadius: '50%' }}></div>
                                Mission active
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="submission-actions">
                <button type="submit" className="btn-next">
                    Suivant
                </button>
            </div>
        </form>
    );
};
