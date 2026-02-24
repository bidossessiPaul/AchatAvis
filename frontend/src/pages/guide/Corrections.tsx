import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { guideService } from '../../services/guideService';
import {
    AlertTriangle,
    Link,
    Mail,
    RefreshCw,
    X,
    ExternalLink,
    CheckCircle2,
    Clock
} from 'lucide-react';
import { showSuccess, showError, showConfirm } from '../../utils/Swal';
import Swal from 'sweetalert2';
import './Submissions.css';

interface CorrectableSubmission {
    id: string;
    review_url: string;
    google_email: string;
    rejection_reason: string;
    submitted_at: string;
    earnings: number;
    artisan_company: string;
    sector: string;
    allow_resubmit: number;
    allow_appeal: number;
}

export const Corrections: React.FC = () => {
    const [submissions, setSubmissions] = useState<CorrectableSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<CorrectableSubmission | null>(null);
    const [editForm, setEditForm] = useState({ reviewUrl: '', googleEmail: '' });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await guideService.getCorrectableSubmissions();
            setSubmissions(data);
        } catch (error) {
            console.error('Failed to load correctable submissions', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (item: CorrectableSubmission) => {
        setEditingItem(item);
        setEditForm({
            reviewUrl: item.review_url || '',
            googleEmail: item.google_email || ''
        });
    };

    const handleAppeal = async (item: CorrectableSubmission) => {
        const result = await showConfirm(
            'Relancer cet avis ?',
            'Vous confirmez que votre avis est de nouveau visible sur Google. Il sera remis en attente de validation.'
        );
        if (!result.isConfirmed) return;

        setIsSaving(true);
        Swal.fire({
            title: 'Relance en cours...',
            text: 'Veuillez patienter',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            await guideService.updateSubmission(item.id, {
                reviewUrl: item.review_url,
                googleEmail: item.google_email
            });
            Swal.close();
            showSuccess('Appel envoyé !', 'Votre avis a été remis en attente de validation.');
            loadData();
        } catch (err: any) {
            console.error('Appeal failed:', err);
            Swal.close();
            showError('Erreur', err.response?.data?.message || 'Impossible de relancer la soumission.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;

        const result = await showConfirm(
            'Relancer cet avis ?',
            'Votre avis sera remis en attente de validation avec le nouveau lien.'
        );
        if (!result.isConfirmed) return;

        setIsSaving(true);
        Swal.fire({
            title: 'Relance en cours...',
            text: 'Veuillez patienter',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            await guideService.updateSubmission(editingItem.id, {
                reviewUrl: editForm.reviewUrl,
                googleEmail: editForm.googleEmail
            });
            setEditingItem(null);
            Swal.close();
            showSuccess('Avis relancé !', 'Votre avis a été remis en attente de validation.');
            loadData();
        } catch (err: any) {
            console.error('Resubmit failed:', err);
            Swal.close();
            showError('Erreur', err.response?.data?.message || 'Impossible de relancer la soumission.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout title="Corrections">
                <div className="loading-container">
                    <div className="spinner"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Corrections">
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                {/* Info Banner */}
                <div style={{
                    background: '#fffbeb',
                    border: '1px solid #fcd34d',
                    borderRadius: '1rem',
                    padding: '1rem 1.25rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem'
                }}>
                    <AlertTriangle size={20} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e', fontWeight: 600 }}>
                            Les avis ci-dessous ont été rejetés mais vous pouvez agir.
                        </p>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#a16207' }}>
                            <strong>Corriger :</strong> changez le lien si celui-ci était incorrect. <strong>Faire appel :</strong> relancez la validation si votre avis est de nouveau visible sur Google.
                        </p>
                    </div>
                </div>

                {submissions.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '4rem 2rem',
                        background: '#f8fafc',
                        borderRadius: '1rem',
                        border: '2px dashed #e2e8f0'
                    }}>
                        <CheckCircle2 size={48} style={{ color: '#10b981', marginBottom: '1rem' }} />
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.5rem' }}>
                            Aucun avis à corriger
                        </h3>
                        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
                            Tous vos avis sont en ordre. Revenez ici si un administrateur vous donne la possibilité de corriger un lien.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {submissions.map((item) => (
                            <div key={item.id} style={{
                                background: 'white',
                                borderRadius: '1rem',
                                border: '1px solid #e5e7eb',
                                padding: '1.25rem',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>
                                            {item.artisan_company || 'Entreprise'}
                                        </h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                                            <span style={{
                                                fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                                                background: item.allow_resubmit ? '#fff7ed' : '#eff6ff',
                                                color: item.allow_resubmit ? '#c2410c' : '#1d4ed8',
                                                border: item.allow_resubmit ? '1px solid #fed7aa' : '1px solid #bfdbfe'
                                            }}>
                                                {item.allow_resubmit ? 'Correction lien' : 'Appel'}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                                                {new Date(item.submitted_at).toLocaleDateString('fr-FR')}
                                            </span>
                                            {item.sector && (
                                                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                    {item.sector}
                                                </span>
                                            )}
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>
                                                +{Number(item.earnings || 0).toFixed(2)}€
                                            </span>
                                        </div>
                                    </div>
                                    {item.allow_resubmit ? (
                                        <button
                                            onClick={() => handleEdit(item)}
                                            style={{
                                                background: '#FF991F',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '0.5rem',
                                                padding: '0.5rem 1rem',
                                                fontSize: '0.8125rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.375rem'
                                            }}
                                        >
                                            <RefreshCw size={14} />
                                            Corriger
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleAppeal(item)}
                                            disabled={isSaving}
                                            style={{
                                                background: '#3b82f6',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '0.5rem',
                                                padding: '0.5rem 1rem',
                                                fontSize: '0.8125rem',
                                                fontWeight: 700,
                                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.375rem',
                                                opacity: isSaving ? 0.7 : 1
                                            }}
                                        >
                                            <RefreshCw size={14} />
                                            Faire appel
                                        </button>
                                    )}
                                </div>

                                {/* Rejection Reason */}
                                <div style={{
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    borderRadius: '0.5rem',
                                    padding: '0.75rem',
                                    marginBottom: '0.75rem'
                                }}>
                                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#991b1b', fontWeight: 600 }}>
                                        <AlertTriangle size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                        Raison du rejet :
                                    </p>
                                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#7f1d1d' }}>
                                        {item.rejection_reason || 'Aucune raison spécifiée'}
                                    </p>
                                </div>

                                {/* Current URL */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#6b7280' }}>
                                    <Link size={14} />
                                    <span style={{ wordBreak: 'break-all' }}>{item.review_url || 'Aucun lien'}</span>
                                    {item.review_url && (
                                        <a href={item.review_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', flexShrink: 0 }}>
                                            <ExternalLink size={14} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Edit Modal */}
                {editingItem && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                        padding: '1rem'
                    }}>
                        <div style={{
                            background: 'white', borderRadius: '1rem', padding: '2rem',
                            maxWidth: '500px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                                    Corriger le lien
                                </h3>
                                <button onClick={() => setEditingItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            {editingItem.rejection_reason && (
                                <div style={{
                                    background: '#fef2f2', border: '1px solid #fecaca',
                                    borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1.25rem'
                                }}>
                                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#991b1b', fontWeight: 600 }}>Raison du rejet :</p>
                                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#7f1d1d' }}>{editingItem.rejection_reason}</p>
                                </div>
                            )}

                            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                        <Link size={14} /> Nouveau lien de l'avis
                                    </label>
                                    <input
                                        type="url"
                                        required
                                        value={editForm.reviewUrl}
                                        onChange={(e) => setEditForm({ ...editForm, reviewUrl: e.target.value })}
                                        placeholder="https://maps.app.goo.gl/..."
                                        style={{
                                            padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db',
                                            fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                        <Mail size={14} /> Email Google utilisé
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={editForm.googleEmail}
                                        onChange={(e) => setEditForm({ ...editForm, googleEmail: e.target.value })}
                                        placeholder="votre.email@gmail.com"
                                        style={{
                                            padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db',
                                            fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setEditingItem(null)}
                                        style={{
                                            flex: 1, padding: '0.75rem', borderRadius: '0.5rem',
                                            border: '1px solid #d1d5db', background: 'white',
                                            fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', color: '#374151'
                                        }}
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        style={{
                                            flex: 1, padding: '0.75rem', borderRadius: '0.5rem',
                                            border: 'none', background: '#10b981', color: 'white',
                                            fontSize: '0.875rem', fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer',
                                            opacity: isSaving ? 0.7 : 1, display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', gap: '0.375rem'
                                        }}
                                    >
                                        <RefreshCw size={14} />
                                        {isSaving ? 'Relance...' : 'Relancer'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};
