import React, { useState, useRef, useMemo } from 'react';
import { ReviewOrder, ReviewProposal, ProposalImage } from '../../../types';
import { artisanService } from '../../../services/artisanService';
import { Trash2, Check, RefreshCw, Sparkles, AlertCircle, Star, ImagePlus, X, Image as ImageIcon } from 'lucide-react';
import { showConfirm, showError } from '../../../utils/Swal';

const EXPERIENCE_LABELS: Record<string, { label: string; bg: string; color: string }> = {
    tested:  { label: 'Testé',            bg: '#dcfce7', color: '#166534' },
    visited: { label: 'Visité',           bg: '#dbeafe', color: '#1d4ed8' },
    online:  { label: 'Observé en ligne', bg: '#ede9fe', color: '#6d28d9' },
    hearsay: { label: 'Bouche-à-oreille', bg: '#fef3c7', color: '#92400e' },
};

function ExperienceBadge({ type }: { type?: string }) {
    if (!type) return null;
    const cfg = EXPERIENCE_LABELS[type];
    if (!cfg) return null;
    return (
        <span style={{
            display: 'inline-block',
            padding: '0.15rem 0.5rem',
            borderRadius: '1rem',
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            background: cfg.bg,
            color: cfg.color,
            marginTop: '0.3rem',
            whiteSpace: 'nowrap',
        }}>
            {cfg.label}
        </span>
    );
}

// Mirror du backend : 30→5, 60→10, 90→25, défaut 5
function getImageQuotaForQuantity(quantity: number): number {
    if (!quantity || quantity < 30) return 5;
    if (quantity >= 90) return 25;
    if (quantity >= 60) return 10;
    return 5;
}

interface Step3Props {
    order: ReviewOrder;
    proposals: ReviewProposal[];
    onNext: () => void;
    onBack: () => void;
    setProposals: React.Dispatch<React.SetStateAction<ReviewProposal[]>>;
    onError?: (error: string | null) => void;
}

export const Step3AIGeneration: React.FC<Step3Props> = ({ order, proposals, onNext, onBack, setProposals, onError }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState<{ current: number, target: number } | null>(null);
    const abortRef = useRef(false);

    const handleGenerate = async (force: boolean = false) => {
        if (isGenerating) return;
        setIsGenerating(true);
        abortRef.current = false;
        if (onError) onError(null);

        const target = order.quantity || 1;
        setProgress({ current: force ? 0 : proposals.length, target });

        let isForce = force;
        let retries = 0;
        const maxRetries = 2;

        while (!abortRef.current) {
            try {
                const result = await artisanService.generateBatch(order.id, isForce);
                setProposals(result.proposals);
                setProgress({ current: result.generated, target: result.target });
                isForce = false; // Only force on first call

                if (result.complete) {
                    // All done
                    retries = 0;
                    break;
                }
                retries = 0; // Reset retries on success
            } catch (error: any) {
                console.error("Batch generation error:", error);
                retries++;
                if (retries > maxRetries) {
                    // After max retries, stop but don't show error if some reviews exist
                    if (onError) {
                        const serverMsg = error.response?.data?.message || error.response?.data?.error;
                        if (error.response?.status === 502) {
                            onError("Le service IA est temporairement indisponible. Cliquez sur 'Compléter' pour réessayer.");
                        } else if (serverMsg) {
                            onError(`Erreur : ${serverMsg}`);
                        } else {
                            onError("Erreur lors de la génération. Cliquez sur 'Compléter la génération' pour reprendre.");
                        }
                    }
                    break;
                }
                // Wait before retry
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        setIsGenerating(false);
        setProgress(null);
    };

    const handleDelete = async (p: ReviewProposal) => {
        if (p.submission_id) return;
        try {
            await artisanService.deleteProposal(p.id);
            setProposals(prev => prev.filter(item => item.id !== p.id));
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    // ---- Gestion images attachées aux propositions ----
    const [uploadingProposalId, setUploadingProposalId] = useState<string | null>(null);
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const imageQuota = useMemo(() => getImageQuotaForQuantity(order.quantity || 0), [order.quantity]);
    const imagesUsed = useMemo(
        () => proposals.reduce((sum, p) => sum + (p.images?.length || 0), 0),
        [proposals]
    );
    const imagesRemaining = Math.max(0, imageQuota - imagesUsed);

    const handlePickImages = (proposalId: string) => {
        const input = fileInputRefs.current[proposalId];
        if (input) input.click();
    };

    const handleUploadImages = async (proposalId: string, fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) return;
        const files = Array.from(fileList);

        // Pré-check taille (10 Mo max par image, comme côté serveur)
        const MAX_BYTES = 10 * 1024 * 1024;
        const tooLarge = files.find(f => f.size > MAX_BYTES);
        if (tooLarge) {
            showError(
                'Image trop volumineuse',
                `${tooLarge.name} fait ${(tooLarge.size / (1024 * 1024)).toFixed(1)} Mo (max 10 Mo).`
            );
            const input = fileInputRefs.current[proposalId];
            if (input) input.value = '';
            return;
        }

        // Pré-check quota côté client (le backend re-vérifie)
        if (files.length > imagesRemaining) {
            showError(
                'Quota dépassé',
                `Il reste ${imagesRemaining} image${imagesRemaining > 1 ? 's' : ''} sur ${imageQuota} pour cette fiche.`
            );
            // Reset input
            const input = fileInputRefs.current[proposalId];
            if (input) input.value = '';
            return;
        }

        setUploadingProposalId(proposalId);
        try {
            const { images } = await artisanService.uploadProposalImages(proposalId, files);
            setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, images } : p));
        } catch (error: any) {
            console.error('Upload images failed', error);
            const msg = error?.response?.data?.message || error?.message || 'Erreur upload';
            showError("Échec de l'upload", msg);
        } finally {
            setUploadingProposalId(null);
            const input = fileInputRefs.current[proposalId];
            if (input) input.value = '';
        }
    };

    const handleDeleteImage = async (proposalId: string, publicId: string) => {
        const confirm = await showConfirm("Supprimer cette image ?", "L'image sera retirée de l'avis.");
        if (!confirm.isConfirmed) return;
        try {
            const { images } = await artisanService.deleteProposalImage(proposalId, publicId);
            setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, images } : p));
        } catch (error: any) {
            console.error('Delete image failed', error);
            showError('Échec de la suppression', error?.response?.data?.message || error?.message || 'Erreur');
        }
    };

    // Bloc compact réutilisé desktop + mobile : thumbs + bouton ajouter
    const renderImagesBlock = (p: ReviewProposal) => {
        const imgs: ProposalImage[] = p.images || [];
        const isUploading = uploadingProposalId === p.id;
        const canAdd = imagesRemaining > 0 && !p.submission_id && !isUploading;
        return (
            <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                    {imgs.map(img => (
                        <div
                            key={img.publicId}
                            style={{
                                position: 'relative',
                                width: 56,
                                height: 56,
                                borderRadius: 8,
                                overflow: 'hidden',
                                border: '1px solid #e2e8f0',
                                background: '#f8fafc'
                            }}
                        >
                            <img
                                src={img.url}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                            {!p.submission_id && (
                                <button
                                    type="button"
                                    onClick={() => handleDeleteImage(p.id, img.publicId)}
                                    title="Supprimer"
                                    style={{
                                        position: 'absolute',
                                        top: 2,
                                        right: 2,
                                        width: 18,
                                        height: 18,
                                        borderRadius: '50%',
                                        border: 'none',
                                        background: 'rgba(220, 38, 38, 0.9)',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 0
                                    }}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    ))}

                    {!p.submission_id && (
                        <>
                            <input
                                ref={el => { fileInputRefs.current[p.id] = el; }}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                style={{ display: 'none' }}
                                onChange={(e) => handleUploadImages(p.id, e.target.files)}
                            />
                            <button
                                type="button"
                                disabled={!canAdd}
                                onClick={() => handlePickImages(p.id)}
                                title={imagesRemaining === 0 ? 'Quota atteint pour cette fiche' : 'Ajouter une ou plusieurs images'}
                                style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 8,
                                    border: '1px dashed #94a3b8',
                                    background: canAdd ? '#f8fafc' : '#f1f5f9',
                                    color: canAdd ? '#059669' : '#94a3b8',
                                    cursor: canAdd ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0
                                }}
                            >
                                {isUploading ? <RefreshCw size={18} className="spin" /> : <ImagePlus size={20} />}
                            </button>
                        </>
                    )}
                </div>
                {imgs.length > 0 && (
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
                        {imgs.length} image{imgs.length > 1 ? 's' : ''} attachée{imgs.length > 1 ? 's' : ''}
                    </div>
                )}
            </div>
        );
    };

    // Bandeau global de quota images (au-dessus de la liste)
    const ImagesQuotaBanner = () => {
        const percent = imageQuota > 0 ? Math.min(100, Math.round((imagesUsed / imageQuota) * 100)) : 0;
        const reached = imagesUsed >= imageQuota;
        return (
            <div
                style={{
                    backgroundColor: reached ? '#fef3c7' : '#f0fdfa',
                    border: `1px solid ${reached ? '#fbbf24' : '#5eead4'}`,
                    padding: '0.75rem 1rem',
                    borderRadius: '0.75rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}
            >
                <ImageIcon size={18} style={{ color: reached ? '#92400e' : '#0f766e' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: reached ? '#92400e' : '#0f766e' }}>
                            Images de la fiche
                        </span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: reached ? '#92400e' : '#0f766e' }}>
                            {imagesUsed} / {imageQuota}
                        </span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: reached ? '#d97706' : '#0d9488', transition: 'width 0.3s ease' }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 4 }}>
                        Pack {order.quantity || 0} avis — {imageQuota} images max au total. {reached ? 'Quota atteint.' : `Reste ${imagesRemaining} image${imagesRemaining > 1 ? 's' : ''}.`}
                    </div>
                </div>
            </div>
        );
    };

    const handleNextClick = () => {
        if (proposals.length < (order.quantity || 0)) {
            const missing = (order.quantity || 0) - proposals.length;
            showConfirm(
                "Génération incomplète",
                `Il reste encore ${missing} avis à générer pour atteindre votre pack (${order.quantity} avis). Souhaitez-vous générer les avis manquants maintenant ?`
            ).then((result) => {
                if (result.isConfirmed) {
                    handleGenerate();
                }
            });
            return;
        }
        onNext();
    };

    // Progress bar component
    const ProgressBar = () => {
        if (!progress) return null;
        const percent = progress.target > 0 ? Math.round((progress.current / progress.target) * 100) : 0;
        return (
            <div style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #93c5fd',
                padding: '1rem',
                borderRadius: '0.75rem',
                marginBottom: '1.5rem'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <RefreshCw size={16} className="spin" style={{ color: '#2563eb' }} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e40af' }}>
                            Génération en cours...
                        </span>
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e40af' }}>
                        {progress.current}/{progress.target} avis
                    </span>
                </div>
                <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#dbeafe',
                    borderRadius: '4px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${percent}%`,
                        height: '100%',
                        backgroundColor: '#2563eb',
                        borderRadius: '4px',
                        transition: 'width 0.5s ease'
                    }} />
                </div>
            </div>
        );
    };

    // Initial state: no proposals, not generating — show launch button + spinner area
    const showInitialSpinner = isGenerating && proposals.length === 0;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="submission-card-title" style={{ margin: 0 }}>Génération des avis</h2>
                {proposals.length === 0 && !isGenerating && (
                    <button onClick={() => handleGenerate()} className="btn-next" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Sparkles size={18} />
                        Lancer la génération
                    </button>
                )}
            </div>

            {showInitialSpinner ? (
                <div className="ai-loader-container">
                    <div className="ai-loader-visual">
                        <div className="ai-loader-ring"></div>
                        <div className="ai-loader-ring"></div>
                        <div className="ai-loader-ring"></div>
                        <div className="ai-loader-icon">
                            <Sparkles size={60} />
                        </div>
                    </div>
                    <div className="ai-loader-text-container">
                        <h3 className="ai-loader-title">Génération en cours</h3>
                        <p className="ai-loader-subtitle">
                            {progress ? `${progress.current}/${progress.target} avis générés...` : "L'IA analyse vos informations..."}
                        </p>
                        <div style={{
                            width: '200px',
                            height: '6px',
                            backgroundColor: '#e5e7eb',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            margin: '1rem auto 0'
                        }}>
                            <div style={{
                                width: progress ? `${Math.round((progress.current / progress.target) * 100)}%` : '0%',
                                height: '100%',
                                backgroundColor: '#10b981',
                                borderRadius: '3px',
                                transition: 'width 0.5s ease'
                            }} />
                        </div>
                    </div>
                </div>
            ) : proposals.length > 0 ? (
                <div className="proposals-list">
                    {/* Progress bar during incremental generation */}
                    {isGenerating && <ProgressBar />}

                    {/* Compteur global d'images de la fiche */}
                    <ImagesQuotaBanner />

                    {/* Status banner (only when NOT generating) */}
                    {!isGenerating && (
                        <div className={`proposals-status-banner ${(order.quantity || 0) > proposals.length ? 'incomplete' : 'complete'}`}>
                            <div className="psb-left">
                                <div className={`psb-icon ${(order.quantity || 0) > proposals.length ? 'incomplete' : 'complete'}`}>
                                    {(order.quantity || 0) > proposals.length ? <AlertCircle size={20} /> : <Check size={20} />}
                                </div>
                                <div>
                                    <span className="psb-title">
                                        {proposals.length} avis générés sur {order.quantity}
                                    </span>
                                    <span className="psb-subtitle">
                                        {(order.quantity || 0) > proposals.length
                                            ? `Il manque ${(order.quantity || 0) - proposals.length} avis pour compléter votre pack.`
                                            : "Tous les avis requis ont été générés avec succès."}
                                    </span>
                                </div>
                            </div>
                            {(order.quantity || 0) > proposals.length ? (
                                <button onClick={() => handleGenerate()} disabled={isGenerating} className="psb-btn-complete">
                                    <Sparkles size={14} />
                                    <span>Compléter</span>
                                </button>
                            ) : (
                                <button onClick={() => { if (window.confirm('Voulez-vous vraiment tout régénérer ? Les avis actuels seront supprimés.')) { handleGenerate(true); } }} disabled={isGenerating} className="psb-btn-regen">
                                    <RefreshCw size={12} />
                                    <span>Tout régénérer</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Desktop: Table layout */}
                    <div className="proposals-table-wrapper proposals-desktop">
                        <table className="proposals-table">
                            <thead>
                                <tr>
                                    <th className="pt-author">Auteur</th>
                                    <th className="pt-stars">Étoiles</th>
                                    <th className="pt-content">Contenu</th>
                                    <th className="pt-actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {proposals.map((p, index) => (
                                    <tr key={p.id}>
                                        <td className="pt-cell pt-cell-author">
                                            <div className="pt-author-info">
                                                <span className="pt-author-name">Avis {index + 1}</span>
                                                {p.submission_id && (
                                                    <span className="pt-published-badge">
                                                        <Check size={10} /> PUBLIÉ
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="pt-cell pt-cell-stars">
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}>
                                                <div className="pt-stars-row">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star
                                                            key={star}
                                                            size={16}
                                                            fill={star <= (p.rating || 5) ? '#f59e0b' : 'none'}
                                                            color={star <= (p.rating || 5) ? '#f59e0b' : '#d1d5db'}
                                                        />
                                                    ))}
                                                </div>
                                                <ExperienceBadge type={p.experience_type} />
                                            </div>
                                        </td>
                                        <td className="pt-cell pt-cell-content">
                                            <p style={{ margin: 0, fontWeight: 500 }}>{p.content}</p>
                                            {renderImagesBlock(p)}
                                        </td>
                                        <td className="pt-cell pt-cell-actions">
                                            {!p.submission_id && (
                                                <div className="pt-action-btns">
                                                    <button onClick={() => handleDelete(p)} className="pt-btn-delete"><Trash2 size={16} /></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile: Card layout */}
                    <div className="proposals-mobile">
                        {proposals.map((p, index) => (
                            <div key={p.id} className="proposal-card-mobile">
                                <div className="pcm-header">
                                    <div className="pcm-author-row">
                                        <span className="pt-author-name">Avis {index + 1}</span>
                                        {p.submission_id && (
                                            <span className="pt-published-badge">
                                                <Check size={10} /> PUBLIÉ
                                            </span>
                                        )}
                                    </div>
                                    {!p.submission_id && (
                                        <div className="pt-action-btns">
                                            <button onClick={() => handleDelete(p)} className="pt-btn-delete"><Trash2 size={16} /></button>
                                        </div>
                                    )}
                                </div>
                                <div className="pcm-stars">
                                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <div className="pt-stars-row">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    size={18}
                                                    fill={star <= (p.rating || 5) ? '#f59e0b' : 'none'}
                                                    color={star <= (p.rating || 5) ? '#f59e0b' : '#d1d5db'}
                                                />
                                            ))}
                                        </div>
                                        <ExperienceBadge type={p.experience_type} />
                                    </div>
                                </div>
                                <div className="pcm-content">
                                    <p style={{ margin: 0, fontWeight: 500 }}>{p.content}</p>
                                    {renderImagesBlock(p)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '3rem', border: '2px dashed #e5e7eb', borderRadius: '1rem' }}>
                    <p style={{ color: '#6b7280' }}>Aucun avis généré pour le moment.</p>
                </div>
            )}

            <div className="submission-actions">
                <button type="button" onClick={onBack} className="btn-back">
                    Retour
                </button>
                <button
                    type="button"
                    onClick={handleNextClick}
                    className="btn-next"
                    disabled={isGenerating}
                >
                    {proposals.length < (order.quantity || 0) ? "Suivant (Incomplet)" : "Suivant"}
                </button>
            </div>
        </div>
    );
};
