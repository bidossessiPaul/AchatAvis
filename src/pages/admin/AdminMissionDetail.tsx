import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminApi } from '../../services/api';
import {
    Save,
    Trash2,
    ArrowLeft,
    Building2,
    ExternalLink,
    CheckCircle2,
    Clock
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { showConfirm, showSuccess, showError } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './AdminLists.css';

interface MissionDetail {
    id: string;
    artisan_id: string;
    artisan_name: string;
    artisan_email: string;
    artisan_company: string;
    company_name: string;
    google_business_url: string;
    quantity: number;
    price: number;
    status: string;
    created_at: string;
    published_at?: string;
    sector: string;
    desired_tone: string;
    reviews_received: number;
    proposals: any[];
    pack_name?: string;
    missions_quota?: number;
    pack_missions_used?: number;
}

export const AdminMissionDetail: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const [mission, setMission] = useState<MissionDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        if (orderId) loadMission(orderId);
    }, [orderId]);

    const loadMission = async (id: string) => {
        setIsLoading(true);
        try {
            const data = await adminApi.getAdminMissionDetail(id);
            setMission(data);
            setFormData(data);
        } catch (error) {
            showError('Erreur', 'Erreur lors du chargement de la mission');
            navigate('/admin/missions');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!orderId) return;
        setIsSaving(true);
        try {
            // Filter out fields that shouldn't be sent back as part of updateData
            const {
                id, artisan_id, artisan_name, artisan_email, artisan_company,
                proposals, created_at, published_at, reviews_received,
                pack_name, missions_quota, pack_missions_used,
                price, quantity, payment_amount, // User asked not to modify these via UI
                ...updateData
            } = formData;

            await adminApi.updateMission(orderId, updateData);
            showSuccess('Succès', 'Mission mise à jour');
            loadMission(orderId);
        } catch (error) {
            showError('Erreur', 'Erreur lors de la mise à jour');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!orderId) return;
        const result = await showConfirm('Confirmation', 'Confirmer la suppression ?');
        if (!result.isConfirmed) return;
        try {
            await adminApi.deleteMission(orderId);
            showSuccess('Succès', 'Mission supprimée');
            navigate('/admin/missions');
        } catch (error) {
            showError('Erreur', 'Erreur lors de la suppression');
        }
    };

    const handleApprove = async () => {
        if (!orderId) return;
        try {
            await adminApi.approveMission(orderId);
            showSuccess('Succès', 'Mission publiée !');
            loadMission(orderId);
        } catch (error) {
            showError('Erreur', 'Erreur lors de la publication');
        }
    };

    if (isLoading) return (
        <DashboardLayout title="Détail Mission">
            <div className="admin-loading"><LoadingSpinner /></div>
        </DashboardLayout>
    );

    if (!mission) return null;

    return (
        <DashboardLayout title={`Mission #${mission.id.slice(0, 8)}`}>
            <div className="admin-dashboard revamped">
                <div className="admin-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button onClick={() => navigate('/admin/missions')} className="action-btn">
                            <ArrowLeft size={20} />
                        </button>
                        <h2 className="card-title" style={{ margin: 0 }}>Détails de la Mission</h2>
                    </div>

                    <div className="admin-controls">
                        {mission.status === 'submitted' && (
                            <button
                                className="btn-next"
                                onClick={handleApprove}
                            >
                                <CheckCircle2 size={20} /> Approuver & Publier
                            </button>
                        )}
                        <button
                            className="btn-next btn-success"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            <Save size={20} /> {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                        <button
                            className="btn-next btn-danger"
                            onClick={handleDelete}
                        >
                            <Trash2 size={20} /> Supprimer
                        </button>
                    </div>
                </div>

                <div className="admin-grid-layout">
                    {/* Main Info */}
                    <div className="admin-main-card" style={{ padding: 0 }}>
                        <div className="admin-card-header" style={{ padding: '1.5rem 1.5rem 0' }}>
                            <h3 className="card-title">Paramètres de la Mission</h3>
                        </div>
                        <div className="admin-form-grid">
                            <div className="form-group">
                                <label>Nom de l'entreprise</label>
                                <input
                                    type="text"
                                    className="admin-input"
                                    value={formData.company_name || ''}
                                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>URL Google Maps</label>
                                <input
                                    type="text"
                                    className="admin-input"
                                    value={formData.google_business_url || ''}
                                    onChange={(e) => setFormData({ ...formData, google_business_url: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Secteur d'activité</label>
                                <input
                                    type="text"
                                    className="admin-input"
                                    value={formData.sector || ''}
                                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Ton souhaité</label>
                                <input
                                    type="text"
                                    className="admin-input"
                                    value={formData.desired_tone || ''}
                                    onChange={(e) => setFormData({ ...formData, desired_tone: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Quantité d'avis</label>
                                <div className="admin-input" style={{ background: '#f9fafb', color: '#6b7280' }}>
                                    {mission.quantity} avis
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Prix Global (Payé par l'Artisan)</label>
                                <div className="admin-input" style={{ background: '#f9fafb', color: '#6b7280' }}>
                                    {Number(mission.price || 0).toFixed(2)} €
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Gain par avis (Pour le Guide)</label>
                                <div className="input-with-suffix" style={{ position: 'relative' }}>
                                    <input
                                        type="number"
                                        step="0.10"
                                        className="admin-input"
                                        value={formData.payout_per_review || 1.50}
                                        onChange={(e) => setFormData({ ...formData, payout_per_review: parseFloat(e.target.value) })}
                                        style={{ paddingRight: '2rem' }}
                                    />
                                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: '13px' }}>€</span>
                                </div>
                            </div>
                            <div className="form-group admin-col-span-2">
                                <label>Statut</label>
                                <select
                                    className="admin-select"
                                    value={formData.status || ''}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="draft">Brouillon</option>
                                    <option value="submitted">À valider</option>
                                    <option value="in_progress">En cours</option>
                                    <option value="completed">Terminé</option>
                                    <option value="cancelled">Annulé</option>
                                </select>
                            </div>
                        </div>

                        <div className="admin-card-header" style={{ borderTop: '1px solid #f3f4f6', marginTop: '1rem' }}>
                            <h3 className="card-title">Propositions Générées ({mission.proposals.length})</h3>
                        </div>
                        <div className="admin-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <table className="admin-modern-table">
                                <thead>
                                    <tr>
                                        <th>Contenu</th>
                                        <th>Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mission.proposals.map((p: any) => (
                                        <tr key={p.id}>
                                            <td style={{ fontSize: '13px' }}>{p.content}</td>
                                            <td>
                                                <span className={`admin-badge ${p.status === 'approved' ? 'active' : 'inactive'}`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Sidebar Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {mission.pack_name && (
                            <div className="admin-main-card" style={{ background: 'linear-gradient(135deg, #fff 0%, #fef2f2 100%)', borderColor: '#fee2e2' }}>
                                <div className="admin-card-header">
                                    <h3 className="card-title" style={{ color: 'var(--primary-red)' }}>Pack Actif</h3>
                                </div>
                                <div style={{ padding: '0 1.5rem 1.5rem' }}>
                                    <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '0.5rem', color: '#1f2937' }}>{mission.pack_name}</div>
                                    <div className="admin-badge active" style={{ marginBottom: '1rem' }}>
                                        {mission.pack_missions_used} / {mission.missions_quota} Missions utilisées
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                        Cette mission consomme 1 crédit sur le quota de ce pack.
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="admin-main-card">
                            <div className="admin-card-header">
                                <h3 className="card-title">Artisan</h3>
                            </div>
                            <div style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                    <Building2 size={24} color="var(--primary-red)" />
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{mission.artisan_name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{mission.artisan_email}</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--gray-700)' }}>
                                    <strong>Société:</strong> {mission.artisan_company}
                                </div>
                                <button
                                    onClick={() => navigate(`/admin/artisans/${mission.artisan_id}`)}
                                    className="review-link-simple"
                                    style={{ marginTop: '1rem', width: '100%', border: '1px solid #f3f4f6', padding: '0.5rem', borderRadius: '0.5rem' }}
                                >
                                    Voir profil artisan <ExternalLink size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="admin-main-card">
                            <div className="admin-card-header">
                                <h3 className="card-title">Chronologie</h3>
                            </div>
                            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Clock size={20} color="var(--gray-400)" />
                                    <div>
                                        <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--gray-400)' }}>Créée le</div>
                                        <div style={{ fontSize: '13px' }}>{new Date(mission.created_at).toLocaleString()}</div>
                                    </div>
                                </div>
                                {mission.published_at && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <CheckCircle2 size={20} color="#10b981" />
                                        <div>
                                            <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--gray-400)' }}>Publiée le</div>
                                            <div style={{ fontSize: '13px' }}>{new Date(mission.published_at).toLocaleString()}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="admin-main-card">
                            <div className="admin-card-header">
                                <h3 className="card-title">Visibilité</h3>
                            </div>
                            <div style={{ padding: '1.5rem' }}>
                                <a href={mission.google_business_url} target="_blank" rel="noopener noreferrer" className="review-link-simple" style={{ gap: '0.5rem' }}>
                                    Voir sur Google Maps <ExternalLink size={16} />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};
