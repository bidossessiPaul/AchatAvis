import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { Plus, Edit2, Trash2, Package, ToggleLeft, ToggleRight } from 'lucide-react';
import { showSuccess, showError, showConfirm } from '../../../utils/Swal';
import { adminPacksApi } from '../../../services/signalement';
import type { SignalementPack } from '../../../types/signalement';
import './signalement-admin.css';

export const SignalementPacks: React.FC = () => {
    const [packs, setPacks] = useState<SignalementPack[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<SignalementPack | null>(null);
    const [form, setForm] = useState({
        name: '', nb_avis: 5, nb_signalements_par_avis: 10, price_cents: 5000,
    });

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await adminPacksApi.list(true);
            setPacks(data);
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ name: '', nb_avis: 5, nb_signalements_par_avis: 10, price_cents: 5000 });
        setModalOpen(true);
    };

    const openEdit = (p: SignalementPack) => {
        setEditing(p);
        setForm({
            name: p.name,
            nb_avis: p.nb_avis,
            nb_signalements_par_avis: p.nb_signalements_par_avis,
            price_cents: p.price_cents,
        });
        setModalOpen(true);
    };

    const save = async () => {
        if (!form.name.trim()) return showError('Erreur', 'Nom requis');
        try {
            if (editing) {
                await adminPacksApi.update(editing.id, form);
                showSuccess('Pack mis à jour');
            } else {
                await adminPacksApi.create(form);
                showSuccess('Pack créé');
            }
            setModalOpen(false);
            load();
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        }
    };

    const toggleActive = async (p: SignalementPack) => {
        try {
            await adminPacksApi.update(p.id, { is_active: !p.is_active });
            load();
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        }
    };

    const remove = async (p: SignalementPack) => {
        const ok = await showConfirm('Supprimer ce pack ?', `"${p.name}" sera désactivé. Les attributions existantes restent intactes.`);
        if (!ok.isConfirmed) return;
        try {
            await adminPacksApi.remove(p.id);
            showSuccess('Pack supprimé');
            load();
        } catch (e: any) {
            showError('Erreur', e.response?.data?.error || e.message);
        }
    };

    return (
        <DashboardLayout>
            <div className="sig-admin-page">
                <div className="sig-admin-header">
                    <div>
                        <h1><Package size={20} /> Packs Signalement</h1>
                        <p>Templates de packs à attribuer aux artisans (signalement d'avis Google).</p>
                    </div>
                    <button className="sig-btn sig-btn-primary" onClick={openCreate}>
                        <Plus size={16} /> Créer un pack
                    </button>
                </div>

                {loading ? <LoadingSpinner /> : packs.length === 0 ? (
                    <div className="sig-empty">Aucun pack créé pour le moment.</div>
                ) : (
                    <div className="sig-table-wrap">
                        <table className="sig-table">
                            <thead>
                                <tr>
                                    <th>Nom</th>
                                    <th>Avis</th>
                                    <th>Signalements / avis</th>
                                    <th>Prix</th>
                                    <th>Actif</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {packs.map(p => (
                                    <tr key={p.id}>
                                        <td><strong>{p.name}</strong></td>
                                        <td>{p.nb_avis}</td>
                                        <td>{p.nb_signalements_par_avis}</td>
                                        <td>{(p.price_cents / 100).toFixed(2)} €</td>
                                        <td>
                                            <button className="sig-btn sig-btn-ghost" onClick={() => toggleActive(p)} title={p.is_active ? 'Désactiver' : 'Activer'}>
                                                {p.is_active ? <ToggleRight size={20} color="#059669" /> : <ToggleLeft size={20} color="#94a3b8" />}
                                            </button>
                                        </td>
                                        <td>
                                            <button className="sig-btn sig-btn-ghost" onClick={() => openEdit(p)} title="Éditer">
                                                <Edit2 size={14} />
                                            </button>
                                            <button className="sig-btn sig-btn-ghost" onClick={() => remove(p)} title="Supprimer">
                                                <Trash2 size={14} color="#dc2626" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {modalOpen && (
                    <div className="sig-modal-overlay" onClick={() => setModalOpen(false)}>
                        <div className="sig-modal" onClick={e => e.stopPropagation()}>
                            <div className="sig-modal-header">
                                <h2>{editing ? 'Éditer le pack' : 'Nouveau pack signalement'}</h2>
                            </div>
                            <div className="sig-modal-body">
                                <div className="sig-form-group">
                                    <label>Nom du pack</label>
                                    <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ex: Basique 5/10" />
                                </div>
                                <div className="sig-form-group">
                                    <label>Nombre d'avis signalables</label>
                                    <input type="number" min={1} value={form.nb_avis} onChange={e => setForm({...form, nb_avis: parseInt(e.target.value) || 0})} />
                                </div>
                                <div className="sig-form-group">
                                    <label>Signalements par avis</label>
                                    <input type="number" min={1} value={form.nb_signalements_par_avis} onChange={e => setForm({...form, nb_signalements_par_avis: parseInt(e.target.value) || 0})} />
                                </div>
                                <div className="sig-form-group">
                                    <label>Prix (€)</label>
                                    <input type="number" min={0} step="0.01" value={(form.price_cents / 100).toFixed(2)}
                                        onChange={e => setForm({...form, price_cents: Math.round(parseFloat(e.target.value || '0') * 100)})} />
                                </div>
                            </div>
                            <div className="sig-modal-footer">
                                <button className="sig-btn sig-btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
                                <button className="sig-btn sig-btn-primary" onClick={save}>{editing ? 'Enregistrer' : 'Créer'}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default SignalementPacks;
