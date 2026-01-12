import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../context/authStore';
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
            // If already success, we might want to still show success if it's currently success in state
            // but since state is local, we just let it be. Usually it will stay on the page until navigate.
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
            <div className="success-glass-card">
                {status === 'loading' && (
                    <>
                        <div className="loading-spinner-wrapper">
                            <div className="premium-spinner" />
                        </div>
                        <h2 className="success-title">Activation de votre compte</h2>
                        <p className="success-description">
                            Nous configurons votre pack et vos nouveaux avantages.
                            Veuillez ne pas quitter cette page.
                        </p>
                        <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                        </div>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="icon-animation-wrapper">
                            <CheckCircle2 size={80} className="success-check-icon" />
                        </div>
                        <h2 className="success-title">Paiement Validé !</h2>
                        <p className="success-description">
                            Votre compte est désormais actif. Vous allez être redirigé pour lancer votre première mission.
                        </p>
                        <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: '100%', transition: 'none' }} />
                        </div>
                        <p className="status-note">Lancement de la mission...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="icon-animation-wrapper">
                            <XCircle size={80} className="error-cross-icon" />
                        </div>
                        <h2 className="success-title">Erreur d'activation</h2>
                        <p className="success-description">
                            Le paiement a été validé par Stripe, mais une erreur est survenue lors de l'activation de votre compte.
                            Ne vous inquiétez pas, notre équipe peut régler cela.
                        </p>
                        <button
                            onClick={() => {
                                globalActivationStarted = false;
                                window.location.reload();
                            }}
                            className="retry-button"
                        >
                            Réessayer l'activation
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
