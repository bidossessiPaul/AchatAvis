import React, { useEffect, useState } from 'react';
import { useAntiDetectionStore } from '../../context/antiDetectionStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield,
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Zap,
    Mail,
    X
} from 'lucide-react';

export const SecurityRadar: React.FC = () => {
    const { guideRecap, fetchGuideRecap, gmailHistory, fetchGmailHistory, loading } = useAntiDetectionStore();
    const [expandedSector, setExpandedSector] = useState<string | null>(null);
    const [historyModalAccount, setHistoryModalAccount] = useState<any | null>(null);

    useEffect(() => {
        fetchGuideRecap();
    }, [fetchGuideRecap]);

    const handleOpenHistory = async (e: React.MouseEvent, account: any) => {
        e.stopPropagation();
        setHistoryModalAccount(account);
        if (!gmailHistory[account.id]) {
            await fetchGmailHistory(account.id);
        }
    };

    if (loading && !guideRecap) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', background: 'white', borderRadius: '1.5rem', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                <div className="animate-pulse" style={{ color: '#64748b' }}>Analyse des quotas de sécurité...</div>
            </div>
        );
    }

    if (!guideRecap) return null;

    const sectors = Object.entries(guideRecap);

    return (
        <div style={{ marginBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Shield size={24} color="#0f172a" />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        Radar de Sécurité & Quotas
                    </h3>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                    Mise à jour en temps réel
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                {sectors.map(([slug, data]: [string, any]) => {
                    const availableAccounts = data.accounts.filter((a: any) => a.status === 'ready').length;
                    const totalAccounts = data.accounts.length;

                    return (
                        <div
                            key={slug}
                            style={{
                                background: 'white',
                                borderRadius: '1.25rem',
                                border: '1px solid #e2e8f0',
                                overflow: 'hidden',
                                transition: 'all 0.2s ease',
                                boxShadow: expandedSector === slug ? '0 12px 20px -8px rgba(0,0,0,0.08)' : 'none'
                            }}
                        >
                            <div
                                onClick={() => setExpandedSector(expandedSector === slug ? null : slug)}
                                style={{
                                    padding: '1.25rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '0.75rem',
                                        background: '#f8fafc',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.25rem'
                                    }}>
                                        {data.icon}
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                                            {data.sector_name}
                                        </h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                                            <div style={{
                                                fontSize: '0.7rem',
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                color: availableAccounts > 0 ? '#10b981' : '#ef4444',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem'
                                            }}>
                                                {availableAccounts > 0 ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                                {availableAccounts} / {totalAccounts} Mails Prêts
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ color: '#94a3b8' }}>
                                    {expandedSector === slug ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </div>

                            <AnimatePresence>
                                {expandedSector === slug && (
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: 'auto' }}
                                        exit={{ height: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid #f1f5f9' }}>
                                            <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
                                                {data.accounts.map((acc: any) => (
                                                    <div
                                                        key={acc.id}
                                                        style={{
                                                            padding: '0.75rem',
                                                            borderRadius: '0.75rem',
                                                            background: acc.status === 'ready' ? '#f0fdf4' : (acc.status === 'cooldown' ? '#fffbeb' : '#fef2f2'),
                                                            border: `1px solid ${acc.status === 'ready' ? '#dcfce7' : (acc.status === 'cooldown' ? '#fef3c7' : '#fee2e2')}`,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                    <Mail size={14} color={acc.status === 'ready' ? '#10b981' : (acc.status === 'cooldown' ? '#f59e0b' : '#ef4444')} />
                                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                                                                        {acc.email}
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                                    <button
                                                                        onClick={(e) => handleOpenHistory(e, acc)}
                                                                        style={{
                                                                            fontSize: '0.7rem',
                                                                            fontWeight: 700,
                                                                            color: '#6366f1',
                                                                            background: '#e0e7ff',
                                                                            border: 'none',
                                                                            padding: '0.25rem 0.6rem',
                                                                            borderRadius: '0.4rem',
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '0.25rem'
                                                                        }}
                                                                    >
                                                                        Historique
                                                                    </button>
                                                                    <div style={{ textAlign: 'right' }}>
                                                                        <div style={{
                                                                            fontSize: '0.7rem',
                                                                            fontWeight: 800,
                                                                            textTransform: 'uppercase',
                                                                            color: acc.status === 'ready' ? '#059669' : (acc.status === 'cooldown' ? '#d97706' : '#dc2626')
                                                                        }}>
                                                                            {acc.status === 'ready' ? 'Disponible' : (acc.status === 'cooldown' ? 'Repos' : 'Quota Atteint')}
                                                                        </div>
                                                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                                            {acc.used_this_month} / {data.max_per_month} mtd
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.75rem', fontSize: '0.8rem', color: '#64748b', display: 'flex', gap: '0.5rem' }}>
                                                <Zap size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                                                <span>
                                                    Règle : Max {data.max_per_month} avis/mois par mail avec {data.cooldown_days} jours entre chaque avis pour ce secteur.
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>

            {/* Premium History Modal */}
            <AnimatePresence>
                {historyModalAccount && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setHistoryModalAccount(null)}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(15, 23, 42, 0.75)',
                                backdropFilter: 'blur(8px)',
                            }}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'white',
                                width: '100%',
                                maxWidth: '800px',
                                borderRadius: '1.5rem',
                                overflow: 'hidden',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                display: 'flex',
                                flexDirection: 'column',
                                maxHeight: '85vh',
                                position: 'relative',
                                zIndex: 1001
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{
                                padding: '1.5rem 2rem',
                                background: '#f8fafc',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '0.75rem',
                                        background: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                        color: '#6366f1'
                                    }}>
                                        <Mail size={20} />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Historique de Contribution</h4>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>{historyModalAccount.email}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setHistoryModalAccount(null)}
                                    style={{
                                        background: '#f1f5f9',
                                        border: 'none',
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: '#64748b'
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal Content - Responsive Table */}
                            <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
                                {!gmailHistory[historyModalAccount.id] ? (
                                    <div style={{ padding: '4rem', textAlign: 'center' }}>
                                        <div className="animate-spin" style={{ margin: '0 auto 1rem', width: '24px', height: '24px', border: '3px solid #f1f5f9', borderTopColor: '#6366f1', borderRadius: '50%' }}></div>
                                        <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Récupération de l'historique...</div>
                                    </div>
                                ) : gmailHistory[historyModalAccount.id].length === 0 ? (
                                    <div style={{ padding: '4rem', textAlign: 'center' }}>
                                        <div style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Aucune mission trouvée pour ce compte.</div>
                                    </div>
                                ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ textAlign: 'left', padding: '0 1rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Artisan / Client</th>
                                                    <th style={{ textAlign: 'left', padding: '0 1rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Date</th>
                                                    <th style={{ textAlign: 'left', padding: '0 1rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Statut</th>
                                                    <th style={{ textAlign: 'right', padding: '0 1rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Gain</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {gmailHistory[historyModalAccount.id].map((h: any) => (
                                                    <tr key={h.id}>
                                                        <td style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem 0 0 0.75rem' }}>
                                                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>{h.artisan_company}</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                                {h.sector_icon} {h.sector_name}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '1rem', background: '#f8fafc', fontSize: '0.85rem', color: '#64748b' }}>
                                                            {new Date(h.submitted_at).toLocaleDateString()}
                                                        </td>
                                                        <td style={{ padding: '1rem', background: '#f8fafc' }}>
                                                            <span style={{
                                                                fontSize: '0.7rem',
                                                                fontWeight: 800,
                                                                padding: '0.25rem 0.6rem',
                                                                borderRadius: '2rem',
                                                                textTransform: 'uppercase',
                                                                background: h.status === 'validated' ? '#d1fae5' : (h.status === 'rejected' ? '#fee2e2' : '#fef3c7'),
                                                                color: h.status === 'validated' ? '#059669' : (h.status === 'rejected' ? '#dc2626' : '#d97706'),
                                                            }}>
                                                                {h.status === 'validated' ? 'Validé' : (h.status === 'rejected' ? 'Refusé' : 'En attente')}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0 0.75rem 0.75rem 0', textAlign: 'right' }}>
                                                            <div style={{ fontWeight: 800, color: h.status === 'validated' ? '#059669' : '#1e293b', fontSize: '1rem' }}>
                                                                {h.earnings}€
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div style={{
                                padding: '1.25rem 2rem',
                                background: '#f8fafc',
                                borderTop: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'flex-end'
                            }}>
                                <button
                                    onClick={() => setHistoryModalAccount(null)}
                                    style={{
                                        padding: '0.6rem 1.2rem',
                                        borderRadius: '0.75rem',
                                        background: 'white',
                                        border: '1px solid #e2e8f0',
                                        color: '#1e293b',
                                        fontWeight: 700,
                                        fontSize: '0.875rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Fermer
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
