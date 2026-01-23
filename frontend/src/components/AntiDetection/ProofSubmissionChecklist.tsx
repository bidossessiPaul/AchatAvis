import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Send, ShieldCheck } from 'lucide-react';

interface ProofSubmissionChecklistProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    sectorName: string;
    isHardSector: boolean;
    gmailAccounts: any[]; // Now an array
    selectedGmailId: number | null;
    onGmailSelect: (gmailId: number) => void;
    quotaData: any; // Quota information from API
    submitLabel?: string;
}

export const ProofSubmissionChecklist: React.FC<ProofSubmissionChecklistProps> = ({
    isOpen,
    onClose,
    onConfirm,
    sectorName,
    isHardSector,
    gmailAccounts,
    selectedGmailId,
    onGmailSelect,
    quotaData,
    submitLabel = "Valider et soumettre"
}) => {
    const [checks, setChecks] = useState({
        navigation: false,
        connection: false,
        limit: false,
        cooldown: !isHardSector
    });

    // Auto-fetch quotas when modal opens if Gmail already selected
    useEffect(() => {
        if (isOpen && selectedGmailId) {
            onGmailSelect(selectedGmailId);
        }
    }, [isOpen, selectedGmailId]);

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
                    <div style={{ background: '#0a0f1d', padding: '1.5rem', color: 'white', position: 'relative' }}>
                        <div style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ffffff' }}>
                            <ShieldCheck size={24} color="#f97316" /> Validation avant envoi
                        </div>
                        <p style={{ margin: '0.5rem 0 0', opacity: 0.7, fontSize: '0.875rem' }}>
                            Secteur : {sectorName} {isHardSector && <span style={{ color: '#ef4444' }}>(🔴 Difficile)</span>}
                        </p>
                        <button onClick={onClose} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', color: 'white', opacity: 0.5, cursor: 'pointer' }}>
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ padding: '1.5rem' }}>
                        {/* Gmail Selector with Quotas */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ fontSize: '0.625rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.5rem', display: 'block' }}>Email utilisé</label>
                            <select
                                value={selectedGmailId || ''}
                                onChange={(e) => onGmailSelect(Number(e.target.value))}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '0.75rem',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="">Sélectionnez un compte Gmail</option>
                                {gmailAccounts?.map((gmail: any) => (
                                    <option key={gmail.id} value={gmail.id}>
                                        {gmail.email}
                                    </option>
                                ))}
                            </select>

                            {/* Quota Display */}
                            {selectedGmailId && !quotaData && (
                                <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #e2e8f0', borderTopColor: '#0ea5e9', animation: 'spin 1s linear infinite' }}></div>
                                    Chargement des quotas...
                                </div>
                            )}

                            {selectedGmailId && quotaData && (
                                <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    <div style={{ background: '#fef3c7', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #fde68a' }}>
                                        <div style={{ fontSize: '0.625rem', color: '#92400e', fontWeight: 800, textTransform: 'uppercase' }}>Secteur {sectorName}</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#92400e', marginTop: '0.25rem' }}>
                                            {quotaData.sectorRemaining}/{quotaData.sectorMax} restants
                                        </div>
                                    </div>
                                    <div style={{ background: '#dbeafe', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #bfdbfe' }}>
                                        <div style={{ fontSize: '0.625rem', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase' }}>Global/Mois</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e40af', marginTop: '0.25rem' }}>
                                            {quotaData.globalRemaining}/{quotaData.globalMax} restants
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {isHardSector && (
                            <div style={{ background: '#fff1f2', padding: '1rem', borderRadius: '1rem', border: '1px solid #ffe4e6', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem' }}>
                                <AlertTriangle size={20} color="#000" style={{ flexShrink: 0 }} />
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#9f1239', lineHeight: 1.5 }}>
                                    <b>Rappel Important :</b> Google est très strict sur ce secteur. Assurez-vous d'avoir respecté tous les protocoles de sécurité.
                                </p>
                            </div>
                        )}

                        {/* Checklist */}
                        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '2rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: checks.navigation ? '#f8fafc' : '#ffffff', borderRadius: '1rem', border: `1.5px solid ${checks.navigation ? '#e2e8f0' : '#e2e8f0'}`, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                <input type="checkbox" checked={checks.navigation} onChange={() => setChecks({ ...checks, navigation: !checks.navigation })} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#0a0f1d' }} />
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Je vais naviguer 3+ minutes sur la fiche avant de poster</span>
                            </label>


                            <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: checks.connection ? '#f8fafc' : '#ffffff', borderRadius: '1rem', border: `1.5px solid ${checks.connection ? '#e2e8f0' : '#e2e8f0'}`, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                <input type="checkbox" checked={checks.connection} onChange={() => setChecks({ ...checks, connection: !checks.connection })} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#0a0f1d' }} />
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Je vais poster depuis une connexion 4G/5G</span>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: checks.limit ? '#f8fafc' : '#ffffff', borderRadius: '1rem', border: `1.5px solid ${checks.limit ? '#e2e8f0' : '#e2e8f0'}`, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                <input type="checkbox" checked={checks.limit} onChange={() => setChecks({ ...checks, limit: !checks.limit })} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#0a0f1d' }} />
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Je n'ai pas posté d'autre avis aujourd'hui en dehors de la plateforme</span>
                            </label>

                            {isHardSector && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: checks.cooldown ? '#f8fafc' : '#ffffff', borderRadius: '1rem', border: `1.5px solid ${checks.cooldown ? '#e2e8f0' : '#e2e8f0'}`, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                    <input type="checkbox" checked={checks.cooldown} onChange={() => setChecks({ ...checks, cooldown: !checks.cooldown })} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#0a0f1d' }} />
                                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Mon dernier avis "{sectorName}" date de +15 jours</span>
                                </label>
                            )}
                        </div>

                        {/* Buttons */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                            <button
                                onClick={onClose}
                                style={{ padding: '1rem', borderRadius: '1rem', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
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
                                    background: allChecked ? '#0ea5e9' : '#f1f5f9',
                                    color: allChecked ? 'white' : '#94a3b8',
                                    fontWeight: 800,
                                    cursor: allChecked ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    transition: 'all 0.2s',
                                    boxShadow: allChecked ? '0 10px 15px -3px rgba(14, 165, 233, 0.3)' : 'none'
                                }}
                            >
                                <Send size={18} /> {submitLabel}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
