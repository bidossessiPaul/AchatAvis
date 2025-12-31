import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';
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
    return (
        <div className={`loading-overlay ${fullScreen ? 'fixed' : 'absolute'} ${className}`}>
            <div className="overlay-content">
                <LoadingSpinner size="lg" text={text} />
            </div>
        </div>
    );
};
