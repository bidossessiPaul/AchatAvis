import React from 'react';
import {
    CheckCircle2,
    Clock,
    ShieldAlert
} from 'lucide-react';
import { motion } from 'framer-motion';

interface CompatibilityResult {
    can_take: boolean;
    reason?: 'SECTOR_COOLDOWN' | 'SECTOR_QUOTA_EXCEEDED' | 'LEVEL_INSUFFICIENT' | 'DAILY_LIMIT_REACHED' | 'COMPLIANCE_LOW' | 'NOT_FOUND' | 'GMAIL_NOT_FOUND';
    message: string;
    details?: any;
    alternatives?: any;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    result: CompatibilityResult | null;
    onSelectOtherGmail?: () => void;
}

export const MissionCompatibilityModal: React.FC<Props> = ({ isOpen, onClose, result }) => {
    if (!isOpen || !result) return null;

    const getIcon = () => {
        if (result.can_take) return <CheckCircle2 size={48} color="#10b981" />;
        if (result.reason === 'SECTOR_COOLDOWN' || result.reason === 'SECTOR_QUOTA_EXCEEDED') return <Clock size={48} color="#f59e0b" />;
        return <ShieldAlert size={48} color="#ef4444" />;
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)'
        }}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                    background: 'white',
                    width: '100%',
                    maxWidth: '450px',
                    borderRadius: '1.5rem',
                    padding: '2rem',
                    textAlign: 'center',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                }}
            >
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                    {getIcon()}
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>
                    {result.can_take ? 'Mission Compatible !' : 'Action Requise'}
                </h3>

                <p style={{ color: '#4b5563', lineHeight: 1.5, marginBottom: '2rem' }}>
                    {result.message}
                </p>

                {(result.details?.used !== undefined && result.details?.max !== undefined) && (
                    <div style={{
                        marginBottom: '1.5rem',
                        padding: '1rem',
                        background: '#f8fafc',
                        borderRadius: '0.75rem',
                        border: '1px solid #e2e8f0',
                        textAlign: 'left'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Quota Secteur (Mois)</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: result.details.used >= result.details.max ? '#ef4444' : '#10b981' }}>
                                {result.details.used} / {result.details.max}
                            </span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(result.details.used / result.details.max) * 100}%` }}
                                style={{
                                    height: '100%',
                                    background: result.details.used >= result.details.max ? '#ef4444' : '#10b981'
                                }}
                            />
                        </div>
                    </div>
                )}

                {result.details?.next_available_date && (
                    <div style={{
                        background: '#fff7ed',
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        marginBottom: '1.5rem',
                        border: '1px solid #ffedd5',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        textAlign: 'left'
                    }}>
                        <Clock size={20} color="#f59e0b" />
                        <div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>Repos requis (Secteur)</p>
                            <p style={{ fontWeight: 600, color: '#c2410c', fontSize: '0.875rem' }}>Disponible le {result.details.next_available_date}</p>
                        </div>
                    </div>
                )}

                {result.can_take && (
                    <div style={{
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        background: '#f0fdf4',
                        border: '1px solid #dcfce7',
                        color: '#166534',
                        fontSize: '0.8125rem',
                        textAlign: 'left',
                        marginBottom: '2rem',
                        display: 'flex',
                        gap: '0.5rem'
                    }}>
                        <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>Compte sécurisé pour ce secteur. Vous pouvez publier cet avis en toute confiance.</span>
                    </div>
                )}

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {result.can_take ? (
                        <button
                            onClick={onClose}
                            style={{
                                padding: '1rem',
                                borderRadius: '0.75rem',
                                border: 'none',
                                background: '#111827',
                                color: 'white',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            Démarrer la publication
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '1rem',
                                    borderRadius: '0.75rem',
                                    border: 'none',
                                    background: '#ef4444',
                                    color: 'white',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                Compris
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
