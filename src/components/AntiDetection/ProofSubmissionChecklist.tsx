import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, CheckCircle2, AlertTriangle, X, Send, ShieldCheck, Mail, History } from 'lucide-react';

interface ProofSubmissionChecklistProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    sectorName: string;
    isHardSector: boolean;
    gmailAccount: any;
    complianceScore: number;
}

export const ProofSubmissionChecklist: React.FC<ProofSubmissionChecklistProps> = ({
    isOpen,
    onClose,
    onConfirm,
    sectorName,
    isHardSector,
    gmailAccount,
    complianceScore
}) => {
    const [checks, setChecks] = useState({
        navigation: false,
        age: false,
        connection: false,
        limit: false,
        cooldown: !isHardSector
    });

    const allChecked = Object.values(checks).every(v => v);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem'
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    style={{
                        background: 'white',
                        width: '100%',
                        maxWidth: '500px',
                        borderRadius: '1.5rem',
                        overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                    }}
                >
                    {/* Header */}
                    <div style={{ background: '#0f172a', padding: '1.5rem', color: 'white', position: 'relative' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <ShieldCheck size={24} color="#38bdf8" /> Validation avant envoi
                        </h3>
                        <p style={{ margin: '0.5rem 0 0', opacity: 0.7, fontSize: '0.875rem' }}>
                            Secteur : {sectorName} {isHardSector && <span style={{ color: '#ef4444' }}>(🔴 Difficile)</span>}
                        </p>
                        <button onClick={onClose} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', color: 'white', opacity: 0.5, cursor: 'pointer' }}>
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ padding: '1.5rem' }}>
                        {/* Summary Info */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.625rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.25rem' }}>Email utilisé</div>
                                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Mail size={14} /> {gmailAccount?.email || 'N/A'}
                                </div>
                            </div>
                            <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '1rem', border: '1px solid #dcfce7' }}>
                                <div style={{ fontSize: '0.625rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.25rem' }}>Score Confiance</div>
                                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Shield size={14} /> {complianceScore}% (Bon ✅)
                                </div>
                            </div>
                        </div>

                        {isHardSector && (
                            <div style={{ background: '#fff1f2', padding: '1rem', borderRadius: '1rem', border: '1px solid #ffe4e6', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem' }}>
                                <AlertTriangle size={20} color="#e11d48" style={{ flexShrink: 0 }} />
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#9f1239', lineHeight: 1.5 }}>
                                    <b>Rappel Important :</b> Google est très strict sur ce secteur. Assurez-vous d'avoir respecté tous les protocoles de sécurité.
                                </p>
                            </div>
                        )}

                        {/* Checklist */}
                        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '2rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: checks.navigation ? '#f0fdf4' : '#f8fafc', borderRadius: '1rem', border: `1.5px solid ${checks.navigation ? '#10b981' : '#e2e8f0'}`, cursor: 'pointer', transition: 'all 0.2s' }}>
                                <input type="checkbox" checked={checks.navigation} onChange={() => setChecks({ ...checks, navigation: !checks.navigation })} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>J'ai navigué 3+ minutes sur la fiche avant</span>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: checks.age ? '#f0fdf4' : '#f8fafc', borderRadius: '1rem', border: `1.5px solid ${checks.age ? '#10b981' : '#e2e8f0'}`, cursor: 'pointer', transition: 'all 0.2s' }}>
                                <input type="checkbox" checked={checks.age} onChange={() => setChecks({ ...checks, age: !checks.age })} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Mon compte Gmail a +60 jours d'ancienneté</span>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: checks.connection ? '#f0fdf4' : '#f8fafc', borderRadius: '1rem', border: `1.5px solid ${checks.connection ? '#10b981' : '#e2e8f0'}`, cursor: 'pointer', transition: 'all 0.2s' }}>
                                <input type="checkbox" checked={checks.connection} onChange={() => setChecks({ ...checks, connection: !checks.connection })} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>J'ai posté depuis une connexion 4G/5G</span>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: checks.limit ? '#f0fdf4' : '#f8fafc', borderRadius: '1rem', border: `1.5px solid ${checks.limit ? '#10b981' : '#e2e8f0'}`, cursor: 'pointer', transition: 'all 0.2s' }}>
                                <input type="checkbox" checked={checks.limit} onChange={() => setChecks({ ...checks, limit: !checks.limit })} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Je n'ai pas posté d'autre avis aujourd'hui</span>
                            </label>

                            {isHardSector && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: checks.cooldown ? '#f0fdf4' : '#f8fafc', borderRadius: '1rem', border: `1.5px solid ${checks.cooldown ? '#10b981' : '#e2e8f0'}`, cursor: 'pointer', transition: 'all 0.2s' }}>
                                    <input type="checkbox" checked={checks.cooldown} onChange={() => setChecks({ ...checks, cooldown: !checks.cooldown })} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Mon dernier avis "{sectorName}" date de +15 jours</span>
                                </label>
                            )}
                        </div>

                        {/* Buttons */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <button
                                onClick={onClose}
                                style={{ padding: '1rem', borderRadius: '1rem', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Annuler
                            </button>
                            <button
                                disabled={!allChecked}
                                onClick={onConfirm}
                                style={{
                                    padding: '1rem',
                                    borderRadius: '1rem',
                                    border: 'none',
                                    background: allChecked ? '#0f172a' : '#f1f5f9',
                                    color: allChecked ? 'white' : '#94a3b8',
                                    fontWeight: 700,
                                    cursor: allChecked ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <Send size={18} /> Valider et soumettre
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
