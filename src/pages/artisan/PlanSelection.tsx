
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import './PlanSelection.css';

import { artisanService } from '../../services/artisanService';
import { SubscriptionPack } from '../../types';
import { showError, showConfirm } from '../../utils/Swal';

export const PlanSelection: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [packs, setPacks] = useState<SubscriptionPack[]>([]);
    const [availablePacks, setAvailablePacks] = useState<any[]>([]);
    const [isFetching, setIsFetching] = useState(true);

    useEffect(() => {
        loadPacks();
    }, []);

    const loadPacks = async () => {
        try {
            const [packsData, availablePacksData] = await Promise.all([
                artisanService.getSubscriptionPacks(),
                artisanService.getAvailablePacks()
            ]);
            setPacks(packsData);
            setAvailablePacks(availablePacksData);
        } catch (error) {
            console.error("Failed to load packs", error);
        } finally {
            setIsFetching(false);
        }
    };

    const handleSubscribe = async (planId: string) => {
        if (availablePacks.length > 0) {
            const result = await showConfirm(
                'Pack déjà actif',
                `Vous avez encore des crédits disponibles. Voulez-vous vraiment acheter un nouveau pack ?`
            );
            if (!result.isConfirmed) return;
        }

        const redirectBack = searchParams.get('redirect_back');
        if (redirectBack) {
            localStorage.setItem('redirect_after_payment', redirectBack);
        } else {
            localStorage.removeItem('redirect_after_payment');
        }

        setIsLoading(planId);
        try {
            const { url } = await artisanService.createCheckoutSession(planId);
            // Redirect to Stripe Checkout
            window.location.href = url;
        } catch (error) {
            console.error("Payment error", error);
            showError('Erreur', "Une erreur est survenue lors de l'initialisation du paiement.");
            setIsLoading(null);
        }
    };

    return (
        <div className="plan-selection-container">
            <div className="plan-header">
                <h1 className="plan-title">
                    <span style={{ color: 'var(--primary-brand)' }}>Module MAX</span> - Agent Boost Avis
                </h1>
                <p className="plan-subtitle">
                    Choisissez le plan qui correspond à vos besoins pour commencer à récolter des avis.
                </p>
            </div>

            {availablePacks.length > 0 && (
                <div className="active-pack-alert">
                    <div className="active-pack-info">
                        <h3>Vous avez déjà un pack actif non utilisé !</h3>
                        <p>Il vous reste <strong>{availablePacks.reduce((acc, p) => acc + (p.review_quantity - p.fiches_used), 0)} avis</strong> disponibles à utiliser immédiatement.</p>
                    </div>
                    <button
                        onClick={() => navigate('/artisan/submit')}
                        className="btn-submit-mission"
                    >
                        Soumettre ma fiche
                    </button>
                </div>
            )}

            <div className="plans-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                {isFetching ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>Chargement des packs...</div>
                ) : packs.map((plan) => (
                    <div key={plan.id} className={`plan-card ${plan.color} ${plan.is_popular ? 'popular-scale' : ''}`}>
                        {plan.is_popular && <div className="plan-badge premium">Recommandé</div>}
                        <div className="plan-price-block">
                            <h3 className="plan-name">{plan.name}</h3>
                            <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '1rem' }}>
                                <span className="plan-amount">{plan.price_cents / 100}€</span>
                                <span className="plan-period">/mois</span>
                            </div>
                        </div>

                        <ul className="plan-features">
                            {(Array.isArray(plan.features) ? plan.features : []).map((feature, i) => (
                                <li key={i} className="plan-feature">
                                    <Check className={`feature-icon ${plan.color}`} />
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handleSubscribe(plan.id)}
                            disabled={isLoading !== null}
                            className={`plan-button ${plan.color}`}
                        >
                            {isLoading === plan.id ? 'Chargement...' : 'Choisir ce plan'}
                        </button>
                    </div>
                ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                <button
                    onClick={() => navigate('/artisan/dashboard')}
                    style={{ background: 'none', border: 'none', color: '#6b7280', textDecoration: 'underline', cursor: 'pointer' }}
                >
                    Retour au tableau de bord
                </button>
            </div>
        </div>
    );
};
