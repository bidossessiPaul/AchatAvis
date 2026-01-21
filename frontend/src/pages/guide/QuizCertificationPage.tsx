import React, { useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useAntiDetectionStore } from '../../context/antiDetectionStore';
import { useAuthStore } from '../../context/authStore';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight,
    CheckCircle,
    Trophy,
    AlertTriangle,
    Award,
    Shield
} from 'lucide-react';
import { showError } from '../../utils/Swal';

const QUESTIONS = [
    {
        id: 1,
        question: "Quelle méthode de connexion est impérative pour garantir l'anonymat de l'IP ?",
        options: [
            { id: 'A', text: "WiFi public d'un café" },
            { id: 'B', text: "Connexion 4G/5G mobile personnelle" },
            { id: 'C', text: "WiFi domestique avec VPN actif" },
            { id: 'D', text: "Réseau partagé d'un hôtel" }
        ],
        correct: 'B'
    },
    {
        id: 2,
        question: "Quel comportement 'Organique' Google privilégie-t-il sur un compte Local Guide ?",
        options: [
            { id: 'A', text: "Poster uniquement des avis sur des fiches rémunérées" },
            { id: 'B', text: "Avoir une activité diversifiée (YouTube, Maps, recherches réelles)" },
            { id: 'C', text: "Créer un nouveau compte pour chaque avis posté" },
            { id: 'D', text: "Ne jamais utiliser les autres services Google" }
        ],
        correct: 'B'
    },
    {
        id: 3,
        question: "Pour un secteur 'Critique' (ex: Serrurerie), quel est l'espacement minimal recommandé entre deux avis ?",
        options: [
            { id: 'A', text: "24 heures" },
            { id: 'B', text: "7 jours" },
            { id: 'C', text: "15 à 30 jours" },
            { id: 'D', text: "Aucun délai particulier" }
        ],
        correct: 'C'
    },
    {
        id: 4,
        question: "Quelle est la limite quotidienne stricte d'avis par compte Gmail pour éviter le 'Flagging' ?",
        options: [
            { id: 'A', text: "1 avis par jour" },
            { id: 'B', text: "2 avis maximum par jour" },
            { id: 'C', text: "5 avis par jour" },
            { id: 'D', text: "10 avis par jour" }
        ],
        correct: 'B'
    },
    {
        id: 5,
        question: "Concernant le texte de l'avis, quelle pratique est considérée comme un 'Pattern' suspect ?",
        options: [
            { id: 'A', text: "Écrire un texte de plus de 200 caractères" },
            { id: 'B', text: "Copier-coller le même modèle de texte sur plusieurs fiches" },
            { id: 'C', text: "Utiliser un ton naturel et personnalisé" },
            { id: 'D', text: "Ajouter des détails sur l'accueil reçus" }
        ],
        correct: 'B'
    },
    {
        id: 6,
        question: "Quel rôle joue la géolocalisation GPS dans la validation d'un avis par Google ?",
        options: [
            { id: 'A', text: "Aucun, seule l'adresse IP compte" },
            { id: 'B', text: "Elle confirme la présence physique à proximité de l'établissement" },
            { id: 'C', text: "Elle sert uniquement pour les publicités locales" },
            { id: 'D', text: "Elle est désactivée par défaut par Google" }
        ],
        correct: 'B'
    },
    {
        id: 7,
        question: "Avant de soumettre un avis, quelle interaction avec la fiche Google est recommandée ?",
        options: [
            { id: 'A', text: "Cliquer directement sur 'Donner un avis'" },
            { id: 'B', text: "Consulter les photos, lire d'autres avis et simuler un intérêt réel" },
            { id: 'C', text: "Signaler les avis négatifs des concurrents" },
            { id: 'D', text: "Rafraîchir la page 50 fois" }
        ],
        correct: 'B'
    },
    {
        id: 8,
        question: "Un compte 'Local Guide' de haut niveau (Niveau 4+) a quel avantage principal ?",
        options: [
            { id: 'A', text: "Il peut poster des avis sans aucune limite" },
            { id: 'B', text: "Ses avis ont un poids supérieur et sont moins susceptibles d'être supprimés" },
            { id: 'C', text: "Il gagne de l'argent directement de Google" },
            { id: 'D', text: "Il peut supprimer les avis des autres" }
        ],
        correct: 'B'
    },
    {
        id: 9,
        question: "Quelle est l'importance des métadonnées des photos jointes à un avis ?",
        options: [
            { id: 'A', text: "Elles n'existent pas sur les fichiers mobiles" },
            { id: 'B', text: "Elles prouvent le lieu et la date de la prise de vue réelle" },
            { id: 'C', text: "Elles ralentissent le chargement de la page" },
            { id: 'D', text: "Elles sont automatiquement supprimées par Google" }
        ],
        correct: 'B'
    },
    {
        id: 10,
        question: "Que signifie un score de conformité Guide inférieur à 50% ?",
        options: [
            { id: 'A', text: "Un simple avertissement sans conséquence" },
            { id: 'B', text: "Une suspension probable des fiches et des gains" },
            { id: 'C', text: "Un bonus de visibilité pour s'améliorer" },
            { id: 'D', text: "Une mise à jour automatique vers le niveau suivant" }
        ],
        correct: 'B'
    }
];

export const QuizCertificationPage: React.FC = () => {
    const { user } = useAuthStore();
    const { submitQuiz } = useAntiDetectionStore();
    const navigate = useNavigate();

    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [isFinished, setIsFinished] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAnswer = (questionId: number, optionId: string) => {
        setAnswers({ ...answers, [questionId]: optionId });
    };

    const nextStep = () => {
        if (currentStep < QUESTIONS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        let correctCount = 0;
        QUESTIONS.forEach(q => {
            if (answers[q.id] === q.correct) correctCount++;
        });

        const score = Math.round((correctCount / QUESTIONS.length) * 100);

        try {
            if (user) {
                const data = await submitQuiz(user.id, score);
                setResult(data);
                setIsFinished(true);
            }
        } catch (error) {
            showError('Erreur', "Erreur lors de la soufiche du protocole");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <DashboardLayout title="Protocoles de Certification">
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                {!isFinished ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                            background: '#ffffff',
                            padding: '3rem',
                            borderRadius: '1.25rem',
                            boxShadow: '0 40px 100px -20px rgba(0,0,0,0.1)',
                            border: '1px solid #f1f5f9'
                        }}
                    >
                        {/* Header Quiz */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ background: '#f1f5f9', padding: '0.75rem', borderRadius: '0.75rem', color: '#64748b' }}>
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Examen de Sécurité</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Module Anti-Détection</div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>{currentStep + 1} / {QUESTIONS.length}</div>
                                <div style={{ width: '120px', height: '6px', background: '#f1f5f9', borderRadius: '3px', marginTop: '0.5rem', overflow: 'hidden' }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${((currentStep + 1) / QUESTIONS.length) * 100}%` }}
                                        style={{ height: '100%', background: '#38bdf8' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '2.5rem', lineHeight: '1.5' }}>
                                    {QUESTIONS[currentStep].question}
                                </h3>

                                <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '3rem' }}>
                                    {QUESTIONS[currentStep].options.map(option => (
                                        <div
                                            key={option.id}
                                            onClick={() => handleAnswer(QUESTIONS[currentStep].id, option.id)}
                                            style={{
                                                padding: '1.25rem 1.5rem',
                                                borderRadius: '0.75rem',
                                                border: `1.5px solid ${answers[QUESTIONS[currentStep].id] === option.id ? '#0f172a' : '#f1f5f9'}`,
                                                background: answers[QUESTIONS[currentStep].id] === option.id ? '#f8fafc' : 'white',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1.25rem'
                                            }}
                                        >
                                            <div style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                border: `1.5px solid ${answers[QUESTIONS[currentStep].id] === option.id ? '#0f172a' : '#e2e8f0'}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.7rem',
                                                fontWeight: 900,
                                                color: answers[QUESTIONS[currentStep].id] === option.id ? '#0f172a' : '#94a3b8',
                                                background: answers[QUESTIONS[currentStep].id] === option.id ? '#f8fafc' : 'white'
                                            }}>
                                                {option.id}
                                            </div>
                                            <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.9375rem' }}>{option.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        <button
                            disabled={!answers[QUESTIONS[currentStep].id] || isSubmitting}
                            onClick={nextStep}
                            style={{
                                width: '100%',
                                padding: '1.25rem',
                                borderRadius: '0.75rem',
                                border: 'none',
                                background: !answers[QUESTIONS[currentStep].id] ? '#f1f5f9' : '#0f172a',
                                color: !answers[QUESTIONS[currentStep].id] ? '#94a3b8' : 'white',
                                fontWeight: 800,
                                fontSize: '1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.75rem',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {isSubmitting ? 'Traitement...' : (currentStep === QUESTIONS.length - 1 ? 'Finaliser le Protocole' : 'Confirmer la Réponse')}
                            {!isSubmitting && <ArrowRight size={18} />}
                        </button>
                    </motion.div>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        {result?.passed ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{ background: 'white', padding: '4rem 3rem', borderRadius: '1.25rem', boxShadow: '0 40px 100px -20px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}
                            >
                                <div style={{
                                    width: '100px',
                                    height: '100px',
                                    background: '#f0fdf4',
                                    color: '#FF991F',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 2rem'
                                }}>
                                    <Trophy size={48} />
                                </div>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', marginBottom: '1rem' }}>Accréditation Validée</h2>
                                <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '3rem', maxWidth: '500px', margin: '0 auto 3rem' }}>
                                    Protocole de sécurité maîtrisé avec succès. Score final : <strong style={{ color: '#0f172a' }}>{result.score}%</strong>.
                                </p>

                                <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '1rem', marginBottom: '3rem', textAlign: 'left', border: '1px solid #f1f5f9' }}>
                                    <h4 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <Award size={18} color="#0f172a" /> Privilèges Débloqués
                                    </h4>
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#475569', fontSize: '0.9rem', fontWeight: 600 }}>
                                            <CheckCircle size={16} color="#FF991F" /> Accès prioritaire secteurs critiques
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#475569', fontSize: '0.9rem', fontWeight: 600 }}>
                                            <CheckCircle size={16} color="#FF991F" /> Multiplicateur de gains actif (+50%)
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#475569', fontSize: '0.9rem', fontWeight: 600 }}>
                                            <CheckCircle size={16} color="#FF991F" /> Badge Expertise de Sécurité
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate('/guide')}
                                    style={{
                                        width: '100%',
                                        padding: '1.25rem',
                                        borderRadius: '0.75rem',
                                        border: 'none',
                                        background: '#0f172a',
                                        color: 'white',
                                        fontWeight: 800,
                                        fontSize: '1rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    Accéder au Registre des fiches
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{ background: 'white', padding: '4rem 3rem', borderRadius: '1.25rem', boxShadow: '0 40px 100px -20px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}
                            >
                                <div style={{
                                    width: '100px',
                                    height: '100px',
                                    background: '#fff1f2',
                                    color: '#ef4444',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 2rem'
                                }}>
                                    <AlertTriangle size={48} />
                                </div>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', marginBottom: '1rem' }}>Échec de l'Accréditation</h2>
                                <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '1rem' }}>
                                    Résultat : <strong style={{ color: '#ef4444' }}>{result.score}%</strong>. Le standard de sécurité exige au moins 80%.
                                </p>
                                <p style={{ color: '#94a3b8', fontSize: '0.9375rem', marginBottom: '3rem', lineHeight: 1.6 }}>
                                    Veuillez consulter les protocoles approfondis avant de soumettre une nouvelle demande de certification.
                                </p>
                                <button
                                    onClick={() => navigate('/guide/anti-detection')}
                                    style={{
                                        width: '100%',
                                        padding: '1.25rem',
                                        borderRadius: '0.75rem',
                                        border: 'none',
                                        background: '#0f172a',
                                        color: 'white',
                                        fontWeight: 800,
                                        fontSize: '1rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Consulter les Protocoles
                                </button>
                            </motion.div>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};
