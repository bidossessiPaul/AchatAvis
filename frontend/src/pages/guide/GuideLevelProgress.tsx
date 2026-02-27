import React, { useEffect } from 'react';
import { useAuthStore } from '../../context/authStore';
import { useAntiDetectionStore } from '../../context/antiDetectionStore';
import { Trophy, Mail, ArrowRight, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import './GuideLevelProgress.css';

const LEVEL_BADGE_IMAGES: Record<number, string> = {
    4: 'https://services.google.com/fh/files/helpcenter/points-badge_level_four.png',
    5: 'https://services.google.com/fh/files/helpcenter/points-badges_level_five.png',
    6: 'https://services.google.com/fh/files/helpcenter/points-badges_level_six.png',
    7: 'https://services.google.com/fh/files/helpcenter/points-badges_level_seven.png',
    8: 'https://services.google.com/fh/files/helpcenter/points-badges_level_eight.png',
    9: 'https://services.google.com/fh/files/helpcenter/points-badges_level_nine.png',
    10: 'https://services.google.com/fh/files/helpcenter/points-badges_level_ten.png',
};

const LEVEL_BONUS: Record<number, number> = {
    4: 3, 5: 5, 6: 5, 7: 10, 8: 10, 9: 20, 10: 20,
};

export const GuideLevelProgress: React.FC = () => {
    const { user } = useAuthStore();
    const { gmailAccounts, fetchGmailAccounts } = useAntiDetectionStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (user?.id) {
            fetchGmailAccounts(user.id);
        }
    }, [user?.id, fetchGmailAccounts]);

    if (!user || user.role !== 'guide') return null;

    const maxLevel = gmailAccounts.reduce((max: number, acc: any) => Math.max(max, acc.local_guide_level || 1), user.local_guide_level || 1);
    const totalReviews = user.total_reviews_validated || 0;

    const nextBonusLevel = maxLevel < 4 ? 4 : maxLevel < 10 ? maxLevel + 1 : null;
    const nextBonus = nextBonusLevel ? LEVEL_BONUS[nextBonusLevel] : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="guide-level-card"
        >
            <div className="level-header">
                <div className="level-badge-container">
                    {maxLevel >= 4 && LEVEL_BADGE_IMAGES[maxLevel] ? (
                        <img
                            src={LEVEL_BADGE_IMAGES[maxLevel]}
                            alt={`Niveau ${maxLevel}`}
                            style={{ width: '56px', height: '56px' }}
                        />
                    ) : (
                        <div className="level-badge-circle">
                            <span className="level-number">{maxLevel}</span>
                        </div>
                    )}
                    <div className="level-info">
                        <h3 className="level-title">Local Guide Niveau {maxLevel}</h3>
                        <div className="level-subtitle">
                            <Trophy size={14} className="level-icon" />
                            <span>{totalReviews} avis validés sur la plateforme</span>
                        </div>
                    </div>
                </div>
                <div className="level-gmail-count" onClick={() => navigate('/guide/my-gmails')} style={{ cursor: 'pointer' }}>
                    <Mail size={16} color="#64748b" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                        {gmailAccounts.length} compte{gmailAccounts.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* Gmail accounts mini list */}
            {gmailAccounts.length > 0 && (
                <div className="gmail-mini-list">
                    {gmailAccounts.slice(0, 3).map((account: any) => (
                        <div key={account.id} className="gmail-mini-item">
                            {account.avatar_url ? (
                                <img src={account.avatar_url} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                            ) : (
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Mail size={12} color="#94a3b8" />
                                </div>
                            )}
                            <span className="gmail-mini-email">{account.email}</span>
                            {account.local_guide_level && account.local_guide_level >= 4 && LEVEL_BADGE_IMAGES[account.local_guide_level] ? (
                                <img
                                    src={LEVEL_BADGE_IMAGES[account.local_guide_level]}
                                    alt={`Niv. ${account.local_guide_level}`}
                                    style={{ width: '18px', height: '18px' }}
                                />
                            ) : (
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Niv. {account.local_guide_level || 1}</span>
                            )}
                            {(account.is_blocked || !account.maps_profile_url) && (
                                <span style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#ef4444', padding: '0.1rem 0.4rem', borderRadius: '0.5rem', fontWeight: 600 }}>
                                    Bloqué
                                </span>
                            )}
                        </div>
                    ))}
                    {gmailAccounts.length > 3 && (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            +{gmailAccounts.length - 3} autre{gmailAccounts.length - 3 > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            )}

            {/* Next bonus / CTA */}
            <div className="level-cta-row">
                {nextBonus && (
                    <div className="next-benefit-card" style={{ flex: 1 }}>
                        <div className="benefit-icon-wrapper">
                            <Star size={18} color="#f97316" />
                        </div>
                        <div className="benefit-content">
                            <span className="benefit-label">Prochain bonus :</span>
                            <span className="benefit-value">
                                Niveau {nextBonusLevel} → +{nextBonus}€ de prime
                            </span>
                        </div>
                    </div>
                )}
                <button
                    className="level-verify-btn"
                    onClick={() => navigate('/guide/my-gmails')}
                >
                    Gérer mes Gmails <ArrowRight size={16} />
                </button>
            </div>
        </motion.div>
    );
};
