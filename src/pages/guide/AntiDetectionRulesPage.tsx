import React, { useEffect, useState, Component, ErrorInfo } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useAntiDetectionStore } from '../../context/antiDetectionStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown,
    ChevronUp,
    Lightbulb,
    ShieldCheck as ShieldIcon,
    AlertTriangle,
    CheckCircle
} from 'lucide-react';

import { SectorDifficultyList } from '../../components/AntiDetection/SectorDifficultyList';
import { SecurityRadar } from '../../components/AntiDetection/SecurityRadar';
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

class SecurityRadarErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
    state = { hasError: false };
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('SecurityRadar crashed:', error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', textAlign: 'center', background: '#fef2f2', borderRadius: '1rem', border: '1px solid #fecaca', marginBottom: '2rem' }}>
                    <AlertTriangle size={24} color="#ef4444" style={{ marginBottom: '0.5rem' }} />
                    <p style={{ color: '#991b1b', fontWeight: 600, margin: 0 }}>Impossible de charger le module Quotas & Anti-Détection.</p>
                    <button onClick={() => this.setState({ hasError: false })} style={{ marginTop: '0.75rem', padding: '0.4rem 1rem', borderRadius: '0.5rem', border: '1px solid #fecaca', background: 'white', color: '#991b1b', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                        Réessayer
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

const parseJsonField = (value: any): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try { return JSON.parse(value); } catch { return []; }
    }
    return [];
};

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
    const {
        rules,
        fetchAntiDetectionRules,
        fetchGuideRecap,
        loading
    } = useAntiDetectionStore();

    const [expandedRule, setExpandedRule] = useState<number | null>(null);
    const [hasInitialized, setHasInitialized] = useState(false);

    useEffect(() => {
        // Only fetch once - use state to track instead of dependencies
        if (!hasInitialized) {
            setHasInitialized(true);
            fetchAntiDetectionRules();
            fetchGuideRecap(); // Fetch guide recap here instead of in SecurityRadar
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps: only check once on mount

    const toggleRule = (id: number) => {
        setExpandedRule(expandedRule === id ? null : id);
    };

    if (loading && !rules.length) {
        return (
            <DashboardLayout title="Protocoles de Sécurité">
                <div style={{ padding: '80px 0' }}>
                    <LoadingSpinner text="Initialisation du module de sécurité..." size="lg" className="theme-guide" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Protocoles de Sécurité">
            <SecurityRadarErrorBoundary>
                <SecurityRadar />
            </SecurityRadarErrorBoundary>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', alignItems: 'start', marginBottom: '3rem' }}>
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
                                                        <h5 style={{ fontWeight: 700, color: '#2383e2', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}>
                                                            <CheckCircle size={14} /> STANDARD REQUIS
                                                        </h5>
                                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
                                                            {parseJsonField(rule.examples_do).map((ex: string, i: number) => (
                                                                <li key={i} style={{ color: '#475569', fontSize: '0.8125rem', lineHeight: '1.4' }}>• {ex}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div style={{ background: '#fffafb', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #fff1f2' }}>
                                                        <h5 style={{ fontWeight: 700, color: '#ef4444', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}>
                                                            <AlertTriangle size={14} /> FACTEUR DE RISQUE
                                                        </h5>
                                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
                                                            {parseJsonField(rule.examples_dont).map((ex: string, i: number) => (
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
                                                        {parseJsonField(rule.tips).map((tip: string, i: number) => <div key={i}>💡 {tip}</div>)}
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
            </div>

            <SectorDifficultyList />
        </DashboardLayout >
    );
};

