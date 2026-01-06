import React from 'react';
import { motion } from 'framer-motion';
import {
    Zap,
    Target,
    Mail,
    ArrowRight,
    MapPin,
    History,
    FileSearch,
    Fingerprint,
    Activity,
    Shield
} from 'lucide-react';

interface AntiDetectionIntroProps {
    onAddEmails?: () => void;
    onViewFullGuide?: () => void;
}

export const AntiDetectionIntro: React.FC<AntiDetectionIntroProps> = ({
    onAddEmails,
    onViewFullGuide
}) => {
    const containerVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{
                background: '#0f172a',
                padding: '2.5rem',
                borderRadius: '1.5rem',
                color: 'white',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                marginBottom: '3rem',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.05)'
            }}
        >
            {/* Background pattern */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: 0.05,
                pointerEvents: 'none',
                background: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '24px 24px'
            }}></div>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '3rem', position: 'relative' }}>
                <div style={{
                    background: 'rgba(56, 189, 248, 0.1)',
                    padding: '1rem',
                    borderRadius: '1rem',
                    border: '1px solid rgba(56, 189, 248, 0.2)'
                }}>
                    <FileSearch size={32} color="#38bdf8" />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>Système Anti-Détection Google</h2>
                    <p style={{ color: '#94a3b8', fontSize: '1rem', margin: '0.25rem 0 0' }}>Protocoles de sécurité pour Local Guides certifiés</p>
                </div>
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem', position: 'relative' }}>

                {/* Protocol 1 */}
                <motion.div variants={itemVariants} style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ color: '#38bdf8' }}><Fingerprint size={20} /></div>
                        <h4 style={cardTitleStyle}>Analyse de Pattern</h4>
                    </div>
                    <p style={cardTextStyle}>
                        L'algorithme Google identifie les répétitions thématiques excessives. Diversifier vos interventions est la clé de la longévité.
                    </p>
                </motion.div>

                {/* Protocol 2 */}
                <motion.div variants={itemVariants} style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ color: '#38bdf8' }}><Activity size={20} /></div>
                        <h4 style={cardTitleStyle}>Activité Organique</h4>
                    </div>
                    <p style={cardTextStyle}>
                        Un profil sain doit présenter des interactions réelles : recherches, historique de navigation et avis spontanés non-rémunérés.
                    </p>
                </motion.div>

                {/* Protocol 3 */}
                <motion.div variants={itemVariants} style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ color: '#38bdf8' }}><Shield size={20} /></div>
                        <h4 style={cardTitleStyle}>Multi-Gestion</h4>
                    </div>
                    <p style={cardTextStyle}>
                        Répartissez votre charge de travail sur plusieurs comptes Gmail distincts pour rester sous le seuil de détection global.
                    </p>
                </motion.div>

                {/* Protocol 4 */}
                <motion.div variants={itemVariants} style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ color: '#38bdf8' }}><MapPin size={20} /></div>
                        <h4 style={cardTitleStyle}>Validation Géo</h4>
                    </div>
                    <p style={cardTextStyle}>
                        Le signal GPS et l'historique de localisation Maps sont les preuves ultimes de votre visite réelle en établissement.
                    </p>
                </motion.div>
            </div>

            {/* Footer information */}
            <motion.div
                variants={itemVariants}
                style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '1.5rem',
                    borderRadius: '1rem',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    marginBottom: '2.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1.5rem'
                }}
            >
                <div>
                    <span style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Difficulté par secteur</span>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></div>
                        Standard
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></div>
                        Modéré
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></div>
                        Critique
                    </div>
                </div>
            </motion.div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                <button
                    onClick={onAddEmails}
                    style={{
                        padding: '0.875rem 1.5rem',
                        borderRadius: '0.75rem',
                        background: '#38bdf8',
                        color: '#0f172a',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.9375rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Mail size={18} />
                    Gérer les comptes Gmail
                </button>
                <button
                    onClick={onViewFullGuide}
                    style={{
                        padding: '0.875rem 1.5rem',
                        borderRadius: '0.75rem',
                        background: 'transparent',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        fontWeight: 600,
                        fontSize: '0.9375rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >
                    Consulter les protocoles
                    <ArrowRight size={18} />
                </button>
            </div>
        </motion.div>
    );
};

const cardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.02)',
    padding: '1.5rem',
    borderRadius: '1rem',
    border: '1px solid rgba(255, 255, 255, 0.05)'
};

const cardTitleStyle: React.CSSProperties = {
    fontSize: '1rem',
    fontWeight: 700,
    margin: 0,
    color: '#f1f5f9'
};

const cardTextStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    lineHeight: '1.6',
    color: '#94a3b8',
    margin: 0
};
