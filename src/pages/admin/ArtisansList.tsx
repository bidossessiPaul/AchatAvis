import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminService } from '../../services/adminService';
import { SectorSelect } from '../../components/Campaign/SectorSelect';
import {
    Search,
    Trash2,
    CheckCircle,
    XCircle,
    PauseCircle,
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
    Globe,
    Power
} from 'lucide-react';
import { getFileUrl } from '../../utils/url';
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
    const [isCreating, setIsCreating] = useState(false);
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
        sector_slug: '',
        password: ''
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

        setIsCreating(true);
        try {
            const result = await adminService.createArtisan({
                ...formData
            });
            showSuccess('Succès', `Compte Artisan créé avec succès.`);
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
                sector_slug: '',
                password: ''
            });
            loadArtisans(true);
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
                                                <div className="artisan-info-main">
                                                    {artisan.avatar_url ? (
                                                        <img src={getFileUrl(artisan.avatar_url)} alt="" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
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
                        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh' }}>
                            <div className="modal-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                                    <div style={{ width: '40px', height: '40px', background: 'var(--artisan-gradient)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                                        <Plus size={24} strokeWidth={3} />
                                    </div>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Nouvel Artisan</h2>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gray-500)' }}>Ajouter manuellement une entreprise au réseau</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowCreateModal(false)} className="modal-close" style={{ background: 'var(--gray-50)', border: 'none', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}>
                                    <X size={20} color="var(--gray-400)" />
                                </button>
                            </div>

                            <div className="modal-body" style={{ padding: '2.5rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                                    {/* SECTION 1: SECTEUR & NOM */}
                                    <div className="modal-section">
                                        <h3 className="modal-section-title">
                                            <Building2 size={16} /> Identité de l'entreprise
                                        </h3>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <SectorSelect
                                                    selectedSectorSlug={formData.sector_slug}
                                                    onSectorChange={(sector) => setFormData({
                                                        ...formData,
                                                        trade: sector.sector_name,
                                                        sector_slug: sector.sector_slug
                                                    })}
                                                />
                                            </div>

                                            <div style={{ gridColumn: 'span 2' }}>
                                                <label className="form-label-premium">Nom de l'entreprise *</label>
                                                <input
                                                    type="text"
                                                    value={formData.companyName}
                                                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                                    className="form-input-premium"
                                                    placeholder="Dénomination commerciale"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* SECTION 2: CONTACT */}
                                    <div className="modal-section">
                                        <h3 className="modal-section-title">
                                            <User size={16} /> Contact Référent
                                        </h3>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                                            <div>
                                                <label className="form-label-premium">Nom & Prénom *</label>
                                                <input
                                                    type="text"
                                                    value={formData.fullName}
                                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                                    className="form-input-premium"
                                                    placeholder="Gérant ou responsable"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label-premium">Email de contact *</label>
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    className="form-input-premium"
                                                    placeholder="pro@email.com"
                                                    required
                                                />
                                            </div>
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
                                                <label className="form-label-premium">Mot de passe de connexion *</label>
                                                <input
                                                    type="text"
                                                    value={formData.password}
                                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                    className="form-input-premium"
                                                    placeholder="Définir un mot de passe"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label-premium">URL Google Business</label>
                                                <input
                                                    type="url"
                                                    value={formData.googleBusinessUrl}
                                                    onChange={(e) => setFormData({ ...formData, googleBusinessUrl: e.target.value })}
                                                    className="form-input-premium"
                                                    placeholder="https://g.page/..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* SECTION 3: LOCALISATION */}
                                    <div className="modal-section">
                                        <h3 className="modal-section-title">
                                            <MapPin size={16} /> Siège Social
                                        </h3>

                                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                                            <div style={{ gridColumn: 'span 1' }}>
                                                <label className="form-label-premium">Adresse</label>
                                                <input
                                                    type="text"
                                                    value={formData.address}
                                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                    className="form-input-premium"
                                                    placeholder="N° et nom de rue"
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
                                            <div>
                                                <label className="form-label-premium">Code Postal</label>
                                                <input
                                                    type="text"
                                                    value={formData.postalCode}
                                                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                                    className="form-input-premium"
                                                    placeholder="75000"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* SECTION 4: PACK */}
                                    <div className="modal-section" style={{ background: 'var(--gray-50)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', border: '1px dashed var(--gray-200)' }}>
                                        <h3 className="modal-section-title" style={{ border: 'none', marginBottom: '1rem' }}>
                                            <Plus size={16} /> Offre de Bienvenue
                                        </h3>

                                        <div>
                                            <label className="form-label-premium">Sélectionner un pack (Optionnel)</label>
                                            <select
                                                value={formData.packId}
                                                onChange={(e) => setFormData({ ...formData, packId: e.target.value })}
                                                className="form-input-premium"
                                                style={{ appearance: 'auto' }}
                                            >
                                                <option value="">-- Sans pack pour le moment --</option>
                                                {packs.map(pack => (
                                                    <option key={pack.id} value={pack.id}>
                                                        {pack.name} — {(pack.price_cents / 100).toFixed(2)}€ ({pack.fiches_quota} fiches)
                                                    </option>
                                                ))}
                                            </select>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.5rem' }}>
                                                L'activation d'un pack créditera directement le compte de l'artisan.
                                            </p>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            <div className="modal-footer">
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
                                    style={{ padding: '0.75rem 2.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    disabled={isCreating}
                                >
                                    {isCreating ? (
                                        <>
                                            <LoadingSpinner size="sm" />
                                            Création en cours...
                                        </>
                                    ) : (
                                        'Créer le compte Artisan'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};
