import React, { useState, useEffect } from 'react';
import { ReviewOrder, ReviewProposal } from '../../../types';
import { artisanService } from '../../../services/artisanService';
import { Trash2, Edit2, Check, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
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
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
    const loadingMessages = [
        "L'IA analyse vos informations...",
        "Optimisation du ton et du style...",
        "Rédaction de vos avis personnalisés...",
        "Finalisation des propositions..."
    ];

    useEffect(() => {
        let interval: any;
        if (isGenerating) {
            interval = setInterval(() => {
                setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
            }, 2500);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);

    const handleGenerate = async (force: boolean = false) => {
        setIsGenerating(true);
        setLoadingMessageIndex(0);
        if (onError) onError(null);
        try {
            // Save to backend - triggered with no proposals to use OpenAI on backend
            // Pass force flag
            const savedProposals = await artisanService.generateProposals(order.id, [], force);
            setProposals(savedProposals);
        } catch (error: any) {
            console.error("Failed to generate", error);
            if (onError) {
                onError("Erreur lors de la génération des avis. Veuillez réessayer.");
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDelete = async (p: ReviewProposal) => {
        if (p.submission_id) return; // Cannot delete published reviews
        try {
            await artisanService.deleteProposal(p.id);
            setProposals(prev => prev.filter(item => item.id !== p.id));
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    const handleEdit = (p: ReviewProposal) => {
        if (p.submission_id) return; // Cannot edit published reviews
        setEditingId(p.id);
        setEditValue(p.content);
    };

    const handleSaveEdit = async (id: string) => {
        try {
            await artisanService.updateProposal(id, { content: editValue });
            setProposals(prev => prev.map(p => p.id === id ? { ...p, content: editValue } : p));
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

            {isGenerating ? (
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
                        <p className="ai-loader-subtitle">{loadingMessages[loadingMessageIndex]}</p>
                        <div className="ai-loader-progress-dots">
                            <div className="ai-dot"></div>
                            <div className="ai-dot"></div>
                            <div className="ai-dot"></div>
                        </div>
                    </div>
                </div>
            ) : proposals.length > 0 ? (
                <div className="proposals-list">
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: (order.quantity || 0) > proposals.length ? '#fffbeb' : '#f0fdf4',
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        marginBottom: '1.5rem',
                        border: (order.quantity || 0) > proposals.length ? '1px solid #fcd34d' : '1px solid #86efac'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: (order.quantity || 0) > proposals.length ? '#fef3c7' : '#dcfce7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: (order.quantity || 0) > proposals.length ? '#b45309' : '#15803d'
                            }}>
                                {(order.quantity || 0) > proposals.length ? <AlertCircle size={20} /> : <Check size={20} />}
                            </div>
                            <div>
                                <span style={{ fontSize: '0.9375rem', color: '#1e293b', fontWeight: 700, display: 'block' }}>
                                    {proposals.length} avis générés sur {order.quantity}
                                </span>
                                <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>
                                    {(order.quantity || 0) > proposals.length
                                        ? `Il manque ${(order.quantity || 0) - proposals.length} avis pour compléter votre pack.`
                                        : "Tous les avis requis ont été générés avec succès."}
                                </span>
                            </div>
                        </div>
                        {(order.quantity || 0) > proposals.length ? (
                            <button onClick={() => handleGenerate()} style={{ background: '#10b981', color: 'white', borderRadius: '0.5rem', padding: '0.5rem 1rem', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', fontWeight: 700, boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)' }}>
                                <Sparkles size={14} />
                                Compléter la génération
                            </button>
                        ) : (
                            <button onClick={() => { if (window.confirm('Voulez-vous vraiment tout régénérer ? Les avis actuels seront supprimés.')) { handleGenerate(true); } }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                                <RefreshCw size={12} />
                                Tout régénérer
                            </button>
                        )}
                    </div>

                    <div className="proposals-table-wrapper" style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                            <thead style={{ backgroundColor: '#f9fafb' }}>
                                <tr>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', borderBottom: '1px solid #e5e7eb' }}>Auteur</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', borderBottom: '1px solid #e5e7eb' }}>Contenu</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {proposals.map((p) => (
                                    <tr key={p.id}>
                                        <td style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top', width: '20%' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#000' }}>{p.author_name}</span>
                                                {p.submission_id && (
                                                    <span style={{
                                                        fontSize: '0.625rem',
                                                        backgroundColor: '#ecfdf5',
                                                        color: '#059669',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        fontWeight: 700,
                                                        width: 'fit-content',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '2px'
                                                    }}>
                                                        <Check size={10} /> PUBLLIÉ
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #f3f4f6', fontSize: '0.9375rem', color: '#1a1a1a', lineHeight: 1.6 }}>
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
                                        <td style={{ padding: '1rem', borderBottom: '1px solid #f3f4f6', textAlign: 'right', verticalAlign: 'top', width: '15%' }}>
                                            {!p.submission_id && (
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                    {editingId === p.id ? (
                                                        <button onClick={() => handleSaveEdit(p.id)} style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}><Check size={18} /></button>
                                                    ) : (
                                                        <button onClick={() => handleEdit(p)} style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}><Edit2 size={16} /></button>
                                                    )}
                                                    <button onClick={() => handleDelete(p)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
