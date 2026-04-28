import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { Flag, ExternalLink, ArrowRight, Lock, Clock } from 'lucide-react';
import { showSuccess, showError } from '../../../utils/Swal';
import { guideSignalementApi } from '../../../services/signalement';
import type {
    AvailableAvisForGuide,
    GuideEligibility,
    ActiveSlotForGuide,
    GuideSignalementStats,
} from '../../../types/signalement';
import { SIGNALEMENT_RAISONS } from '../../../constants/signalementRaisons';
import './GuideSignalementsList.css';

export const GuideSignalementsList = () => {
    const navigate = useNavigate();
    const [avis, setAvis] = useState<AvailableAvisForGuide[]>([]);
    const [eligibility, setEligibility] = useState<GuideEligibility | null>(null);
    const [activeSlots, setActiveSlots] = useState<ActiveSlotForGuide[]>([]);
    const [stats, setStats] = useState<GuideSignalementStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const [available, slots, st] = await Promise.all([
                guideSignalementApi.listAvailable(),
                guideSignalementApi.myActiveSlots(),
                guideSignalementApi.myStats(),
            ]);
            setAvis(available.avis);
            setEligibility(available.eligibility);
            setActiveSlots(slots);
            setStats(st);
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    };

    const takeSlot = async (a: AvailableAvisForGuide) => {
        try {
            const slot = await guideSignalementApi.reserveAnySlot(a.avis_id);
            showSuccess('Slot réservé — vous avez 30 minutes pour soumettre votre preuve');
            navigate(`/guide/signalement/slot/${slot.id}`);
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        }
    };

    const goToSlot = (slotId: string) => navigate(`/guide/signalement/slot/${slotId}`);

    if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

    return (
        <DashboardLayout>
            <div className="gsig-page">
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Flag size={22} /> Signalement d'avis
                </h1>
                <p style={{ color: '#64748b', marginTop: 4, marginBottom: 24 }}>
                    Aidez les artisans à signaler les avis Google diffamatoires. {(eligibility && eligibility.eligible) ? `Payout : ~0,35€ par signalement validé.` : ''}
                </p>

                {eligibility && !eligibility.eligible && (
                    <div className="gsig-banner-warning">
                        <Lock size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                        <strong>Vous n'êtes pas encore éligible au signalement.</strong>
                        <ul>
                            {eligibility.reasons.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                    </div>
                )}

                {stats && (
                    <div className="gsig-stats">
                        <div className="gsig-stat-card"><div className="label">Validés</div><div className="value">{stats.validated_count}</div></div>
                        <div className="gsig-stat-card alt-blue"><div className="label">En attente</div><div className="value">{stats.pending_count}</div></div>
                        <div className="gsig-stat-card alt-purple"><div className="label">Solde signalement</div><div className="value">{(stats.balance_cents / 100).toFixed(2)} €</div></div>
                    </div>
                )}

                {activeSlots.length > 0 && (
                    <div className="gsig-active-section">
                        <h2 style={{ marginTop: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={18} /> Mes slots en cours ({activeSlots.length})
                        </h2>
                        {activeSlots.map(s => (
                            <div key={s.slot_id} className="gsig-active-card">
                                <div>
                                    <div><strong>{SIGNALEMENT_RAISONS[s.raison] || s.raison}</strong></div>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                        Expire à {new Date(s.reservation_expires_at).toLocaleTimeString('fr-FR')}
                                    </div>
                                </div>
                                <button className="gsig-btn-take" onClick={() => goToSlot(s.slot_id)}>
                                    Soumettre la preuve <ArrowRight size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <h2 style={{ fontSize: '1.1rem', marginTop: 24, marginBottom: 12 }}>Avis à signaler disponibles</h2>

                {!eligibility?.eligible ? (
                    <div className="gsig-empty">Devenez éligible pour voir les avis à signaler.</div>
                ) : avis.length === 0 ? (
                    <div className="gsig-empty">Aucun avis dispo pour l'instant — revenez plus tard.</div>
                ) : (
                    avis.map(a => (
                        <div key={a.avis_id} className="gsig-card">
                            <h3>
                                <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
                                    {SIGNALEMENT_RAISONS[a.raison] || a.raison}
                                </span>
                            </h3>
                            <div className="meta">
                                {a.raison_details && <div>« {a.raison_details} »</div>}
                                <div style={{ marginTop: 4 }}>Slots restants : {a.nb_slots_remaining} / {a.nb_signalements_target}</div>
                            </div>
                            <div className="footer">
                                <a href={a.google_review_url} target="_blank" rel="noreferrer">
                                    <ExternalLink size={14} /> Voir l'avis sur Google
                                </a>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span className="payout">{(a.payout_per_signalement_cents / 100).toFixed(2)} €</span>
                                    {a.can_take ? (
                                        <button className="gsig-btn-take" onClick={() => takeSlot(a)}>
                                            Prendre <ArrowRight size={14} />
                                        </button>
                                    ) : (
                                        <span className="blocked">{a.blocked_reason || 'Indisponible'}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </DashboardLayout>
    );
};

export default GuideSignalementsList;
