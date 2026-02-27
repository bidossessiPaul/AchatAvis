import React, { useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown,
    ChevronUp,
    BookOpen,
    Star,
    Camera,
    ShieldCheck,
    Award,
    MessageSquare,
    Image,
    ThumbsUp,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Lightbulb,
    MapPin,
    Coffee,
    ShoppingBag,
    Globe,
    Heart,
    Ban
} from 'lucide-react';

interface RuleSection {
    id: number;
    title: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    summary: string;
    content: React.ReactNode;
}

export const CommunityRulesPage: React.FC = () => {
    const [expandedSection, setExpandedSection] = useState<number | null>(null);

    const toggleSection = (id: number) => {
        setExpandedSection(expandedSection === id ? null : id);
    };

    const sections: RuleSection[] = [
        {
            id: 1,
            title: 'Mission des Local Guides',
            icon: <Globe size={24} />,
            color: '#2383e2',
            bgColor: '#eff6ff',
            summary: 'Faire vivre Google Maps en partageant des expériences authentiques',
            content: (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    <p style={{ color: '#475569', lineHeight: 1.7, fontSize: '0.9rem', margin: 0 }}>
                        Les Local Guides permettent de faire vivre Google Maps. Ils aident les utilisateurs à parcourir plus facilement le monde en rédigeant des avis, en publiant des photos et en suggérant des informations à jour sur différents lieux.
                    </p>
                    <p style={{ color: '#475569', lineHeight: 1.7, fontSize: '0.9rem', margin: 0 }}>
                        Qu'ils prennent une photo d'un plat à goûter absolument ou qu'ils partagent l'adresse d'une nouvelle boutique coup de cœur, les Local Guides partagent leurs expériences et permettent aux utilisateurs de découvrir des lieux.
                    </p>
                    <div style={{ background: '#f0f9ff', padding: '1rem 1.25rem', borderRadius: '0.75rem', border: '1px solid #e0f2fe', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <Award size={18} color="#0369a1" style={{ marginTop: 2, flexShrink: 0 }} />
                        <p style={{ color: '#0c4a6e', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
                            Si vous voyez le badge Local Guides sur l'image de profil d'un utilisateur, cela signifie que ses contributions lui ont donné suffisamment de points pour atteindre au moins le <strong>niveau 4</strong>.
                        </p>
                    </div>
                </div>
            )
        },
        {
            id: 2,
            title: 'Rédiger des avis utiles',
            icon: <MessageSquare size={24} />,
            color: '#059669',
            bgColor: '#ecfdf5',
            summary: 'Inclure des informations intéressantes et donner un avis authentique',
            content: (
                <div style={{ display: 'grid', gap: '1.25rem' }}>
                    <p style={{ color: '#475569', lineHeight: 1.7, fontSize: '0.9rem', margin: 0 }}>
                        Veillez à toujours inclure des informations intéressantes sur un lieu et donner un avis authentique. Évitez les commentaires vagues, génériques et répétitifs, du type « pas mal », « bien » ou « miam ».
                    </p>

                    <div>
                        <h5 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CheckCircle size={16} color="#059669" /> Un avis utile décrit :
                        </h5>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                            {['Le cadre', 'La décoration', 'L\'atmosphère', 'Les points marquants', 'Tout détail pertinent'].map((item, i) => (
                                <div key={i} style={{ background: '#f0fdf4', padding: '0.625rem 1rem', borderRadius: '0.5rem', color: '#166534', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <ThumbsUp size={14} /> {item}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                            <h5 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Coffee size={16} color="#92400e" /> Restaurants, cafés, bars
                            </h5>
                            <p style={{ color: '#64748b', fontSize: '0.8125rem', lineHeight: 1.5, margin: 0 }}>
                                Précisez ce que vous avez commandé et ce que vous recommandez aux clients potentiels.
                            </p>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                            <h5 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <ShoppingBag size={16} color="#7c3aed" /> Magasins
                            </h5>
                            <p style={{ color: '#64748b', fontSize: '0.8125rem', lineHeight: 1.5, margin: 0 }}>
                                Précisez la gamme de produits, l'ordre d'idée des prix, la qualité du service et le type de client susceptible d'apprécier l'endroit.
                            </p>
                        </div>
                    </div>

                    <div style={{ background: '#fef2f2', padding: '1rem 1.25rem', borderRadius: '0.75rem', border: '1px solid #fecaca', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <AlertTriangle size={18} color="#dc2626" style={{ marginTop: 2, flexShrink: 0 }} />
                        <p style={{ color: '#991b1b', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
                            Un Local Guide sera <strong>exclu du programme</strong> s'il publie le même avis pour différents lieux.
                        </p>
                    </div>
                </div>
            )
        },
        {
            id: 3,
            title: 'Photos et vidéos de qualité',
            icon: <Camera size={24} />,
            color: '#7c3aed',
            bgColor: '#f5f3ff',
            summary: 'Prendre des images pertinentes, nettes et bien cadrées',
            content: (
                <div style={{ display: 'grid', gap: '1.25rem' }}>
                    <p style={{ color: '#475569', lineHeight: 1.7, fontSize: '0.9rem', margin: 0 }}>
                        Les photos et les vidéos permettent de raconter l'histoire d'un lieu. En tant que Local Guide, vos images doivent être pertinentes et nettes.
                    </p>

                    <div>
                        <h5 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Lightbulb size={16} color="#eab308" /> Bonnes pratiques :
                        </h5>
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {[
                                'Tirez profit de la lumière naturelle',
                                'Essayez différents angles avant d\'importer les plus réussies',
                                'Effectuez un zoom arrière pour photographier le sujet dans son intégralité',
                                'Prenez une photo horizontale pour montrer tout l\'extérieur d\'un bâtiment',
                                'Placez-vous au-dessus d\'un plat pour le prendre en photo'
                            ].map((tip, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.5rem 0' }}>
                                    <CheckCircle size={16} color="#7c3aed" style={{ marginTop: 2, flexShrink: 0 }} />
                                    <span style={{ color: '#475569', fontSize: '0.875rem', lineHeight: 1.5 }}>{tip}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ background: '#fefce8', padding: '1rem 1.25rem', borderRadius: '0.75rem', border: '1px solid #fef08a', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <Heart size={18} color="#a16207" style={{ marginTop: 2, flexShrink: 0 }} />
                        <p style={{ color: '#854d0e', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
                            Respectez la confidentialité des autres personnes. Demandez leur autorisation ou évitez de prendre des photos de personnes identifiables dans des lieux tels que des établissements scolaires ou des hôpitaux.
                        </p>
                    </div>

                    <div style={{ background: '#fef2f2', padding: '1rem 1.25rem', borderRadius: '0.75rem', border: '1px solid #fecaca' }}>
                        <p style={{ color: '#991b1b', fontSize: '0.875rem', lineHeight: 1.6, margin: 0, display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <AlertTriangle size={18} color="#dc2626" style={{ marginTop: 2, flexShrink: 0 }} />
                            <span>
                                Toute photo sombre, floue ou superflue sera supprimée. Un Local Guide sera <strong>exclu</strong> s'il publie les mêmes photos pour différents lieux ou des images portant atteinte aux droits d'auteur.
                            </span>
                        </p>
                    </div>
                </div>
            )
        },
        {
            id: 4,
            title: 'Digne de confiance',
            icon: <ShieldCheck size={24} />,
            color: '#dc2626',
            bgColor: '#fef2f2',
            summary: 'Contributions fondées sur des expériences et informations réelles',
            content: (
                <div style={{ display: 'grid', gap: '1.25rem' }}>
                    <p style={{ color: '#475569', lineHeight: 1.7, fontSize: '0.9rem', margin: 0 }}>
                        Vos contributions doivent se fonder sur des expériences et des informations réelles. Notre règlement interdit les contenus inappropriés.
                    </p>

                    <div>
                        <h5 style={{ fontWeight: 700, color: '#dc2626', marginBottom: '0.75rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Ban size={16} /> Contenus interdits :
                        </h5>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                            {[
                                'Modifications délibérément falsifiées',
                                'Photos copiées ou volées',
                                'Réponses hors sujet',
                                'Propos diffamatoires',
                                'Attaques personnelles',
                                'Modifications inutiles ou incorrectes'
                            ].map((item, i) => (
                                <div key={i} style={{ background: '#fff1f2', padding: '0.625rem 1rem', borderRadius: '0.5rem', color: '#be123c', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <XCircle size={14} /> {item}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ background: '#fef2f2', padding: '1rem 1.25rem', borderRadius: '0.75rem', border: '1px solid #fecaca', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <AlertTriangle size={18} color="#dc2626" style={{ marginTop: 2, flexShrink: 0 }} />
                        <p style={{ color: '#991b1b', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
                            Un Local Guide sera <strong>exclu du programme</strong> s'il abuse de cette confiance.
                        </p>
                    </div>
                </div>
            )
        },
        {
            id: 5,
            title: 'La marque Local Guides',
            icon: <Award size={24} />,
            color: '#0369a1',
            bgColor: '#f0f9ff',
            summary: 'Protéger la marque et respecter les consignes d\'utilisation',
            content: (
                <div style={{ display: 'grid', gap: '1.25rem' }}>
                    <p style={{ color: '#475569', lineHeight: 1.7, fontSize: '0.9rem', margin: 0 }}>
                        Pour protéger la marque Local Guides et permettre aux utilisateurs de reconnaître les communications officielles, veuillez respecter ces consignes :
                    </p>

                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {[
                            {
                                title: 'Logo Local Guides',
                                desc: 'N\'utilisez pas le logo Local Guides ni aucun autre logo Google, sauf si vous avez noué un partenariat ou obtenu l\'approbation officielle de l\'équipe chargée de la marque Google.'
                            },
                            {
                                title: 'Noms et domaines',
                                desc: 'Ne donnez pas à vos produits, noms de domaine, sites Web ou entreprise le nom « Local Guides », « Google » ou tout autre nom susceptible de laisser penser que votre produit est un produit officiel de Google.'
                            },
                            {
                                title: 'Réseaux sociaux',
                                desc: 'N\'utilisez pas « GOOGLE » dans le nom de votre compte de réseau social. Si votre nom inclut « LOCAL GUIDES », indiquez clairement que vous n\'êtes pas une chaîne officielle de Google.'
                            }
                        ].map((rule, i) => (
                            <div key={i} style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                                <h5 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.375rem', fontSize: '0.875rem' }}>{rule.title}</h5>
                                <p style={{ color: '#64748b', fontSize: '0.8125rem', lineHeight: 1.6, margin: 0 }}>{rule.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )
        }
    ];

    return (
        <DashboardLayout title="Règlement de la Communauté">
            {/* Header Banner */}
            <div style={{
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
                borderRadius: '1.25rem',
                padding: '2rem 2.5rem',
                marginBottom: '2rem',
                color: 'white',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    top: -30,
                    right: -30,
                    width: 150,
                    height: 150,
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '50%'
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: -20,
                    right: 80,
                    width: 80,
                    height: 80,
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '50%'
                }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <MapPin size={28} />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
                            Règlement de la Communauté Local Guides
                        </h2>
                    </div>
                    <p style={{ fontSize: '0.95rem', opacity: 0.9, maxWidth: '600px', lineHeight: 1.6, margin: 0 }}>
                        La communauté Local Guides s'efforce d'être un groupe aussi authentique et utile que possible. Prenez connaissance de ces règles pour maintenir votre statut de Local Guide.
                    </p>
                </div>
            </div>

            {/* Rules Sections */}
            <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '2rem' }}>
                {sections.map((section) => (
                    <div
                        key={section.id}
                        style={{
                            background: 'white',
                            borderRadius: '1rem',
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden',
                            transition: 'all 0.2s ease',
                            boxShadow: expandedSection === section.id ? '0 10px 15px -3px rgba(0,0,0,0.05)' : 'none'
                        }}
                    >
                        <div
                            onClick={() => toggleSection(section.id)}
                            style={{
                                padding: '1.25rem 1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1.25rem',
                                cursor: 'pointer',
                            }}
                        >
                            <div style={{
                                color: section.color,
                                background: section.bgColor,
                                width: '48px',
                                height: '48px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '0.75rem',
                                flexShrink: 0
                            }}>
                                {section.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.125rem' }}>{section.title}</h4>
                                <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>{section.summary}</p>
                            </div>
                            <div style={{ color: '#94a3b8' }}>
                                {expandedSection === section.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                        </div>

                        <AnimatePresence>
                            {expandedSection === section.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div style={{ padding: '0 1.5rem 1.75rem 5.25rem', borderTop: '1px solid #f1f5f9' }}>
                                        <div style={{ marginTop: '1.25rem' }}>
                                            {section.content}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>

            {/* Footer reminder */}
            <div style={{
                background: '#fffbeb',
                border: '1px solid #fef08a',
                borderRadius: '1rem',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
                marginBottom: '2rem'
            }}>
                <Lightbulb size={20} color="#a16207" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                    <h4 style={{ fontWeight: 700, color: '#92400e', marginBottom: '0.25rem', fontSize: '0.9375rem' }}>Rappel important</h4>
                    <p style={{ color: '#a16207', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
                        Pour éviter que vos publications soient supprimées ou pour ne pas perdre votre statut de Local Guide, respectez scrupuleusement ces consignes. Consultez également le Règlement relatif aux contenus générés par les utilisateurs de Google.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
};
