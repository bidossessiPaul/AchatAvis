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
    Clock,
    Edit2,
    X,
    Check
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { showConfirm, showSuccess, showError } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './AdminLists.css';

interface FicheDetailData {
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
    pack_reviews_per_fiche?: number;
    pack_features?: string;
    fiches_quota?: number;
    pack_fiches_used?: number;
}

export const AdminFicheDetail: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const [fiche, setFiche] = useState<FicheDetailData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
    const [editedContent, setEditedContent] = useState<string>('');

    useEffect(() => {
        if (orderId) loadfiche(orderId);
    }, [orderId]);

    const loadfiche = async (id: string) => {
        setIsLoading(true);
        try {
            const data = await adminApi.getAdminficheDetail(id);
            setFiche(data);
            setFormData(data);
        } catch (error) {
            showError('Erreur', 'Erreur lors du chargement de la fiche');
            navigate('/admin/fiches');
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
                pack_name, fiches_quota, pack_fiches_used,
                price, quantity, payment_amount, // User asked not to modify these via UI
                ...updateData
            } = formData;

            await adminApi.updatefiche(orderId, updateData);
            showSuccess('Succès', 'fiche mise à jour');
            loadfiche(orderId);
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
            await adminApi.deletefiche(orderId);
            showSuccess('Succès', 'fiche supprimée');
            navigate('/admin/fiches');
        } catch (error) {
            showError('Erreur', 'Erreur lors de la suppression');
        }
    };

    const handleApprove = async () => {
        if (!orderId) return;
        try {
            await adminApi.approvefiche(orderId);
            showSuccess('Succès', 'fiche publiée !');
            loadfiche(orderId);
        } catch (error) {
            showError('Erreur', 'Erreur lors de la publication');
        }
    };

    const handleEditProposal = (proposalId: string, content: string) => {
        setEditingProposalId(proposalId);
        setEditedContent(content);
    };

    const handleSaveProposal = async (proposalId: string) => {
        try {
            await adminApi.updateProposal(proposalId, { content: editedContent });
            showSuccess('Succès', 'Avis mis à jour');
            setEditingProposalId(null);
            loadfiche(orderId!);
        } catch (error) {
            showError('Erreur', "Erreur lors de la mise à jour de l'avis");
        }
    };

    const handleCancelEdit = () => {
        setEditingProposalId(null);
        setEditedContent('');
    };

    if (isLoading) return (
        <DashboardLayout title="Détail fiche">
            <div className="admin-loading"><LoadingSpinner /></div>
        </DashboardLayout>
    );

    if (!fiche) return null;

    return (
        <DashboardLayout title={`fiche #${fiche.id.slice(0, 8)}`}>
            <div className="admin-dashboard revamped">
                <div className="admin-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button onClick={() => navigate('/admin/fiches')} className="action-btn">
                            <ArrowLeft size={20} />
                        </button>
                        <h2 className="card-title" style={{ margin: 0 }}>Détails de la fiche</h2>
                    </div>

                    <div className="admin-controls">
                        {fiche.status === 'submitted' && (
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
                            <h3 className="card-title">Paramètres de la fiche</h3>
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
                                <label>Quantité d'avis</label>
                                <div className="admin-input" style={{ background: '#f9fafb', color: '#6b7280' }}>
                                    {fiche.quantity} avis
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Prix Global (Payé par l'Artisan)</label>
                                <div className="admin-input" style={{ background: '#f9fafb', color: '#6b7280' }}>
                                    {Number(fiche.price || 0).toFixed(2)} €
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
                            <h3 className="card-title">Propositions Générées ({fiche.proposals.length})</h3>
                        </div>
                        <div className="admin-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <table className="admin-modern-table">
                                <thead>
                                    <tr>
                                        <th>Contenu</th>
                                        <th>Statut</th>
                                        <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fiche.proposals.map((p: any) => (
                                        <tr key={p.id}>
                                            <td style={{ fontSize: '13px' }}>
                                                {editingProposalId === p.id ? (
                                                    <textarea
                                                        value={editedContent}
                                                        onChange={(e) => setEditedContent(e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.75rem',
                                                            borderRadius: '8px',
                                                            border: '2px solid #3b82f6',
                                                            fontSize: '13px',
                                                            fontFamily: 'inherit',
                                                            minHeight: '80px',
                                                            resize: 'vertical'
                                                        }}
                                                    />
                                                ) : (
                                                    p.content
                                                )}
                                            </td>
                                            <td>
                                                <span className={`admin-badge ${p.status === 'approved' ? 'active' : 'inactive'}`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                    {editingProposalId === p.id ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleSaveProposal(p.id)}
                                                                className="action-btn"
                                                                style={{
                                                                    background: '#10b981',
                                                                    color: 'white',
                                                                    padding: '0.4rem 0.6rem',
                                                                    borderRadius: '6px'
                                                                }}
                                                                title="Enregistrer"
                                                            >
                                                                <Check size={16} />
                                                            </button>
                                                            <button
                                                                onClick={handleCancelEdit}
                                                                className="action-btn"
                                                                style={{
                                                                    background: '#ef4444',
                                                                    color: 'white',
                                                                    padding: '0.4rem 0.6rem',
                                                                    borderRadius: '6px'
                                                                }}
                                                                title="Annuler"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleEditProposal(p.id, p.content)}
                                                            className="action-btn"
                                                            style={{
                                                                background: '#f59e0b',
                                                                color: 'white',
                                                                padding: '0.4rem 0.6rem',
                                                                borderRadius: '6px'
                                                            }}
                                                            title="Éditer"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Sidebar Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {fiche.pack_name && (
                            <div className="admin-main-card" style={{ background: '#fff8e1', borderColor: '#FFE6A5' }}>
                                <div className="admin-card-header">
                                    <h3 className="card-title" style={{ color: 'var(--artisan-primary)' }}>Pack Actif</h3>
                                </div>
                                <div style={{ padding: '0 1.5rem 1.5rem' }}>
                                    <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '0.5rem', color: '#1f2937' }}>{fiche.pack_name}</div>
                                    <div className="admin-badge active" style={{ marginBottom: '1rem' }}>
                                        {fiche.pack_fiches_used} / {fiche.fiches_quota} fiches utilisées
                                    </div>

                                    <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#B45309', fontWeight: 700, fontSize: '0.85rem' }}>
                                            <Building2 size={16} />
                                            {fiche.pack_reviews_per_fiche ? `${fiche.pack_reviews_per_fiche} avis par fiche` : 'Quantité d\'avis non définie'}
                                        </div>

                                        {fiche.pack_features && (
                                            <div style={{ marginTop: '0.5rem' }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#92400e', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Infos importantes :</div>
                                                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#92400e', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                    {(() => {
                                                        try {
                                                            const features = typeof fiche.pack_features === 'string' ? JSON.parse(fiche.pack_features) : fiche.pack_features;
                                                            return Array.isArray(features) ? features.slice(0, 4).map((f: string, i: number) => (
                                                                <li key={i}>{f}</li>
                                                            )) : null;
                                                        } catch (e) {
                                                            return null;
                                                        }
                                                    })()}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ fontSize: '12px', color: '#6b7280', borderTop: '1px solid rgba(251, 191, 36, 0.3)', paddingTop: '0.75rem' }}>
                                        Cette fiche consomme 1 crédit sur le quota de ce pack.
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
                                    <Building2 size={24} color="var(--artisan-primary)" />
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{fiche.artisan_name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{fiche.artisan_email}</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--gray-700)' }}>
                                    <strong>Société:</strong> {fiche.artisan_company}
                                </div>
                                <button
                                    onClick={() => navigate(`/admin/artisans/${fiche.artisan_id}`)}
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
                                        <div style={{ fontSize: '13px' }}>{new Date(fiche.created_at).toLocaleString()}</div>
                                    </div>
                                </div>
                                {fiche.published_at && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <CheckCircle2 size={20} color="#FF991F" />
                                        <div>
                                            <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--gray-400)' }}>Publiée le</div>
                                            <div style={{ fontSize: '13px' }}>{new Date(fiche.published_at).toLocaleString()}</div>
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
                                <a href={fiche.google_business_url} target="_blank" rel="noopener noreferrer" className="review-link-simple" style={{ gap: '0.5rem' }}>
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
