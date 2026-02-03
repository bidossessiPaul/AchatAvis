import React from 'react';
import { motion } from 'framer-motion';
import { Award } from 'lucide-react';

interface ComplianceWidgetProps {
    data: any;
    orientation?: 'vertical' | 'horizontal';
}

export const ComplianceWidget: React.FC<ComplianceWidgetProps> = ({ data, orientation = 'vertical' }) => {
    if (!data) return null;

    const { compliance_score, score_color, score_label, last_30_days } = data;

    const getColor = (color: string) => {
        switch (color) {
            case 'red': return '#ef4444';
            case 'orange': return '#f59e0b';
            case 'blue': return '#38bdf8';
            default: return '#10b981';
        }
    };

    const statusColor = getColor(score_color);

    return (
        <div style={{
            background: '#0f172a',
            padding: '1.5rem',
            borderRadius: '1.25rem',
            color: 'white',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: orientation === 'vertical' ? 'column' : 'row',
            alignItems: 'center',
            gap: '1.5rem'
        }}>
            <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    <motion.circle
                        cx="50" cy="50" r="45"
                        fill="none"
                        stroke={statusColor}
                        strokeWidth="8"
                        strokeDasharray="283"
                        initial={{ strokeDashoffset: 283 }}
                        animate={{ strokeDashoffset: 283 - (283 * compliance_score) / 100 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        strokeLinecap="round"
                    />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '1.1rem', fontWeight: 800 }}>
                    {compliance_score}%
                </div>
            </div>

            <div style={{ textAlign: orientation === 'vertical' ? 'center' : 'left', flex: 1 }}>
                <div style={{ fontSize: '0.625rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                    Score de Conformité
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: orientation === 'vertical' ? 'center' : 'flex-start', gap: '0.5rem' }}>
                    {score_label}
                </h4>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: orientation === 'vertical' ? 'center' : 'flex-start' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#10b981' }}>{last_30_days?.validated || 0}</div>
                        <div style={{ fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase' }}>Validés</div>
                    </div>
                    <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', alignSelf: 'center' }}></div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ef4444' }}>{last_30_days?.rejected || 0}</div>
                        <div style={{ fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase' }}>Rejetés</div>
                    </div>
                    <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', alignSelf: 'center' }}></div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8' }}>{last_30_days?.success_rate || 0}%</div>
                        <div style={{ fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase' }}>Réussite</div>
                    </div>
                </div>

                {data.certification_passed && (
                    <div style={{
                        marginTop: '1rem',
                        background: 'rgba(56, 189, 248, 0.1)',
                        padding: '0.4rem 0.6rem',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        color: '#38bdf8',
                        fontSize: '0.65rem',
                        fontWeight: 700
                    }}>
                        <Award size={12} /> Certifié Anti-Détection
                    </div>
                )}
            </div>
        </div>
    );
};
