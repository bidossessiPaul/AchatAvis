import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GraduationCap,
    PlayCircle,
    CheckCircle2,
    ArrowRight,
    AlertTriangle,
    Trophy,
    LogOut,
    RotateCcw
} from 'lucide-react';
import { useAuthStore } from '../../context/authStore';
import { guideService } from '../../services/guideService';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { showError } from '../../utils/Swal';
import './GuideTraining.css';

interface TrainingVideo {
    id: number;
    title: string;
    description: string | null;
    video_url: string;
    position: number;
}

interface TrainingQuestion {
    id: number;
    video_id: number | null;
    question: string;
    options: { id: string; text: string }[];
}

interface QuizResult {
    score: number;
    passed: boolean;
    correctCount: number;
    totalQuestions: number;
    passingScore: number;
    trainingCompleted: boolean;
}

// 'video'       : vidéo à gauche + questions de la vidéo à droite
// 'videoResult' : score de la vidéo (>= 80% → suivante, sinon revoir)
// 'quiz'        : fallback QCM global tant qu'aucune vidéo n'est en ligne
// 'completed'   : formation terminée → vérification d'identité
type Step = 'video' | 'videoResult' | 'quiz' | 'completed';

export const GuideTraining: React.FC = () => {
    const { user, logout, checkAuth } = useAuthStore();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(true);
    const [videos, setVideos] = useState<TrainingVideo[]>([]);
    const [questions, setQuestions] = useState<TrainingQuestion[]>([]);
    const [passingScore, setPassingScore] = useState(80);

    const [step, setStep] = useState<Step>('video');
    const [videoIndex, setVideoIndex] = useState(0);
    // Vidéos dont la lecture est terminée — condition pour pouvoir valider ses réponses
    const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set());

    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<QuizResult | null>(null);
    const [finalScore, setFinalScore] = useState<number | null>(null);
    const [isContinuing, setIsContinuing] = useState(false);

    // Fallback QCM global (aucune vidéo en ligne) : question par question
    const [questionIndex, setQuestionIndex] = useState(0);

    useEffect(() => {
        loadContent();
    }, []);

    const loadContent = async () => {
        try {
            const [content, status] = await Promise.all([
                guideService.getTrainingContent(),
                guideService.getTrainingStatus(),
            ]);
            setVideos(content.videos);
            setQuestions(content.questions);
            setPassingScore(content.passingScore);

            if (status.completed) {
                setFinalScore(status.score);
                setStep('completed');
                return;
            }

            if (content.videos.length === 0) {
                // Pas encore de vidéos en ligne : QCM global directement
                setStep('quiz');
                return;
            }

            // Reprend la formation à la première vidéo non encore validée
            const firstPending = content.videos.findIndex(v => !status.passedVideoIds.includes(v.id));
            setVideoIndex(firstPending === -1 ? content.videos.length - 1 : firstPending);
        } catch (e) {
            console.error('Erreur chargement formation:', e);
            showError('Erreur', 'Impossible de charger la formation. Réessayez.');
        } finally {
            setIsLoading(false);
        }
    };

    const currentVideo = videos[videoIndex];
    const currentVideoWatched = currentVideo ? watchedIds.has(currentVideo.id) : false;
    const videoQuestions = currentVideo ? questions.filter(q => q.video_id === currentVideo.id) : [];
    const answeredCount = videoQuestions.filter(q => answers[q.id]).length;
    const allAnswered = videoQuestions.length > 0 && answeredCount === videoQuestions.length;
    const isLastVideo = videoIndex === videos.length - 1;

    const generalQuestions = questions.filter(q => q.video_id === null);
    const currentQuestion = generalQuestions[questionIndex];
    const isLastQuestion = questionIndex === generalQuestions.length - 1;

    const handleVideoEnded = () => {
        if (!currentVideo) return;
        setWatchedIds(prev => new Set(prev).add(currentVideo.id));
    };

    const handleAnswer = (questionId: number, optionId: string) => {
        setAnswers({ ...answers, [questionId]: optionId });
    };

    // Valide les réponses de la vidéo en cours : >= 80% → suivante, sinon revoir
    const submitCurrentVideo = async () => {
        if (!currentVideo) return;
        setIsSubmitting(true);
        try {
            const videoAnswers: Record<number, string> = {};
            videoQuestions.forEach(q => { videoAnswers[q.id] = answers[q.id]; });

            const res = await guideService.submitTrainingVideoQuiz(currentVideo.id, videoAnswers);
            setResult(res);
            if (res.trainingCompleted) {
                setFinalScore(res.score);
            }
            setStep('videoResult');
        } catch (e: any) {
            showError('Erreur', e?.response?.data?.error || 'Impossible de valider vos réponses');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Vidéo sans question : la fin du visionnage suffit pour passer à la suivante
    const skipToNextVideo = () => {
        if (!isLastVideo) {
            setVideoIndex(videoIndex + 1);
        }
    };

    const goToNextVideo = () => {
        setResult(null);
        if (result?.trainingCompleted) {
            setStep('completed');
            return;
        }
        setVideoIndex(videoIndex + 1);
        setStep('video');
    };

    // Échec : il revoit la vidéo et retente ses questions
    const rewatchVideo = () => {
        if (!currentVideo) return;
        setWatchedIds(prev => {
            const next = new Set(prev);
            next.delete(currentVideo.id);
            return next;
        });
        setAnswers(prev => {
            const next = { ...prev };
            videoQuestions.forEach(q => { delete next[q.id]; });
            return next;
        });
        setResult(null);
        setStep('video');
    };

    // Fallback QCM global
    const nextQuestion = async () => {
        if (!isLastQuestion) {
            setQuestionIndex(questionIndex + 1);
            return;
        }
        setIsSubmitting(true);
        try {
            const res = await guideService.submitTrainingQuiz(answers);
            setResult(res);
            if (res.trainingCompleted) {
                setFinalScore(res.score);
                setStep('completed');
            } else {
                setStep('videoResult');
            }
        } catch (e: any) {
            showError('Erreur', e?.response?.data?.error || 'Impossible de soumettre le QCM');
        } finally {
            setIsSubmitting(false);
        }
    };

    const restartQuiz = () => {
        setAnswers({});
        setQuestionIndex(0);
        setResult(null);
        setStep('quiz');
    };

    // Formation terminée : rafraîchit le user puis passe à la vérif d'identité
    const continueToNextStep = async () => {
        setIsContinuing(true);
        try {
            await checkAuth(true);
            navigate('/identity-verification', { replace: true });
        } finally {
            setIsContinuing(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        window.location.href = '/login';
    };

    if (isLoading) {
        return <LoadingOverlay text="Chargement de la formation..." />;
    }

    const primaryButtonStyle = (enabled: boolean): React.CSSProperties => ({
        width: '100%',
        padding: '0.9rem',
        background: enabled ? 'linear-gradient(135deg, #0369a1, #0284c7)' : '#94a3b8',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '1rem',
        fontWeight: 700,
        cursor: enabled ? 'pointer' : 'not-allowed',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.6rem'
    });

    const renderQuestionCard = (q: TrainingQuestion, index: number) => (
        <div
            key={q.id}
            style={{
                border: `1px solid ${answers[q.id] ? '#bfdbfe' : '#e2e8f0'}`,
                background: answers[q.id] ? '#f8fbff' : 'white',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '0.75rem'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div style={{
                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                    background: answers[q.id] ? '#0284c7' : '#e2e8f0',
                    color: answers[q.id] ? 'white' : '#64748b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 700
                }}>
                    {answers[q.id] ? <CheckCircle2 size={13} /> : index + 1}
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.45 }}>
                    {q.question}
                </p>
            </div>
            <div style={{ display: 'grid', gap: '0.4rem' }}>
                {q.options.map(option => {
                    const selected = answers[q.id] === option.id;
                    return (
                        <div
                            key={option.id}
                            onClick={() => handleAnswer(q.id, option.id)}
                            style={{
                                padding: '0.55rem 0.75rem',
                                borderRadius: '8px',
                                border: `1.5px solid ${selected ? '#0284c7' : '#e2e8f0'}`,
                                background: selected ? '#eff6ff' : 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <span style={{
                                width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                                border: `1.5px solid ${selected ? '#0284c7' : '#cbd5e1'}`,
                                background: selected ? '#0284c7' : 'white',
                                color: selected ? 'white' : '#64748b',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.6rem', fontWeight: 700
                            }}>
                                {option.id}
                            </span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', lineHeight: 1.4 }}>
                                {option.text}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const isVideoMode = step === 'video' && !!currentVideo;

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            background: 'linear-gradient(135deg, #f0f4f8 0%, #e6eef7 100%)',
            padding: '2rem 1rem'
        }}>
            {/* Logo AchatAvis */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <img src="/logo.png" alt="AchatAvis" style={{ height: '56px', width: 'auto', objectFit: 'contain' }} />
            </div>

            <div style={{
                maxWidth: isVideoMode ? '1040px' : '680px',
                width: '100%',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
                overflow: 'hidden',
                transition: 'max-width 0.3s ease'
            }}>
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #0369a1, #0284c7)',
                    color: 'white',
                    padding: '1.75rem 2rem',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.2)',
                        margin: '0 auto 0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <GraduationCap size={28} />
                    </div>
                    <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>
                        Formation obligatoire
                    </h1>
                    <p style={{ margin: '0.5rem 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
                        Bonjour {user?.full_name || user?.email} — regardez chaque vidéo et répondez aux questions ({passingScore}% minimum)
                    </p>

                    {/* Progression des vidéos */}
                    {videos.length > 0 && step !== 'completed' && (
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginTop: '1rem' }}>
                            {videos.map((v, i) => (
                                <div
                                    key={v.id}
                                    style={{
                                        width: '34px',
                                        height: '5px',
                                        borderRadius: '3px',
                                        background: i < videoIndex ? '#4ade80' : i === videoIndex ? 'white' : 'rgba(255,255,255,0.3)'
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div style={{ padding: '1.5rem 2rem 2rem' }}>
                    {/* MODE VIDÉO : vidéo à gauche, questions de la vidéo à droite */}
                    {isVideoMode && (
                        <motion.div
                            key={currentVideo.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
                                    Vidéo {videoIndex + 1} / {videos.length}
                                </div>
                                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0.2rem 0 0' }}>
                                    {currentVideo.title}
                                </h2>
                            </div>

                            <div className="gt-columns">
                                {/* Colonne vidéo */}
                                <div className="gt-video-col">
                                    <video
                                        key={currentVideo.video_url}
                                        src={currentVideo.video_url}
                                        controls
                                        controlsList="nodownload"
                                        onEnded={handleVideoEnded}
                                        style={{ width: '100%', display: 'block', background: '#0f172a', borderRadius: '12px' }}
                                    />
                                    {currentVideo.description && (
                                        <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0.85rem 0 0', lineHeight: 1.5 }}>
                                            {currentVideo.description}
                                        </p>
                                    )}
                                    {!currentVideoWatched && (
                                        <div style={{
                                            background: '#fffbeb',
                                            border: '1px solid #fde68a',
                                            borderRadius: '12px',
                                            padding: '0.75rem 1rem',
                                            marginTop: '0.85rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.6rem',
                                            fontSize: '0.82rem',
                                            color: '#92400e',
                                            fontWeight: 600
                                        }}>
                                            <PlayCircle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                                            Regardez la vidéo jusqu'à la fin et répondez aux questions à droite
                                        </div>
                                    )}
                                </div>

                                {/* Colonne questions : toutes visibles dès le début */}
                                <div className="gt-questions-col">
                                    {videoQuestions.length > 0 ? (
                                        <>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: '0.75rem'
                                            }}>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                                                    Questions sur cette vidéo
                                                </span>
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    fontWeight: 700,
                                                    padding: '0.2rem 0.6rem',
                                                    borderRadius: '1rem',
                                                    background: allAnswered ? '#dcfce7' : '#eff6ff',
                                                    color: allAnswered ? '#166534' : '#1e40af'
                                                }}>
                                                    {answeredCount} / {videoQuestions.length}
                                                </span>
                                            </div>
                                            {videoQuestions.map((q, i) => renderQuestionCard(q, i))}
                                        </>
                                    ) : (
                                        <div style={{
                                            border: '1px dashed #cbd5e1',
                                            borderRadius: '12px',
                                            padding: '1.5rem',
                                            textAlign: 'center',
                                            color: '#64748b',
                                            fontSize: '0.85rem'
                                        }}>
                                            Aucune question pour cette vidéo — regardez-la jusqu'à la fin pour continuer.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ marginTop: '1.25rem' }}>
                                {videoQuestions.length > 0 ? (
                                    <button
                                        disabled={!currentVideoWatched || !allAnswered || isSubmitting}
                                        onClick={submitCurrentVideo}
                                        style={primaryButtonStyle(currentVideoWatched && allAnswered && !isSubmitting)}
                                    >
                                        {isSubmitting ? 'Correction en cours...' : 'Valider mes réponses'}
                                        {!isSubmitting && <ArrowRight size={16} />}
                                    </button>
                                ) : (
                                    <button
                                        disabled={!currentVideoWatched || isLastVideo}
                                        onClick={skipToNextVideo}
                                        style={primaryButtonStyle(currentVideoWatched && !isLastVideo)}
                                    >
                                        Vidéo suivante <ArrowRight size={16} />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* RÉSULTAT D'UNE VIDÉO (ou du QCM fallback raté) */}
                    {step === 'videoResult' && result && (
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{ textAlign: 'center', padding: '1rem 0' }}
                        >
                            <div style={{
                                width: '90px', height: '90px', borderRadius: '50%',
                                background: result.passed ? '#dcfce7' : '#fee2e2',
                                color: result.passed ? '#059669' : '#dc2626',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1.25rem'
                            }}>
                                {result.passed ? <CheckCircle2 size={42} /> : <AlertTriangle size={42} />}
                            </div>

                            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                                {result.passed
                                    ? (currentVideo ? 'Vidéo validée !' : 'QCM validé !')
                                    : 'Score insuffisant'}
                            </h2>

                            <div style={{
                                fontSize: '2.4rem', fontWeight: 800,
                                color: result.passed ? '#059669' : '#dc2626',
                                marginBottom: '0.25rem'
                            }}>
                                {result.score}%
                            </div>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
                                {result.correctCount} bonne{result.correctCount > 1 ? 's' : ''} réponse{result.correctCount > 1 ? 's' : ''} sur {result.totalQuestions} — minimum requis : {result.passingScore}%
                            </p>

                            {result.passed ? (
                                <button onClick={goToNextVideo} style={primaryButtonStyle(true)}>
                                    {result.trainingCompleted ? 'Terminer la formation' : 'Vidéo suivante'} <ArrowRight size={16} />
                                </button>
                            ) : (
                                <>
                                    <div style={{
                                        background: '#fef2f2',
                                        border: '1px solid #fecaca',
                                        borderRadius: '12px',
                                        padding: '1rem',
                                        marginBottom: '1.25rem',
                                        fontSize: '0.85rem',
                                        color: '#7f1d1d',
                                        textAlign: 'left'
                                    }}>
                                        <strong style={{ color: '#b91c1c' }}>Le minimum requis est de {result.passingScore}%.</strong>
                                        <p style={{ margin: '0.5rem 0 0' }}>
                                            {currentVideo
                                                ? 'Revoyez la vidéo puis répondez à nouveau aux questions.'
                                                : 'Recommencez le QCM pour valider votre formation.'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={currentVideo && videos.length > 0 ? rewatchVideo : restartQuiz}
                                        style={primaryButtonStyle(true)}
                                    >
                                        <RotateCcw size={16} /> {currentVideo && videos.length > 0 ? 'Revoir la vidéo' : 'Recommencer le QCM'}
                                    </button>
                                </>
                            )}
                        </motion.div>
                    )}

                    {/* FALLBACK : QCM global question par question (aucune vidéo en ligne) */}
                    {step === 'quiz' && currentQuestion && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                                        Question {questionIndex + 1} / {generalQuestions.length}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                                        Minimum requis : {passingScore}%
                                    </div>
                                </div>
                                <div style={{ width: '140px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                    <motion.div
                                        animate={{ width: `${((questionIndex + 1) / generalQuestions.length) * 100}%` }}
                                        style={{ height: '100%', background: '#0284c7' }}
                                    />
                                </div>
                            </div>

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentQuestion.id}
                                    initial={{ opacity: 0, x: 16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -16 }}
                                    transition={{ duration: 0.18 }}
                                >
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                                        {currentQuestion.question}
                                    </h3>

                                    <div style={{ display: 'grid', gap: '0.65rem', marginBottom: '1.75rem' }}>
                                        {currentQuestion.options.map(option => {
                                            const selected = answers[currentQuestion.id] === option.id;
                                            return (
                                                <div
                                                    key={option.id}
                                                    onClick={() => handleAnswer(currentQuestion.id, option.id)}
                                                    style={{
                                                        padding: '1rem 1.25rem', borderRadius: '12px',
                                                        border: `1.5px solid ${selected ? '#0284c7' : '#e2e8f0'}`,
                                                        background: selected ? '#eff6ff' : 'white',
                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                                                        border: `1.5px solid ${selected ? '#0284c7' : '#cbd5e1'}`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.7rem', fontWeight: 700,
                                                        color: selected ? 'white' : '#64748b',
                                                        background: selected ? '#0284c7' : 'white'
                                                    }}>
                                                        {option.id}
                                                    </div>
                                                    <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>{option.text}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            </AnimatePresence>

                            <button
                                disabled={!answers[currentQuestion.id] || isSubmitting}
                                onClick={nextQuestion}
                                style={primaryButtonStyle(!!answers[currentQuestion.id] && !isSubmitting)}
                            >
                                {isSubmitting ? 'Correction en cours...' : isLastQuestion ? 'Valider mes réponses' : 'Question suivante'}
                                {!isSubmitting && <ArrowRight size={16} />}
                            </button>
                        </motion.div>
                    )}

                    {/* Cas limite : aucun contenu configuré */}
                    {step === 'quiz' && !currentQuestion && (
                        <div style={{
                            background: '#fffbeb',
                            border: '1px solid #fde68a',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            textAlign: 'center'
                        }}>
                            <AlertTriangle size={40} style={{ color: '#d97706', marginBottom: '0.75rem' }} />
                            <h3 style={{ margin: 0, color: '#92400e', fontSize: '1.1rem' }}>
                                La formation n'est pas encore disponible
                            </h3>
                            <p style={{ margin: '0.75rem 0 0', color: '#78350f', fontSize: '0.9rem' }}>
                                Revenez un peu plus tard.
                            </p>
                        </div>
                    )}

                    {/* FORMATION TERMINÉE */}
                    {step === 'completed' && (
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{ textAlign: 'center', padding: '1rem 0' }}
                        >
                            <div style={{
                                width: '96px', height: '96px', borderRadius: '50%',
                                background: '#dcfce7',
                                color: '#059669',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1.25rem'
                            }}>
                                <Trophy size={44} />
                            </div>

                            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                                Formation validée !
                            </h2>

                            {finalScore !== null && (
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#059669', marginBottom: '0.25rem' }}>
                                    {finalScore}%
                                </div>
                            )}
                            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
                                Bravo, vous maîtrisez les règles essentielles. Dernière étape : la vérification de votre identité.
                            </p>

                            <button onClick={continueToNextStep} disabled={isContinuing} style={primaryButtonStyle(!isContinuing)}>
                                {isContinuing ? 'Chargement...' : "Continuer vers la vérification d'identité"} <ArrowRight size={16} />
                            </button>
                        </motion.div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1rem 2rem',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Besoin d'aide ? Contactez le support AchatAvis
                    </span>
                    <button
                        onClick={handleLogout}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.4rem 0.9rem',
                            background: 'transparent',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            color: '#475569',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                        }}
                    >
                        <LogOut size={14} /> Déconnexion
                    </button>
                </div>
            </div>
        </div>
    );
};
