import React from 'react';
import './Badge.css';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'pending' | 'active' | 'success' | 'warning' | 'error' | 'info';
    size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'info',
    size = 'md',
}) => {
    return (
        <span className={`badge badge-${variant} badge-${size}`}>
            {children}
        </span>
    );
};
