import React, { useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Megaphone, ShieldCheck, FileText, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface Communique {
    id: string;
    date: string;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    accentColor: string;
    content: React.ReactNode;
}

export const CommuniquesPage: React.FC = () => {
    const [expanded, setExpanded] = useState<string | null>('identity-verification');

    const toggle = (id: string) => setExpanded(prev => prev === id ? null : id);

    const communiques: Communique[] = [
        {
            id: 'identity-verification',
            date: 'Avril 2026',
            title: 'Vérification d\'identité obligatoire',
            subtitle: 'Sécurité des comptes Guides Locaux',
            icon: <ShieldCheck size={24} />,
            accentColor: '#0369a1',
            content: (
                <div style={{ lineHeight: 1.7, color: '#334155' }}>
                    <p style={{ marginTop: 0 }}>
                        Dans le prolongement de notre engagement pour une plateforme <strong>fiable et transparente</strong>,
                        nous mettons en place une nouvelle étape de vérification destinée à garantir
                        l'identité réelle de chaque membre de la communauté AchatAvis.
                    </p>

                    <div style={{
                        padding: '1rem 1.25rem',
                        background: '#eff6ff',
                        borderLeft: '4px solid #0369a1',
                        borderRadius: '0 8px 8px 0',
                        margin: '1.5rem 0',
                        fontWeight: 600,
                        color: '#1e3a8a'
                    }}>
                        Règle fondamentale : chaque compte Local Guide AchatAvis doit être lié
                        à une personne réelle et identifiable.
                    </div>

                    <h3 style={{ color: '#0f172a', fontSize: '1.05rem', marginTop: '1.5rem' }}>
                        ✅ Qui est concerné ?
                    </h3>
                    <ul>
                        <li><strong>Tout guide n'ayant encore publié aucun avis</strong> sur la plateforme</li>
                        <li><strong>Tous les nouveaux inscrits</strong>, à partir de ce jour</li>
                    </ul>
                    <p style={{ fontStyle: 'italic', color: '#64748b' }}>
                        Les guides ayant déjà des avis validés <strong>ne sont pas concernés</strong> — la confiance est déjà établie.
                    </p>

                    <h3 style={{ color: '#0f172a', fontSize: '1.05rem', marginTop: '1.5rem' }}>
                        📋 Procédure à suivre
                    </h3>
                    <ol style={{ paddingLeft: '1.25rem' }}>
                        <li>Connectez-vous à votre compte sur <strong>https://manager.achatavis.com</strong></li>
                        <li>Vous serez automatiquement redirigé vers la page de vérification d'identité</li>
                        <li>Téléversez une photo ou un scan de votre <strong>pièce d'identité officielle</strong> :
                            <ul>
                                <li>Carte nationale d'identité</li>
                                <li>Passeport</li>
                                <li>Permis de conduire</li>
                            </ul>
                        </li>
                        <li>Formats acceptés : <strong>JPG, PNG, WEBP, PDF</strong> (max. 8 Mo)</li>
                        <li>Cliquez sur <strong>« Envoyer ma pièce d'identité »</strong></li>
                    </ol>

                    <div style={{
                        padding: '1rem 1.25rem',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '8px',
                        margin: '1.5rem 0'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem', color: '#166534', fontWeight: 700 }}>
                            ⏱️ Délai de traitement : 24h maximum
                        </div>
                        <p style={{ margin: 0, color: '#14532d' }}>
                            Dès validation, votre compte est <strong>automatiquement réactivé</strong>, vous retrouvez
                            l'accès complet à la plateforme. Votre solde et vos informations restent intégralement conservés.
                        </p>
                    </div>

                    <h3 style={{ color: '#0f172a', fontSize: '1.05rem' }}>🔒 Protection de vos données</h3>
                    <ul>
                        <li><strong>Chiffrées et stockées de manière sécurisée</strong></li>
                        <li><strong>Consultées uniquement</strong> par l'équipe de vérification AchatAvis</li>
                        <li><strong>Utilisées exclusivement</strong> pour confirmer votre identité — jamais partagées avec des tiers</li>
                        <li><strong>Conservées</strong> dans le respect du RGPD</li>
                    </ul>

                    <div style={{
                        padding: '1rem 1.25rem',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        margin: '1.5rem 0',
                        color: '#7f1d1d'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem', fontWeight: 700 }}>
                            <AlertTriangle size={18} /> Important
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                            <li>Cette étape est <strong>obligatoire et unique</strong>. Une fois validée, vous n'aurez plus jamais à la refaire.</li>
                            <li>Tout compte n'ayant <strong>pas soumis sa pièce</strong> restera bloqué et ne pourra plus accepter de missions.</li>
                            <li>La <strong>falsification d'une pièce d'identité</strong> entraînera la suppression définitive du compte et un signalement aux autorités compétentes.</li>
                        </ul>
                    </div>

                    <p>
                        Merci de votre coopération. Cette mesure nous permet de bâtir ensemble une
                        communauté <strong>fiable, professionnelle et durable</strong>.
                    </p>
                    <p style={{ fontStyle: 'italic', color: '#64748b' }}>
                        Pour toute question, contactez le support AchatAvis.
                    </p>
                    <p style={{ fontWeight: 700, color: '#0f172a' }}>— L'équipe AchatAvis</p>
                </div>
            )
        },
        {
            id: 'authenticity-charter',
            date: 'Avril 2026',
            title: 'Charte de Qualité & d\'Authenticité des Avis',
            subtitle: 'Mise à jour des règles de publication',
            icon: <FileText size={24} />,
            accentColor: '#047857',
            content: (
                <div style={{ lineHeight: 1.7, color: '#334155' }}>
                    <p style={{ marginTop: 0 }}>
                        En tant que membre de la communauté AchatAvis, vous contribuez à aider les consommateurs
                        à découvrir des commerces et artisans de qualité dans leur quartier. Cette mission repose
                        sur un principe fondamental : <strong>la sincérité</strong>.
                    </p>
                    <p>
                        Nous avons identifié des avis qui ne reflètent pas une expérience ou une observation réelle.
                        Ces contenus nuisent à la crédibilité de toute la communauté et exposent leurs auteurs à des risques.
                    </p>

                    <div style={{
                        padding: '1rem 1.25rem',
                        background: '#f0fdf4',
                        borderLeft: '4px solid #047857',
                        borderRadius: '0 8px 8px 0',
                        margin: '1.5rem 0',
                        fontWeight: 600,
                        color: '#14532d'
                    }}>
                        Règle n°1 : Ne publiez que ce que vous avez réellement vécu, vu ou constaté par vous-même.
                    </div>

                    <h3 style={{ color: '#047857', fontSize: '1.05rem', marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={20} /> Bonnes pratiques – Avis acceptés
                    </h3>

                    {[
                        {
                            title: 'Vous avez testé le service ou visité l\'établissement',
                            body: 'Partagez votre vraie expérience : accueil, qualité de la prestation, ambiance, rapport qualité/prix. C\'est le meilleur type d\'avis.',
                            example: '« J\'ai fait appel à ce serrurier pour un changement de serrure. Intervention en 30 min, tarif conforme au devis. Je recommande. »'
                        },
                        {
                            title: 'Vous êtes passé devant le commerce (sans y entrer)',
                            body: 'Décrivez uniquement ce que vous avez vu de l\'extérieur : façade, vitrine, propreté, emplacement, accessibilité.',
                            example: '« Je passe régulièrement devant cette boulangerie. La vitrine est toujours soignée et bien achalandée. Bon emplacement, facile d\'accès. »'
                        },
                        {
                            title: 'Vous avez consulté leur présence en ligne',
                            body: 'Vous pouvez partager votre impression basée sur leur site web, leurs réseaux sociaux ou leurs photos Google — à condition de le préciser clairement.',
                            example: '« D\'après leurs photos Instagram et leur fiche Google, l\'endroit a l\'air lumineux et bien aménagé. Leur communication est pro, ça donne envie de tester. »'
                        },
                        {
                            title: 'Vous connaissez l\'entreprise de réputation',
                            body: 'Si des proches vous l\'ont recommandée ou si elle a une bonne notoriété locale, dites-le honnêtement.',
                            example: '« Plusieurs personnes de mon entourage m\'ont recommandé ce plombier. Je n\'ai pas encore fait appel à lui mais les retours sont très positifs. »'
                        }
                    ].map((item, i) => (
                        <div key={i} style={{
                            padding: '1rem 1.25rem',
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '8px',
                            margin: '0.75rem 0'
                        }}>
                            <div style={{ fontWeight: 700, color: '#14532d', marginBottom: '0.5rem' }}>
                                ✓ {item.title}
                            </div>
                            <p style={{ margin: '0 0 0.5rem', color: '#166534' }}>{item.body}</p>
                            <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.9rem', color: '#065f46' }}>
                                Ex : {item.example}
                            </p>
                        </div>
                    ))}

                    <h3 style={{ color: '#b91c1c', fontSize: '1.05rem', marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <XCircle size={20} /> Pratiques interdites – Tolérance zéro
                    </h3>

                    {[
                        {
                            title: 'Inventer une expérience fictive',
                            body: 'Ne décrivez jamais un service comme si vous l\'aviez utilisé alors que ce n\'est pas le cas. C\'est de la fausse représentation.',
                            example: '« Super déménagement, équipe ponctuelle et cartons bien protégés ! » → alors que vous n\'avez jamais fait appel à eux.'
                        },
                        {
                            title: 'Décrire l\'intérieur d\'un lieu sans y être entré',
                            body: 'Si vous n\'avez pas franchi la porte, ne parlez pas de l\'ambiance intérieure, du personnel ou de la décoration.',
                            example: '« Super endroit, lumineux, personnel souriant, très bon café » → alors que vous n\'y êtes jamais allé.'
                        },
                        {
                            title: 'Ajouter des détails fictifs (noms, prix, dates)',
                            body: 'Ne fabriquez pas de faux éléments pour rendre l\'avis plus réaliste. Pas de faux prénoms, pas de faux montants, pas de fausses dates de visite.',
                            example: '« J\'ai payé 45 € pour une coupe chez Karim, il était au top » → alors que rien de cela n\'est réel.'
                        },
                        {
                            title: 'Copier ou reformuler l\'avis d\'une autre personne',
                            body: 'Chaque contribution doit être personnelle, unique et rédigée par vous. Le copier-coller est interdit.',
                            example: null
                        },
                        {
                            title: 'Utiliser des formulations trompeuses',
                            body: 'Ne laissez jamais croire au lecteur que vous avez testé un service si ce n\'est pas le cas. Si votre avis est basé sur une impression en ligne ou un passage devant le commerce, précisez-le.',
                            example: '« J\'y vais souvent, toujours satisfait » → alors que vous n\'y êtes jamais allé.'
                        }
                    ].map((item, i) => (
                        <div key={i} style={{
                            padding: '1rem 1.25rem',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            margin: '0.75rem 0'
                        }}>
                            <div style={{ fontWeight: 700, color: '#7f1d1d', marginBottom: '0.5rem' }}>
                                ✗ {item.title}
                            </div>
                            <p style={{ margin: item.example ? '0 0 0.5rem' : 0, color: '#991b1b' }}>{item.body}</p>
                            {item.example && (
                                <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.9rem', color: '#7f1d1d' }}>
                                    Ex interdit : {item.example}
                                </p>
                            )}
                        </div>
                    ))}

                    <div style={{
                        padding: '1rem 1.25rem',
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: '8px',
                        margin: '2rem 0 1rem',
                        color: '#78350f'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem', fontWeight: 700 }}>
                            <AlertTriangle size={18} /> Rappel important
                        </div>
                        <p style={{ margin: 0 }}>
                            La publication d'avis contenant des informations fausses peut constituer une
                            <strong> pratique commerciale trompeuse au sens du Code de la consommation</strong>.
                            Tout guide en infraction s'expose à la suspension immédiate de son compte,
                            à la suppression de ses avis, et le cas échéant, à un signalement aux autorités compétentes.
                        </p>
                    </div>
                </div>
            )
        }
    ];

    return (
        <DashboardLayout title="Communiqués officiels">
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem' }}>
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #0369a1, #0284c7)',
                    color: 'white',
                    padding: '2rem',
                    borderRadius: '16px',
                    marginBottom: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem'
                }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <Megaphone size={32} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
                            Communiqués officiels
                        </h1>
                        <p style={{ margin: '0.4rem 0 0', opacity: 0.9, fontSize: '0.95rem' }}>
                            Annonces, mises à jour des règles et informations importantes
                            de l'équipe AchatAvis. Merci de lire attentivement.
                        </p>
                    </div>
                </div>

                {/* Communiques list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {communiques.map(c => {
                        const isOpen = expanded === c.id;
                        return (
                            <div
                                key={c.id}
                                style={{
                                    background: 'white',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                    border: `2px solid ${isOpen ? c.accentColor : '#e2e8f0'}`,
                                    overflow: 'hidden',
                                    transition: 'border-color 0.2s'
                                }}
                            >
                                <button
                                    onClick={() => toggle(c.id)}
                                    style={{
                                        width: '100%',
                                        padding: '1.25rem 1.5rem',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        textAlign: 'left'
                                    }}
                                >
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '12px',
                                        background: `${c.accentColor}15`,
                                        color: c.accentColor,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        {c.icon}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            color: c.accentColor,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            marginBottom: '2px'
                                        }}>
                                            Communiqué officiel · {c.date}
                                        </div>
                                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>
                                            {c.title}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                                            {c.subtitle}
                                        </div>
                                    </div>
                                    {isOpen
                                        ? <ChevronUp size={20} style={{ color: '#64748b' }} />
                                        : <ChevronDown size={20} style={{ color: '#64748b' }} />
                                    }
                                </button>

                                {isOpen && (
                                    <div style={{
                                        padding: '0 1.5rem 1.5rem',
                                        borderTop: '1px solid #f1f5f9'
                                    }}>
                                        <div style={{ paddingTop: '1.25rem' }}>
                                            {c.content}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default CommuniquesPage;
