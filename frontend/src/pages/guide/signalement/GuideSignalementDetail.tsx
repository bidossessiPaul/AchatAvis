import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { Flag, ExternalLink, Upload, ArrowLeft } from 'lucide-react';
import { showSuccess, showError } from '../../../utils/Swal';
import { guideSignalementApi } from '../../../services/signalement';
import type { ActiveSlotForGuide } from '../../../types/signalement';
import { SIGNALEMENT_RAISONS, SIGNALEMENT_RAISONS_DESCRIPTIONS } from '../../../constants/signalementRaisons';
import './GuideSignalementsList.css';

export const GuideSignalementDetail = () => {
    const { slotId } = useParams<{ slotId: string }>();
    const navigate = useNavigate();

    const [slot, setSlot] = useState<ActiveSlotForGuide | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [reportLink, setReportLink] = useState('');
    const [note, setNote] = useState('');
    const [remainingSec, setRemainingSec] = useState<number>(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => { load(); return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, [slotId]);

    const load = async () => {
        setLoading(true);
        try {
            const slots = await guideSignalementApi.myActiveSlots();
            const found = slots.find(s => s.slot_id === slotId) || null;
            setSlot(found);
            if (found) startTimer(found.reservation_expires_at);
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    };

    const startTimer = (expiresAt: string) => {
        const end = new Date(expiresAt).getTime();
        const tick = () => {
            const sec = Math.max(0, Math.floor((end - Date.now()) / 1000));
            setRemainingSec(sec);
            if (sec <= 0 && intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
        tick();
        intervalRef.current = setInterval(tick, 1000);
    };

    const submit = async () => {
        if (!slotId) return;
        if (!file) return showError('Erreur', 'Sélectionnez une capture d\'écran');
        setSubmitting(true);
        try {
            await guideSignalementApi.submitProof(slotId, file, reportLink || undefined, note || undefined);
            showSuccess('Preuve soumise — en attente de validation par l\'admin');
            navigate('/guide/signalement');
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

    if (!slot) {
        return (
            <DashboardLayout>
                <div className="gsig-page">
                    <button onClick={() => navigate('/guide/signalement')} style={{ background: 'none', border: 'none', color: '#2383e2', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <ArrowLeft size={16} /> Retour
                    </button>
                    <div className="gsig-empty">Slot introuvable ou expiré.</div>
                </div>
            </DashboardLayout>
        );
    }

    const min = Math.floor(remainingSec / 60);
    const sec = remainingSec % 60;
    const timerCls = remainingSec < 300 ? 'gsig-timer warning' : 'gsig-timer';

    return (
        <DashboardLayout>
            <div className="gsig-page">
                <button onClick={() => navigate('/guide/signalement')} style={{ background: 'none', border: 'none', color: '#2383e2', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: 16 }}>
                    <ArrowLeft size={16} /> Retour à la liste
                </button>

                <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Flag size={22} /> Soumettre la preuve de signalement
                </h1>

                <div className="gsig-detail-card" style={{ marginTop: 16 }}>
                    <div className={timerCls}>
                        Temps restant : {min.toString().padStart(2, '0')}:{sec.toString().padStart(2, '0')}
                    </div>

                    <div style={{ marginBottom: 12 }}>
                        <strong>Raison à signaler :</strong> {SIGNALEMENT_RAISONS[slot.raison] || slot.raison}
                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                            {SIGNALEMENT_RAISONS_DESCRIPTIONS[slot.raison]}
                        </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                        <strong>Avis à signaler :</strong>
                        <div style={{ marginTop: 4 }}>
                            <a href={slot.google_review_url} target="_blank" rel="noreferrer">
                                <ExternalLink size={14} /> Ouvrir l'avis Google
                            </a>
                        </div>
                    </div>

                    <div className="gsig-instructions">
                        <strong>Procédure</strong>
                        <ol>
                            <li>Cliquez sur le lien ci-dessus pour ouvrir l'avis Google</li>
                            <li>Cliquez sur les 3 points de l'avis → <em>"Signaler l'avis"</em></li>
                            <li>Choisissez la raison <strong>« {SIGNALEMENT_RAISONS[slot.raison]} »</strong></li>
                            <li>Validez le signalement et faites une <strong>capture d'écran</strong> de la confirmation</li>
                            <li>Uploadez la capture ci-dessous + soumettez</li>
                        </ol>
                    </div>

                    <div className="gsig-form-group">
                        <label>Capture d'écran de la confirmation Google *</label>
                        <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
                    </div>

                    <div className="gsig-form-group">
                        <label>Lien de l'avis (optionnel — peut différer de l'URL initiale)</label>
                        <input type="url" value={reportLink} onChange={e => setReportLink(e.target.value)} placeholder="https://..." />
                    </div>

                    <div className="gsig-form-group">
                        <label>Note (optionnel)</label>
                        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Détails utiles pour l'admin…" />
                    </div>

                    <button onClick={submit} disabled={submitting || !file}
                        style={{ background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Upload size={14} /> {submitting ? 'Envoi…' : 'Soumettre la preuve'}
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default GuideSignalementDetail;
