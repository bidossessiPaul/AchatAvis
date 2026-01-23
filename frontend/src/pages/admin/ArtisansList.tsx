import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminService } from '../../services/adminService';
import { SectorSelect } from '../../components/Campaign/SectorSelect';
import {
    Search,
    Trash2,
    CheckCircle,
    XCircle,
    Bell,
    Eye,
    Briefcase,
    Plus,
    X,
    Building2,
    Mail,
    User,
    Phone,
    MapPin,
    Globe
} from 'lucide-react';
import { showConfirm, showSuccess, showError, showInput, showPremiumWarningModal } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './AdminLists.css';

interface Artisan {
    id: string;
    email: string;
    avatar_url: string | null;
    status: string;
    created_at: string;
    company_name: string;
    trade: string;
    city: string;
    subscription_status: string;
    warning_count: number;
}

export const ArtisansList: React.FC = () => {
    const [artisans, setArtisans] = useState<Artisan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [packs, setPacks] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        email: '',
        fullName: '',
        companyName: '',
        trade: '', // This will be the sector name
        phone: '',
        address: '',
        city: '',
        postalCode: '',
        googleBusinessUrl: '',
        packId: '',
        sector_slug: ''
    });

    useEffect(() => {
        loadArtisans();
        loadPacks();
    }, []);

    const loadArtisans = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const data = await adminService.getArtisans();
            setArtisans(data);
        } catch (error) {
            showError('Erreur', 'Erreur lors du chargement des artisans');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const loadPacks = async () => {
        try {
            const data = await adminService.getPacks();
            setPacks(data);
        } catch (error) {
            console.error('Error loading packs:', error);
        }
    };

    const handleCreateArtisan = async () => {
        // Validate required fields
        if (!formData.email || !formData.fullName || !formData.companyName || !formData.trade || !formData.phone || !formData.city) {
            showError('Erreur', 'Tous les champs obligatoires (*) doivent être remplis');
            return;
        }

        try {
            // Include a dummy siret or handle it in backend
            const result = await adminService.createArtisan({
                ...formData,
                siret: `TEMP_${Date.now()}` // Pass temporary SIRET as it's often required in schema/backend
            });
            showSuccess('Succès', `Artisan créé avec succès. Mot de passe temporaire: ${result.tempPassword}`);
            setShowCreateModal(false);
            // Reset form
            setFormData({
                email: '',
                fullName: '',
                companyName: '',
                trade: '',
                phone: '',
                address: '',
                city: '',
                postalCode: '',
                googleBusinessUrl: '',
                packId: '',
                sector_slug: ''
            });
            loadArtisans(true);
        } catch (error: any) {
            showError('Erreur', error.response?.data?.error || 'Erreur lors de la création');
        }
    };

    const handleStatusUpdate = async (userId: string, newStatus: string) => {
        const result = await showConfirm('Confirmation', `Changer le statut en ${newStatus} ?`);
        if (!result.isConfirmed) return;
        try {
            await adminService.updateUserStatus(userId, newStatus);
            showSuccess('Succès', 'Statut mis à jour');
            loadArtisans(true);
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
            loadArtisans(true);
        } catch (error) {
            showError('Erreur', 'Erreur lors de la suppression');
        }
    };

    const handleIssueWarning = async (artisan: Artisan) => {
        try {
            const reasonsData = await adminService.getSuspensionReasons();
            const reasons = reasonsData.warnings;

            const result = await showPremiumWarningModal(
                'Avertissement',
                `Envoyer un avertissement à ${artisan.company_name}. Sélectionnez le motif :`,
                reasons
            );

            if (!result.isConfirmed || !result.value) return;

            let finalReason = result.value;
            console.log('🔍 Reason selected:', finalReason);

            if (finalReason === 'OTHER') {
                console.log('🔍 Opening manual input modal...');
                const manualInput = await showInput('Autre motif', 'Saisissez le motif de l\'avertissement :', 'Précisez la raison...');
                if (!manualInput.isConfirmed || !manualInput.value) return;
                finalReason = manualInput.value;
                console.log('🔍 Manual reason entered:', finalReason);
            }

            const response = await adminService.issueWarning(artisan.id, finalReason);
            showSuccess('Succès', response.suspended ? 'Avertissement envoyé et compte suspendu !' : `Avertissement envoyé (${response.warningCount}/3).`);
            loadArtisans(true);
        } catch (error) {
            console.error('❌ Error in handleIssueWarning:', error);
            showError('Erreur', "Erreur lors de l'envoi de l'avertissement");
        }
    };

    const filteredArtisans = artisans.filter(a =>
        a.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout title="Gestion des Artisans">
            <div className="admin-dashboard revamped">
                <div className="admin-main-card">
                    <div className="admin-card-header">
                        <h2 className="card-title">Liste des Artisans</h2>
                        <div className="admin-controls">
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="admin-btn-primary"
                                style={{ marginRight: 'var(--space-4)' }}
                            >
                                <Plus size={18} />
                                Créer Artisan
                            </button>
                            <div className="search-box">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Rechercher une entreprise ou email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="admin-table-container">
                        {isLoading ? (
                            <div className="admin-loading">
                                <LoadingSpinner size="lg" text="Chargement des artisans..." />
                            </div>
                        ) : (
                            <table className="admin-modern-table">
                                <thead>
                                    <tr>
                                        <th>Entreprise</th>
                                        <th>Email</th>
                                        <th>Métier</th>
                                        <th>Abonnement</th>
                                        <th>Avertissements</th>
                                        <th>Statut</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredArtisans.map(artisan => (
                                        <tr key={artisan.id}>
                                            <td className="font-medium">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                                    {artisan.avatar_url ? (
                                                        <img src={artisan.avatar_url} alt="" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>
                                                            <div style={{ transform: 'scale(0.8)' }}><Briefcase size={16} /></div>
                                                        </div>
                                                    )}
                                                    {artisan.company_name}
                                                </div>
                                            </td>

                                            <td className="text-gray-500">{artisan.email}</td>
                                            <td>{artisan.trade}</td>
                                            <td>
                                                <span className={`subscription-badge ${artisan.subscription_status || 'none'}`}>
                                                    {artisan.subscription_status || 'Aucun'}
                                                </span>
                                            </td>
                                            <td>
                                                {artisan.warning_count > 0 ? (
                                                    <span className="admin-badge warning" style={{ background: '#fff7ed', color: '#c2410c', borderColor: '#fdba74' }}>
                                                        {artisan.warning_count}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">-</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className={`admin-badge ${artisan.status || 'inactive'}`}>
                                                    {artisan.status}
                                                </span>
                                            </td>
                                            <td className="actions-cell">
                                                <div className="action-buttons">
                                                    <>
                                                        <button
                                                            onClick={() => (window.location.href = `/admin/artisans/${artisan.id}`)}
                                                            className="action-btn"
                                                            title="Voir détails"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                        {artisan.status === 'active' ? (
                                                            <button
                                                                onClick={() => handleStatusUpdate(artisan.id, 'suspended')}
                                                                className="action-btn block-btn"
                                                                title="Suspendre"
                                                            >
                                                                <XCircle size={18} />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleStatusUpdate(artisan.id, 'active')}
                                                                className="action-btn active-btn"
                                                                title="Activer"
                                                            >
                                                                <CheckCircle size={18} />
                                                            </button>
                                                        )}
                                                    </>
                                                    <button
                                                        onClick={() => handleIssueWarning(artisan)}
                                                        className="action-btn warn-btn"
                                                        title="Avertir"
                                                    >
                                                        <Bell size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(artisan.id)}
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

                {/* Create Artisan Modal */}
                {showCreateModal && (
                    <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                            <div className="modal-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                    <div style={{ padding: 'var(--space-2)', background: 'rgba(255, 153, 31, 0.1)', borderRadius: 'var(--radius-lg)', color: 'var(--artisan-primary)' }}>
                                        <Plus size={24} />
                                    </div>
                                    <div>
                                        <h2 style={{ margin: 0 }}>Créer un nouvel Artisan</h2>
                                        <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>Ajoutez un artisan manuellement au système</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowCreateModal(false)} className="modal-close">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="modal-body" style={{ padding: 'var(--space-8)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                            <Building2 size={16} /> Informations Entreprise
                                        </h3>
                                    </div>

                                    <div>
                                        <label className="form-label-premium">Nom de l'entreprise *</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="text"
                                                value={formData.companyName}
                                                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                                className="form-input-premium"
                                                placeholder="Ex: Plomberie Martin"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <SectorSelect
                                            selectedSectorSlug={formData.sector_slug}
                                            onSectorChange={(sector) => setFormData({
                                                ...formData,
                                                trade: sector.sector_name,
                                                sector_slug: sector.sector_slug
                                            })}
                                        />
                                    </div>

                                    <div style={{ gridColumn: '1 / -1', height: '1px', background: 'var(--gray-100)', margin: 'var(--space-2) 0' }}></div>

                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                            <User size={16} /> Contact & Compte
                                        </h3>
                                    </div>

                                    <div>
                                        <label className="form-label-premium">Nom complet de l'artisan *</label>
                                        <input
                                            type="text"
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                            className="form-input-premium"
                                            placeholder="Ex: Jean Martin"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label-premium">Email professionnel *</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="form-input-premium"
                                            placeholder="jean.martin@example.com"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label-premium">Numéro de téléphone *</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="form-input-premium"
                                            placeholder="06 00 00 00 00"
                                            required
                                        />
                                    </div>

                                    <div style={{ gridColumn: '1 / -1', height: '1px', background: 'var(--gray-100)', margin: 'var(--space-2) 0' }}></div>

                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                            <MapPin size={16} /> Localisation
                                        </h3>
                                    </div>

                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label-premium">Adresse complète</label>
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            className="form-input-premium"
                                            placeholder="123 rue de la Paix"
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label-premium">Ville *</label>
                                        <input
                                            type="text"
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            className="form-input-premium"
                                            placeholder="Paris"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label-premium">Code Postal</label>
                                        <input
                                            type="text"
                                            value={formData.postalCode}
                                            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                            className="form-input-premium"
                                            placeholder="75001"
                                        />
                                    </div>

                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label-premium">URL Google Business (Optionnel)</label>
                                        <input
                                            type="url"
                                            value={formData.googleBusinessUrl}
                                            onChange={(e) => setFormData({ ...formData, googleBusinessUrl: e.target.value })}
                                            className="form-input-premium"
                                            placeholder="https://g.page/..."
                                        />
                                    </div>

                                    <div style={{ gridColumn: '1 / -1', height: '1px', background: 'var(--gray-100)', margin: 'var(--space-2) 0' }}></div>

                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                            <Plus size={16} /> Offre & Activation
                                        </h3>
                                    </div>

                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label-premium">Pack de démarrage</label>
                                        <select
                                            value={formData.packId}
                                            onChange={(e) => setFormData({ ...formData, packId: e.target.value })}
                                            className="form-input-premium"
                                            style={{ appearance: 'auto' }}
                                        >
                                            <option value="">-- Aucun pack (activation ultérieure) --</option>
                                            {packs.map(pack => (
                                                <option key={pack.id} value={pack.id}>
                                                    {pack.name} — {(pack.price_cents / 100).toFixed(2)}€ ({pack.fiches_quota} fiches)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-4)' }}>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="btn-secondary"
                                    style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-lg)', fontWeight: 600 }}
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleCreateArtisan}
                                    className="admin-btn-primary"
                                    style={{ padding: '0.75rem 2rem' }}
                                >
                                    Finaliser la création
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};
