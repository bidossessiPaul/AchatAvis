import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { Settings, Save } from 'lucide-react';
import { showSuccess, showError } from '../../../utils/Swal';
import { adminConfigApi } from '../../../services/signalement';
import type { SignalementConfig as Cfg } from '../../../types/signalement';
import './signalement-admin.css';

export const SignalementConfig: React.FC = () => {
    const [cfg, setCfg] = useState<Cfg | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const c = await adminConfigApi.get();
            setCfg(c);
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    };

    const save = async () => {
        if (!cfg) return;
        setSaving(true);
        try {
            await adminConfigApi.update({
                cooldown_hours_between_signalements: cfg.cooldown_hours_between_signalements,
                default_payout_cents: cfg.default_payout_cents,
                reservation_timer_minutes: cfg.reservation_timer_minutes,
                min_validated_reviews_for_eligibility: cfg.min_validated_reviews_for_eligibility,
            });
            showSuccess('Configuration mise à jour');
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading || !cfg) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

    return (
        <DashboardLayout>
            <div className="sig-admin-page" style={{ maxWidth: 700 }}>
                <div className="sig-admin-header">
                    <div>
                        <h1><Settings size={20} /> Configuration Signalement</h1>
                        <p>Paramètres globaux du module signalement (s'appliquent à tous les avis et tous les guides).</p>
                    </div>
                </div>

                <div className="sig-table-wrap" style={{ padding: '1.5rem' }}>
                    <div className="sig-form-group">
                        <label>Cooldown entre signalements sur le même avis (heures)</label>
                        <input type="number" min={0} value={cfg.cooldown_hours_between_signalements}
                            onChange={e => setCfg({ ...cfg, cooldown_hours_between_signalements: parseInt(e.target.value) || 0 })} />
                        <small style={{ color: '#64748b' }}>Délai minimum entre 2 signalements sur le même avis Google. Évite la détection de pattern Google.</small>
                    </div>

                    <div className="sig-form-group">
                        <label>Payout par défaut (€)</label>
                        <input type="number" min={0} step="0.01" value={(cfg.default_payout_cents / 100).toFixed(2)}
                            onChange={e => setCfg({ ...cfg, default_payout_cents: Math.round(parseFloat(e.target.value || '0') * 100) })} />
                        <small style={{ color: '#64748b' }}>Rémunération guide par signalement validé. Surchargeable par avis dans la page "Avis à signaler".</small>
                    </div>

                    <div className="sig-form-group">
                        <label>Timer de réservation (minutes)</label>
                        <input type="number" min={1} value={cfg.reservation_timer_minutes}
                            onChange={e => setCfg({ ...cfg, reservation_timer_minutes: parseInt(e.target.value) || 1 })} />
                        <small style={{ color: '#64748b' }}>Temps dont le guide dispose après réservation pour soumettre la preuve.</small>
                    </div>

                    <div className="sig-form-group">
                        <label>Avis classiques validés requis (éligibilité guide)</label>
                        <input type="number" min={0} value={cfg.min_validated_reviews_for_eligibility}
                            onChange={e => setCfg({ ...cfg, min_validated_reviews_for_eligibility: parseInt(e.target.value) || 0 })} />
                        <small style={{ color: '#64748b' }}>Nombre minimum d'avis classiques validés pour qu'un guide accède au signalement.</small>
                    </div>

                    <div style={{ marginTop: 16, textAlign: 'right' }}>
                        <button className="sig-btn sig-btn-primary" onClick={save} disabled={saving}>
                            <Save size={14} /> {saving ? 'Sauvegarde…' : 'Enregistrer'}
                        </button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default SignalementConfig;
