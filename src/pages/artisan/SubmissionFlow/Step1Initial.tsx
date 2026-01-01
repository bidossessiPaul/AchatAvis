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


    // Déterminer le nombre d'avis du pack actif de l'utilisateur
    const userPackQuota = user?.monthly_reviews_quota || 5;
    const userPackTier = user?.subscription_tier || 'discovery';

    const packNames: Record<string, string> = {
        'discovery': 'Pack Découverte',
        'growth': 'Pack Croissance',
        'expert': 'Pack Expert'
    };

    const [formData, setFormData] = useState({
        company_name: initialData?.company_name || '',
        google_business_url: initialData?.google_business_url || '',
        company_context: initialData?.company_context || '',
        quantity: userPackQuota,
        payment_id: initialData?.payment_id || ''
    });

    useEffect(() => {
        const fetchData = async () => {
            setIsLoadingPacks(true);
            try {
                const [urls, packs] = await Promise.all([
                    artisanService.getGoogleUrlHistory(),
                    artisanService.getAvailablePacks()
                ]);
                setHistory(urls);
                setAvailablePacks(packs);

                // Auto-select the first pack if nothing is selected yet
                if (packs.length > 0) {
                    setFormData(prev => {
                        // Priority: 1. initialData, 2. First pack from list
                        const currentPaymentId = initialData?.payment_id || prev.payment_id;

                        if (!currentPaymentId) {
                            return {
                                ...prev,
                                payment_id: packs[0].id,
                                quantity: packs[0].missions_quota - packs[0].missions_used
                            };
                        }
                        return prev;
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

            <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Info size={18} style={{ color: '#ff3b6a' }} />
                    Sélectionnez votre pack disponible
                </label>

                {isLoadingPacks ? (
                    <div style={{ color: '#666', fontSize: '0.875rem' }}>Chargement de vos packs...</div>
                ) : availablePacks.length === 0 ? (
                    <div style={{
                        padding: '1rem',
                        backgroundColor: '#fff1f2',
                        color: '#ff3b6a',
                        borderRadius: '0.75rem',
                        fontSize: '0.875rem',
                        border: '1px solid #ff3b6a'
                    }}>
                        Vous n'avez aucun pack actif avec des missions restantes.
                    </div>
                ) : availablePacks.length > 1 ? (
                    <select
                        className="form-input"
                        value={formData.payment_id}
                        onChange={(e) => {
                            const pack = availablePacks.find(p => p.id === e.target.value);
                            setFormData({
                                ...formData,
                                payment_id: e.target.value,
                                quantity: pack ? (pack.missions_quota - pack.missions_used) : userPackQuota
                            });
                        }}
                        required
                    >
                        {availablePacks.map(pack => (
                            <option key={pack.id} value={pack.id}>
                                {pack.description} ({pack.missions_quota - pack.missions_used} avis restants - {new Date(pack.created_at).toLocaleDateString()})
                            </option>
                        ))}
                    </select>
                ) : null}

                <div style={{
                    marginTop: '1rem',
                    padding: '1.5rem',
                    background: '#ff3b6a',
                    borderRadius: '1rem',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 10px 30px rgba(255, 59, 106, 0.25)'
                }}>
                    <div>
                        <div style={{
                            fontSize: '1.75rem',
                            fontWeight: '800',
                            color: '#fff'
                        }}>
                            {formData.quantity} avis
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: 'rgba(255, 255, 255, 0.9)',
                            marginTop: '0.25rem',
                            fontWeight: '600'
                        }}>
                            {availablePacks.find(p => p.id === formData.payment_id)?.description || packNames[userPackTier] || 'Votre pack'}
                        </div>
                    </div>
                    <div style={{
                        backgroundColor: '#fff',
                        color: '#ff3b6a',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        Inclus
                    </div>
                </div>

                {/* FUTURE FEATURE: Achat d'avis supplémentaires
                <div style={{ marginTop: '1rem' }}>
                    <label className="form-label">
                        Avis supplémentaires (optionnel)
                        <span style={{ color: '#9ca3af', fontWeight: 'normal', marginLeft: '0.5rem' }}>
                            - 5€ par avis
                        </span>
                    </label>
                    <input
                        type="number"
                        className="form-input"
                        min="0"
                        max="20"
                        value={additionalReviews}
                        onChange={(e) => setAdditionalReviews(parseInt(e.target.value) || 0)}
                        placeholder="0"
                    />
                    {additionalReviews > 0 && (
                        <div style={{
                            marginTop: '0.75rem',
                            padding: '0.75rem',
                            backgroundColor: '#fef3c7',
                            border: '1px solid #fbbf24',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem'
                        }}>
                            <strong>Coût supplémentaire:</strong> {additionalReviews * 5}€
                            <br />
                            <strong>Total d'avis:</strong> {userPackQuota + additionalReviews} avis
                        </div>
                    )}
                </div>
                */}
            </div>

            <div className="submission-actions">
                <button type="submit" className="btn-next">
                    Suivant
                </button>
            </div>
        </form>
    );
};
