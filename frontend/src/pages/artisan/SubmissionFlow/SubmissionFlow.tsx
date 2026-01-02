import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { artisanService } from '../../../services/artisanService';
import { ReviewOrder, ReviewProposal } from '../../../types';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { PremiumBlurOverlay } from '../../../components/layout/PremiumBlurOverlay';
import { useAuthStore } from '../../../context/authStore';
import toast from 'react-hot-toast';
import './SubmissionFlow.css';

// Steps components (we will create them next)
import { Step1Initial } from './Step1Initial';
import { Step2Enrichment } from './Step2Enrichment';
import { Step3AIGeneration } from './Step3AIGeneration';
import { Step4Review } from './Step4Review';

const STEPS = [
    { id: 1, label: 'Essentiels' },
    { id: 2, label: 'Contexte' },
    { id: 3, label: 'Génération' },
    { id: 4, label: 'Validation' }
];

export const SubmissionFlow: React.FC = () => {
    const { orderId } = useParams<{ orderId?: string }>();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [order, setOrder] = useState<Partial<ReviewOrder> | null>(null);
    const [proposals, setProposals] = useState<ReviewProposal[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasActivePacks, setHasActivePacks] = useState<boolean>(true);
    const { silentRefresh } = useAuthStore();
    const [isRefreshingAuth, setIsRefreshingAuth] = useState(true);

    useEffect(() => {
        const init = async () => {
            setIsRefreshingAuth(true);
            try {
                // Use silentRefresh instead of checkAuth to avoid global isLoading (which unmounts this component via ProtectedRoute)
                await silentRefresh();

                // 2. Double check specifically for available packs (unused)
                const packs = await artisanService.getAvailablePacks();
                setHasActivePacks(packs.length > 0);
            } catch (err) {
                console.error("Auth/Packs refresh failed", err);
            } finally {
                setIsRefreshingAuth(false);
            }
        };
        init();
    }, [silentRefresh]);

    useEffect(() => {
        if (!isRefreshingAuth && orderId) {
            loadOrder(orderId);
        }
    }, [orderId, isRefreshingAuth]);

    const loadOrder = async (id: string) => {
        setIsLoading(true);
        try {
            const data = await artisanService.getOrder(id);
            setOrder(data);
            setProposals(data.proposals);

            // Security: If mission is already published or beyond, redirect out
            if (['in_progress', 'completed', 'cancelled'].includes(data.status)) {
                toast.error("Cette mission est déjà publiée et ne peut plus être modifiée.");
                navigate('/artisan');
                return;
            }
            // Deduce current step based on data completeness
            // If we are coming from the detail page, we stay at step 1 to allow full review
            if (data.status === 'draft') {
                if (data.sector && data.desired_tone) {
                    setCurrentStep(3);
                } else {
                    setCurrentStep(2);
                }
            } else {
                setCurrentStep(1);
            }
        } catch (error) {
            console.error("Failed to load order", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNext = async (data: Partial<ReviewOrder>) => {
        setIsLoading(true);
        setError(null);
        try {
            let updatedOrder;
            if (currentStep === 1) {
                if (!order?.id) {
                    updatedOrder = await artisanService.createDraft(data);
                    navigate(`/artisan/submit/${updatedOrder.id}`, { replace: true });
                } else {
                    updatedOrder = await artisanService.updateDraft(order.id, data);
                }
            } else if (currentStep === 2) {
                updatedOrder = await artisanService.updateDraft(order!.id!, data);
            }

            if (updatedOrder) setOrder(updatedOrder);
            setCurrentStep(prev => prev + 1);
        } catch (error: any) {
            console.error("Navigation error", error);
            const message = error.response?.data?.message || error.message || "Une erreur est survenue lors de la progression.";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        } else {
            navigate('/artisan');
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <Step1Initial initialData={order} onNext={handleNext} />;
            case 2:
                return <Step2Enrichment initialData={order} onNext={handleNext} onBack={handleBack} />;
            case 3:
                return <Step3AIGeneration
                    order={order as ReviewOrder}
                    proposals={proposals}
                    onNext={() => setCurrentStep(4)}
                    onBack={handleBack}
                    setProposals={setProposals}
                    onError={setError}
                />;
            case 4:
                return <Step4Review order={order as ReviewOrder} proposals={proposals} onBack={handleBack} />;
            default:
                return null;
        }
    };
    return (
        <DashboardLayout title="Soumettre une fiche">
            <PremiumBlurOverlay
                isActive={isRefreshingAuth || isLoading || hasActivePacks || !!order?.payment_id}
                title={!hasActivePacks ? "Aucun pack disponible" : "Compte Inactif"}
                description={!hasActivePacks
                    ? "Vous avez déjà utilisé tous vos packs actifs. Veuillez en reprendre un nouveau pour créer une mission."
                    : "Activez votre compte avec un pack pour accéder à cette fonctionnalité."}
            >
                <div className="submission-flow-container">
                    <div className="submission-header">
                        <h1 className="submission-title">Soumettre une fiche</h1>
                        <p className="submission-subtitle">Créez vos avis personnalisés en quelques étapes</p>
                    </div>

                    <div className="progress-stepper">
                        {STEPS.map((step) => (
                            <div key={step.id} className={`step-item ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}>
                                <div className="step-circle">
                                    {currentStep > step.id ? <CheckCircle size={20} /> : step.id}
                                </div>
                                <span className="step-label">{step.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="submission-card">
                        {error && (
                            <div style={{
                                backgroundColor: '#fff1f2',
                                border: '1px solid #ff3b6a',
                                color: '#ff3b6a',
                                padding: '1rem',
                                borderRadius: '0.75rem',
                                marginBottom: '1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <AlertCircle size={20} />
                                    <span style={{ fontWeight: 600 }}>{error}</span>
                                </div>
                                <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#ff3b6a', cursor: 'pointer' }}>
                                    <X size={18} />
                                </button>
                            </div>
                        )}
                        {isLoading ? <div className="loading-spinner">Chargement...</div> : renderStep()}
                    </div>
                </div>
            </PremiumBlurOverlay>
        </DashboardLayout>
    );
};
