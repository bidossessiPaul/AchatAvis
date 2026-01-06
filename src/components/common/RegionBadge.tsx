import React, { useEffect } from 'react';
import { useAuthStore } from '../../context/authStore';
import { Globe } from 'lucide-react';

export const RegionBadge: React.FC = () => {
    const { detectedCountry, fetchDetectedRegion } = useAuthStore();

    useEffect(() => {
        if (!detectedCountry) {
            fetchDetectedRegion();
        }
    }, [detectedCountry, fetchDetectedRegion]);

    if (!detectedCountry) return null;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid #f1f5f9',
            fontSize: '0.75rem',
            color: '#94a3b8'
        }}>
            <Globe size={14} />
            <span>Votre région détectée : <strong>{detectedCountry}</strong></span>
        </div>
    );
};
