
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, MessageCircle } from 'lucide-react';
import './PlanSelection.css';

import { artisanService } from '../../services/artisanService';
import { SubscriptionPack } from '../../types';

const STRIPE_LINKS: Record<number, string> = {
    29900: 'https://buy.stripe.com/4gM14o3OzgIe9IOd2s7Re13',
    23500: 'https://buy.stripe.com/aFabJ270L4Zw3kq4vW7Re12',
    49900: 'https://buy.stripe.com/14A3cw5WHbnU1cifaA7Re14',
};

const WHATSAPP_NUMBER = '33644678642';
const WHATSAPP_MESSAGE = encodeURIComponent(
    "Bonjour, je viens d'effectuer le paiement de mon pack AchatAvis. Merci d'activer mon abonnement."
);

export const PlanSelection: React.FC = () => {
    const navigate = useNavigate();
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

            <div className="plan-payment-info-banner">
                <p>Après le paiement, cliquez sur le bouton WhatsApp en bas à droite pour confirmer et demander l'activation de votre pack.</p>
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

                        <a
                            href={STRIPE_LINKS[plan.price_cents] || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`plan-button ${plan.color}`}
                        >
                            Payer {plan.price_cents / 100}€
                        </a>
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

            {/* Floating WhatsApp button */}
            <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-fab"
                title="Confirmer mon paiement via WhatsApp"
            >
                <MessageCircle size={28} />
                <span className="whatsapp-fab-label">J'ai payé, activer mon pack</span>
            </a>
        </div>
    );
};
