import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { useAuthStore } from '../../context/authStore';
import './LoadingOverlay.css';

interface LoadingOverlayProps {
    text?: string;
    fullScreen?: boolean;
    className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
    text = 'Chargement en cours...',
    fullScreen = true,
    className = ''
}) => {
    const { user } = useAuthStore();
    const isGuide = user?.role === 'guide';

    return (
        <div className={`loading-overlay ${fullScreen ? 'fixed' : 'absolute'} ${isGuide ? 'theme-guide' : ''} ${className}`}>
            <div className="overlay-content">
                <LoadingSpinner size="lg" text={text} />
            </div>
        </div>
    );
};
