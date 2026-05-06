import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { guideService } from '../../services/guideService';
import apiClient from '../../services/api';
import { showSuccess, showError } from '../../utils/Swal';
import { ReviewOrder, ReviewProposal, ReviewSubmission } from '../../types';
import {
    MapPin,
    ExternalLink,
    Copy,
    CheckCircle2,
    ChevronLeft,
    Clock,
    Star,
    Send,
    Shield,
    AlertTriangle,
    Download,
    Image as ImageIcon,
    Flag,
} from 'lucide-react';
import { guideSignalementApi } from '../../services/signalement';

// Force le téléchargement Cloudinary via le flag fl_attachment
function getDownloadUrl(url: string): string {
    if (!url) return url;
    if (url.includes('/upload/fl_attachment')) return url;
    return url.replace('/upload/', '/upload/fl_attachment/');
}
import { useAntiDetectionStore } from '../../context/antiDetectionStore';
import { useAuthStore } from '../../context/authStore';
import { FicheCompatibilityModal } from '../../components/AntiDetection/FicheCompatibilityModal';
import { ProofSubmissionChecklist } from '../../components/AntiDetection/ProofSubmissionChecklist';
import './FicheDetail.css';

export const FicheDetail: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const [fiche, setfiche] = useState<ReviewOrder & {
        proposals: ReviewProposal[],
        submissions: ReviewSubmission[],
        artisan_company: string,
        city?: string
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submittingId, setSubmittingId] = useState<string | null>(null);
    const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
    const [googleEmails, setGoogleEmails] = useState<Record<string, string>>({});
    const [selectedGmailId, setSelectedGmailId] = useState<number | null>(null);
    const [compatibilityResult, setCompatibilityResult] = useState<any>(null);
    const [isCompModalOpen, setIsCompModalOpen] = useState(false);
    const [lockedByOther, setLockedByOther] = useState(false);
    const [isFull, setIsFull] = useState(false);
    const [isDailyFull, setIsDailyFull] = useState(false);
    const [isChecklistValidated, setIsChecklistValidated] = useState(false);

    const { user } = useAuthStore();
    const { gmailAccounts, fetchGmailAccounts, fetchComplianceData, checkficheCompatibility } = useAntiDetectionStore();
    const [isChecklistOpen, setIsChecklistOpen] = useState(false);
    const [pendingProposalId, setPendingProposalId] = useState<string | null>(null);
    const [quotaData, setQuotaData] = useState<any>(null);
    const [showStarsWarning, setShowStarsWarning] = useState(true);
    const [reservingSlotId, setReservingSlotId] = useState<string | null>(null);

    useEffect(() => {
        if (orderId) {
            loadficheDetails(orderId);
        }
        if (user) {
            fetchGmailAccounts(user.id);
            fetchComplianceData(user.id);
        }
        // Cleanup: Release lock on unmount
        return () => {
            if (orderId) {
                guideService.releaseLock(orderId).catch(console.error);
            }
        };
    }, [orderId, user, fetchGmailAccounts, fetchComplianceData]);

    // Auto-select first Gmail account when loaded
    useEffect(() => {
        if (!selectedGmailId && gmailAccounts.length > 0) {
            handleCheckCompatibility(gmailAccounts[0].id);
        }
    }, [gmailAccounts, selectedGmailId]);

    const loadficheDetails = async (id: string) => {
        setIsLoading(true);
        setError(null);
        setLockedByOther(false);
        setIsFull(false);
        setIsDailyFull(false);
        try {
            const data = await guideService.getficheDetails(id);
            setfiche(data);
        } catch (err: any) {
            console.error("Failed to load fiche details", err);
            const message = err.response?.data?.message || err.message;
            if (message === 'fiche_FULL') {
                setIsFull(true);
                setError("Désolé, cette fiche a déjà atteint son quota d'avis.");
            } else if (message === 'DAILY_QUOTA_FULL') {
                setIsDailyFull(true);
                setError("Le quota journalier pour cette fiche a été atteint. Revenez demain !");
            } else if (message === 'fiche_LOCKED') {
                setLockedByOther(true);
                setError("Un autre guide est déjà en train de traiter cette fiche. Veuillez réessayer dans quelques minutes.");
            } else if (message && message.includes('fiche_OUTSIDE_HOURS')) {
                // Format: "fiche_OUTSIDE_HOURS:07:00-23:00"
                const range = message.split(':').slice(1).join(':');
                setError(`Cette fiche n'est pas disponible en ce moment. Plage horaire autorisée : ${range} (heure de Paris). Réessayez dans cette fenêtre.`);
            } else if (message && message.includes('TRUST_SCORE_BLOCKED')) {
                setError("Votre compte est restreint à cause d'un Score de Confiance insuffisant. Veuillez mettre à jour vos preuves ou contacter le support.");
            } else {
                setError("Impossible de charger les détails de la fiche.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        // Simple visual feedback could be added here
    };

    const handleCheckCompatibility = async (gmailId: number) => {
        if (!orderId) return;
        try {
            const result = await checkficheCompatibility(orderId, gmailId);
            setCompatibilityResult(result);

            if (result.can_take) {
                setIsCompModalOpen(false); // Hide the status modal
                setIsChecklistOpen(true); // Show the checklist
                handleGmailSelect(gmailId); // Fetch quotas immediately
            } else {
                setIsCompModalOpen(true); // Show the error modal
            }
        } catch (error: any) {
            const serverMsg = error.response?.data?.error;
            console.error("❌ Compatibility check failed:", serverMsg || error.message);
            showError('Erreur', serverMsg || "Erreur lors de la vérification de compatibilité");
        }
    };

    // Handle Gmail Selection and fetch quotas
    const handleGmailSelect = async (gmailId: number) => {
        if (!gmailId) return;

        setSelectedGmailId(gmailId);
        setQuotaData(null); // Reset while loading

        // Find account and sync current email for submission
        const account = gmailAccounts.find(a => a.id === gmailId);
        if (account) {
            setGoogleEmails(prev => ({ ...prev, current: account.email }));
        }

        const targetId = orderId || (fiche as any)?.id;
        if (targetId) {
            try {
                const response = await apiClient.get(`/guide/fiches/${targetId}/gmail-quotas`);
                const gmailData = response.data.gmailAccounts.find((g: any) => g.id === gmailId);

                if (gmailData) {
                    setQuotaData({
                        sectorUsed: gmailData.quotaSector.used,
                        sectorMax: gmailData.quotaSector.max,
                        sectorRemaining: gmailData.quotaSector.remaining,
                        globalUsed: gmailData.quotaGlobal.used,
                        globalMax: gmailData.quotaGlobal.max,
                        globalRemaining: gmailData.quotaGlobal.remaining
                    });
                }
            } catch (error) {
                console.error('Error fetching quota data:', error);
            }
        }
    };

    const handleSubmitProof = async (proposalId: string) => {
        const url = proofUrls[proposalId];
        const email = googleEmails[proposalId] || googleEmails['current'];

        if (!selectedGmailId && !compatibilityResult?.can_take) {
            showError('Attention', "Veuillez d'abord vérifier la compatibilité de votre compte Gmail.");
            return;
        }

        if (!url || !url.startsWith('http')) {
            showError('Erreur', "Veuillez entrer un lien valide (commençant par http ou https).");
            return;
        }

        if (!email || !email.includes('@')) {
            showError('Erreur', "Veuillez entrer un email Google valide.");
            return;
        }

        // Open checklist before final submission
        setPendingProposalId(proposalId);
        if (isChecklistValidated) {
            // Already validated to see the text, can submit directly now
            confirmSubmission();
        } else {
            setIsChecklistOpen(true);
        }
    };

    const confirmSubmission = async () => {
        setIsChecklistValidated(true);
        setIsChecklistOpen(false);
        if (!pendingProposalId) return;

        const proposalId = pendingProposalId;
        const url = proofUrls[proposalId];
        const email = googleEmails[proposalId] || googleEmails['current'];

        setSubmittingId(proposalId);

        try {
            await guideService.submitProof({
                orderId: fiche!.id,
                proposalId,
                reviewUrl: url,
                googleEmail: email,
                artisanId: fiche!.artisan_id,
                gmailAccountId: selectedGmailId || undefined
            });
            showSuccess('Succès', "Preuve soumise avec succès ! Elle sera validée par un administrateur.");
            loadficheDetails(orderId!);
            setProofUrls(prev => {
                const next = { ...prev };
                delete next[proposalId];
                return next;
            });
            setGoogleEmails(prev => {
                const next = { ...prev };
                delete next[proposalId];
                return next;
            });
            setPendingProposalId(null);
        } catch (err: any) {
            console.error("Failed to submit proof", err);
            const errorMessage = err.response?.data?.message || err.message || "Erreur lors de la soufiche de la preuve.";
            showError('Erreur', errorMessage);
        } finally {
            setSubmittingId(null);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout title="Chargement...">
                <div className="loading-container">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500" style={{ borderColor: 'var(--guide-primary)', borderTopColor: 'transparent' }} />
                </div>
            </DashboardLayout>
        );
    }

    if (error || !fiche) {
        return (
            <DashboardLayout title="fiche indisponible">
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <div className={`status-icon-wrapper ${isFull || isDailyFull ? 'warning' : 'locked'}`}>
                        {isFull || isDailyFull ? (
                            <Star size={40} color="#f97316" />
                        ) : (
                            <Shield size={40} color="#ef4444" />
                        )}
                    </div>
                    <h2 className="error-title">
                        {isFull ? 'Quota Atteint' : isDailyFull ? 'Quota Journalier Atteint' : lockedByOther ? 'fiche en cours' : 'Erreur'}
                    </h2>
                    <p className="error-text">
                        {error}
                    </p>
                    <button
                        onClick={() => navigate('/guide')}
                        className="btn-back-error"
                    >
                        Retour aux fiches
                    </button>

                    {lockedByOther && (
                        <p className="lock-info">
                            <Clock size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                            Le verrou expirera automatiquement si le guide ne soumet pas de preuve.
                        </p>
                    )}
                </div>
            </DashboardLayout>
        );
    }

    const handleReserveSlot = async (avisId: string) => {
        setReservingSlotId(avisId);
        try {
            await guideSignalementApi.reserveAnySlot(avisId);
            showSuccess('Slot réservé', 'Rendez-vous sur votre page Signalement pour uploader la preuve.');
            if (orderId) loadficheDetails(orderId);
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        } finally {
            setReservingSlotId(null);
        }
    };

    // Filter proposals into pending and published (exclude rejected submissions)
    const activeSubmissions = fiche.submissions.filter((s: any) => s.status !== 'rejected');
    const publishedProposalIds = activeSubmissions.map((s: any) => s.proposal_id);
    const totalRemaining = Math.max(0, fiche.quantity - activeSubmissions.length);

    // Filter and cap the pending proposals to match the fiche quantity
    const pendingProposals = fiche.proposals
        .filter(p => !publishedProposalIds.includes(p.id))
        .slice(0, totalRemaining);

    // Map over SUBficheS to allow showing all reviews (even if multiple guides did the same one)
    const publishedProposals = activeSubmissions.map((submission: any) => {
        const proposal = fiche.proposals.find(p => p.id === submission.proposal_id);
        return {
            ...proposal, // Spread existing proposal data
            // Defaults for display
            id: proposal?.id || submission.id,
            content: proposal?.content || "Avis publié (contenu indisponible)",
            rating: proposal?.rating || 5,
            status: proposal?.status || 'approved',
            submission: submission
        };
    });


    return (
        <DashboardLayout title="Détails de la fiche">
            <div className="fiche-detail-container">
                <button onClick={() => navigate('/guide')} className="fiche-back-button">
                    <ChevronLeft size={20} /> Retour aux fiches
                </button>

                <div className="fiche-grid">
                    {/* Main Content - Pending Reviews (Col 8) */}
                    <div className="fiche-content-area">
                        <div className="fiche-main-card">
                            <div className="fiche-main-header">
                                <div>
                                    <h2 className="fiche-company-name">
                                        {fiche.artisan_company}
                                    </h2>
                                    <p className="fiche-location">
                                        <span className="location-item">
                                            <MapPin size={18} /> {fiche.city || 'Ville non spécifiée'}
                                        </span>
                                        <span className="location-separator">
                                            |
                                        </span>
                                        <span className="location-item">
                                            <span style={{ fontSize: '1.2rem' }}>{(fiche as any).sector_icon}</span>
                                            <span className={`difficulty-badge ${(fiche as any).difficulty}`}>
                                                {(fiche as any).difficulty === 'easy' ? 'Simple' : ((fiche as any).difficulty === 'medium' ? 'Modéré' : 'Difficile')}
                                            </span>
                                        </span>
                                    </p>
                                </div>
                                <div className="fiche-badge">
                                    {activeSubmissions.length} / {fiche.quantity} avis soumis
                                </div>
                            </div>

                            {fiche.google_business_url && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.65rem 0.85rem',
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '0.5rem',
                                    marginBottom: 'var(--space-8)',
                                }}>
                                    <span style={{
                                        flex: 1,
                                        fontSize: '0.8rem',
                                        color: '#475569',
                                        wordBreak: 'break-all',
                                        fontFamily: 'monospace',
                                        lineHeight: 1.4,
                                    }}>
                                        {fiche.google_business_url}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(fiche.google_business_url!);
                                            showSuccess('Lien copié', 'Collez-le dans votre navigateur pour éviter toute détection.');
                                        }}
                                        style={{
                                            flexShrink: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.35rem',
                                            padding: '0.45rem 0.85rem',
                                            background: 'linear-gradient(135deg, #059669, #047857)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontWeight: 700,
                                            fontSize: '0.8rem',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        <Copy size={14} /> Copier le lien
                                    </button>
                                </div>
                            )}

                            {/* Signalements liés à cette fiche */}
                            {(fiche as any).signalements?.length > 0 && (
                                <section style={{ marginBottom: '1.5rem' }}>
                                    <h3 className="section-header" style={{ marginTop: 0 }}>
                                        <Flag size={20} color="#dc2626" /> Avis Google à signaler ({(fiche as any).signalements.length})
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {(fiche as any).signalements.map((s: any) => (
                                            <div key={s.avis_id} style={{
                                                border: '1px solid #fecaca',
                                                borderRadius: '0.75rem',
                                                padding: '1rem 1.25rem',
                                                background: '#fff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '1rem',
                                                flexWrap: 'wrap',
                                            }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', marginBottom: 4 }}>
                                                        Avis à signaler
                                                    </div>
                                                    <a href={s.google_review_url} target="_blank" rel="noreferrer"
                                                        style={{ fontSize: '0.85rem', color: '#2383e2', wordBreak: 'break-all' }}>
                                                        {s.google_review_url}
                                                    </a>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
                                                        {s.nb_signalements_validated}/{s.nb_signalements_target} signalements · {(s.payout_per_signalement_cents / 100).toFixed(2)}€/signalement
                                                    </div>
                                                </div>
                                                {s.guide_has_slot > 0 ? (
                                                    <span style={{ fontSize: '0.78rem', background: '#dcfce7', color: '#166534', padding: '0.3rem 0.75rem', borderRadius: '1rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                        Slot pris
                                                    </span>
                                                ) : s.nb_slots_remaining > 0 ? (
                                                    <button
                                                        onClick={() => handleReserveSlot(s.avis_id)}
                                                        disabled={reservingSlotId === s.avis_id}
                                                        style={{
                                                            background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                                                            color: '#fff', border: 'none', borderRadius: '0.625rem',
                                                            padding: '0.5rem 1rem', fontWeight: 700, fontSize: '0.85rem',
                                                            cursor: 'pointer', whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        <Flag size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                                        {reservingSlotId === s.avis_id ? 'Réservation…' : 'Prendre le slot'}
                                                    </button>
                                                ) : (
                                                    <span style={{ fontSize: '0.78rem', background: '#f1f5f9', color: '#64748b', padding: '0.3rem 0.75rem', borderRadius: '1rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                        Complet
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Pending Reviews Section */}
                            <section>
                                <h3 className="section-header" style={{ marginTop: 0 }}>
                                    <Clock size={24} color="var(--guide-primary)" /> Avis en attente ({pendingProposals.length})
                                </h3>

                                {pendingProposals.length > 0 && (
                                    <div className="stars-instruction-banner">
                                        <Star size={20} fill="currentColor" />
                                        <div>
                                            <strong>Obligation :</strong> Respectez <strong>obligatoirement</strong> le nombre d'étoiles indiqué sur chaque avis lors de la publication, même s'il s'agit d'un seul étoile. Le non-respect entraînera le rejet de l'avis.
                                        </div>
                                    </div>
                                )}

                                {pendingProposals.length > 0 ? (
                                    <div className="reviews-stack">
                                        {pendingProposals.map((proposal) => (
                                            <div key={proposal.id} className="review-card">
                                                <div className="review-card-header">
                                                    <span className="review-card-label">Texte à copier</span>
                                                    <div className="stars-row">
                                                        {[...Array(proposal.rating)].map((_, i) => (
                                                            <Star key={i} size={18} fill="currentColor" />
                                                        ))}
                                                    </div>
                                                </div>

                                                <p className={`review-content ${!isChecklistValidated ? 'blurred' : ''}`}>
                                                    {proposal.content}
                                                </p>

                                                {/* Images fournies par l'artisan : à télécharger et joindre au moment de poster */}
                                                {proposal.images && proposal.images.length > 0 && (
                                                    <div className={`review-images ${!isChecklistValidated ? 'blurred' : ''}`} style={{ margin: '0.75rem 0 1rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                                                                <ImageIcon size={16} /> Images à joindre à l'avis ({proposal.images.length})
                                                            </span>
                                                            <button
                                                                type="button"
                                                                disabled={!isChecklistValidated}
                                                                onClick={() => {
                                                                    if (!isChecklistValidated) {
                                                                        showError('Action requise', "Veuillez d'abord valider les consignes de sécurité.");
                                                                        return;
                                                                    }
                                                                    // Déclenche le téléchargement de toutes les images en série
                                                                    proposal.images!.forEach((img, idx) => {
                                                                        const a = document.createElement('a');
                                                                        a.href = getDownloadUrl(img.url);
                                                                        a.download = `image-${idx + 1}`;
                                                                        a.target = '_blank';
                                                                        a.rel = 'noopener';
                                                                        document.body.appendChild(a);
                                                                        a.click();
                                                                        document.body.removeChild(a);
                                                                    });
                                                                }}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.4rem',
                                                                    padding: '0.4rem 0.75rem',
                                                                    background: isChecklistValidated ? '#059669' : '#cbd5e1',
                                                                    color: '#fff',
                                                                    border: 'none',
                                                                    borderRadius: '0.5rem',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 700,
                                                                    cursor: isChecklistValidated ? 'pointer' : 'not-allowed'
                                                                }}
                                                            >
                                                                <Download size={14} /> Tout télécharger
                                                            </button>
                                                        </div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                            {proposal.images.map((img, idx) => (
                                                                <div key={img.publicId} style={{ position: 'relative', width: 72, height: 72, borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                                                    <a
                                                                        href={isChecklistValidated ? img.url : undefined}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        title="Ouvrir en grand"
                                                                        style={{ display: 'block', width: '100%', height: '100%', pointerEvents: isChecklistValidated ? 'auto' : 'none' }}
                                                                    >
                                                                        <img src={img.url} alt={`Image ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                                                    </a>
                                                                    {isChecklistValidated && (
                                                                        <a
                                                                            href={getDownloadUrl(img.url)}
                                                                            download={`image-${idx + 1}`}
                                                                            title="Télécharger cette image"
                                                                            style={{
                                                                                position: 'absolute',
                                                                                bottom: 2,
                                                                                right: 2,
                                                                                width: 22,
                                                                                height: 22,
                                                                                borderRadius: '50%',
                                                                                background: 'rgba(5, 150, 105, 0.95)',
                                                                                color: '#fff',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                textDecoration: 'none'
                                                                            }}
                                                                        >
                                                                            <Download size={12} />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.4rem' }}>
                                                            Téléchargez ces images puis joignez-les à votre avis Google.
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="review-actions">
                                                    <button
                                                        onClick={() => isChecklistValidated ? handleCopy(proposal.content) : showError('Action requise', "Veuillez d'abord valider les consignes de sécurité.")}
                                                        className={`copy-btn ${!isChecklistValidated ? 'disabled' : ''}`}
                                                    >
                                                        <Copy size={18} /> Copier le texte
                                                    </button>

                                                    <div className="submission-form">
                                                        <div className="field-group">
                                                            <label className="field-label">Email Google utilisé</label>
                                                            <select
                                                                className="text-input"
                                                                value={googleEmails[proposal.id] || googleEmails['current'] || ''}
                                                                onChange={(e) => {
                                                                    const email = e.target.value;
                                                                    setGoogleEmails(prev => ({ ...prev, [proposal.id]: email }));

                                                                    const account = gmailAccounts.find(a => a.email === email);
                                                                    if (account) {
                                                                        handleCheckCompatibility(account.id);
                                                                    }
                                                                }}
                                                            >
                                                                <option value="">Choisir un compte Gmail</option>
                                                                {gmailAccounts.map(account => (
                                                                    <option key={account.id} value={account.email}>
                                                                        {account.email} (Niv. {account.local_guide_level || '-'})
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {gmailAccounts.length === 0 && (
                                                                <Link to="/profile?tab=gmail" className="add-gmail-link" style={{ fontSize: '0.75rem', color: 'var(--primary-brand)', marginTop: '0.5rem', display: 'block' }}>
                                                                    + Enregistrer un compte Gmail pour continuer
                                                                </Link>
                                                            )}
                                                        </div>
                                                        <div className="field-group">
                                                            <label className="field-label">Lien de l'avis posté</label>
                                                            <div className="proof-input-row">
                                                                <input
                                                                    type="text"
                                                                    placeholder="https://maps.app.goo.gl/..."
                                                                    className="text-input"
                                                                    value={proofUrls[proposal.id] || ''}
                                                                    onChange={(e) => setProofUrls(prev => ({ ...prev, [proposal.id]: e.target.value }))}
                                                                />
                                                                <button
                                                                    onClick={() => handleSubmitProof(proposal.id)}
                                                                    disabled={submittingId === proposal.id}
                                                                    className="submit-btn"
                                                                >
                                                                    {submittingId === proposal.id ? '...' : <><Send size={18} /> Soumettre</>}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : fiche.proposals.length > 0 ? (
                                    <div className="empty-state success">
                                        <p className="empty-state-text">Tous les avis disponibles ont été postés ! 🎉</p>
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <p className="empty-state-text">Les textes d'avis sont en cours de préparation... ⏳</p>
                                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginTop: 'var(--space-2)' }}>
                                            Dès que l'artisan aura validé les textes, ils apparaîtront ici.
                                        </p>
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>

                    {/* Sidebar - Instructions & Published (Col 4) */}
                    <aside className="fiche-sidebar">
                        <div className="info-card">
                            <h3 className="info-card-title">Instructions</h3>

                            <div className="instruction-item">
                                <div className="instruction-icon-wrapper gray">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <p className="instruction-label">Rythme conseillé</p>
                                    <p className="instruction-value" style={{ color: (fiche.daily_submissions_count || 0) >= (fiche.reviews_per_day || 1) ? 'var(--gray-400)' : 'var(--guide-primary)' }}>
                                        {fiche.reviews_per_day || 1} par jour
                                    </p>
                                    <p className="instruction-value" style={{ fontSize: '0.75rem', marginTop: '4px', fontWeight: 600 }}>
                                        <span style={{ color: (fiche.daily_submissions_count || 0) >= (fiche.reviews_per_day || 1) ? '#ef4444' : '#10b981' }}>
                                            {fiche.daily_submissions_count || 0} / {fiche.reviews_per_day || 1}
                                        </span> avis demandés aujourd'hui
                                    </p>
                                </div>
                            </div>

                            <div className="instruction-item">
                                <div className="instruction-icon-wrapper success">
                                    <CheckCircle2 size={20} />
                                </div>
                                <div>
                                    <p className="instruction-label">Rémunération</p>
                                    <p className="instruction-value price">
                                        {Number(fiche.payout_per_review || 1.50).toFixed(2)} €
                                    </p>
                                    <p className="instruction-value" style={{ fontSize: 'var(--text-xs)' }}>par avis validé</p>
                                </div>
                            </div>

                            <div className="instruction-warning-box">
                                <p className="instruction-warning-text">
                                    <strong>Rythme :</strong> Ne publiez qu'un seul avis à la fois. Respectez la limite de {fiche.reviews_per_day || 1} avis par jour pour cette fiche.
                                </p>
                            </div>

                            {/* Gmail Account Selector */}
                            <div className="gmail-selector-box">
                                <h4 className="gmail-selector-title">
                                    <Shield size={18} /> COMPTE GMAIL
                                </h4>

                                {gmailAccounts.length > 0 ? (
                                    <div className="gmail-accounts-grid">
                                        {gmailAccounts.map(account => (
                                            <button
                                                key={account.id}
                                                onClick={() => handleCheckCompatibility(account.id)}
                                                className="gmail-account-btn"
                                                style={{
                                                    border: `2px solid ${selectedGmailId === account.id ? '#0ea5e9' : '#f3f4f6'}`
                                                }}
                                            >
                                                <span className="gmail-account-email">{account.email}</span>
                                                {selectedGmailId === account.id && <CheckCircle2 size={16} color="#0ea5e9" />}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="gmail-empty-state">
                                        <p className="gmail-empty-text">Aucun compte Gmail enregistré.</p>
                                        <Link
                                            to="/profile?tab=gmail"
                                            className="gmail-add-btn"
                                        >
                                            + Ajouter un compte
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Published Reviews Section - Moved to sidebar */}
                        {publishedProposals.length > 0 && (
                            <div className="fiche-published-card sidebar-card mt-4">
                                <h3 className="section-header small-header">
                                    <CheckCircle2 size={20} color="var(--guide-primary)" /> Avis déjà publiés ({publishedProposals.length})
                                </h3>

                                <div className="reviews-stack published-stack">
                                    {publishedProposals.map((item) => (
                                        <div key={item.id} className="published-item sidebar-item">
                                            <div className="published-info">
                                                <div className="published-item-header">
                                                    <p className="published-text">
                                                        {item.content}
                                                    </p>
                                                    {item.submission?.guide_avatar && item.submission.guide_id !== user?.id && (
                                                        <img
                                                            src={item.submission.guide_avatar}
                                                            alt={item.submission.guide_name}
                                                            title={`Publié par ${item.submission.guide_name}`}
                                                            className="published-avatar"
                                                        />
                                                    )}
                                                </div>
                                                <div className="published-meta-row">
                                                    <div className="published-meta-left">
                                                        <a href={item.submission?.review_url} target="_blank" rel="noopener noreferrer" className="proof-link">
                                                            Preuve <ExternalLink size={10} />
                                                        </a>
                                                        {item.submission?.guide_id !== user?.id && (
                                                            <span className="published-author">
                                                                par {item.submission?.guide_name?.split(' ')[0]}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.submission?.google_email && (
                                                        <span className="account-info">
                                                            {item.submission.google_email}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </div>

            <FicheCompatibilityModal
                isOpen={isCompModalOpen}
                onClose={() => setIsCompModalOpen(false)}
                result={compatibilityResult}
                gmailAccounts={gmailAccounts}
                selectedGmailId={selectedGmailId}
                onSelectGmail={handleCheckCompatibility}
            />

            <ProofSubmissionChecklist
                isOpen={isChecklistOpen}
                onClose={() => {
                    setIsChecklistOpen(false);
                    setPendingProposalId(null);
                    navigate('/guide/fiches'); // Redirect to fiches list
                }}
                onConfirm={confirmSubmission}
                sectorName={fiche.sector || 'Général'}
                isHardSector={fiche.sector_difficulty === 'hard'}
                gmailAccounts={gmailAccounts}
                selectedGmailId={selectedGmailId}
                onGmailSelect={handleGmailSelect}
                quotaData={quotaData}
                submitLabel={pendingProposalId ? "Valider et soumettre" : "Accéder au texte de l'avis"}
            />

            {/* Modal annonce personnalisation des avis */}
            {showStarsWarning && (
                <div className="stars-warning-overlay">
                    <div
                        className="stars-warning-backdrop"
                        onClick={() => setShowStarsWarning(false)}
                    />
                    <div className="stars-warning-modal">
                        <div className="stars-warning-icon-circle">
                            <AlertTriangle size={32} color="#0369a1" />
                        </div>

                        <h3 className="stars-warning-title" style={{ color: '#0369a1' }}>
                            Personnalisez vos avis !
                        </h3>

                        <p className="stars-warning-text" style={{ textAlign: 'left', lineHeight: 1.6 }}>
                            Vous pouvez <strong style={{ color: '#0369a1' }}>modifier le texte des avis</strong> proposés en y ajoutant votre <strong>expérience personnelle</strong> et votre <strong>vécu réel</strong>.
                        </p>

                        <div style={{
                            background: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            borderRadius: '8px',
                            padding: '0.75rem 1rem',
                            margin: '0.75rem 0',
                            fontSize: '0.85rem',
                            color: '#0c4a6e',
                            textAlign: 'left',
                            lineHeight: 1.5
                        }}>
                            <strong>Exemples :</strong>
                            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                                <li>Décrivez ce que vous avez vu en passant devant le commerce</li>
                                <li>Partagez les retours de vos proches</li>
                                <li>Ajoutez des détails sur l'emplacement ou l'ambiance</li>
                            </ul>
                        </div>

                        <p className="stars-warning-text" style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            Un avis personnalisé a plus de valeur et réduit le risque de rejet. Respectez également le <strong>nombre d'étoiles</strong> indiqué.
                        </p>

                        <button
                            className="stars-warning-btn"
                            style={{ background: 'linear-gradient(135deg, #0369a1, #0284c7)' }}
                            onClick={() => setShowStarsWarning(false)}
                        >
                            J'ai compris
                        </button>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};
