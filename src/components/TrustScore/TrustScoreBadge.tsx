import React from 'react';
import './TrustScoreBadge.css';

interface TrustScoreBadgeProps {
    score: number;
    level: 'BLOCKED' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
    size?: 'small' | 'medium' | 'large';
    showDetails?: boolean;
}

const TrustScoreBadge: React.FC<TrustScoreBadgeProps> = ({
    score,
    level,
    size = 'medium',
    showDetails = false
}) => {
    const getBadgeConfig = () => {
        switch (level) {
            case 'PLATINUM':
                return { emoji: '🟣', label: 'PLATINE', color: '#9333EA' };
            case 'GOLD':
                return { emoji: '🔵', label: 'OR', color: '#3B82F6' };
            case 'SILVER':
                return { emoji: '🟢', label: 'ARGENT', color: '#10B981' };
            case 'BRONZE':
                return { emoji: '🟡', label: 'BRONZE', color: '#F59E0B' };
            case 'BLOCKED':
            default:
                return { emoji: '🔴', label: 'BLOQUÉ', color: '#EF4444' };
        }
    };

    const config = getBadgeConfig();

    return (
        <div className={`trust-score-badge trust-score-badge--${size}`}>
            <div className="trust-score-badge__icon" style={{ backgroundColor: config.color }}>
                <span className="trust-score-badge__emoji">{config.emoji}</span>
                <span className="trust-score-badge__score">{score}</span>
            </div>
            {showDetails && (
                <div className="trust-score-badge__details">
                    <span className="trust-score-badge__level">{config.label}</span>
                    <div className="trust-score-badge__progress">
                        <div
                            className="trust-score-badge__progress-bar"
                            style={{
                                width: `${score}%`,
                                backgroundColor: config.color
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrustScoreBadge;
