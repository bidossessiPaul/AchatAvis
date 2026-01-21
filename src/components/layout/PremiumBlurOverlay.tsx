import React from 'react';
import { Lock, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './PremiumBlurOverlay.css';

interface PremiumBlurOverlayProps {
    children: React.ReactNode;
    isActive: boolean;
    title?: string;
    description?: string;
    redirectBack?: string;
}

export const PremiumBlurOverlay: React.FC<PremiumBlurOverlayProps> = ({
    children,
    isActive,
    title = "Compte Inactif",
    description = "Activez votre compte avec un pack pour accéder à cette fonctionnalité et booster votre visibilité.",
    redirectBack
}) => {
    const navigate = useNavigate();

    if (isActive) {
        return <>{children}</>;
    }

    return (
        <div className="premium-overlay-container">
            <div className="blurred-content">
                {children}
            </div>
            <div className="overlay-content">
                <div className="premium-glass-card">
                    <div className="lock-icon-wrapper">
                        <div className="lock-pulse"></div>
                        <Lock size={32} className="lock-icon" />
                    </div>

                    <h2 className="overlay-title">{title}</h2>
                    <p className="overlay-description">{description}</p>

                    <button
                        className="overlay-action-btn"
                        onClick={() => navigate(`/artisan/plan${redirectBack ? `?redirect_back=${encodeURIComponent(redirectBack)}` : ''}`)}
                    >
                        <Zap size={18} fill="currentColor" />
                        Voir les Packs
                    </button>
                </div>
            </div>
        </div>
    );
};
