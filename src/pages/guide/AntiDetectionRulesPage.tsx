import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useAntiDetectionStore } from '../../context/antiDetectionStore';
import { useAuthStore } from '../../context/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown,
    ChevronUp,
    Lightbulb,
    ShieldCheck as ShieldIcon,
    AlertTriangle,
    CheckCircle,
    Award
} from 'lucide-react';

import { AntiDetectionIntro } from '../../components/AntiDetection/AntiDetectionIntro';
import { SectorDifficultyList } from '../../components/AntiDetection/SectorDifficultyList';
import {
    User,
    Navigation,
    MapPin,
    Smartphone,
    MessageSquare,
    Camera,
    Clock,
    Building2,
    Timer,
    Trophy,
    RotateCcw
} from 'lucide-react';

const ruleIconMap: Record<string, React.ReactNode> = {
    'gmail_reel': <User size={24} />,
    'natural_navigation': <Navigation size={24} />,
    'gps_active': <MapPin size={24} />,
    'mobile_data_only': <Smartphone size={24} />,
    'texte_unique': <MessageSquare size={24} />,
    'photos_reelles': <Camera size={24} />,
    'rythme_naturel': <Clock size={24} />,
    'diversite_lieux': <Building2 size={24} />,
    'patience_post_visite': <Timer size={24} />,
    'guide_level': <Trophy size={24} />,
    'interaction': <RotateCcw size={24} />
};

export const AntiDetectionRulesPage: React.FC = () => {
    const { user } = useAuthStore();
    const {
        rules,
        complianceData,
        fetchRules,
        fetchComplianceData,
        loading
    } = useAntiDetectionStore();

    const [expandedRule, setExpandedRule] = useState<number | null>(null);

    useEffect(() => {
        fetchRules();
        if (user) {
            fetchComplianceData(user.id);
        }
    }, [fetchRules, fetchComplianceData, user]);

    const toggleRule = (id: number) => {
        setExpandedRule(expandedRule === id ? null : id);
    };

    if (loading && !rules.length) {
        return (
            <DashboardLayout title="Protocoles de Sécurité">
                <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>Initialisation du module de sécurité...</div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Protocoles de Sécurité">
            <AntiDetectionIntro
                onAddEmails={() => window.location.href = '/profile?tab=gmail'}
                onViewFullGuide={() => {
                    const el = document.getElementById('rules-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
            />

            <SectorDifficultyList />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start', marginBottom: '3rem' }}>
                <div id="rules-section">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <ShieldIcon size={20} color="#0f172a" /> Registre des Protocoles
                        </h3>
                        <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {rules.length} unités actives
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {rules.map((rule) => (
                            <div
                                key={rule.id}
                                style={{
                                    background: 'white',
                                    borderRadius: '1rem',
                                    border: '1px solid #e2e8f0',
                                    overflow: 'hidden',
                                    transition: 'all 0.2s ease',
                                    boxShadow: expandedRule === rule.id ? '0 10px 15px -3px rgba(0,0,0,0.05)' : 'none'
                                }}
                            >
                                <div
                                    onClick={() => toggleRule(rule.id)}
                                    style={{
                                        padding: '1.25rem 1.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1.25rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <div style={{
                                        color: '#64748b',
                                        background: '#f8fafc',
                                        width: '48px',
                                        height: '48px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '0.75rem'
                                    }}>
                                        {ruleIconMap[rule.rule_key] || <ShieldIcon size={24} />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.125rem' }}>
                                            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{rule.rule_name}</h4>
                                            <span style={{
                                                fontSize: '0.625rem',
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                padding: '0.125rem 0.5rem',
                                                borderRadius: '0.25rem',
                                                background: rule.severity === 'critical' ? '#fee2e2' : (rule.severity === 'high' ? '#ffedd5' : '#f1f5f9'),
                                                color: rule.severity === 'critical' ? '#ef4444' : (rule.severity === 'high' ? '#f59e0b' : '#64748b'),
                                            }}>
                                                {rule.severity}
                                            </span>
                                        </div>
                                        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>{rule.description_short}</p>
                                    </div>
                                    <div style={{ color: '#94a3b8' }}>
                                        {expandedRule === rule.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {expandedRule === rule.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <div style={{ padding: '0 1.5rem 1.75rem 5.25rem', borderTop: '1px solid #f1f5f9' }}>
                                                <div style={{ marginTop: '1.25rem', marginBottom: '1.5rem' }}>
                                                    <h5 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Spécifications techniques</h5>
                                                    <p style={{ color: '#475569', lineHeight: 1.6, fontSize: '0.875rem', margin: 0 }}>{rule.description_long}</p>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #f1f5f9' }}>
                                                        <h5 style={{ fontWeight: 700, color: '#059669', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}>
                                                            <CheckCircle size={14} /> STANDARD REQUIS
                                                        </h5>
                                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
                                                            {rule.examples_do?.map((ex: string, i: number) => (
                                                                <li key={i} style={{ color: '#475569', fontSize: '0.8125rem', lineHeight: '1.4' }}>• {ex}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div style={{ background: '#fffafb', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #fff1f2' }}>
                                                        <h5 style={{ fontWeight: 700, color: '#e11d48', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}>
                                                            <AlertTriangle size={14} /> FACTEUR DE RISQUE
                                                        </h5>
                                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
                                                            {rule.examples_dont?.map((ex: string, i: number) => (
                                                                <li key={i} style={{ color: '#475569', fontSize: '0.8125rem', lineHeight: '1.4' }}>• {ex}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>

                                                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0f9ff', borderRadius: '0.75rem', border: '1px solid #e0f2fe' }}>
                                                    <h5 style={{ fontWeight: 700, color: '#0369a1', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}>
                                                        <Lightbulb size={14} /> Analyse d'Expert
                                                    </h5>
                                                    <div style={{ color: '#0c4a6e', fontSize: '0.8125rem', lineHeight: '1.5' }}>
                                                        {rule.tips?.map((tip: string, i: number) => <div key={i}>{tip}</div>)}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ position: 'sticky', top: '2rem' }}>
                    <div style={{
                        background: '#0f172a',
                        padding: '2rem',
                        borderRadius: '1.5rem',
                        color: 'white',
                        textAlign: 'center',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{
                            background: 'rgba(255,255,255,0.05)',
                            padding: '0.375rem 0.75rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.625rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            marginBottom: '1.5rem',
                            color: '#94a3b8',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase'
                        }}>
                            Indicateur de Conformité
                        </div>

                        <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 1.5rem' }}>
                            <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                                <motion.circle
                                    cx="50" cy="50" r="45"
                                    fill="none"
                                    stroke={complianceData?.score_color === 'red' ? '#ef4444' : (complianceData?.score_color === 'orange' ? '#f59e0b' : '#38bdf8')}
                                    strokeWidth="6"
                                    strokeDasharray="283"
                                    initial={{ strokeDashoffset: 283 }}
                                    animate={{ strokeDashoffset: 283 - (283 * (complianceData?.compliance_score || 100)) / 100 }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '1.25rem', fontWeight: 800 }}>
                                {complianceData?.compliance_score || 100}%
                            </div>
                        </div>

                        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#f8fafc' }}>
                            {complianceData?.score_label?.replace(/⭐|Excellent|Score/g, '').trim() || 'Stable'}
                        </h4>

                        {complianceData?.certification_passed && (
                            <div style={{
                                background: 'rgba(56, 189, 248, 0.1)',
                                padding: '0.5rem',
                                borderRadius: '0.5rem',
                                border: '1px solid rgba(56, 189, 248, 0.2)',
                                marginBottom: '1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                color: '#38bdf8',
                                fontSize: '0.75rem',
                                fontWeight: 700
                            }}>
                                <Award size={14} /> Certifié (Score: {complianceData.certification_score}%)
                            </div>
                        )}

                        <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '2rem', lineHeight: '1.5' }}>
                            Profil Guide identifié comme {complianceData?.compliance_score && complianceData.compliance_score > 90 ? 'sécurisé' : 'à optimiser'}.
                        </p>

                        <button
                            onClick={() => window.location.href = '/guide/quiz'}
                            style={{
                                width: '100%',
                                padding: '0.875rem',
                                borderRadius: '0.75rem',
                                background: complianceData?.certification_passed ? 'rgba(255,255,255,0.05)' : 'white',
                                color: complianceData?.certification_passed ? 'white' : '#0f172a',
                                border: complianceData?.certification_passed ? '1px solid rgba(255,255,255,0.1)' : 'none',
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.6rem'
                            }}
                        >
                            <Award size={16} />
                            {complianceData?.certification_passed ? 'Repasser la Certification' : 'Passer la Certification'}
                        </button>
                    </div>

                    <div style={{ marginTop: '1.25rem', padding: '1.25rem', background: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
                        <h5 style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '1rem', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pratiques Recommandées</h5>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.875rem' }}>
                            <li style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '0.6rem' }}>
                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#38bdf8', marginTop: '6px', flexShrink: 0 }}></div>
                                Interactions communautaires régulières.
                            </li>
                            <li style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '0.6rem' }}>
                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#38bdf8', marginTop: '6px', flexShrink: 0 }}></div>
                                Documentation photographique authentique.
                            </li>
                            <li style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '0.6rem' }}>
                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#38bdf8', marginTop: '6px', flexShrink: 0 }}></div>
                                Rédaction sémantique diversifiée.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};
