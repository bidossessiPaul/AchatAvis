import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    showCloseButton?: boolean;
    maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    showCloseButton = true,
    maxWidth = '500px'
}) => {
    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const isMobile = window.innerWidth <= 768;

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: isMobile ? '0.75rem' : '1rem'
                    }}
                >
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={showCloseButton ? onClose : undefined}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(15, 23, 42, 0.7)',
                            backdropFilter: 'blur(4px)'
                        }}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: maxWidth,
                            background: 'white',
                            borderRadius: isMobile ? '1.25rem' : '1.5rem',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            maxHeight: isMobile ? '95vh' : '90vh'
                        }}
                    >
                        {/* Header */}
                        {(title || showCloseButton) && (
                            <div style={{
                                padding: isMobile ? '1rem 1.25rem' : '1.25rem 1.5rem',
                                borderBottom: '1px solid #f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#f8fafc'
                            }}>
                                {title && (
                                    <h3 style={{
                                        margin: 0,
                                        fontSize: isMobile ? '1rem' : '1.1rem',
                                        fontWeight: 700,
                                        color: '#0f172a',
                                        lineHeight: 1.3,
                                        paddingRight: showCloseButton ? '1rem' : 0
                                    }}>
                                        {title}
                                    </h3>
                                )}
                                {showCloseButton && (
                                    <button
                                        onClick={onClose}
                                        style={{
                                            background: '#f1f5f9',
                                            border: 'none',
                                            padding: '0.4rem',
                                            borderRadius: '0.5rem',
                                            display: 'flex',
                                            cursor: 'pointer',
                                            color: '#64748b',
                                            transition: 'all 0.2s',
                                            flexShrink: 0
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                        onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                                    >
                                        <X size={isMobile ? 18 : 20} />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Body */}
                        <div style={{
                            padding: isMobile ? '1rem' : '1.5rem',
                            overflowY: 'auto',
                            maxHeight: '80vh',
                            fontSize: isMobile ? '0.9375rem' : '1rem'
                        }}>
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
