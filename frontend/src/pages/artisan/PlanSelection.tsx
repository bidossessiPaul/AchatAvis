
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, MessageCircle } from 'lucide-react';
import './PlanSelection.css';

import { artisanService } from '../../services/artisanService';
import { SubscriptionPack } from '../../types';

const WHATSAPP_NUMBER = '33644678642';
const WHATSAPP_MESSAGE = encodeURIComponent(
    "Bonjour, je viens d'effectuer le paiement de mon pack AchatAvis. Merci d'activer mon abonnement."
);

interface PackStyle {
    badgeColor: string;
    badgeBg: string;
    checkColor: string;
    buttonClass: string;
    originalPrice: number;
    discount: number;
    subtext: string;
}

const PACK_STYLES: Record<string, PackStyle> = {
    discovery: {
        badgeColor: '#0284c7',
        badgeBg: '#e0f2fe',
        checkColor: '#10b981',
        buttonClass: 'plan-btn-blue',
        originalPrice: 449,
        discount: 47,
        subtext: '-10% sur votre prochaine commande',
    },
    growth: {
        badgeColor: '#2563eb',
        badgeBg: '#eff6ff',
        checkColor: '#10b981',
        buttonClass: 'plan-btn-pink',
        originalPrice: 552,
        discount: 46,
        subtext: '-15% sur votre prochaine commande',
    },
    expert: {
        badgeColor: '#2563eb',
        badgeBg: '#eff6ff',
        checkColor: '#10b981',
        buttonClass: 'plan-btn-blue',
        originalPrice: 1123,
        discount: 56,
        subtext: '-10% sur votre prochaine commande',
    },
};

const DEFAULT_STYLE: PackStyle = {
    badgeColor: '#6b7280',
    badgeBg: '#f3f4f6',
    checkColor: '#6b7280',
    buttonClass: 'plan-btn-green',
    originalPrice: 0,
    discount: 0,
    subtext: '',
};

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
            const packsData = await artisanService.getSubscriptionPacks();
            setPacks(packsData);
        } catch (error) {
            console.error("Failed to load packs", error);
        }
        try {
            const availablePacksData = await artisanService.getAvailablePacks();
            setAvailablePacks(availablePacksData);
        } catch {
            // Non connecté — on masque juste la bannière
        }
        setIsFetching(false);
    };

    const getStyle = (packId: string) => PACK_STYLES[packId] || DEFAULT_STYLE;

    return (
        <div className="plan-selection-container">
            <div className="plan-header">
                <span className="plan-tag">Tarifs Entreprises</span>
                <h1 className="plan-title">
                    Développez votre Notoriété avec des Avis Clients Illimités
                </h1>
                <p className="plan-subtitle">
                    Gestion complète de votre réputation Google : collecte automatique d'avis, SEO local optimisé,
                    rapports mensuels, support dédié. Satisfait ou remboursé.
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

            <div className="plans-grid">
                {isFetching ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>Chargement des packs...</div>
                ) : packs.map((plan) => {
                    const style = getStyle(plan.id);
                    const price = Math.round(plan.price_cents / 100);
                    return (
                        <div key={plan.id} className={`plan-card ${plan.is_popular ? 'plan-card-popular' : ''}`}>
                            {plan.is_popular && (
                                <div className="plan-ribbon">
                                    <span>PLUS POPULAIRE</span>
                                </div>
                            )}

                            <div className="plan-card-body">
                                <span
                                    className="plan-name-badge"
                                    style={{ color: style.badgeColor, backgroundColor: style.badgeBg }}
                                >
                                    {plan.name}
                                </span>

                                <div className="plan-pricing">
                                    {style.originalPrice > 0 && (
                                        <span className="plan-old-price">{style.originalPrice}€</span>
                                    )}
                                    <div className="plan-current-price">
                                        <span className="plan-amount">{price}</span>
                                        <span className="plan-currency">€/mois</span>
                                    </div>
                                    {style.discount > 0 && (
                                        <span className="plan-discount-badge">
                                            Économisez {style.discount}%
                                        </span>
                                    )}
                                </div>

                                <ul className="plan-features">
                                    {(Array.isArray(plan.features) ? plan.features : []).map((feature, i) => (
                                        <li key={i} className="plan-feature">
                                            <Check size={18} style={{ color: style.checkColor, flexShrink: 0 }} />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="plan-card-footer">
                                <a
                                    href={plan.stripe_link || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`plan-cta ${style.buttonClass}`}
                                >
                                    COMMANDER MAINTENANT
                                </a>
                                {style.subtext && (
                                    <p className="plan-cta-subtext">{style.subtext}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
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
