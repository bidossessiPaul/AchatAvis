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
import {
    MdRestaurant, MdPlumbing, MdElectricalServices, MdRealEstateAgent,
    MdHealthAndSafety, MdCarRepair, MdCleaningServices,
    MdOutlineAccountBalanceWallet, MdOutlineLocalFlorist, MdOutlinePets,
    MdOutlineDoorBack, MdOutlinePhotoCamera, MdOutlineHotel, MdOutlineGrass,
    MdRoofing, MdOutlineAcUnit, MdWindow, MdDirectionsCar, MdOutlineConstruction
} from 'react-icons/md';
import { FaHardHat, FaTruckMoving, FaGavel, FaSpa, FaGamepad, FaTooth, FaTaxi, FaTools } from 'react-icons/fa';
import { GiBread, GiScissors, GiLipstick } from 'react-icons/gi';
import { IoCafe } from 'react-icons/io5';
import { HiOutlineComputerDesktop } from 'react-icons/hi2';
import { BiShoppingBag } from 'react-icons/bi';
import { BsBriefcase, BsBrush } from 'react-icons/bs';
import { FiGlobe } from 'react-icons/fi';
import { GmailHistoryTable } from './GmailHistoryTable';

const getSectorIcon = (identifier: string) => {
    const s = identifier.toLowerCase().trim();

    // Food & Drink
    if (s.includes('restaur')) return <MdRestaurant size={20} />;
    if (s.includes('cafe')) return <IoCafe size={20} />;
    if (s.includes('boulanger')) return <GiBread size={20} />;

    // Services & Beauty
    if (s.includes('coiffure')) return <GiScissors size={20} />;
    if (s.includes('esthetique') || s.includes('beaut') || s.includes('salon')) return <GiLipstick size={20} />;
    if (s.includes('massage') || s.includes('spa') || s.includes('bien-etre')) return <FaSpa size={20} />;
    if (s.includes('nettoy') || s.includes('menage')) return <MdCleaningServices size={20} />;
    if (s.includes('fleurist')) return <MdOutlineLocalFlorist size={20} />;
    if (s.includes('photo')) return <MdOutlinePhotoCamera size={20} />;
    if (s.includes('animaux') || s.includes('pets') || s.includes('animal')) return <MdOutlinePets size={20} />;

    // Home & Building
    if (s.includes('plomb') || s.includes('assainiss')) return <MdPlumbing size={20} />;
    if (s.includes('elec')) return <MdElectricalServices size={20} />;
    if (s.includes('immo')) return <MdRealEstateAgent size={20} />;
    if (s.includes('serrur') || s.includes('depann')) return <MdOutlineDoorBack size={20} />;
    if (s.includes('toiture') || s.includes('couver') || s.includes('couvreur') || s.includes('charpen') || s.includes('ardois')) return <MdRoofing size={20} />;
    if (s.includes('chauff') || s.includes('climo') || s.includes('clim')) return <MdOutlineAcUnit size={20} />;
    if (s.includes('vitr')) return <MdWindow size={20} />;
    if (s.includes('menuis') || s.includes('bois') || s.includes('ebenist')) return <FaTools size={20} />;
    if (s.includes('bati') || s.includes('renov') || s.includes('travaux')) return <FaHardHat size={20} />;
    if (s.includes('macon')) return <MdOutlineConstruction size={20} />;
    if (s.includes('peint') || s.includes('deco')) return <BsBrush size={20} />;
    if (s.includes('jardin') || s.includes('paysag')) return <MdOutlineGrass size={20} />;
    if (s.includes('demenag')) return <FaTruckMoving size={20} />;

    // Tech & Professional
    if (s.includes('info') || s.includes('tech') || s.includes('repar') || s.includes('ordi')) return <HiOutlineComputerDesktop size={20} />;
    if (s.includes('compta') || s.includes('expert') || s.includes('audit')) return <MdOutlineAccountBalanceWallet size={20} />;
    if (s.includes('jurid') || s.includes('avocat') || s.includes('notaire')) return <FaGavel size={20} />;
    if (s.includes('service')) return <BsBriefcase size={20} />;

    // Health & Transport & Others
    if (s.includes('dentist')) return <FaTooth size={20} />;
    if (s.includes('sant') || s.includes('medic') || s.includes('docteur') || s.includes('hopital')) return <MdHealthAndSafety size={20} />;
    if (s.includes('vtc') || s.includes('transport') || s.includes('chauffeur') || s.includes('camion')) return <MdDirectionsCar size={20} />;
    if (s.includes('taxi')) return <FaTaxi size={20} />;
    if (s.includes('hotel') || s.includes('voyage') || s.includes('sejour')) return <MdOutlineHotel size={20} />;
    if (s.includes('auto') || s.includes('garage') || s.includes('mecani')) return <MdCarRepair size={20} />;
    if (s.includes('loysir') || s.includes('loisir') || s.includes('divertis') || s.includes('jeu') || s.includes('sport')) return <FaGamepad size={20} />;
    if (s.includes('shop') || s.includes('commerce') || s.includes('boutique') || s.includes('magasin')) return <BiShoppingBag size={20} />;

    return <FiGlobe size={20} />;
};

export const SecurityRadar: React.FC = () => {
    const { guideRecap, fetchGuideRecap, gmailHistory, fetchGmailHistory, loading } = useAntiDetectionStore();
    const [expandedSector, setExpandedSector] = useState<string | null>(null);
    const [historyModalAccount, setHistoryModalAccount] = useState<{ account: any, sectorId: number | null, sectorName: string } | null>(null);

    useEffect(() => {
        fetchGuideRecap();
    }, [fetchGuideRecap]);

    const handleOpenHistory = async (e: React.MouseEvent, account: any, sectorId: number | null, sectorName: string) => {
        e.stopPropagation();
        setHistoryModalAccount({ account, sectorId, sectorName });
        const key = `${account.id}_${sectorId || 'all'}`;
        if (!gmailHistory[key]) {
            await fetchGmailHistory(account.id, sectorId || undefined);
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

            {/* Dynamic Table Layout - Scrollable Container */}
            <div style={{
                background: 'white',
                borderRadius: '1.25rem',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                overflow: 'hidden'
            }}>
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', width: '30%' }}>Secteur</th>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', width: '30%' }}>Disponibilité Mails</th>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', width: '30%' }}>Règles Anti-Détection</th>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', width: '10%', textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sectors.map(([slug, data]: [string, any]) => {
                                const availableAccounts = data.accounts.filter((a: any) => a.status === 'ready').length;
                                const totalAccounts = data.accounts.length;
                                const readyPercentage = totalAccounts > 0 ? (availableAccounts / totalAccounts) * 100 : 0;
                                const isExpanded = expandedSector === slug;

                                return (
                                    <React.Fragment key={slug}>
                                        <tr
                                            onClick={() => setExpandedSector(isExpanded ? null : slug)}
                                            style={{
                                                borderBottom: '1px solid #f1f5f9',
                                                cursor: 'pointer',
                                                transition: 'background 0.2s ease',
                                                background: isExpanded ? '#f8fafc' : 'transparent'
                                            }}
                                            onMouseEnter={(e) => !isExpanded && (e.currentTarget.style.background = '#fcfdfe')}
                                            onMouseLeave={(e) => !isExpanded && (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <td style={{ padding: '1.25rem 1.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '0.75rem',
                                                        background: '#f1f5f9',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: readyPercentage > 0 ? '#6366f1' : '#94a3b8'
                                                    }}>
                                                        {getSectorIcon(slug)}
                                                    </div>
                                                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                                                        {data.sector_name}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            fontWeight: 800,
                                                            color: availableAccounts > 0 ? '#10b981' : '#ef4444'
                                                        }}>
                                                            {availableAccounts} / {totalAccounts} PRÊTS
                                                        </span>
                                                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                                                            {Math.round(readyPercentage)}%
                                                        </span>
                                                    </div>
                                                    <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{
                                                            width: `${readyPercentage}%`,
                                                            height: '100%',
                                                            background: availableAccounts > 0 ? '#10b981' : '#ef4444',
                                                            transition: 'width 0.3s ease'
                                                        }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.8rem' }}>
                                                        <Zap size={14} color="#f59e0b" />
                                                        <span>Pause : {data.cooldown_days} jours</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.8rem' }}>
                                                        <Shield size={14} color="#6366f1" />
                                                        <span>Max : {data.max_per_month} avis/mois</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                                                <div style={{ color: '#94a3b8' }}>
                                                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                </div>
                                            </td>
                                        </tr>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={4} style={{ padding: 0, background: '#fcfdfe' }}>
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            style={{ overflow: 'hidden' }}
                                                        >
                                                            <div style={{ padding: '1.5rem 2rem', borderBottom: '2px solid #f1f5f9' }}>
                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                                                    {data.accounts.map((acc: any) => (
                                                                        <div
                                                                            key={acc.id}
                                                                            style={{
                                                                                padding: '1rem',
                                                                                borderRadius: '1rem',
                                                                                background: 'white',
                                                                                border: '1px solid #e2e8f0',
                                                                                display: 'flex',
                                                                                flexDirection: 'column',
                                                                                gap: '0.75rem',
                                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                                                            }}
                                                                        >
                                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                                    <div style={{
                                                                                        width: '32px',
                                                                                        height: '32px',
                                                                                        borderRadius: '50%',
                                                                                        background: acc.status === 'ready' ? '#dcfce7' : (acc.status === 'cooldown' ? '#fef3c7' : '#fee2e2'),
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        justifyContent: 'center',
                                                                                        color: acc.status === 'ready' ? '#059669' : (acc.status === 'cooldown' ? '#d97706' : '#dc2626')
                                                                                    }}>
                                                                                        <Mail size={16} />
                                                                                    </div>
                                                                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                                        {acc.email}
                                                                                    </div>
                                                                                </div>
                                                                                <button
                                                                                    onClick={(e) => handleOpenHistory(e, acc, data.sector_id || null, data.sector_name)}
                                                                                    style={{
                                                                                        fontSize: '0.7rem',
                                                                                        fontWeight: 800,
                                                                                        color: '#6366f1',
                                                                                        background: '#f5f3ff',
                                                                                        border: '1px solid #ddd6fe',
                                                                                        padding: '0.3rem 0.6rem',
                                                                                        borderRadius: '0.5rem',
                                                                                        cursor: 'pointer',
                                                                                        textTransform: 'uppercase'
                                                                                    }}
                                                                                >
                                                                                    Historique
                                                                                </button>
                                                                            </div>
                                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                                                                                <div style={{
                                                                                    fontSize: '0.65rem',
                                                                                    fontWeight: 900,
                                                                                    textTransform: 'uppercase',
                                                                                    color: acc.status === 'ready' ? '#059669' : (acc.status === 'cooldown' ? '#d97706' : '#dc2626'),
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '0.25rem'
                                                                                }}>
                                                                                    {acc.status === 'ready' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                                                                    {acc.status === 'ready' ? 'Disponible' : (acc.status === 'cooldown' ? 'Repos' : 'Quotas')}
                                                                                </div>
                                                                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                                                                                    {acc.used_this_month} / {data.max_per_month} par mois
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    </td>
                                                </tr>
                                            )}
                                        </AnimatePresence>
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
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
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            style={{
                                background: 'white',
                                width: '100%',
                                maxWidth: '900px',
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
                                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                                            Historique : {historyModalAccount.sectorName}
                                        </h4>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>{historyModalAccount.account.email}</div>
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

                            {/* Modal Content - Using Premium Table */}
                            <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
                                {!gmailHistory[`${historyModalAccount.account.id}_${historyModalAccount.sectorId || 'all'}`] ? (
                                    <div style={{ padding: '4rem', textAlign: 'center' }}>
                                        <div className="animate-spin" style={{ margin: '0 auto 1rem', width: '24px', height: '24px', border: '3px solid #f1f5f9', borderTopColor: '#6366f1', borderRadius: '50%' }}></div>
                                        <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Récupération de l'historique...</div>
                                    </div>
                                ) : (
                                    <GmailHistoryTable
                                        history={gmailHistory[`${historyModalAccount.account.id}_${historyModalAccount.sectorId || 'all'}`]}
                                    />
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
