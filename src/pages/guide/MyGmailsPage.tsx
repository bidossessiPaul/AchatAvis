import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { GmailAccountList } from '../../components/AntiDetection/GmailAccountList';
import { AddGmailModal } from '../../components/AntiDetection/AddGmailModal';
import { LevelVerificationModal } from '../../components/AntiDetection/LevelVerificationModal';
import { useAntiDetectionStore } from '../../context/antiDetectionStore';
import { useAuthStore } from '../../context/authStore';
import { motion } from 'framer-motion';
import {
    Trophy,
    Star,
    Camera,
    MessageSquare,
    MapPin,
    CheckCircle2,
    XCircle,
    Clock,
    Video,
    Edit3,
    HelpCircle,
    Flag,
    PlusCircle,
    Route,
    Eye,
    Tag,
    Pen,
    Monitor,
    Smartphone,
    Tablet,
    ExternalLink
} from 'lucide-react';

const POINTS_TABLE = [
    { action: 'Avis', points: 10, bonus: 'Bonus +10pts si > 200 caractères', icon: <Star size={16} /> },
    { action: 'Note', points: 1, bonus: null, icon: <Star size={16} /> },
    { action: 'Photo', points: 5, bonus: null, icon: <Camera size={16} /> },
    { action: 'Tag de photo', points: 3, bonus: null, icon: <Tag size={16} /> },
    { action: 'Vidéo', points: 7, bonus: null, icon: <Video size={16} /> },
    { action: 'Légende', points: 10, bonus: null, icon: <Pen size={16} /> },
    { action: 'Réponse', points: 1, bonus: null, icon: <MessageSquare size={16} /> },
    { action: 'Répondre à des questions', points: 3, bonus: null, icon: <HelpCircle size={16} /> },
    { action: 'Modification', points: 5, bonus: null, icon: <Edit3 size={16} /> },
    { action: 'Ajout d\'un lieu', points: 15, bonus: null, icon: <PlusCircle size={16} /> },
    { action: 'Ajout d\'une route', points: 15, bonus: null, icon: <Route size={16} /> },
    { action: 'Contrôle d\'informations', points: 1, bonus: null, icon: <Eye size={16} /> },
    { action: 'Signalement d\'élément incorrect', points: 1, bonus: null, icon: <Flag size={16} /> },
];

const LEVELS_TABLE = [
    { level: 1, points: 0, badge: false, bonus: 0, badgeImg: null },
    { level: 2, points: 15, badge: false, bonus: 0, badgeImg: null },
    { level: 3, points: 75, badge: false, bonus: 0, badgeImg: null },
    { level: 4, points: 250, badge: true, bonus: 3, badgeImg: 'https://services.google.com/fh/files/helpcenter/points-badge_level_four.png' },
    { level: 5, points: 500, badge: true, bonus: 5, badgeImg: 'https://services.google.com/fh/files/helpcenter/points-badges_level_five.png' },
    { level: 6, points: 1500, badge: true, bonus: 5, badgeImg: 'https://services.google.com/fh/files/helpcenter/points-badges_level_six.png' },
    { level: 7, points: 5000, badge: true, bonus: 10, badgeImg: 'https://services.google.com/fh/files/helpcenter/points-badges_level_seven.png' },
    { level: 8, points: 15000, badge: true, bonus: 10, badgeImg: 'https://services.google.com/fh/files/helpcenter/points-badges_level_eight.png' },
    { level: 9, points: 50000, badge: true, bonus: 20, badgeImg: 'https://services.google.com/fh/files/helpcenter/points-badges_level_nine.png' },
    { level: 10, points: 100000, badge: true, bonus: 20, badgeImg: 'https://services.google.com/fh/files/helpcenter/points-badges_level_ten.png' },
];

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    pending: { label: 'En attente', color: '#92400e', bg: '#fef3c7', icon: <Clock size={14} /> },
    approved: { label: 'Approuvé', color: '#166534', bg: '#dcfce7', icon: <CheckCircle2 size={14} /> },
    rejected: { label: 'Refusé', color: '#991b1b', bg: '#fee2e2', icon: <XCircle size={14} /> },
};

export const MyGmailsPage: React.FC = () => {
    const { user } = useAuthStore();
    const { fetchGmailAccounts, fetchLevelVerifications, levelVerifications } = useAntiDetectionStore();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [verificationModal, setVerificationModal] = useState<{ isOpen: boolean; accountId: number | null }>({
        isOpen: false, accountId: null
    });
    const [platformTab, setPlatformTab] = useState<'desktop' | 'android' | 'ios'>('desktop');

    useEffect(() => {
        if (user) {
            fetchGmailAccounts(user.id);
            fetchLevelVerifications();
        }
    }, [user]);

    return (
        <DashboardLayout title="Mes Comptes Gmail">
            {/* Section 1: Gmail Accounts */}
            <div style={{
                background: 'white',
                borderRadius: '1.25rem',
                border: '1px solid #e2e8f0',
                padding: '1.5rem',
                marginBottom: '2rem'
            }}>
                <GmailAccountList
                    onAddClick={() => setIsAddModalOpen(true)}
                    onVerifyLevel={(accountId) => setVerificationModal({ isOpen: true, accountId })}
                />
            </div>

            {/* Section 2: Verification History */}
            {levelVerifications.length > 0 && (
                <div style={{
                    background: 'white',
                    borderRadius: '1.25rem',
                    border: '1px solid #e2e8f0',
                    padding: '1.5rem',
                    marginBottom: '2rem'
                }}>
                    <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Trophy size={20} color="#f59e0b" /> Mes demandes de vérification
                    </h3>
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {levelVerifications.map((v: any) => {
                            const config = statusConfig[v.status] || statusConfig.pending;
                            return (
                                <div key={v.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    padding: '1rem',
                                    background: '#f8fafc',
                                    borderRadius: '0.75rem',
                                    border: '1px solid #f1f5f9'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>
                                                {v.gmail_email}
                                            </span>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                padding: '0.15rem 0.5rem',
                                                borderRadius: '1rem',
                                                fontWeight: 700,
                                                background: config.bg,
                                                color: config.color,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem'
                                            }}>
                                                {config.icon} {config.label}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                            Niveau {v.current_level} → Niveau {v.claimed_level}
                                            <span style={{ marginLeft: '1rem', color: '#94a3b8' }}>
                                                {new Date(v.created_at).toLocaleDateString('fr-FR')}
                                            </span>
                                        </div>
                                        {v.admin_notes && v.status === 'rejected' && (
                                            <p style={{ fontSize: '0.8rem', color: '#dc2626', margin: '0.5rem 0 0', fontStyle: 'italic' }}>
                                                Motif : {v.admin_notes}
                                            </p>
                                        )}
                                    </div>
                                    <a
                                        href={v.screenshot_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            fontSize: '0.75rem',
                                            color: '#2383e2',
                                            fontWeight: 600,
                                            textDecoration: 'none'
                                        }}
                                    >
                                        Voir capture
                                    </a>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Section 3: Points System + Levels */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Points Table */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    style={{
                        background: 'white',
                        borderRadius: '1.25rem',
                        border: '1px solid #e2e8f0',
                        padding: '1.5rem',
                        overflow: 'hidden'
                    }}
                >
                    <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Star size={20} color="#2383e2" /> Points par contribution
                    </h3>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {POINTS_TABLE.map((item, i) => (
                            <div key={i} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.625rem 0.75rem',
                                background: i % 2 === 0 ? '#f8fafc' : 'white',
                                borderRadius: '0.5rem'
                            }}>
                                <div style={{ color: '#64748b', width: '24px', display: 'flex', justifyContent: 'center' }}>
                                    {item.icon}
                                </div>
                                <span style={{ flex: 1, fontSize: '0.85rem', color: '#0f172a', fontWeight: 500 }}>
                                    {item.action}
                                </span>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        color: '#2383e2',
                                        background: '#eff6ff',
                                        padding: '0.15rem 0.5rem',
                                        borderRadius: '0.375rem'
                                    }}>
                                        {item.points} pts
                                    </span>
                                    {item.bonus && (
                                        <div style={{ fontSize: '0.65rem', color: '#059669', marginTop: '0.125rem', fontWeight: 600 }}>
                                            {item.bonus}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Levels Table */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{
                        background: 'white',
                        borderRadius: '1.25rem',
                        border: '1px solid #e2e8f0',
                        padding: '1.5rem',
                        overflow: 'hidden'
                    }}
                >
                    <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Trophy size={20} color="#f59e0b" /> Niveaux Local Guide
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 1rem', lineHeight: 1.5 }}>
                        Le badge Local Guide s'affiche à partir du <strong>niveau 4</strong> (250 points minimum).
                        Une <strong>prime</strong> est créditée automatiquement sur votre compte lors de la validation de votre niveau.
                    </p>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {LEVELS_TABLE.map((item) => (
                            <div key={item.level} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.625rem 0.75rem',
                                background: item.badge ? '#fffbeb' : '#f8fafc',
                                borderRadius: '0.5rem',
                                border: item.level === 4 ? '1px solid #fde68a' : '1px solid transparent'
                            }}>
                                {item.badgeImg ? (
                                    <img
                                        src={item.badgeImg}
                                        alt={`Niveau ${item.level}`}
                                        style={{ width: '32px', height: '32px', flexShrink: 0 }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        background: '#e2e8f0',
                                        color: '#64748b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.8rem',
                                        fontWeight: 800,
                                        flexShrink: 0
                                    }}>
                                        {item.level}
                                    </div>
                                )}
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                                        Niveau {item.level}
                                    </span>
                                    {item.level === 4 && (
                                        <span style={{
                                            fontSize: '0.65rem',
                                            background: '#fef3c7',
                                            color: '#92400e',
                                            padding: '0.1rem 0.4rem',
                                            borderRadius: '0.25rem',
                                            fontWeight: 700,
                                            marginLeft: '0.5rem'
                                        }}>
                                            BADGE
                                        </span>
                                    )}
                                </div>
                                <span style={{
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    color: item.badge ? '#92400e' : '#64748b'
                                }}>
                                    {item.points.toLocaleString('fr-FR')} pts
                                </span>
                                {item.bonus > 0 ? (
                                    <span style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: '#059669',
                                        background: '#ecfdf5',
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: '0.375rem',
                                        minWidth: '50px',
                                        textAlign: 'center'
                                    }}>
                                        +{item.bonus}€
                                    </span>
                                ) : (
                                    <span style={{ minWidth: '50px' }} />
                                )}
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Section 4: How to check your level */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{
                    background: 'white',
                    borderRadius: '1.25rem',
                    border: '1px solid #e2e8f0',
                    padding: '1.5rem',
                    marginBottom: '2rem'
                }}
            >
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <HelpCircle size={20} color="#2383e2" /> Comment vérifier votre niveau Local Guide ?
                </h3>

                {/* Platform tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0' }}>
                    {[
                        { key: 'desktop' as const, label: 'Ordinateur', icon: <Monitor size={16} /> },
                        { key: 'android' as const, label: 'Android', icon: <Smartphone size={16} /> },
                        { key: 'ios' as const, label: 'iPhone et iPad', icon: <Tablet size={16} /> },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setPlatformTab(tab.key)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.6rem 1rem',
                                fontSize: '0.85rem',
                                fontWeight: platformTab === tab.key ? 700 : 500,
                                color: platformTab === tab.key ? '#2383e2' : '#64748b',
                                background: 'none',
                                border: 'none',
                                borderBottom: platformTab === tab.key ? '2px solid #2383e2' : '2px solid transparent',
                                cursor: 'pointer',
                                marginBottom: '-2px',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div style={{
                    background: '#f8fafc',
                    borderRadius: '0.75rem',
                    padding: '1.25rem',
                    border: '1px solid #f1f5f9'
                }}>
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', margin: '0 0 1rem' }}>
                        Déterminez votre niveau Local Guides
                    </p>

                    {platformTab === 'desktop' && (
                        <ol style={{ margin: '0', paddingLeft: '1.25rem', display: 'grid', gap: '0.6rem' }}>
                            <li style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
                                Ouvrez <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" style={{ color: '#2383e2', fontWeight: 600, textDecoration: 'none' }}>Google Maps <ExternalLink size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /></a> sur votre ordinateur.
                            </li>
                            <li style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
                                En haut à gauche, cliquez sur <strong>Menu</strong> (les trois traits ≡).
                            </li>
                            <li style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
                                Cliquez sur <strong>Vos contributions</strong>.
                            </li>
                            <li style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
                                Votre niveau et le total de vos points s'affichent.
                            </li>
                        </ol>
                    )}

                    {platformTab === 'android' && (
                        <ol style={{ margin: '0', paddingLeft: '1.25rem', display: 'grid', gap: '0.6rem' }}>
                            <li style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
                                Assurez-vous d'utiliser la dernière version de Google Maps.
                            </li>
                            <li style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
                                Ouvrez l'application <strong>Google Maps</strong>.
                            </li>
                            <li style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
                                Appuyez sur <strong>Contribuer</strong> puis sur <strong>Afficher votre profil</strong>.
                            </li>
                            <li style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
                                Votre niveau et le total de vos points s'affichent.
                            </li>
                        </ol>
                    )}

                    {platformTab === 'ios' && (
                        <ol style={{ margin: '0', paddingLeft: '1.25rem', display: 'grid', gap: '0.6rem' }}>
                            <li style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
                                Assurez-vous d'utiliser la dernière version de Google Maps.
                            </li>
                            <li style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
                                Ouvrez l'application <strong>Google Maps</strong> sur votre iPhone ou votre iPad.
                            </li>
                            <li style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
                                Appuyez sur <strong>Contribuer</strong> puis sur <strong>Afficher votre profil</strong>.
                            </li>
                            <li style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
                                Votre niveau et le total de vos points s'affichent.
                            </li>
                        </ol>
                    )}

                    <div style={{
                        marginTop: '1rem',
                        padding: '0.75rem 1rem',
                        background: '#fffbeb',
                        borderRadius: '0.5rem',
                        border: '1px solid #fde68a',
                        fontSize: '0.82rem',
                        color: '#92400e',
                        lineHeight: 1.5
                    }}>
                        <strong>Remarque :</strong> La mise à jour de votre profil peut prendre jusqu'à 24 heures.
                    </div>

                    <a
                        href="https://support.google.com/maps/answer/6225851?ref_topic=6225845&co=GENIE.Platform%3DiOS&oco=1#zippy=%2Cd%C3%A9terminez-votre-niveau-local-guides"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            marginTop: '1rem',
                            fontSize: '0.82rem',
                            color: '#2383e2',
                            fontWeight: 600,
                            textDecoration: 'none'
                        }}
                    >
                        <ExternalLink size={14} /> En savoir plus sur le programme Local Guides
                    </a>
                </div>
            </motion.div>

            {/* Modals */}
            <AddGmailModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => user && fetchGmailAccounts(user.id)}
            />
            <LevelVerificationModal
                isOpen={verificationModal.isOpen}
                accountId={verificationModal.accountId}
                onClose={() => setVerificationModal({ isOpen: false, accountId: null })}
                onSuccess={() => { fetchLevelVerifications(); if (user) fetchGmailAccounts(user.id); }}
            />
        </DashboardLayout>
    );
};
