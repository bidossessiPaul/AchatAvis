import React from 'react';
import { useAuthStore } from '../../context/authStore';
import { Trophy, Unlock } from 'lucide-react';
import { motion } from 'framer-motion';
import './GuideLevelProgress.css';

export const GuideLevelProgress: React.FC = () => {
    const { user } = useAuthStore();

    if (!user || user.role !== 'guide') return null;

    // Default values if not present
    const currentLevel = user.local_guide_level || 1;
    const currentXP = user.total_reviews_validated || 0;

    // Gamification Logic (Simplified for MVP)
    // Level 1: 0-10 reviews
    // Level 2: 10-50 reviews
    // Level 3: 50-100 reviews
    // Level 4: 100+ reviews
    const getLevelData = (level: number) => {
        switch (level) {
            case 1:
                return { nextLevelXP: 10, title: 'Guide Novice', nextBenefit: 'Accès aux missions Bronzes' };
            case 2:
                return { nextLevelXP: 50, title: 'Guide Confirmé', nextBenefit: 'Bonus de +0.10€ par avis' };
            case 3:
                return { nextLevelXP: 100, title: 'Guide Expert', nextBenefit: 'Accès prioritaire aux missions' };
            default:
                return { nextLevelXP: 1000, title: 'Maître Guide', nextBenefit: 'Statut Élite' };
        }
    };

    const levelData = getLevelData(currentLevel);
    const progressPercent = Math.min(100, (currentXP / levelData.nextLevelXP) * 100);
    const reviewsNeeded = Math.max(0, levelData.nextLevelXP - currentXP);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="guide-level-card"
        >
            <div className="level-header">
                <div className="level-badge-container">
                    <div className="level-badge-circle">
                        <span className="level-number">{currentLevel}</span>
                    </div>
                    <div className="level-info">
                        <h3 className="level-title">{levelData.title}</h3>
                        <div className="level-subtitle">
                            <Trophy size={14} className="level-icon" />
                            <span>{currentXP} avis validés</span>
                        </div>
                    </div>
                </div>
                <div className="earnings-preview">
                    {/* Placeholder for future earning stats logic if needed */}
                </div>
            </div>

            <div className="progress-section">
                <div className="progress-labels">
                    <span className="progress-label-left">Progression niveau {currentLevel + 1}</span>
                    <span className="progress-label-right">{currentXP} / {levelData.nextLevelXP} XP</span>
                </div>
                <div className="progress-bar-container">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="progress-bar-fill"
                    ></motion.div>
                </div>
                <p className="next-milestone-text">
                    Plus que <strong>{reviewsNeeded} avis validés</strong> pour atteindre le niveau suivant !
                </p>
            </div>

            <div className="next-benefit-card">
                <div className="benefit-icon-wrapper">
                    <Unlock size={18} color="#f97316" />
                </div>
                <div className="benefit-content">
                    <span className="benefit-label">Prochain avantage :</span>
                    <span className="benefit-value">{levelData.nextBenefit}</span>
                </div>
            </div>
        </motion.div>
    );
};
