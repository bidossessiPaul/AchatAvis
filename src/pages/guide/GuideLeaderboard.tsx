import React, { useState, useEffect } from 'react';
import { guideService } from '../../services/guideService';
import { Trophy, Medal, ChevronUp, CheckCircle, XCircle, TrendingUp, Send, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import './GuideLeaderboard.css';

interface LeaderboardEntry {
    rank: number;
    name: string;
    totalPosted: number;
    totalValidated: number;
    totalPending: number;
    totalRejected: number;
    validationRate: number;
    isCurrentUser: boolean;
}

export const GuideLeaderboard: React.FC = () => {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLeaderboard();
    }, []);

    const loadLeaderboard = async () => {
        try {
            const data = await guideService.getLeaderboard();
            setEntries(data);
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Trophy size={18} color="#f59e0b" />;
        if (rank === 2) return <Medal size={18} color="#94a3b8" />;
        if (rank === 3) return <Medal size={18} color="#cd7f32" />;
        return <span className="lb-rank-number">{rank}</span>;
    };

    const getRankClass = (rank: number) => {
        if (rank === 1) return 'lb-rank-gold';
        if (rank === 2) return 'lb-rank-silver';
        if (rank === 3) return 'lb-rank-bronze';
        return '';
    };

    const currentUserEntry = entries.find(e => e.isCurrentUser);
    const currentUserRank = currentUserEntry?.rank;

    if (loading) {
        return (
            <div className="leaderboard-card">
                <div className="lb-header">
                    <h3 className="lb-title"><Trophy size={18} /> Classement des Guides</h3>
                </div>
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Chargement...</div>
            </div>
        );
    }

    if (entries.length === 0) return null;

    return (
        <div className="leaderboard-card">
            <div className="lb-header">
                <h3 className="lb-title"><Trophy size={18} color="#f59e0b" /> Classement des Guides</h3>
                {currentUserRank && (
                    <div className="lb-my-rank">
                        <ChevronUp size={14} />
                        <span>Vous êtes <strong>#{currentUserRank}</strong></span>
                    </div>
                )}
            </div>

            {/* Column headers */}
            <div className="lb-table-header">
                <span className="lb-col-rank">#</span>
                <span className="lb-col-name">Guide</span>
                <span className="lb-col-stat"><Send size={11} /> Postés</span>
                <span className="lb-col-stat"><CheckCircle size={11} /> Validés</span>
                <span className="lb-col-stat"><XCircle size={11} /> Rejetés</span>
                <span className="lb-col-stat"><Clock size={11} /> Attente</span>
                <span className="lb-col-stat"><TrendingUp size={11} /> %</span>
            </div>

            {/* Entries */}
            <div className="lb-list">
                {entries.map((entry, i) => {
                    const rateColor = entry.validationRate >= 60 ? '#10b981'
                        : entry.validationRate >= 30 ? '#f59e0b'
                        : '#ef4444';
                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className={`lb-row ${entry.isCurrentUser ? 'lb-row-me' : ''} ${getRankClass(entry.rank)}`}
                        >
                            <div className="lb-col-rank">
                                {getRankIcon(entry.rank)}
                            </div>
                            <div className="lb-col-name">
                                <span className="lb-name">{entry.name}</span>
                                {entry.isCurrentUser && <span className="lb-you-badge">Vous</span>}
                            </div>
                            <div className="lb-col-stat">
                                <span className="lb-stat-value">{entry.totalPosted}</span>
                            </div>
                            <div className="lb-col-stat">
                                <span className="lb-stat-value lb-stat-validated">{entry.totalValidated}</span>
                            </div>
                            <div className="lb-col-stat">
                                <span className="lb-stat-value" style={{ color: '#ef4444' }}>{entry.totalRejected}</span>
                            </div>
                            <div className="lb-col-stat">
                                <span className="lb-stat-value lb-stat-pending">{entry.totalPending}</span>
                            </div>
                            <div className="lb-col-stat">
                                <span className="lb-stat-value" style={{ color: rateColor, fontWeight: 800 }}>{entry.validationRate}%</span>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};
