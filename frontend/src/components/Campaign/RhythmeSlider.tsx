import React, { useState, useEffect } from 'react';
import { Calendar, Zap, Timer } from 'lucide-react';

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
    // Default to Moderate (2 reviews/day)
    const [reviewsPerDay, setReviewsPerDay] = useState(2);
    const [mode, setMode] = useState<'discret' | 'modere' | 'rapide'>('modere');


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
        let newPerDay = 1;
        if (selectedMode === 'modere') newPerDay = 2;
        if (selectedMode === 'rapide') newPerDay = 3;
        setReviewsPerDay(newPerDay);
    };

    const getModeStyle = (m: string) => {
        const isActive = mode === m;
        const baseStyle = {
            flex: 1,
            padding: '1rem',
            borderRadius: '0.75rem',
            border: isActive ? '2px solid #FF991F' : '1px solid #e2e8f0',
            background: isActive ? '#fffcf0' : 'white',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            opacity: (m === 'rapide' && sectorDifficulty === 'hard') ? 0.5 : 1,
            pointerEvents: (m === 'rapide' && sectorDifficulty === 'hard') ? 'none' : 'auto',
            textAlign: 'center' as const
        };
        return baseStyle;
    };

    const duration = calculateDuration(reviewsPerDay);

    return (
        <div className="rhythme-slider-container" style={{
            background: '#f8fafc',
            padding: window.innerWidth <= 640 ? '1rem' : '1.5rem',
            borderRadius: '1rem',
            border: '1px solid #e2e8f0',
            margin: '2rem 0'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9375rem', color: '#0f172a' }}>
                    <Timer size={18} color="#0f172a" />
                    Rythme de publication
                </h4>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Total : <strong>{totalReviews} avis</strong>
                </div>
            </div>

            <div style={{ display: 'flex', gap: window.innerWidth <= 640 ? '0.5rem' : '1rem', marginBottom: '1.5rem' }}>
                <div
                    onClick={() => handleModeChange('discret')}
                    style={getModeStyle('discret') as any}
                >
                    <div style={{ display: 'flex', justifyContent: 'center', color: '#64748b', marginBottom: '0.25rem' }}>
                        <Timer size={20} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a' }}>Lent</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>1/j</div>
                </div>

                <div
                    onClick={() => handleModeChange('modere')}
                    style={getModeStyle('modere') as any}
                >
                    <div style={{ display: 'flex', justifyContent: 'center', color: '#64748b', marginBottom: '0.25rem' }}>
                        <Calendar size={20} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a' }}>Normal</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>2/j</div>
                </div>

                <div
                    onClick={() => handleModeChange('rapide')}
                    style={getModeStyle('rapide') as any}
                >
                    <div style={{ display: 'flex', justifyContent: 'center', color: '#64748b', marginBottom: '0.25rem' }}>
                        <Zap size={20} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a' }}>Rapide</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>3/j</div>
                </div>
            </div>

            {/* Durée Estimée Section with Beige Theme */}
            <div style={{
                background: '#fff8e1',
                padding: window.innerWidth <= 640 ? '0.875rem' : '1.25rem',
                borderRadius: '0.75rem',
                border: '1px solid #FFE6A5',
                color: '#37352f',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
            }}>
                <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'rgba(255, 153, 31, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <Calendar size={16} color="#FF991F" />
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 700, color: '#000' }}>Durée estimée</span> : {`pour publier vos ${totalReviews} avis est de `}
                    <strong style={{ color: '#FF991F' }}>{duration} jours</strong>
                </div>
            </div>
        </div >
    );
};
