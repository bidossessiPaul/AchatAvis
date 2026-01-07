import React from 'react';
import './Card.css';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
    style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
    children,
    className = '',
    padding = 'md',
    hover = false,
    style,
}) => {
    const classes = [
        'card',
        `card-padding-${padding}`,
        hover && 'card-hover',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return <div className={classes} style={style}>{children}</div>;
};
