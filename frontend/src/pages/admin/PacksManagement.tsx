import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminApi } from '../../services/api';
import {
    Plus,
    Edit2,
    Trash2,
    Check,
    X,
    Package,
    Star,
} from 'lucide-react';
import { showConfirm, showSuccess, showError } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './PacksManagement.css';
import './PackModal.css';

interface Pack {
    id: string;
    name: string;
    price_cents: number;
    quantity: number;
    fiches_quota: number;
    features: string[];
    color: string;
    is_popular: boolean;
}

export const PacksManagement: React.FC = () => {
    const [packs, setPacks] = useState<Pack[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPack, setEditingPack] = useState<Pack | null>(null);

    // Form states
    const [formData, setFormData] = useState<Partial<Pack>>({
        id: '',
        name: '',
        price_cents: 0,
        quantity: 0,
        fiches_quota: 1,
        features: [],
        color: '#FF991F',
        is_popular: false
    });
    const [featureInput, setFeatureInput] = useState('');

    useEffect(() => {
        loadPacks();
    }, []);

    const loadPacks = async () => {
        setIsLoading(true);
        try {
            const data = await adminApi.getPacks();
            // Parse features if they are stringified JSON (from the database)
            const formattedData = data.map((p: any) => ({
                ...p,
                features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features || []
            }));
            setPacks(formattedData);
        } catch (error) {
            console.error('Error loading packs:', error);
            showError('Erreur', 'Erreur lors du chargement des packs');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (pack?: Pack) => {
        if (pack) {
            setEditingPack(pack);
            setFormData(pack);
        } else {
            setEditingPack(null);
            setFormData({
                id: '',
                name: '',
                price_cents: 0,
                quantity: 0,
                fiches_quota: 1,
                features: [],
                color: '#FF991F',
                is_popular: false
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPack(null);
    };

    const handleAddFeature = () => {
        if (featureInput.trim()) {
            setFormData(prev => ({
                ...prev,
                features: [...(prev.features || []), featureInput.trim()]
            }));
            setFeatureInput('');
        }
    };

    const handleRemoveFeature = (index: number) => {
        setFormData(prev => ({
            ...prev,
            features: (prev.features || []).filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingPack) {
                await adminApi.updatePack(editingPack.id, formData);
                showSuccess('Succès', 'Pack mis à jour');
            } else {
                await adminApi.createPack(formData);
                showSuccess('Succès', 'Pack créé');
            }
            handleCloseModal();
            loadPacks();
        } catch (error) {
            console.error('Error saving pack:', error);
            showError('Erreur', "Erreur lors de l'enregistrement");
        }
    };

    const handleDeletePack = async (id: string) => {
        const result = await showConfirm('Confirmation', 'Voulez-vous vraiment supprimer ce pack ?');
        if (!result.isConfirmed) return;
        try {
            await adminApi.deletePack(id);
            showSuccess('Succès', 'Pack supprimé');
            loadPacks();
        } catch (error) {
            console.error('Error deleting pack:', error);
            showError('Erreur', 'Erreur lors de la suppression');
        }
    };

    return (
        <DashboardLayout title="Gestion des Packs">
            <div className="admin-dashboard revamped">
                <div className="admin-card-header">
                    <div>
                        <h2 className="card-title">Configuration des Offres</h2>
                        <p className="admin-p-subtitle">Gérez les prix, crédits et fonctionnalités de vos abonnements.</p>
                    </div>
                    <button className="admin-btn-primary" onClick={() => handleOpenModal()}>
                        <Plus size={18} />
                        Nouveau Pack
                    </button>
                </div>

                {isLoading ? (
                    <div className="admin-loading">
                        <LoadingSpinner size="lg" text="Chargement des packs..." />
                    </div>
                ) : (
                    <div className="packs-grid">
                        {packs.map(pack => (
                            <div key={pack.id} className={`pack-card glass ${pack.is_popular ? 'popular' : ''}`}>
                                {pack.is_popular && <div className="popular-badge">Populaire</div>}
                                <div className="pack-card-header" style={{ borderTop: `4px solid ${pack.color}` }}>
                                    <div className="pack-icon" style={{ background: `${pack.color}20`, color: pack.color }}>
                                        <Package size={24} />
                                    </div>
                                    <div className="pack-id">{pack.id}</div>
                                    <h3 className="pack-name">{pack.name}</h3>
                                    <div className="pack-price">
                                        <span className="amount">{(pack.price_cents / 100).toFixed(2)}€</span>
                                        <span className="period">/mois</span>
                                    </div>
                                </div>

                                <div className="pack-details">
                                    <div className="detail-item">
                                        <Star size={16} />
                                        <span>{pack.quantity} crédits / mois</span>
                                    </div>
                                    <div className="detail-item">
                                        <Package size={16} />
                                        <span>{pack.fiches_quota || 1} fiches / pack</span>
                                    </div>
                                    <div className="features-list">
                                        {(pack.features || []).map((feature, i) => (
                                            <div key={i} className="feature-item">
                                                <Check size={14} />
                                                <span>{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pack-actions">
                                    <button className="pack-btn-edit" onClick={() => handleOpenModal(pack)}>
                                        <Edit2 size={16} />
                                        Modifier
                                    </button>
                                    <button className="pack-btn-delete" onClick={() => handleDeletePack(pack.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {isModalOpen && (
                    <div className="pack-modal-overlay">
                        <div className="pack-modal-content">
                            <div className="pack-modal-header">
                                <h3>{editingPack ? 'Modifier le Pack' : 'Créer un Nouveau Pack'}</h3>
                                <button className="pack-close-btn" onClick={handleCloseModal}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="pack-modal-form">
                                <div className="pack-form-inner">
                                    <div className="pack-form-grid">
                                        <div className="pack-form-field">
                                            <label>ID du Pack (Unique)</label>
                                            <input
                                                type="text"
                                                value={formData.id}
                                                onChange={e => setFormData({ ...formData, id: e.target.value })}
                                                disabled={!!editingPack}
                                                required
                                                placeholder="ex: pack_expert"
                                            />
                                        </div>
                                        <div className="pack-form-field">
                                            <label>Nom Affiché</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                required
                                                placeholder="ex: Offre Expert"
                                            />
                                        </div>
                                        <div className="pack-form-field">
                                            <label>Prix Mensuel (cents)</label>
                                            <input
                                                type="number"
                                                value={formData.price_cents}
                                                onChange={e => setFormData({ ...formData, price_cents: parseInt(e.target.value) })}
                                                required
                                            />
                                            <small>{(formData.price_cents || 0) / 100}€ par mois</small>
                                        </div>
                                        <div className="pack-form-field">
                                            <label>Crédits / Avis mensuels</label>
                                            <input
                                                type="number"
                                                value={formData.quantity}
                                                onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                                required
                                            />
                                        </div>
                                        <div className="pack-form-field">
                                            <label>Quota de fiches</label>
                                            <input
                                                type="number"
                                                value={formData.fiches_quota}
                                                onChange={e => setFormData({ ...formData, fiches_quota: parseInt(e.target.value) })}
                                                required
                                            />
                                            <small>Nombre de fiches créables avec ce pack</small>
                                        </div>
                                        <div className="pack-form-field">
                                            <label>Couleur du Pack</label>
                                            <input
                                                type="color"
                                                className="pack-color-picker"
                                                value={formData.color}
                                                onChange={e => setFormData({ ...formData, color: e.target.value })}
                                            />
                                        </div>
                                        <div className="pack-checkbox-field" onClick={() => setFormData({ ...formData, is_popular: !formData.is_popular })}>
                                            <input
                                                type="checkbox"
                                                checked={formData.is_popular}
                                                onChange={e => setFormData({ ...formData, is_popular: e.target.checked })}
                                                onClick={e => e.stopPropagation()}
                                            />
                                            <span>Mise en avant (Plus populaire)</span>
                                        </div>
                                    </div>

                                    <div className="pack-features-section">
                                        <label>Fonctionnalités incluses</label>
                                        <div className="pack-feature-add-row">
                                            <input
                                                type="text"
                                                value={featureInput}
                                                onChange={e => setFeatureInput(e.target.value)}
                                                placeholder="Ajouter une fonctionnalité..."
                                                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                                            />
                                            <button type="button" className="pack-btn-add-feature" onClick={handleAddFeature}>
                                                <Plus size={18} />
                                            </button>
                                        </div>
                                        <div className="pack-feature-tags-cloud">
                                            {(formData.features || []).map((feature, i) => (
                                                <div key={i} className="pack-feature-token">
                                                    <span>{feature}</span>
                                                    <button type="button" onClick={() => handleRemoveFeature(i)}><X size={12} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="pack-modal-footer">
                                    <button type="button" className="pack-btn-cancel" onClick={handleCloseModal}>Annuler</button>
                                    <button type="submit" className="pack-btn-save">Enregistrer le pack</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};
