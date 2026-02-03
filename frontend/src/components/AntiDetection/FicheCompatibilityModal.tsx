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
    gmailAccounts: any[];
    selectedGmailId: number | null;
    onSelectGmail: (gmailId: number) => void;
}

export const FicheCompatibilityModal: React.FC<Props> = ({
    isOpen,
    onClose,
    result,
    gmailAccounts,
    selectedGmailId,
    onSelectGmail
}) => {
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
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(8px)'
        }}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                style={{
                    background: 'white',
                    width: '100%',
                    maxWidth: '480px',
                    borderRadius: '2rem',
                    padding: '2.5rem',
                    textAlign: 'center',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Decorative background element */}
                <div style={{
                    position: 'absolute',
                    top: '-50px',
                    right: '-50px',
                    width: '150px',
                    height: '150px',
                    background: result.can_take ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                    borderRadius: '50%',
                    zIndex: 0
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                            padding: '1.5rem',
                            borderRadius: '2rem',
                            background: result.can_take ? '#f0fdf4' : (result.reason === 'SECTOR_COOLDOWN' ? '#fff7ed' : '#fef2f2'),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {getIcon()}
                        </div>
                    </div>

                    <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
                        {result.can_take ? 'Fiche Compatible !' : 'Action Requise'}
                    </h3>

                    <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '2rem', fontSize: '1rem', fontWeight: 500 }}>
                        {result.message}
                    </p>

                    {(result.details?.used !== undefined && result.details?.max !== undefined) && (
                        <div style={{
                            marginBottom: '1.5rem',
                            padding: '1.25rem',
                            background: '#f8fafc',
                            borderRadius: '1.25rem',
                            border: '1px solid #e2e8f0',
                            textAlign: 'left'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quota Secteur (Mois)</span>
                                <span style={{ fontSize: '0.875rem', fontWeight: 900, color: result.details.used >= result.details.max ? '#ef4444' : '#10b981' }}>
                                    {result.details.used} / {result.details.max}
                                </span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (result.details.used / result.details.max) * 100)}%` }}
                                    style={{
                                        height: '100%',
                                        background: result.details.used >= result.details.max ? 'linear-gradient(90deg, #ef4444, #f87171)' : 'linear-gradient(90deg, #10b981, #34d399)'
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {result.details?.next_available_date && (
                        <div style={{
                            background: '#fff7ed',
                            padding: '1.25rem',
                            borderRadius: '1.25rem',
                            marginBottom: '2rem',
                            border: '1px solid #ffedd5',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            textAlign: 'left'
                        }}>
                            <div style={{ background: '#f59e0b', padding: '0.5rem', borderRadius: '0.75rem', color: 'white' }}>
                                <Clock size={20} />
                            </div>
                            <div>
                                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Repos requis (Secteur)</p>
                                <p style={{ fontWeight: 800, color: '#c2410c', fontSize: '1rem' }}>Disponible le {result.details.next_available_date}</p>
                            </div>
                        </div>
                    )}

                    {/* Quick Gmail Switcher if NOT compatible */}
                    {!result.can_take && gmailAccounts.length > 1 && (
                        <div style={{ marginBottom: '2rem', textAlign: 'left' }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                                Essayer avec un autre compte
                            </p>
                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                {gmailAccounts.filter(a => a.id !== selectedGmailId).map(account => (
                                    <button
                                        key={account.id}
                                        onClick={() => onSelectGmail(account.id)}
                                        style={{
                                            padding: '0.75rem 1rem',
                                            borderRadius: '1rem',
                                            border: '1px solid #e2e8f0',
                                            background: '#fff',
                                            textAlign: 'left',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            color: '#1e293b',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = '#0ea5e9';
                                            e.currentTarget.style.background = '#f0f9ff';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                            e.currentTarget.style.background = '#fff';
                                        }}
                                    >
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0ea5e9' }} />
                                        {account.email}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '1.25rem',
                                borderRadius: '1.25rem',
                                border: 'none',
                                background: result.can_take ? '#111827' : '#ef4444',
                                color: 'white',
                                fontWeight: 800,
                                fontSize: '1rem',
                                cursor: 'pointer',
                                boxShadow: result.can_take ? '0 10px 15px -3px rgba(17, 24, 39, 0.4)' : '0 10px 15px -3px rgba(239, 68, 68, 0.4)',
                                transition: 'transform 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            {result.can_take ? 'Démarrer la publication' : 'Compris'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
