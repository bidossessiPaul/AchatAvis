import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { ShieldCheck, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import { showSuccess, showError } from '../../../utils/Swal';
import Swal from 'sweetalert2';
import { adminValidationsApi } from '../../../services/signalement';
import type { SignalementProofWithContext } from '../../../types/signalement';
import { SIGNALEMENT_RAISONS } from '../../../constants/signalementRaisons';
import './signalement-admin.css';

export const SignalementValidations: React.FC = () => {
    const [proofs, setProofs] = useState<SignalementProofWithContext[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    useEffect(() => { load(); }, [page]);

    const load = async () => {
        setLoading(true);
        try {
            const data = await adminValidationsApi.listPending(page, 50);
            setProofs(data.proofs);
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    };

    const approve = async (p: SignalementProofWithContext) => {
        try {
            await adminValidationsApi.approve(p.id);
            showSuccess('Preuve validée — guide payé');
            load();
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        }
    };

    const reject = async (p: SignalementProofWithContext) => {
        const { value } = await Swal.fire({
            title: 'Rejeter cette preuve',
            input: 'textarea',
            inputLabel: 'Raison du rejet (sera visible par le guide)',
            inputPlaceholder: 'Ex: Capture floue, lien manquant, mauvaise raison signalée…',
            showCancelButton: true,
            confirmButtonText: 'Rejeter',
            cancelButtonText: 'Annuler',
            inputValidator: (v) => !v || v.trim().length < 3 ? 'Min 3 caractères' : null,
        });
        if (!value) return;
        try {
            await adminValidationsApi.reject(p.id, value.trim());
            showSuccess('Preuve rejetée');
            load();
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        }
    };

    const openImage = (url: string) => window.open(url, '_blank');

    return (
        <DashboardLayout>
            <div className="sig-admin-page">
                <div className="sig-admin-header">
                    <div>
                        <h1><ShieldCheck size={20} /> Validation des preuves</h1>
                        <p>Preuves de signalement en attente de validation, du plus ancien au plus récent.</p>
                    </div>
                </div>

                {loading ? <LoadingSpinner /> : proofs.length === 0 ? (
                    <div className="sig-empty">Aucune preuve en attente — bonne nouvelle.</div>
                ) : (
                    proofs.map(p => (
                        <div key={p.id} className="sig-validation-card">
                            <div className="header">
                                <div>
                                    <div className="meta">
                                        Guide : <strong>{p.guide_email}</strong> · Soumis le {new Date(p.submitted_at).toLocaleString('fr-FR')}
                                    </div>
                                    <div style={{ marginTop: 4 }}>
                                        <a href={p.google_review_url} target="_blank" rel="noreferrer">
                                            <ExternalLink size={14} /> Avis Google
                                        </a>
                                        <span className="sig-badge sig-badge-pending" style={{ marginLeft: 8 }}>
                                            {SIGNALEMENT_RAISONS[p.raison] || p.raison}
                                        </span>
                                    </div>
                                    {p.raison_details && <div style={{ marginTop: 4, fontSize: '0.85rem', color: '#64748b' }}>« {p.raison_details} »</div>}
                                </div>
                                <div style={{ fontWeight: 700, color: '#059669' }}>
                                    {(p.earnings_cents / 100).toFixed(2)} €
                                </div>
                            </div>

                            <img src={p.screenshot_url} alt="capture" className="sig-screenshot-thumb" onClick={() => openImage(p.screenshot_url)} />

                            {p.report_link && (
                                <div style={{ marginTop: 8, fontSize: '0.85rem' }}>
                                    Lien fourni : <a href={p.report_link} target="_blank" rel="noreferrer">{p.report_link}</a>
                                </div>
                            )}
                            {p.note_guide && (
                                <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#475569' }}>
                                    Note guide : « {p.note_guide} »
                                </div>
                            )}

                            <div className="actions">
                                <button className="sig-btn sig-btn-primary" onClick={() => approve(p)}>
                                    <CheckCircle2 size={14} /> Valider
                                </button>
                                <button className="sig-btn sig-btn-danger" onClick={() => reject(p)}>
                                    <XCircle size={14} /> Rejeter
                                </button>
                            </div>
                        </div>
                    ))
                )}

                {proofs.length >= 50 && (
                    <div className="sig-pagination">
                        <span>Page {page}</span>
                        <div>
                            <button className="sig-btn sig-btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Précédent</button>
                            <button className="sig-btn sig-btn-secondary" onClick={() => setPage(page + 1)} style={{ marginLeft: 8 }}>Suivant</button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default SignalementValidations;
