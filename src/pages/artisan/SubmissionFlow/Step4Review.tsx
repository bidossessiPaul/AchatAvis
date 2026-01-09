import React, { useState } from 'react';
import { ReviewOrder, ReviewProposal } from '../../../types';
import { artisanService } from '../../../services/artisanService';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';

interface Step4Props {
    order: ReviewOrder;
    proposals: ReviewProposal[];
    onBack: () => void;
}

export const Step4Review: React.FC<Step4Props> = ({ order, proposals, onBack }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await artisanService.updateDraft(order.id, { status: 'submitted' });
            setIsSuccess(true);
            setTimeout(() => {
                navigate('/artisan');
            }, 3000);
        } catch (error) {
            console.error("Submission failed", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: '#ecfdf5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'scaleUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}>
                        <CheckCircle size={48} style={{ color: '#10b981' }} />
                    </div>
                </div>
                <h2 className="submission-card-title">Soumission réussie !</h2>
                <p style={{ color: '#1a1a1a', marginBottom: '2rem', fontWeight: 500 }}>
                    Vos {proposals.length} avis ont été envoyés à notre réseau de Local Guides. <br />
                    Vous recevrez une notification dès qu'ils seront publiés.
                </p>
                <button onClick={() => navigate('/artisan')} className="btn-next" style={{ margin: '0 auto' }}>
                    Retour au dashboard
                </button>
                <p style={{ fontSize: '0.875rem', color: '#4b5563', marginTop: '1.5rem', fontWeight: 600 }}>
                    Redirection automatique dans 3 secondes...
                </p>
            </div>
        );
    }

    return (
        <div>
            <h2 className="submission-card-title">Résumé de la soumission</h2>

            <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Entreprise</span>
                        <p style={{ fontWeight: 700, margin: '0.25rem 0', color: '#000' }}>{order.company_name}</p>
                    </div>
                    <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Forfait</span>
                        <p style={{ fontWeight: 700, margin: '0.25rem 0', color: '#000' }}>{order.quantity} avis</p>
                    </div>
                    <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Secteur</span>
                        <p style={{ fontWeight: 700, margin: '0.25rem 0', color: '#000' }}>{order.sector}</p>
                    </div>
                    <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ton</span>
                        <p style={{ fontWeight: 700, margin: '0.25rem 0', textTransform: 'capitalize', color: '#000' }}>{order.desired_tone}</p>
                    </div>
                    <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rythme</span>
                        <p style={{ fontWeight: 700, margin: '0.25rem 0', color: '#000' }}>{order.reviews_per_day} avis / jour</p>
                    </div>
                    <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ville</span>
                        <p style={{ fontWeight: 700, margin: '0.25rem 0', color: '#000' }}>{order.city || 'Non renseignée'}</p>
                    </div>
                </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Avis à soumettre ({proposals.length})</h3>
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
                    {proposals.map((p, idx) => (
                        <div key={p.id} style={{ padding: '1.25rem', borderBottom: idx === proposals.length - 1 ? 'none' : '1px solid #f3f4f6' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#000' }}>{p.author_name}</span>
                                <span style={{ color: '#ff3b6a' }}>{'★'.repeat(p.rating)}</span>
                            </div>
                            <p style={{ fontSize: '0.9375rem', color: '#1a1a1a', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>{p.content}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="submission-actions">
                <button type="button" onClick={onBack} className="btn-back" disabled={isSubmitting}>
                    Retour
                </button>
                <button
                    type="button"
                    onClick={handleSubmit}
                    className="btn-next"
                    disabled={isSubmitting}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    {isSubmitting ? (
                        <><Loader2 className="animate-spin" size={18} /> Traitement...</>
                    ) : (
                        <>Confirmer et Soumettre <ArrowRight size={18} /></>
                    )}
                </button>
            </div>
        </div>
    );
};
