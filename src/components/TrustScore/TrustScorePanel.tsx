import React from 'react';
import TrustScoreBadge from './TrustScoreBadge';
import './TrustScorePanel.css';

interface TrustScorePanelProps {
    trustScore: {
        finalScore: number;
        trustLevel: 'BLOCKED' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
        badge: string;
        maxReviewsPerMonth: number;
        restrictions: string[];
        recommendations: string[];
        breakdown: {
            emailScore: number;
            mapsProfileScore: number;
            verificationBonus: number;
            penalties: number;
        };
    };
    onImprove?: () => void;
}

const TrustScorePanel: React.FC<TrustScorePanelProps> = ({ trustScore, onImprove }) => {
    const getNextLevel = () => {
        const levels = {
            BLOCKED: { next: 'BRONZE', threshold: 21 },
            BRONZE: { next: 'ARGENT', threshold: 41 },
            SILVER: { next: 'OR', threshold: 66 },
            GOLD: { next: 'PLATINE', threshold: 86 },
            PLATINUM: { next: 'MAX', threshold: 100 }
        };
        return levels[trustScore.trustLevel];
    };

    const nextLevel = getNextLevel();
    const pointsToNext = nextLevel ? nextLevel.threshold - trustScore.finalScore : 0;

    return (
        <div className="trust-score-panel">
            <div className="trust-score-panel__header">
                <h3 className="trust-score-panel__title">🎯 Votre Trust Score</h3>
                <TrustScoreBadge
                    score={trustScore.finalScore}
                    level={trustScore.trustLevel}
                    size="large"
                    showDetails={true}
                />
            </div>

            {/* Score Breakdown */}
            <div className="trust-score-panel__breakdown">
                <h4 className="trust-score-panel__subtitle">Décomposition du score</h4>
                <div className="trust-score-breakdown">
                    <div className="trust-score-breakdown__item">
                        <span className="trust-score-breakdown__label">📧 Email</span>
                        <span className="trust-score-breakdown__value">{trustScore.breakdown.emailScore}/30</span>
                        <div className="trust-score-breakdown__bar">
                            <div
                                className="trust-score-breakdown__bar-fill trust-score-breakdown__bar-fill--email"
                                style={{ width: `${(trustScore.breakdown.emailScore / 30) * 100}%` }}
                            />
                        </div>
                    </div>

                    <div className="trust-score-breakdown__item">
                        <span className="trust-score-breakdown__label">🗺️ Profil Google Maps</span>
                        <span className="trust-score-breakdown__value">{trustScore.breakdown.mapsProfileScore}/60</span>
                        <div className="trust-score-breakdown__bar">
                            <div
                                className="trust-score-breakdown__bar-fill trust-score-breakdown__bar-fill--maps"
                                style={{ width: `${Math.max(0, (trustScore.breakdown.mapsProfileScore / 60) * 100)}%` }}
                            />
                        </div>
                    </div>

                    <div className="trust-score-breakdown__item">
                        <span className="trust-score-breakdown__label">✅ Vérifications</span>
                        <span className="trust-score-breakdown__value">+{trustScore.breakdown.verificationBonus}/10</span>
                        <div className="trust-score-breakdown__bar">
                            <div
                                className="trust-score-breakdown__bar-fill trust-score-breakdown__bar-fill--bonus"
                                style={{ width: `${(trustScore.breakdown.verificationBonus / 10) * 100}%` }}
                            />
                        </div>
                    </div>

                    {trustScore.breakdown.penalties > 0 && (
                        <div className="trust-score-breakdown__item">
                            <span className="trust-score-breakdown__label">❌ Pénalités</span>
                            <span className="trust-score-breakdown__value trust-score-breakdown__value--penalty">
                                -{trustScore.breakdown.penalties}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Restrictions */}
            <div className="trust-score-panel__restrictions">
                <h4 className="trust-score-panel__subtitle">Restrictions actives</h4>
                <ul className="trust-score-restrictions">
                    {trustScore.restrictions.map((restriction, index) => (
                        <li key={index} className="trust-score-restrictions__item">
                            {restriction}
                        </li>
                    ))}
                </ul>
                <div className="trust-score-quota">
                    <span className="trust-score-quota__label">Quota mensuel:</span>
                    <span className="trust-score-quota__value">
                        {trustScore.maxReviewsPerMonth === 999 ? '∞' : trustScore.maxReviewsPerMonth} avis/mois
                    </span>
                </div>
            </div>

            {/* Recommendations */}
            {trustScore.recommendations.length > 0 && (
                <div className="trust-score-panel__recommendations">
                    <h4 className="trust-score-panel__subtitle">💡 Comment améliorer votre score</h4>
                    <ul className="trust-score-recommendations">
                        {trustScore.recommendations.map((rec, index) => (
                            <li key={index} className="trust-score-recommendations__item">
                                {rec}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Progress to next level */}
            {trustScore.trustLevel !== 'PLATINUM' && (
                <div className="trust-score-panel__progress">
                    <div className="trust-score-progress">
                        <div className="trust-score-progress__header">
                            <span>Progression vers {nextLevel?.next}</span>
                            <span className="trust-score-progress__remaining">
                                {pointsToNext} points restants
                            </span>
                        </div>
                        <div className="trust-score-progress__bar">
                            <div
                                className="trust-score-progress__bar-fill"
                                style={{ width: `${(trustScore.finalScore / (nextLevel?.threshold || 100)) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* CTA Button */}
            {onImprove && (
                <button
                    className="trust-score-panel__cta"
                    onClick={onImprove}
                >
                    Améliorer mon score
                </button>
            )}
        </div>
    );
};

export default TrustScorePanel;
