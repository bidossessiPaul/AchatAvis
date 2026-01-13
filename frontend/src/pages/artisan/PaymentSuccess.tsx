import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../context/authStore';
import { ParticlesBackground } from '../../components/common/ParticlesBackground';
import './PaymentSuccess.css';

// Global flag to prevent activation loop when component re-mounts due to Auth wrappers
let globalActivationStarted = false;

export default function PaymentSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (status === 'loading') {
            const timer = setTimeout(() => setProgress(90), 100);
            return () => clearTimeout(timer);
        }
    }, [status]);

    useEffect(() => {
        // Prevent multiple activations across re-mounts
        if (globalActivationStarted) {
            console.log('⚠️ Activation already in progress or completed, skipping...');
            return;
        }

        const activate = async () => {
            globalActivationStarted = true;
            const planId = searchParams.get('plan_id') || localStorage.getItem('selected_plan') || 'discovery';

            console.log('🔄 Activation depuis frontend, plan:', planId);

            try {
                // Manuel activation with fixed plan IDs and column names on backend
                const response = await api.post('/payment/manual-activate', { planId });
                console.log('✅ Activation réussie:', response.data);

                // Refresh auth state to get new status/tokens
                const { checkAuth } = useAuthStore.getState();
                await checkAuth();

                setProgress(100);
                setTimeout(() => setStatus('success'), 500);

                setTimeout(() => {
                    navigate('/artisan/submit');
                }, 3500);

            } catch (error) {
                console.error('❌ Erreur activation:', error);
                setStatus('error');
                globalActivationStarted = false; // Allow retry on error
            }
        };

        activate();
    }, [navigate, searchParams]);

    return (
        <div className="payment-success-container">
            <ParticlesBackground />

            <div className="success-content">
                <div className="auth-logo">
                    <h1 className="auth-brand">
                        <Sparkles className="brand-icon" size={32} />
                        AchatAvis
                    </h1>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="success-glass-card"
                >
                    {status === 'loading' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="loading-spinner-wrapper">
                                <div className="premium-spinner" />
                            </div>
                            <h2 className="success-title">Activation en cours</h2>
                            <p className="success-description">
                                Nous configurons votre pack et vos nouveaux avantages.<br />
                                Veuillez ne pas quitter cette page.
                            </p>
                            <div className="progress-bar-container">
                                <motion.div
                                    className="progress-bar-fill"
                                    initial={{ width: "0%" }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 2, ease: "easeInOut" }}
                                />
                            </div>
                        </motion.div>
                    )}

                    {status === 'success' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            <div className="icon-animation-wrapper">
                                <CheckCircle2 size={80} className="success-check-icon" />
                            </div>
                            <h2 className="success-title">Compte Activé !</h2>
                            <p className="success-description">
                                Félicitations ! Votre compte est désormais actif.<br />
                                Redirection vers votre espace mission...
                            </p>
                            <div className="progress-bar-container">
                                <motion.div
                                    className="progress-bar-fill success"
                                    initial={{ width: "0%" }}
                                    animate={{ width: "100%" }}
                                />
                            </div>
                        </motion.div>
                    )}

                    {status === 'error' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <div className="icon-animation-wrapper">
                                <XCircle size={80} className="error-cross-icon" />
                            </div>
                            <h2 className="success-title">Erreur d'activation</h2>
                            <p className="success-description">
                                Une erreur est survenue lors de l'activation.<br />
                                Notre équipe a été notifiée.
                            </p>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    globalActivationStarted = false;
                                    window.location.reload();
                                }}
                                className="retry-button"
                            >
                                Réessayer
                            </motion.button>
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
