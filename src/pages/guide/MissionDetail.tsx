import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { guideService } from '../../services/guideService';
import toast from 'react-hot-toast';
import { ReviewOrder, ReviewProposal, ReviewSubmission } from '../../types';
import {
    MapPin,
    ExternalLink,
    Copy,
    CheckCircle2,
    AlertCircle,
    ChevronLeft,
    Clock,
    Star,
    Send,
    Shield
} from 'lucide-react';
import { useAntiDetectionStore } from '../../context/antiDetectionStore';
import { useAuthStore } from '../../context/authStore';
import { MissionCompatibilityModal } from '../../components/AntiDetection/MissionCompatibilityModal';
import { ProofSubmissionChecklist } from '../../components/AntiDetection/ProofSubmissionChecklist';
import './MissionDetail.css';

export const MissionDetail: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const [mission, setMission] = useState<ReviewOrder & {
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

    const { user } = useAuthStore();
    const { gmailAccounts, complianceData, fetchGmailAccounts, fetchComplianceData, checkMissionCompatibility } = useAntiDetectionStore();
    const [isChecklistOpen, setIsChecklistOpen] = useState(false);
    const [pendingProposalId, setPendingProposalId] = useState<string | null>(null);

    useEffect(() => {
        if (orderId) {
            loadMissionDetails(orderId);
        }
        if (user) {
            fetchGmailAccounts(user.id);
            fetchComplianceData(user.id);
        }
    }, [orderId, user, fetchGmailAccounts, fetchComplianceData]);

    const loadMissionDetails = async (id: string) => {
        setIsLoading(true);
        try {
            const data = await guideService.getMissionDetails(id);
            setMission(data);
        } catch (err: any) {
            console.error("Failed to load mission details", err);
            setError("Impossible de charger les détails de la mission.");
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
            const result = await checkMissionCompatibility(orderId, gmailId);
            setCompatibilityResult(result);
            setIsCompModalOpen(true);
            if (result.can_take) {
                setSelectedGmailId(gmailId);
                const account = gmailAccounts.find(a => a.id === gmailId);
                if (account) {
                    // Pre-fill email
                    setGoogleEmails(prev => ({ ...prev, current: account.email }));
                }
            }
        } catch (error) {
            toast.error("Erreur lors de la vérification de compatibilité");
        }
    };

    const handleSubmitProof = async (proposalId: string) => {
        const url = proofUrls[proposalId];
        const email = googleEmails[proposalId] || googleEmails['current'];

        if (!selectedGmailId && !compatibilityResult?.can_take) {
            toast.error("Veuillez d'abord vérifier la compatibilité de votre compte Gmail.");
            return;
        }

        if (!url || !url.startsWith('http')) {
            toast.error("Veuillez entrer un lien valide (commençant par http ou https).");
            return;
        }

        if (!email || !email.includes('@')) {
            toast.error("Veuillez entrer un email Google valide.");
            return;
        }

        // Open checklist before final submission
        setPendingProposalId(proposalId);
        setIsChecklistOpen(true);
    };

    const confirmSubmission = async () => {
        if (!pendingProposalId) return;

        const proposalId = pendingProposalId;
        const url = proofUrls[proposalId];
        const email = googleEmails[proposalId] || googleEmails['current'];

        setIsChecklistOpen(false);
        setSubmittingId(proposalId);

        try {
            await guideService.submitProof({
                orderId: mission!.id,
                proposalId,
                reviewUrl: url,
                googleEmail: email,
                artisanId: mission!.artisan_id,
                gmailAccountId: selectedGmailId || undefined
            });
            toast.success("Preuve soumise avec succès ! Elle sera validée par un administrateur.");
            loadMissionDetails(orderId!);
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
            const errorMessage = err.response?.data?.message || err.message || "Erreur lors de la soumission de la preuve.";
            toast.error(errorMessage);
        } finally {
            setSubmittingId(null);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout title="Chargement...">
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-yellow-500" />
                </div>
            </DashboardLayout>
        );
    }

    if (error || !mission) {
        return (
            <DashboardLayout title="Erreur">
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
                    <p>{error || "Mission non trouvée"}</p>
                    <button onClick={() => navigate('/guide')} className="btn-back" style={{ marginTop: '1rem' }}>
                        Retour aux missions
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    // Filter proposals into pending and published
    const publishedProposalIds = mission.submissions.map(s => s.proposal_id);
    const totalRemaining = Math.max(0, mission.quantity - mission.submissions.length);

    // Filter and cap the pending proposals to match the mission quantity
    const pendingProposals = mission.proposals
        .filter(p => !publishedProposalIds.includes(p.id))
        .slice(0, totalRemaining);

    const publishedProposals = mission.proposals.filter(p => publishedProposalIds.includes(p.id))
        .map(p => ({
            ...p,
            submission: mission.submissions.find(s => s.proposal_id === p.id)
        }));


    return (
        <DashboardLayout title="Détails de la Mission">
            <div className="mission-detail-container">
                <button onClick={() => navigate('/guide')} className="mission-back-button">
                    <ChevronLeft size={20} /> Retour aux missions
                </button>

                <div className="mission-grid">
                    {/* Main Content - Pending Reviews (Col 8) */}
                    <div className="mission-content-area">
                        <div className="mission-main-card">
                            <div className="mission-main-header">
                                <div>
                                    <h2 className="mission-company-name">
                                        {mission.artisan_company}
                                    </h2>
                                    <p className="mission-location">
                                        <MapPin size={18} /> {mission.city || 'Ville non spécifiée'}
                                    </p>
                                </div>
                                <div className="mission-badge">
                                    {mission.submissions.length} / {mission.quantity} avis soumis
                                </div>
                            </div>

                            {mission.google_business_url && (
                                <a
                                    href={mission.google_business_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="maps-link-btn"
                                    style={{ marginBottom: 'var(--space-8)' }}
                                >
                                    Voir sur Google Maps <ExternalLink size={16} />
                                </a>
                            )}

                            {/* Pending Reviews Section */}
                            <section>
                                <h3 className="section-header" style={{ marginTop: 0 }}>
                                    <Clock size={24} color="var(--warning)" /> Avis en attente ({pendingProposals.length})
                                </h3>

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

                                                <p className="review-content">
                                                    {proposal.content}
                                                </p>

                                                <div className="review-actions">
                                                    <button
                                                        onClick={() => handleCopy(proposal.content)}
                                                        className="copy-btn"
                                                    >
                                                        <Copy size={18} /> Copier le texte
                                                    </button>

                                                    <div className="submission-form">
                                                        <div className="field-group">
                                                            <label className="field-label">Email Google used</label>
                                                            <input
                                                                type="email"
                                                                placeholder="votre.email@gmail.com"
                                                                className="text-input"
                                                                value={googleEmails[proposal.id] || ''}
                                                                onChange={(e) => setGoogleEmails(prev => ({ ...prev, [proposal.id]: e.target.value }))}
                                                            />
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
                                ) : mission.proposals.length > 0 ? (
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
                    <aside className="mission-sidebar">
                        <div className="info-card">
                            <h3 className="info-card-title">Instructions</h3>

                            <div className="instruction-item">
                                <div className="instruction-icon-wrapper gray">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <p className="instruction-label">Rythme conseillé</p>
                                    <p className="instruction-value">
                                        {mission.publication_pace || '1 avis par jour'}
                                    </p>
                                </div>
                            </div>

                            <div className="instruction-item">
                                <div className="instruction-icon-wrapper success">
                                    <CheckCircle2 size={20} />
                                </div>
                                <div>
                                    <p className="instruction-label">Rémunération</p>
                                    <p className="instruction-value price">2.00 €</p>
                                    <p className="instruction-value" style={{ fontSize: 'var(--text-xs)' }}>par avis validé</p>
                                </div>
                            </div>

                            <div className="instruction-warning-box">
                                <p className="instruction-warning-text">
                                    <strong>Rythme :</strong> Ne publiez qu'un seul avis à la fois en respectant le temps d'attente conseillé.
                                </p>
                            </div>

                            {/* Gmail Account Selector */}
                            <div style={{ marginTop: 'var(--space-4)', padding: '1.25rem', background: '#f0f9ff', borderRadius: '1rem', border: '1px solid #e0f2fe' }}>
                                <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0369a1', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Shield size={18} /> COMPTE GMAIL
                                </h4>

                                {gmailAccounts.length > 0 ? (
                                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                                        {gmailAccounts.map(account => (
                                            <button
                                                key={account.id}
                                                onClick={() => handleCheckCompatibility(account.id)}
                                                style={{
                                                    padding: '0.75rem',
                                                    borderRadius: '0.75rem',
                                                    border: `2px solid ${selectedGmailId === account.id ? '#0ea5e9' : '#f3f4f6'}`,
                                                    background: 'white',
                                                    textAlign: 'left',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>{account.email}</span>
                                                {selectedGmailId === account.id && <CheckCircle2 size={16} color="#0ea5e9" />}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Aucun compte Gmail enregistré.</p>
                                        <Link
                                            to="/profile?tab=gmail"
                                            style={{
                                                display: 'inline-block',
                                                marginTop: '0.5rem',
                                                fontSize: '0.75rem',
                                                color: '#0ea5e9',
                                                fontWeight: 600,
                                                textDecoration: 'none'
                                            }}
                                        >
                                            + Ajouter un compte
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Published Reviews Section - Moved to sidebar */}
                        {publishedProposals.length > 0 && (
                            <div className="mission-published-card sidebar-card" style={{ marginTop: 'var(--space-4)' }}>
                                <h3 className="section-header" style={{ marginTop: 0, fontSize: 'var(--text-lg)' }}>
                                    <CheckCircle2 size={20} color="var(--success)" /> Avis déjà publiés ({publishedProposals.length})
                                </h3>

                                <div className="reviews-stack published-stack">
                                    {publishedProposals.map((item) => (
                                        <div key={item.id} className="published-item sidebar-item">
                                            <div className="published-info">
                                                <p className="published-text" style={{ fontSize: 'var(--text-xs)' }}>
                                                    {item.content}
                                                </p>
                                                <div className="published-meta">
                                                    <a href={item.submission?.review_url} target="_blank" rel="noopener noreferrer" className="proof-link">
                                                        Preuve <ExternalLink size={10} />
                                                    </a>
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

            <MissionCompatibilityModal
                isOpen={isCompModalOpen}
                onClose={() => setIsCompModalOpen(false)}
                result={compatibilityResult}
            />

            <ProofSubmissionChecklist
                isOpen={isChecklistOpen}
                onClose={() => setIsChecklistOpen(false)}
                onConfirm={confirmSubmission}
                sectorName={mission.sector || 'Général'}
                isHardSector={mission.sector_difficulty === 'hard'}
                gmailAccount={gmailAccounts.find(a => a.id === selectedGmailId)}
                complianceScore={complianceData?.compliance_score || 0}
            />
        </DashboardLayout>
    );
};
