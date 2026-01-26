import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminService } from '../../services/adminService';
import {
    Search,
    Trash2,
    CheckCircle,
    Eye,
    User,
    Plus,
    X,
    XCircle,
    Calendar,
    Power
} from 'lucide-react';
import { getFileUrl } from '../../utils/url';
import { showConfirm, showSuccess, showError } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './AdminLists.css';

interface Guide {
    id: string;
    email: string;
    avatar_url: string | null;
    status: string;
    created_at: string;
    google_email: string;
    city: string;
}

export const GuidesList: React.FC = () => {
    const [guides, setGuides] = useState<Guide[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        fullName: '',
        googleEmail: '',
        phone: '',
        city: '',
        password: ''
    });

    useEffect(() => {
        loadGuides();
    }, []);

    const loadGuides = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const data = await adminService.getGuides();
            setGuides(data);
        } catch (error) {
            showError('Erreur', 'Erreur lors du chargement des guides');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const handleCreateGuide = async () => {
        if (!formData.email || !formData.fullName || !formData.googleEmail || !formData.phone || !formData.city) {
            showError('Erreur', 'Tous les champs obligatoires (*) doivent être remplis');
            return;
        }

        setIsCreating(true);
        try {
            await adminService.createGuide(formData);
            showSuccess('Succès', `Compte Local Guide créé avec succès.`);
            setShowCreateModal(false);
            setFormData({
                email: '',
                fullName: '',
                googleEmail: '',
                phone: '',
                city: '',
                password: ''
            });
            loadGuides(true);
        } catch (error: any) {
            showError('Erreur', error.response?.data?.error || 'Erreur lors de la création');
        } finally {
            setIsCreating(false);
        }
    };

    const handleStatusUpdate = async (userId: string, newStatus: string) => {
        const result = await showConfirm('Confirmation', `Changer le statut en ${newStatus} ?`);
        if (!result.isConfirmed) return;
        try {
            await adminService.updateUserStatus(userId, newStatus);
            showSuccess('Succès', 'Statut mis à jour');
            loadGuides(true);
        } catch (error) {
            showError('Erreur', 'Erreur lors de la mise à jour');
        }
    };

    const handleDelete = async (userId: string) => {
        const result = await showConfirm('Supprimer ce compte ?', 'Cette action est irréversible.');
        if (!result.isConfirmed) return;
        try {
            await adminService.deleteUser(userId);
            showSuccess('Succès', 'Compte supprimé');
            loadGuides(true);
        } catch (error) {
            showError('Erreur', 'Erreur lors de la suppression');
        }
    };

    const filteredGuides = guides.filter(g =>
        g.google_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout title="Gestion des Guides">
            <div className="admin-dashboard revamped">
                <div className="admin-main-card">
                    <div className="admin-card-header">
                        <h2 className="card-title">Liste des Local Guides</h2>
                        <div className="admin-controls">
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="admin-btn-primary"
                                style={{ marginRight: 'var(--space-4)' }}
                            >
                                <Plus size={18} />
                                Créer Guide
                            </button>
                            <div className="search-box">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Rechercher un email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="admin-table-container">
                        {isLoading ? (
                            <div className="admin-loading">
                                <LoadingSpinner size="lg" text="Chargement des guides..." />
                            </div>
                        ) : (
                            <table className="admin-modern-table">
                                <thead>
                                    <tr>
                                        <th>Local Guide</th>
                                        <th>Email Compte</th>
                                        <th>Ville</th>
                                        <th>Statut</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredGuides.map(guide => (
                                        <tr key={guide.id}>
                                            <td className="font-medium">
                                                <div className="artisan-info-main" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                                    {guide.avatar_url ? (
                                                        <img src={getFileUrl(guide.avatar_url)} alt="" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>
                                                            <User size={16} />
                                                        </div>
                                                    )}
                                                    {guide.google_email}
                                                </div>
                                            </td>
                                            <td className="text-gray-500">{guide.email}</td>
                                            <td>{guide.city}</td>
                                            <td>
                                                <span className={`admin-badge ${guide.status || 'inactive'}`}>
                                                    {guide.status}
                                                </span>
                                            </td>
                                            <td className="actions-cell">
                                                <div className="action-buttons">
                                                    <button
                                                        onClick={() => (window.location.href = `/admin/guides/${guide.id}`)}
                                                        className="action-btn"
                                                        title="Voir détails"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    {guide.status !== 'active' && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(guide.id, 'active')}
                                                            className="action-btn active-btn"
                                                            title="Activer"
                                                        >
                                                            <CheckCircle size={18} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(guide.id)}
                                                        className="action-btn delete-btn"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 size={18} />
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
            </div>

            {/* Create Guide Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                                <div style={{ width: '40px', height: '40px', background: 'var(--primary-gradient)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                    <Plus size={24} strokeWidth={3} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Nouveau Local Guide</h2>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gray-500)' }}>Ajouter manuellement un guide au réseau</p>
                                </div>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="modal-close">
                                <X size={20} color="var(--gray-400)" />
                            </button>
                        </div>

                        <div className="modal-body" style={{ padding: '2rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label className="form-label-premium">Nom Complet *</label>
                                    <input
                                        type="text"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        className="form-input-premium"
                                        placeholder="Prénom Nom"
                                        required
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div>
                                        <label className="form-label-premium">Email Connexion *</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="form-input-premium"
                                            placeholder="guide@email.com"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label-premium">Email Google Maps *</label>
                                        <input
                                            type="email"
                                            value={formData.googleEmail}
                                            onChange={(e) => setFormData({ ...formData, googleEmail: e.target.value })}
                                            className="form-input-premium"
                                            placeholder="google@gmail.com"
                                            required
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div>
                                        <label className="form-label-premium">Téléphone Mobile *</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="form-input-premium"
                                            placeholder="06..."
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label-premium">Ville *</label>
                                        <input
                                            type="text"
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            className="form-input-premium"
                                            placeholder="Ex: Paris"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label-premium">Mot de passe *</label>
                                    <input
                                        type="text"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="form-input-premium"
                                        placeholder="Définir un mot de passe"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button onClick={() => setShowCreateModal(false)} className="btn-secondary">
                                Annuler
                            </button>
                            <button
                                onClick={handleCreateGuide}
                                className="admin-btn-primary"
                                disabled={isCreating}
                            >
                                {isCreating ? 'Création...' : 'Créer le compte Guide'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};
