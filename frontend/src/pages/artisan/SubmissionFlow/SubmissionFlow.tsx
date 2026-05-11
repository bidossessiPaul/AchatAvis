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

    // Split mode : quantité choisie pour cette fiche (30 ou 60), null = pas de split
    const [splitQuantity, setSplitQuantity] = useState<30 | 60 | null>(null);
    // Modal de choix split : 'ask' = on pose la question, 'choose' = choisir 30 ou 60, null = masqué
    const [splitModalStep, setSplitModalStep] = useState<'ask' | 'choose' | null>(null);
    // Info sur le pack split : crédits restants pour la 2ème fiche
    const [splitPackInfo, setSplitPackInfo] = useState<{ remaining: number; packName: string } | null>(null);

    useEffect(() => {
        const init = async () => {
            setIsRefreshingAuth(true);
            try {
                await silentRefresh();

                const packs = await artisanService.getAvailablePacks();

                if (orderId) {
                    setHasActivePacks(true);
                } else {
                    setHasActivePacks(packs.length > 0);

                    // Détecte si un pack 90+ crédits est dispo pour proposer le mode split
                    if (!orderId) {
                        const splitPack = packs.find((p: any) => p.review_credits >= 90);
                        if (splitPack) {
                            const remaining = splitPack.remaining_credits ?? splitPack.review_credits;
                            // 2ème fiche du split : remaining < review_credits → quantité fixe, pas de question
                            if (remaining < splitPack.review_credits && remaining > 0) {
                                setSplitQuantity(remaining as 30 | 60);
                                setSplitPackInfo({ remaining, packName: splitPack.pack_name });
                            } else {
                                // 1ère fiche : poser la question split
                                setSplitModalStep('ask');
                            }
                        }
                    }
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
                    const ficheData = {
                        ...data,
                        establishment_id: (tempEstablishment?.id || tempEstablishment?.establishment_id || data.establishment_id) || null,
                        company_name: tempEstablishment?.company_name || tempEstablishment?.name || data.name || data.company_name,
                        city: tempEstablishment?.city || data.city,
                        sector_slug: tempEstablishment?.sector_slug || data.sector_slug,
                        google_business_url: tempEstablishment?.platform_links?.[selectedPlatform || '']?.url || data.platform_links?.[selectedPlatform || '']?.url || data.google_business_url,
                        // Mode split : injecte quantity_override si défini
                        ...(splitQuantity ? { quantity_override: splitQuantity } : {})
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

            {/* Modal split — demande si le client veut activer 2 fiches */}
            {splitModalStep !== null && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 2000,
                    background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <div style={{
                        background: '#fff', borderRadius: '1.25rem', padding: '2rem',
                        maxWidth: 480, width: '100%',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                    }}>
                        {splitModalStep === 'ask' ? (
                            <>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                                    Activer 2 fiches avec votre pack ?
                                </h3>
                                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                                    Votre pack 499€ vous permet de créer <strong>2 fiches</strong> : une avec <strong>60 avis</strong> et une avec <strong>30 avis</strong>. Vous pouvez soumettre la seconde fiche plus tard.
                                </p>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button
                                        onClick={() => setSplitModalStep('choose')}
                                        style={{
                                            flex: 1, padding: '0.75rem', borderRadius: '0.625rem',
                                            background: 'linear-gradient(135deg, #059669, #047857)',
                                            color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.9rem'
                                        }}
                                    >
                                        Oui, 2 fiches
                                    </button>
                                    <button
                                        onClick={() => { setSplitModalStep(null); setSplitQuantity(null); }}
                                        style={{
                                            flex: 1, padding: '0.75rem', borderRadius: '0.625rem',
                                            background: '#f8fafc', color: '#0f172a',
                                            fontWeight: 700, border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.9rem'
                                        }}
                                    >
                                        Non, 1 fiche (90 avis)
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                                    Combien d'avis pour cette fiche ?
                                </h3>
                                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                    Choisissez la quantité pour cette fiche. Vous soumettrez la seconde fiche plus tard.
                                </p>
                                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                                    {([60, 30] as const).map(qty => (
                                        <button
                                            key={qty}
                                            onClick={() => { setSplitQuantity(qty); setSplitModalStep(null); }}
                                            style={{
                                                flex: 1, padding: '1.25rem', borderRadius: '0.75rem',
                                                border: '2px solid #e2e8f0', background: '#f8fafc',
                                                cursor: 'pointer', fontWeight: 700, fontSize: '1.1rem', color: '#0f172a',
                                                transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#059669'; (e.currentTarget as HTMLElement).style.background = '#f0fdf4'; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                                        >
                                            {qty} avis
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setSplitModalStep('ask')}
                                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    ← Retour
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

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

                    {/* Bannière 2ème fiche split : affiche les crédits restants */}
                    {splitPackInfo && (
                        <div style={{
                            background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.75rem',
                            padding: '0.875rem 1.25rem', marginBottom: '1rem',
                            display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#166534', fontSize: '0.9rem'
                        }}>
                            <CheckCircle size={18} color="#059669" />
                            <span>
                                <strong>{splitPackInfo.packName}</strong> — 2ème fiche :
                                vous avez <strong>{splitPackInfo.remaining} avis restants</strong> à utiliser.
                            </span>
                        </div>
                    )}

                    {/* Récap split choisi pour la 1ère fiche */}
                    {splitQuantity && !splitPackInfo && (
                        <div style={{
                            background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.75rem',
                            padding: '0.875rem 1.25rem', marginBottom: '1rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem'
                        }}>
                            <span style={{ color: '#1e40af' }}>
                                Mode 2 fiches activé — cette fiche : <strong>{splitQuantity} avis</strong>
                            </span>
                            <button
                                onClick={() => { setSplitQuantity(null); setSplitModalStep('ask'); }}
                                style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                            >
                                Modifier
                            </button>
                        </div>
                    )}

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
