import React, { useState, useRef } from 'react';
import { ReviewOrder, ReviewProposal } from '../../../types';
import { artisanService } from '../../../services/artisanService';
import { Trash2, Check, RefreshCw, Sparkles, AlertCircle, Star, Edit3, ShieldAlert, X } from 'lucide-react';
import { showConfirm } from '../../../utils/Swal';

const EXPERIENCE_LABELS: Record<string, { label: string; bg: string; color: string }> = {
    tested:  { label: 'Testé',            bg: '#dcfce7', color: '#166534' },
    visited: { label: 'Sans tester',      bg: '#dbeafe', color: '#1d4ed8' },
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
    const [disclaimerTarget, setDisclaimerTarget] = useState<ReviewProposal | null>(null);
    const [editingProposal, setEditingProposal] = useState<ReviewProposal | null>(null);
    const [editContent, setEditContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
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
                isForce = false;

                if (result.complete) {
                    retries = 0;
                    break;
                }
                retries = 0;
            } catch (error: any) {
                console.error("Batch generation error:", error);
                retries++;
                if (retries > maxRetries) {
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

    const handleDisclaimerAccept = () => {
        if (!disclaimerTarget) return;
        setEditingProposal(disclaimerTarget);
        setEditContent(disclaimerTarget.content || '');
        setDisclaimerTarget(null);
    };

    const handleSaveEdit = async () => {
        if (!editingProposal) return;
        setIsSaving(true);
        try {
            await artisanService.updateProposal(editingProposal.id, { content: editContent });
            setProposals(prev => prev.map(p =>
                p.id === editingProposal.id
                    ? { ...p, content: editContent, modified_by_artisan_at: new Date().toISOString() }
                    : p
            ));
            setEditingProposal(null);
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Erreur lors de la sauvegarde.');
        } finally {
            setIsSaving(false);
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

    const showInitialSpinner = isGenerating && proposals.length === 0;

    return (
        <div>
            {/* Disclaimer modal */}
            {disclaimerTarget && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: 'white', borderRadius: '1.25rem', maxWidth: '520px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
                        <div style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <ShieldAlert size={24} color="white" />
                            <h3 style={{ margin: 0, color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>Avant de modifier cet avis</h3>
                        </div>
                        <div style={{ padding: '1.5rem' }}>
                            <p style={{ margin: '0 0 1rem', color: '#374151', fontWeight: 500 }}>En modifiant cet avis, vous acceptez les règles suivantes :</p>
                            <ul style={{ margin: '0 0 1rem', padding: '0 0 0 1.25rem', color: '#4b5563', lineHeight: 1.7, fontSize: '0.9rem' }}>
                                <li>L'avis doit rester authentique et conforme aux règles Google.</li>
                                <li>Vous êtes responsable du contenu que vous modifiez.</li>
                                <li>Aucune information fausse, trompeuse ou à visée SEO n'est autorisée.</li>
                            </ul>
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.75rem', padding: '0.875rem 1rem', marginBottom: '1.5rem' }}>
                                <p style={{ margin: 0, color: '#991b1b', fontSize: '0.875rem', fontWeight: 600 }}>
                                    Les avis que vous modifiez ne sont plus couverts par la garantie AchatAvis. En cas de suppression par Google, nous ne pourrons pas les remplacer.
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                <button onClick={() => setDisclaimerTarget(null)} style={{ padding: '0.65rem 1.25rem', borderRadius: '0.625rem', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#374151' }}>
                                    Annuler
                                </button>
                                <button onClick={handleDisclaimerAccept} style={{ padding: '0.65rem 1.25rem', borderRadius: '0.625rem', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white', cursor: 'pointer', fontWeight: 700 }}>
                                    J'accepte et je modifie
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit modal */}
            {editingProposal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: 'white', borderRadius: '1.25rem', maxWidth: '580px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Modifier l'avis</h3>
                            <button onClick={() => setEditingProposal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
                        </div>
                        <div style={{ padding: '1.5rem' }}>
                            <textarea
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                rows={8}
                                style={{ width: '100%', border: '2px solid #7c3aed', borderRadius: '8px', padding: '0.75rem', fontSize: '0.9rem', lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                            />
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button onClick={() => setEditingProposal(null)} style={{ padding: '0.65rem 1.25rem', borderRadius: '0.625rem', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontWeight: 600 }}>
                                    Annuler
                                </button>
                                <button onClick={handleSaveEdit} disabled={isSaving} style={{ padding: '0.65rem 1.25rem', borderRadius: '0.625rem', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white', cursor: 'pointer', fontWeight: 700 }}>
                                    {isSaving ? 'Sauvegarde...' : 'Enregistrer'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div style={{
                display: 'flex',
                gap: '0.75rem',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '0.75rem',
                padding: '1rem 1.25rem',
                marginBottom: '1.5rem',
                alignItems: 'flex-start',
            }}>
                <AlertCircle size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e', lineHeight: 1.6, fontWeight: 500 }}>
                    <strong>Important :</strong> Les avis affichés ici sont des exemples que nos Guides Locaux utilisent comme référence pour rédiger leurs propres avis sur votre fiche. Ils illustrent les bonnes pratiques de la Charte de Qualité &amp; d'Authenticité des Avis – Guides Locaux. Ce ne sont pas les avis qui seront publiés tels quels, et ils ne sont pas modifiables depuis la plateforme.
                </p>
            </div>

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
                    {isGenerating && <ProgressBar />}

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
                                    <tr key={p.id} style={p.modified_by_artisan_at ? { background: '#fdf4ff', borderLeft: '3px solid #a855f7' } : {}}>
                                        <td className="pt-cell pt-cell-author">
                                            <div className="pt-author-info">
                                                <span className="pt-author-name">Avis {index + 1}</span>
                                                {p.submission_id && (
                                                    <span className="pt-published-badge">
                                                        <Check size={10} /> PUBLIÉ
                                                    </span>
                                                )}
                                                {p.modified_by_artisan_at && (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: '#ede9fe', color: '#6d28d9', borderRadius: '1rem', padding: '0.15rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, marginTop: '0.2rem' }}>
                                                        <Edit3 size={10} /> Modifié par vous
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
                                        </td>
                                        <td className="pt-cell pt-cell-actions">
                                            {!p.submission_id && (
                                                <div className="pt-action-btns">
                                                    <button
                                                        onClick={() => setDisclaimerTarget(p)}
                                                        title="Modifier"
                                                        style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.35rem', cursor: 'pointer', color: '#7c3aed', display: 'flex', alignItems: 'center' }}
                                                    >
                                                        <Edit3 size={15} />
                                                    </button>
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
                            <div key={p.id} className="proposal-card-mobile" style={p.modified_by_artisan_at ? { background: '#fdf4ff', borderLeft: '3px solid #a855f7' } : {}}>
                                <div className="pcm-header">
                                    <div className="pcm-author-row">
                                        <span className="pt-author-name">Avis {index + 1}</span>
                                        {p.submission_id && (
                                            <span className="pt-published-badge">
                                                <Check size={10} /> PUBLIÉ
                                            </span>
                                        )}
                                        {p.modified_by_artisan_at && (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: '#ede9fe', color: '#6d28d9', borderRadius: '1rem', padding: '0.15rem 0.5rem', fontSize: '0.65rem', fontWeight: 700 }}>
                                                <Edit3 size={10} /> Modifié par vous
                                            </span>
                                        )}
                                    </div>
                                    {!p.submission_id && (
                                        <div className="pt-action-btns">
                                            <button
                                                onClick={() => setDisclaimerTarget(p)}
                                                title="Modifier"
                                                style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.35rem', cursor: 'pointer', color: '#7c3aed', display: 'flex', alignItems: 'center' }}
                                            >
                                                <Edit3 size={15} />
                                            </button>
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
