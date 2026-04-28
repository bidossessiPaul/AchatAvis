// Section "Signalement" à inclure dans la page ArtisanDetail.
// Affiche les attributions de packs signalement de l'artisan + permet d'en attribuer un nouveau.

import { useState, useEffect } from 'react';
import { Flag, Plus, Edit3, Pause, Play, Trash2 } from 'lucide-react';
import { showSuccess, showError } from '../../utils/Swal';
import Swal from 'sweetalert2';
import { adminAttributionApi, adminPacksApi } from '../../services/signalement';
import type { SignalementAttribution, SignalementPack } from '../../types/signalement';

interface Props { artisanId: string; }

export const ArtisanSignalementSection = ({ artisanId }: Props) => {
    const [attributions, setAttributions] = useState<SignalementAttribution[]>([]);
    const [remaining, setRemaining] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => { load(); }, [artisanId]);

    const load = async () => {
        setLoading(true);
        try {
            const data = await adminAttributionApi.listForArtisan(artisanId);
            setAttributions(data.attributions);
            setRemaining(data.avis_remaining);
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    };

    const attribute = async () => {
        try {
            const packs = await adminPacksApi.list(false);
            if (packs.length === 0) {
                showError('Aucun pack disponible', 'Créez d\'abord un pack dans /admin/signalement/packs');
                return;
            }
            const options: Record<string, string> = {};
            packs.forEach((p: SignalementPack) => {
                options[p.id] = `${p.name} — ${p.nb_avis} avis × ${p.nb_signalements_par_avis} sig — ${(p.price_cents/100).toFixed(2)} €`;
            });

            const { value: packId } = await Swal.fire({
                title: 'Attribuer un pack signalement',
                input: 'select',
                inputOptions: options,
                inputPlaceholder: 'Choisir un pack',
                showCancelButton: true,
                confirmButtonText: 'Attribuer',
                cancelButtonText: 'Annuler',
            });
            if (!packId) return;

            const { value: note } = await Swal.fire({
                title: 'Note interne (optionnel)',
                input: 'textarea',
                inputPlaceholder: 'Contexte d\'attribution…',
                showCancelButton: true,
                confirmButtonText: 'Confirmer',
                cancelButtonText: 'Annuler',
            });

            await adminAttributionApi.create({ artisan_id: artisanId, pack_id: packId, note: note || undefined });
            showSuccess('Pack attribué');
            load();
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        }
    };

    const editNote = async (a: SignalementAttribution) => {
        const { value: note, isConfirmed } = await Swal.fire({
            title: 'Modifier la note',
            input: 'textarea',
            inputValue: a.note ?? '',
            inputPlaceholder: 'Note interne…',
            showCancelButton: true,
            confirmButtonText: 'Enregistrer',
            cancelButtonText: 'Annuler',
        });
        if (!isConfirmed) return;
        try {
            const updated = await adminAttributionApi.updateNote(a.id, note ?? '');
            setAttributions(prev => prev.map(x => x.id === a.id ? updated : x));
            showSuccess('Note mise à jour');
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        }
    };

    const togglePause = async (a: SignalementAttribution) => {
        const action = a.is_paused ? 'reprendre' : 'mettre en pause';
        const { isConfirmed } = await Swal.fire({
            title: `${a.is_paused ? 'Reprendre' : 'Mettre en pause'} l'attribution ?`,
            text: a.is_paused
                ? 'L\'artisan pourra à nouveau utiliser ce crédit.'
                : 'L\'artisan ne pourra plus créer de nouveaux avis depuis ce crédit.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: `Oui, ${action}`,
            cancelButtonText: 'Annuler',
        });
        if (!isConfirmed) return;
        try {
            const updated = await adminAttributionApi.togglePause(a.id);
            setAttributions(prev => prev.map(x => x.id === a.id ? updated : x));
            showSuccess(a.is_paused ? 'Attribution reprise' : 'Attribution mise en pause');
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        }
    };

    const remove = async (a: SignalementAttribution) => {
        const { isConfirmed } = await Swal.fire({
            title: 'Supprimer l\'attribution ?',
            text: 'Les avis en cours rattachés à ce crédit resteront actifs. Action irréversible.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Supprimer',
            cancelButtonColor: '#d33',
            cancelButtonText: 'Annuler',
        });
        if (!isConfirmed) return;
        try {
            await adminAttributionApi.remove(a.id);
            setAttributions(prev => prev.filter(x => x.id !== a.id));
            showSuccess('Attribution supprimée');
            load(); // recalcule remaining
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        }
    };

    return (
        <div className="premium-card table-card" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                    <Flag size={18} /> Signalement — Attributions de packs
                    <span style={{ background: '#dcfce7', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700 }}>
                        {remaining} avis restants
                    </span>
                </h3>
                <button onClick={attribute}
                    style={{ background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Plus size={14} /> Attribuer un pack
                </button>
            </div>

            <div style={{ padding: loading ? '1.5rem' : 0 }}>
                {loading ? (
                    <div style={{ color: '#64748b' }}>Chargement…</div>
                ) : attributions.length === 0 ? (
                    <div style={{ padding: '1.5rem', color: '#94a3b8', textAlign: 'center' }}>
                        Aucun pack signalement attribué à cet artisan.
                    </div>
                ) : (
                    <table className="premium-table">
                        <thead>
                            <tr>
                                <th>Date attribution</th>
                                <th>Avis (consommé / total)</th>
                                <th>Signalements / avis</th>
                                <th>Statut</th>
                                <th>Note</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attributions.map(a => (
                                <tr key={a.id} style={{ opacity: a.is_paused ? 0.6 : 1 }}>
                                    <td>{new Date(a.attributed_at).toLocaleDateString('fr-FR')}</td>
                                    <td>{a.nb_avis_consumed} / {a.nb_avis_total}</td>
                                    <td>{a.nb_signalements_par_avis}</td>
                                    <td>
                                        {a.is_paused ? (
                                            <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
                                                En pause
                                            </span>
                                        ) : (
                                            <span style={{ background: '#dcfce7', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
                                                Actif
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {a.note || '—'}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                            <button
                                                onClick={() => editNote(a)}
                                                title="Modifier la note"
                                                style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '0.3rem 0.5rem', cursor: 'pointer', color: '#475569', display: 'inline-flex', alignItems: 'center' }}>
                                                <Edit3 size={14} />
                                            </button>
                                            <button
                                                onClick={() => togglePause(a)}
                                                title={a.is_paused ? 'Reprendre' : 'Mettre en pause'}
                                                style={{ background: a.is_paused ? '#dcfce7' : '#fef3c7', border: 'none', borderRadius: 6, padding: '0.3rem 0.5rem', cursor: 'pointer', color: a.is_paused ? '#166534' : '#92400e', display: 'inline-flex', alignItems: 'center' }}>
                                                {a.is_paused ? <Play size={14} /> : <Pause size={14} />}
                                            </button>
                                            <button
                                                onClick={() => remove(a)}
                                                title="Supprimer"
                                                style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '0.3rem 0.5rem', cursor: 'pointer', color: '#991b1b', display: 'inline-flex', alignItems: 'center' }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
