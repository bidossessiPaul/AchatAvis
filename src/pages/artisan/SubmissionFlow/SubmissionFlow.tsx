import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { artisanService } from '../../../services/artisanService';
import { ReviewOrder, ReviewProposal } from '../../../types';
import { CheckCircle, AlertCircle, X, ArrowLeft } from 'lucide-react';
import { PremiumBlurOverlay } from '../../../components/layout/PremiumBlurOverlay';
import { useAuthStore } from '../../../context/authStore';
import { showError } from '../../../utils/Swal';
import './SubmissionFlow.css';

// Steps components
import { Step0PlatformSelection } from './Step0PlatformSelection';
import { Step0AddEstablishment } from './Step0AddEstablishment';
import { Step2Enrichment } from './Step2Enrichment';
import { Step3AIGeneration } from './Step3AIGeneration';
import { Step4Review } from './Step4Review';
import { establishmentApi } from '../../../services/api';
const STEPS = [
    { id: 1, label: 'Plateforme' },
    { id: 2, label: 'Fiche' },
    { id: 3, label: 'Avis' },
    { id: 4, label: 'Génération' },
    { id: 5, label: 'Validation' }
];

export const SubmissionFlow: React.FC = () => {
    const { orderId } = useParams<{ orderId?: string }>();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [order, setOrder] = useState<Partial<ReviewOrder> | null>(null);
    const [proposals, setProposals] = useState<ReviewProposal[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasActivePacks, setHasActivePacks] = useState<boolean | null>(null);
    const { silentRefresh } = useAuthStore();
    const [isRefreshingAuth, setIsRefreshingAuth] = useState(true);

    // Flow persistence for newly created establishments (fiches)
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
    const [tempEstablishment, setTempEstablishment] = useState<any>(null);

    useEffect(() => {
        const init = async () => {
            setIsRefreshingAuth(true);
            try {
                // Use silentRefresh instead of checkAuth to avoid global isLoading (which unmounts this component via ProtectedRoute)
                await silentRefresh();

                // 2. Double check specifically for available packs (unused)
                const packs = await artisanService.getAvailablePacks();

                // If we are editing an existing fiche (orderId exists), we don't block even if 0 unused packs remain
                // because this fiche ALREADY used a pack.
                if (orderId) {
                    setHasActivePacks(true);
                } else {
                    setHasActivePacks(packs.length > 0);
                }
            } catch (err) {
                console.error("Auth/Packs refresh failed", err);
                setHasActivePacks(false);
            } finally {
                setIsRefreshingAuth(false);
            }
        };
        init();
    }, [silentRefresh, orderId]);

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

            // Security: If fiche is cancelled, redirect out. 
            // We now ALLOW 'in_progress' and 'completed' to be edited (to modify unposted reviews)
            if (data.status === 'cancelled') {
                showError('Action impossible', "Cette fiche est annulée et ne peut plus être modifiée.");
                navigate('/artisan');
                return;
            }
            // Deduce current step based on data completeness
            // If we are coming from the detail page, we stay at step 1 to allow full review
            if (data.status === 'draft') {
                if (data.sector && data.desired_tone) {
                    setCurrentStep(4);
                } else {
                    setCurrentStep(3);
                }
            } else {
                setCurrentStep(2); // Start at Fiche collection if already has orderId
            }

            // Sync persistence states
            if (data.establishment_id) {
                try {
                    const estResponse = await establishmentApi.getDetails(data.establishment_id);
                    const establishment = estResponse.data || estResponse;
                    setTempEstablishment(establishment);

                    // Infer platform
                    if (data.google_business_url) {
                        setSelectedPlatform('google');
                    } else if (establishment?.platform_links?.trustpilot?.url) {
                        setSelectedPlatform('trustpilot');
                    } else if (establishment?.platform_links?.pagesjaunes?.url) {
                        setSelectedPlatform('pagesjaunes');
                    }
                } catch (err) {
                    console.error("Failed to load establishment details", err);
                }
            } else {
                // Populate from order data directly if no linked establishment record
                setTempEstablishment({
                    name: data.company_name,
                    city: data.city,
                    sector_slug: data.sector_slug,
                    google_business_url: data.google_business_url,
                    platform_links: {
                        google: { url: data.google_business_url, verified: false }
                    }
                });
                if (data.google_business_url) {
                    setSelectedPlatform('google');
                }
            }
        } catch (error) {
            console.error("Failed to load order", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNext = async (data: any) => {
        setIsLoading(true);
        setError(null);
        try {
            if (currentStep === 1) {
                setSelectedPlatform(data);
                setCurrentStep(2);
                setIsLoading(false);
                return;
            }

            if (currentStep === 2) {
                setTempEstablishment(data);

                let updatedOrder;
                if (!order?.id) {
                    // Inject temp fiche data if available
                    const ficheData = {
                        ...data,
                        // If we don't have a real establishment_id yet, we pass null
                        establishment_id: (tempEstablishment?.id || tempEstablishment?.establishment_id || data.establishment_id) || null,
                        company_name: tempEstablishment?.company_name || tempEstablishment?.name || data.name || data.company_name,
                        city: tempEstablishment?.city || data.city,
                        sector_slug: tempEstablishment?.sector_slug || data.sector_slug,
                        google_business_url: tempEstablishment?.platform_links?.[selectedPlatform || '']?.url || data.platform_links?.[selectedPlatform || '']?.url || data.google_business_url
                    };
                    updatedOrder = await artisanService.createDraft(ficheData);
                    navigate(`/artisan/submit/${updatedOrder.id}`, { replace: true });
                } else {
                    updatedOrder = await artisanService.updateDraft(order.id, data);
                }

                if (updatedOrder) setOrder(updatedOrder);
                setCurrentStep(3);
                setIsLoading(false);
                return;
            }

            let updatedOrder;
            if (currentStep === 3) {
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
                return <Step0PlatformSelection initialPlatform={selectedPlatform} onNext={handleNext} />;
            case 2:
                return <Step0AddEstablishment initialData={tempEstablishment} orderInitialData={order} platformId={selectedPlatform || 'google'} onNext={handleNext} onBack={handleBack} />;
            case 3:
                return <Step2Enrichment initialData={order} onNext={handleNext} onBack={handleBack} />;
            case 4:
                return <Step3AIGeneration
                    order={order as ReviewOrder}
                    proposals={proposals}
                    onNext={() => setCurrentStep(5)}
                    onBack={handleBack}
                    setProposals={setProposals}
                    onError={setError}
                />;
            case 5:
                return <Step4Review order={order as ReviewOrder} proposals={proposals} onBack={handleBack} />;
            default:
                return null;
        }
    };

    // Strict loading state to avoid flash
    if (isRefreshingAuth || hasActivePacks === null) {
        return (
            <div className="fullscreen-submission">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem' }}>
                    <div className="loading-spinner"></div>
                    <p style={{ color: '#64748b', fontWeight: 500 }}>Vérification de vos accès...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fullscreen-submission">
            <button onClick={() => navigate('/artisan/dashboard')} className="back-button-fullscreen">
                <ArrowLeft size={20} />
                <span>Retour au tableau de bord</span>
            </button>
            <PremiumBlurOverlay
                isActive={hasActivePacks || !!order?.payment_id}
                title="Aucun pack disponible"
                description="Vous avez déjà utilisé tous vos packs actifs ou votre compte n'est pas encore activé. Veuillez prendre un pack pour créer une fiche."
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
                                border: '1px solid #FF6B35',
                                color: '#FF6B35',
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
                                <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#FF6B35', cursor: 'pointer' }}>
                                    <X size={18} />
                                </button>
                            </div>
                        )}
                        {isLoading ? <div className="loading-spinner">Chargement...</div> : renderStep()}
                    </div>
                </div>
            </PremiumBlurOverlay>
        </div>
    );
};
