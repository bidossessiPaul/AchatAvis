import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Zap, ShieldAlert, Timer } from 'lucide-react';

export interface RhythmeConfig {
    reviews_per_day: number;
    estimated_duration_days: number;
    mode: 'discret' | 'modere' | 'rapide';
}

interface RhythmeSliderProps {
    totalReviews: number;
    sectorDifficulty: 'easy' | 'medium' | 'hard';
    onRhythmeChange: (config: RhythmeConfig) => void;
}

export const RhythmeSlider: React.FC<RhythmeSliderProps> = ({
    totalReviews,
    sectorDifficulty,
    onRhythmeChange
}) => {
    // Default to Moderate
    const [reviewsPerDay, setReviewsPerDay] = useState(3);
    const [mode, setMode] = useState<'discret' | 'modere' | 'rapide'>('modere');

    const getMaxReviewsPerDay = () => {
        switch (sectorDifficulty) {
            case 'hard': return 1; // Strict limit: max 1 per day
            case 'medium': return 3;
            default: return 6;
        }
    };

    const maxPerDay = getMaxReviewsPerDay();

    useEffect(() => {
        // Enforce limit if sector difficulty changes
        if (reviewsPerDay > maxPerDay) {
            handleSliderChange(maxPerDay);
        }
    }, [sectorDifficulty]);

    useEffect(() => {
        emitChange(reviewsPerDay, mode);
    }, [reviewsPerDay, mode]);

    const calculateDuration = (perDay: number) => {
        return Math.ceil(totalReviews / perDay);
    };

    const emitChange = (perDay: number, selectedMode: 'discret' | 'modere' | 'rapide') => {
        onRhythmeChange({
            reviews_per_day: perDay,
            estimated_duration_days: calculateDuration(perDay),
            mode: selectedMode
        });
    };

    const handleModeChange = (selectedMode: 'discret' | 'modere' | 'rapide') => {
        setMode(selectedMode);
        let newPerDay = 3;

        if (selectedMode === 'discret') newPerDay = Math.min(2, maxPerDay);
        if (selectedMode === 'modere') newPerDay = Math.min(4, maxPerDay);
        if (selectedMode === 'rapide') newPerDay = maxPerDay;

        setReviewsPerDay(newPerDay);
    };

    const handleSliderChange = (val: number) => {
        const newValue = Math.min(Math.max(1, val), maxPerDay);
        setReviewsPerDay(newValue);

        if (newValue <= 2) setMode('discret');
        else if (newValue <= 4) setMode('modere');
        else setMode('rapide');
    };

    const getModeStyle = (m: string) => {
        const isActive = mode === m;
        const baseStyle = {
            flex: 1,
            padding: '1rem',
            borderRadius: '0.75rem',
            border: isActive ? '2px solid #0ea5e9' : '1px solid #e2e8f0',
            background: isActive ? '#f0f9ff' : 'white',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            opacity: (m === 'rapide' && sectorDifficulty === 'hard') ? 0.5 : 1,
            pointerEvents: (m === 'rapide' && sectorDifficulty === 'hard') ? 'none' : 'auto'
        };
        return baseStyle;
    };

    return (
        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', margin: '2rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: '#0f172a' }}>
                    <Timer size={18} color="#0f172a" />
                    Rythme de publication
                </h4>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Total : <strong>{totalReviews} avis</strong>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <div
                    onClick={() => handleModeChange('discret')}
                    style={getModeStyle('discret') as any}
                >
                    <div style={{ display: 'flex', justifyContent: 'center', color: '#64748b', marginBottom: '0.5rem' }}>
                        <Timer size={24} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>Discret</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>1 avis/jour</div>
                </div>

                <div
                    onClick={() => handleModeChange('modere')}
                    style={getModeStyle('modere') as any}
                >
                    <div style={{ display: 'flex', justifyContent: 'center', color: '#64748b', marginBottom: '0.5rem' }}>
                        <Calendar size={24} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>Modéré</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{maxPerDay === 1 ? 'Non dispo' : '2-3 avis/jour'}</div>
                </div>

                <div
                    onClick={() => handleModeChange('rapide')}
                    style={getModeStyle('rapide') as any}
                >
                    <div style={{ display: 'flex', justifyContent: 'center', color: '#64748b', marginBottom: '0.5rem' }}>
                        <Zap size={24} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>Rapide</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Max {maxPerDay}/jour</div>
                </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Ajustement manuel</label>
                    <span style={{ fontWeight: 700, color: '#0ea5e9' }}>{reviewsPerDay} avis / jour</span>
                </div>
                <input
                    type="range"
                    min="1"
                    max={maxPerDay}
                    value={reviewsPerDay}
                    onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#0ea5e9' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    <span>Lent (1)</span>
                    <span>Max autorisé ({maxPerDay})</span>
                </div>
            </div>

            <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.75rem', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Calendar size={20} color="#38bdf8" />
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Durée estimée</div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{calculateDuration(reviewsPerDay)} jours</div>
                    </div>
                </div>
                {reviewsPerDay > 4 && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', color: '#ef4444', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <ShieldAlert size={14} /> Attention
                    </div>
                )}
            </div>

            {
                sectorDifficulty === 'hard' && (
                    <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#ef4444', textAlign: 'center' }}>
                        ⚠️ Secteur difficile : Vitesse limitée à 2 avis/jour par sécurité.
                    </div>
                )
            }
        </div >
    );
};
