import React, { useState, useRef } from 'react';
import { ReviewOrder, ReviewProposal } from '../../../types';
import { artisanService } from '../../../services/artisanService';
import { Trash2, Edit2, Check, RefreshCw, Sparkles, AlertCircle, Star } from 'lucide-react';
import { showConfirm } from '../../../utils/Swal';

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
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [editRating, setEditRating] = useState<number>(5);
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

    const handleEdit = (p: ReviewProposal) => {
        if (p.submission_id) return;
        setEditingId(p.id);
        setEditValue(p.content);
        setEditRating(p.rating || 5);
    };

    const handleSaveEdit = async (id: string) => {
        try {
            await artisanService.updateProposal(id, { content: editValue, rating: editRating });
            setProposals(prev => prev.map(p => p.id === id ? { ...p, content: editValue, rating: editRating } : p));
            setEditingId(null);
        } catch (error) {
            console.error("Edit failed", error);
        }
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
                                {proposals.map((p) => (
                                    <tr key={p.id}>
                                        <td className="pt-cell pt-cell-author">
                                            <div className="pt-author-info">
                                                <span className="pt-author-name">{p.author_name}</span>
                                                {p.submission_id && (
                                                    <span className="pt-published-badge">
                                                        <Check size={10} /> PUBLIÉ
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="pt-cell pt-cell-stars">
                                            {editingId === p.id ? (
                                                <div className="pt-stars-row">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star
                                                            key={star}
                                                            size={20}
                                                            fill={star <= editRating ? '#f59e0b' : 'none'}
                                                            color={star <= editRating ? '#f59e0b' : '#d1d5db'}
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={() => setEditRating(star)}
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
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
                                            )}
                                        </td>
                                        <td className="pt-cell pt-cell-content">
                                            {editingId === p.id ? (
                                                <textarea
                                                    className="form-textarea"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    style={{ minHeight: '100px', marginBottom: 0, color: '#000' }}
                                                />
                                            ) : (
                                                <p style={{ margin: 0, fontWeight: 500 }}>{p.content}</p>
                                            )}
                                        </td>
                                        <td className="pt-cell pt-cell-actions">
                                            {!p.submission_id && (
                                                <div className="pt-action-btns">
                                                    {editingId === p.id ? (
                                                        <button onClick={() => handleSaveEdit(p.id)} className="pt-btn-save"><Check size={18} /></button>
                                                    ) : (
                                                        <button onClick={() => handleEdit(p)} className="pt-btn-edit"><Edit2 size={16} /></button>
                                                    )}
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
                        {proposals.map((p) => (
                            <div key={p.id} className="proposal-card-mobile">
                                <div className="pcm-header">
                                    <div className="pcm-author-row">
                                        <span className="pt-author-name">{p.author_name}</span>
                                        {p.submission_id && (
                                            <span className="pt-published-badge">
                                                <Check size={10} /> PUBLIÉ
                                            </span>
                                        )}
                                    </div>
                                    {!p.submission_id && (
                                        <div className="pt-action-btns">
                                            {editingId === p.id ? (
                                                <button onClick={() => handleSaveEdit(p.id)} className="pt-btn-save"><Check size={18} /></button>
                                            ) : (
                                                <button onClick={() => handleEdit(p)} className="pt-btn-edit"><Edit2 size={16} /></button>
                                            )}
                                            <button onClick={() => handleDelete(p)} className="pt-btn-delete"><Trash2 size={16} /></button>
                                        </div>
                                    )}
                                </div>
                                <div className="pcm-stars">
                                    {editingId === p.id ? (
                                        <div className="pt-stars-row">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    size={22}
                                                    fill={star <= editRating ? '#f59e0b' : 'none'}
                                                    color={star <= editRating ? '#f59e0b' : '#d1d5db'}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => setEditRating(star)}
                                                />
                                            ))}
                                        </div>
                                    ) : (
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
                                    )}
                                </div>
                                <div className="pcm-content">
                                    {editingId === p.id ? (
                                        <textarea
                                            className="form-textarea"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            style={{ minHeight: '100px', marginBottom: 0, color: '#000' }}
                                        />
                                    ) : (
                                        <p style={{ margin: 0, fontWeight: 500 }}>{p.content}</p>
                                    )}
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
