import React, { forwardRef } from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, className = '', ...props }, ref) => {
        const inputId = props.id || props.name || `input-${Math.random()}`;

        return (
            <div className="input-wrapper">
                {label && (
                    <label htmlFor={inputId} className="input-label">
                        {label}
                        {props.required && <span className="input-required">*</span>}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={`input ${error ? 'input-error' : ''} ${className}`}
                    {...props}
                />
                {error && <p className="input-error-text">{error}</p>}
                {!error && helperText && <p className="input-helper-text">{helperText}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';
