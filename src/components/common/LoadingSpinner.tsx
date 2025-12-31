import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    color?: string;
    thickness?: number;
    className?: string;
    text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    className = '',
    text
}) => {
    return (
        <div className={`premium-loader-container ${size} ${className}`}>
            <div className="premium-loader">
                <div className="loader-ring"></div>
                <div className="loader-ring"></div>
                <div className="loader-ring"></div>
                <div className="loader-dot"></div>
            </div>
            {text && <div className="loader-text">{text}</div>}
        </div>
    );
};
