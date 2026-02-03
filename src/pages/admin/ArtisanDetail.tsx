import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminService } from '../../services/adminService';
import {
    Briefcase,
    Mail,
    Phone,
    MapPin,
    ArrowLeft,
    ShieldAlert,
    Trash2,
    CheckCircle,
    XCircle,
    Globe,
    ExternalLink,
    Zap,
    Power,
    Search,
    Filter,
    MessageSquare,
    MessageCircle,
    User,
    Smartphone
} from 'lucide-react';
import { getFileUrl } from '../../utils/url';
import { showConfirm, showSuccess, showError, showInput, showSelection, showPremiumWarningModal } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './AdminDetail.css';

interface Order {
    id: string;
    status: string;
    amount: number;
    credits_purchased: number;
    created_at: string;
    validated_reviews_count: number;
}

interface Payment {
    id: string;
    amount: number;
    status: string;
    type: string;
    description: string;
    created_at: string;
}

interface Pack {
    id: string;
    name: string;
    fiches_quota: number;
    price_cents: number;
    quantity: number;
}

interface ArtisanDetailData {
    profile: {
        id: string;
        email: string;
        full_name: string;
        avatar_url: string | null;
        status: string;
        created_at: string;
        last_login: string;
        last_seen: string | null;
        warning_count: number;
        company_name: string;
        trade: string;
        phone: string;
        whatsapp_number: string;
        address: string;
        city: string;
        postal_code: string;
        google_business_url: string;
        subscription_status: string;
        subscription_end_date: string;
        active_pack_name: string | null;
        monthly_reviews_quota: number;
        current_month_reviews: number;
    };
    orders: Order[];
    payments: Payment[];
}

interface ArtisanSubmission {
    proposal_id: string;
    proposal_content: string;
    proposal_author: string;
    rating: number;
    proposal_status: string;
    submission_id: string | null;
    submission_status: 'pending' | 'validated' | 'rejected' | null;
    review_url: string | null;
    submitted_at: string | null;
    earnings: number;
    rejection_reason: string | null;
    fiche_name: string;
    order_id: string;
    guide_name: string | null;
    guide_id: string | null;
    proposal_date: string;
}

export const ArtisanDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<ArtisanDetailData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [packs, setPacks] = useState<Pack[]>([]);
    const [selectedPackId, setSelectedPackId] = useState<string>('');
    const [isActivating, setIsActivating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editFormData, setEditFormData] = useState<any>(null);
    const [submissions, setSubmissions] = useState<ArtisanSubmission[]>([]);
    const [submissionsLoading, setSubmissionsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        if (id) {
            loadDetail();
            fetchPacks();
            loadSubmissions();
        }
    }, [id]);

    const loadDetail = async () => {
        setIsLoading(true);
        try {
            const result = await adminService.getArtisanDetail(id!);
            setData(result);
            setEditFormData({
                full_name: result.profile.full_name,
                email: result.profile.email,
                company_name: result.profile.company_name,
                trade: result.profile.trade,
                phone: result.profile.phone,
                address: result.profile.address,
                city: result.profile.city,
                postal_code: result.profile.postal_code,
                google_business_url: result.profile.google_business_url,
                whatsapp_number: result.profile.whatsapp_number,
                password: ''
            });
        } catch (error) {
            showError('Erreur', 'Erreur lors du chargement des détails');
        } finally {
            setIsLoading(false);
        }
    };

    const loadSubmissions = async () => {
        setSubmissionsLoading(true);
        try {
            const result = await adminService.getArtisanSubmissions(id!);
            setSubmissions(result);
        } catch (error) {
            console.error('Error loading submissions:', error);
        } finally {
            setSubmissionsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!id || !editFormData) return;
        setIsSaving(true);
        try {
            await adminService.updateArtisan(id, editFormData);
            showSuccess('Succès', 'Profil mis à jour avec succès');
            setIsEditing(false);
            loadDetail();
        } catch (error: any) {
            showError('Erreur', error.response?.data?.error || 'Erreur lors de la mise à jour');
        } finally {
            setIsSaving(false);
        }
    };

    const fetchPacks = async () => {
        try {
            const availablePacks = await adminService.getPacks();
            setPacks(availablePacks);
        } catch (error) {
            console.error('Error fetching packs:', error);
        }
    };

    const handleActivatePack = async () => {
        if (!selectedPackId || !data) return;

        const pack = packs.find(p => p.id === selectedPackId);
        const confirmResult = await showConfirm(
            'Activation Manuelle',
            `Voulez-vous vraiment activer le pack "${pack?.name}" pour ${data.profile.company_name} ? Cela simulera un paiement réussi.`
        );

        if (!confirmResult.isConfirmed) return;

        setIsActivating(true);
        try {
            await adminService.activateArtisanPack(id!, selectedPackId);
            showSuccess('Succès', 'Le pack a été activé avec succès !');
            loadDetail();
            setSelectedPackId('');
        } catch (error: any) {
            showError('Erreur', error.response?.data?.error || "Erreur lors de l'activation du pack");
        } finally {
            setIsActivating(false);
        }
    };

    const handleCancelPayment = async (paymentId: string) => {
        const confirmResult = await showConfirm(
            'Annuler le paiement',
            'Voulez-vous vraiment annuler ce paiement ? Cela déduira les crédits accordés à l\'artisan.'
        );

        if (!confirmResult.isConfirmed) return;

        try {
            await adminService.cancelPayment(paymentId);
            showSuccess('Succès', 'Paiement annulé');
            loadDetail();
        } catch (error: any) {
            showError('Erreur', error.response?.data?.error || 'Erreur lors de l\'annulation');
        }
    };

    const handleReactivatePayment = async (paymentId: string) => {
        const confirmResult = await showConfirm(
            'Réactiver le paiement',
            'Voulez-vous vraiment réactiver ce paiement ? Cela rajoutera les crédits à l\'artisan.'
        );

        if (!confirmResult.isConfirmed) return;

        try {
            await adminService.reactivatePayment(paymentId);
            showSuccess('Succès', 'Paiement réactivé');
            loadDetail();
        } catch (error: any) {
            showError('Erreur', error.response?.data?.error || 'Erreur lors de la réactivation');
        }
    };

    const handleBlockPayment = async (paymentId: string) => {
        const confirmResult = await showConfirm(
            'Bloquer le pack',
            'Voulez-vous vraiment bloquer ce pack ? Les crédits seront retirés et le montant exclu des statistiques.'
        );

        if (!confirmResult.isConfirmed) return;

        try {
            await adminService.blockPayment(paymentId);
            showSuccess('Succès', 'Pack bloqué');
            loadDetail();
        } catch (error: any) {
            showError('Erreur', error.response?.data?.error || 'Erreur lors du blocage');
        }
    };

    const handleDeletePaymentStatus = async (paymentId: string) => {
        const confirmResult = await showConfirm(
            'Supprimer le paiement',
            'Voulez-vous vraiment marquer ce paiement comme supprimé ? Les crédits seront retirés s\'ils étaient encore actifs.'
        );

        if (!confirmResult.isConfirmed) return;

        try {
            await adminService.deletePaymentStatus(paymentId);
            showSuccess('Succès', 'Paiement supprimé');
            loadDetail();
        } catch (error: any) {
            showError('Erreur', error.response?.data?.error || 'Erreur lors de la suppression');
        }
    };

    const handleIssueWarning = async () => {
        if (!data) return;
        try {
            const reasonsData = await adminService.getSuspensionReasons();
            const reasons = reasonsData.warnings;

            const result = await showPremiumWarningModal(
                'Avertissement',
                `Envoyer un avertissement à ${data.profile.company_name}. Sélectionnez le motif :`,
                reasons
            );

            if (!result.isConfirmed || !result.value) return;

            let finalReason = result.value;

            if (finalReason === 'OTHER') {
                const manualInput = await showInput('Autre motif', 'Saisissez le motif de l\'avertissement :', 'Précisez la raison...');
                if (!manualInput.isConfirmed || !manualInput.value) return;
                finalReason = manualInput.value;
            }

            const response = await adminService.issueWarning(id!, finalReason);
            showSuccess('Succès', response.suspended ? 'Avertissement envoyé et compte suspendu !' : `Avertissement envoyé (${response.warningCount}/3).`);
            loadDetail();
        } catch (error) {
            showError('Erreur', "Erreur lors de l'envoi de l'avertissement");
        }
    };

    const handleDeleteUser = async () => {
        if (!data) return;
        const confirmResult = await showConfirm(
            'Supprimer l\'artisan',
            `Voulez-vous vraiment supprimer définitivement ${data.profile.company_name} ? Cette action est irréversible et supprimera toutes les données associées.`
        );

        if (!confirmResult.isConfirmed) return;

        try {
            await adminService.deleteUser(id!);
            showSuccess('Succès', 'Artisan supprimé avec succès');
            navigate('/admin/artisans');
        } catch (error: any) {
            showError('Erreur', error.response?.data?.error || 'Erreur lors de la suppression');
        }
    };

    const handleStatusUpdate = async (newStatus: string) => {
        const action = newStatus === 'suspended' ? 'suspendre' : 'activer';
        const confirmResult = await showConfirm('Confirmation', `Voulez-vous vraiment ${action} ce compte ?`);
        if (!confirmResult.isConfirmed) return;

        try {
            let reason = '';
            if (newStatus === 'suspended') {
                const reasonsData = await adminService.getSuspensionReasons();
                const suspReasons = [...reasonsData.suspensions, 'Autre (Saisie manuelle)'];

                const selectionResult = await showSelection(
                    'Motif de suspension',
                    `Pourquoi souhaitez-vous suspendre ${data?.profile.company_name} ?`,
                    suspReasons
                );

                if (!selectionResult.isConfirmed || !selectionResult.value) return;

                reason = selectionResult.value;
                if (reason === 'Autre (Saisie manuelle)') {
                    const manualResult = await showInput('Autre motif', 'Saisissez le motif de la suspension :', 'Précisez la raison...');
                    if (!manualResult.isConfirmed || !manualResult.value) return;
                    reason = manualResult.value;
                }
            }

            await adminService.updateUserStatus(id!, newStatus, reason);
            showSuccess('Succès', 'Statut mis à jour');
            loadDetail();
        } catch (error) {
            showError('Erreur', 'Erreur lors de la mise à jour');
        }
    };

    if (isLoading) return (
        <DashboardLayout title="Détails Artisan">
            <div className="admin-loading">
                <LoadingSpinner size="lg" text="Chargement du profil artisan..." />
            </div>
        </DashboardLayout>
    );

    if (!data) return (
        <DashboardLayout title="Détails Artisan">
            <div className="admin-error">Artisan non trouvé</div>
        </DashboardLayout>
    );

    const { profile, orders, payments } = data;

    return (
        <DashboardLayout title={`Détails : ${profile.company_name}`}>
            <div className="admin-dashboard detail-page revamped">
                <button onClick={() => navigate('/admin/artisans')} className="back-btn">
                    <ArrowLeft size={18} />
                    Retour à la liste
                </button>

                <header className="detail-header-section">
                    <div className="header-content-flex">
                        <div className="header-main-info">
                            <div className="header-icon-badge">
                                {profile.avatar_url ? (
                                    <img src={getFileUrl(profile.avatar_url)} alt={profile.full_name} className="header-avatar" />
                                ) : (
                                    <div className="header-avatar-placeholder">
                                        <Briefcase size={32} />
                                    </div>
                                )}
                            </div>
                            <div className="header-titles">
                                {isEditing ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editFormData.full_name}
                                            onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                                            className="form-input-premium"
                                            placeholder="Nom complet"
                                            style={{ marginBottom: '0.5rem' }}
                                        />
                                        <input
                                            type="text"
                                            value={editFormData.company_name}
                                            onChange={(e) => setEditFormData({ ...editFormData, company_name: e.target.value })}
                                            className="form-input-premium h2-style"
                                            placeholder="Nom de l'entreprise"
                                        />
                                    </>
                                ) : (
                                    <>
                                        <span className="header-subtitle" title={profile.full_name}>{profile.full_name}</span>
                                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            {profile.company_name}
                                            {(() => {
                                                if (!profile.last_seen) return null;
                                                const lastSeenDate = new Date(profile.last_seen);
                                                const now = new Date();
                                                const diffInMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
                                                if (diffInMinutes < 5) {
                                                    return (
                                                        <span
                                                            title="En ligne"
                                                            style={{
                                                                width: '12px',
                                                                height: '12px',
                                                                backgroundColor: '#10b981',
                                                                borderRadius: '50%',
                                                                display: 'inline-block',
                                                                boxShadow: '0 0 0 2px #fff, 0 0 8px #10b98177'
                                                            }}
                                                        />
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </h2>
                                    </>
                                )}
                                <div className="status-row">
                                    <span className={`premium-status-badge ${profile.status}`}>
                                        {profile.status}
                                    </span>
                                    {profile.warning_count > 0 && (
                                        <span className="premium-status-badge warning">
                                            {profile.warning_count} Avertissement(s)
                                        </span>
                                    )}
                                    {profile.subscription_status && (
                                        <span className={`premium-status-badge active`}>
                                            {profile.active_pack_name || profile.subscription_status}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="header-actions">
                            {isEditing ? (
                                <div className="button-group">
                                    <button
                                        className="premium-action-btn primary"
                                        onClick={handleSave}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? <LoadingSpinner size="sm" /> : <>Enregistrer</>}
                                    </button>
                                    <button
                                        className="premium-action-btn"
                                        onClick={() => setIsEditing(false)}
                                    >
                                        Annuler
                                    </button>
                                </div>
                            ) : (
                                <button className="premium-action-btn" onClick={() => setIsEditing(true)}>
                                    Modifier
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                <div className="detail-content-layout">
                    <div className="detail-main-columns">
                        <div className="info-cards-masonry">
                            <div className="premium-card">
                                <h3><Mail size={20} /> Contact & Localisation</h3>
                                <div className="premium-info-list">
                                    <div className="premium-info-item">
                                        <div className="info-icon-box"><Mail size={16} /></div>
                                        <div className="info-content">
                                            <span className="info-label">Email</span>
                                            {isEditing ? (
                                                <input
                                                    type="email"
                                                    value={editFormData.email}
                                                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                                    className="form-input-premium"
                                                />
                                            ) : (
                                                <span className="info-value">{profile.email}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="premium-info-item">
                                        <div className="info-icon-box"><Phone size={16} /></div>
                                        <div className="info-content">
                                            <span className="info-label">Téléphone</span>
                                            {isEditing ? (
                                                <input
                                                    type="tel"
                                                    value={editFormData.phone}
                                                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                                    className="form-input-premium"
                                                />
                                            ) : (
                                                <span className="info-value">{profile.phone || 'Non renseigné'}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="premium-info-item">
                                        <div className="info-icon-box" style={{ background: '#25d366', color: 'white' }}><Smartphone size={16} /></div>
                                        <div className="info-content">
                                            <span className="info-label">WhatsApp</span>
                                            {isEditing ? (
                                                <input
                                                    type="tel"
                                                    value={editFormData.whatsapp_number}
                                                    onChange={(e) => setEditFormData({ ...editFormData, whatsapp_number: e.target.value })}
                                                    className="form-input-premium"
                                                    placeholder="+33..."
                                                />
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span className="info-value">{profile.whatsapp_number || 'Non renseigné'}</span>
                                                    {profile.whatsapp_number && (
                                                        <a
                                                            href={`https://wa.me/${profile.whatsapp_number.replace(/[\s.+-]/g, '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="info-value link"
                                                            title="Ouvrir dans WhatsApp"
                                                            style={{ color: '#25d366' }}
                                                        >
                                                            <MessageCircle size={14} />
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="premium-info-item">
                                        <div className="info-icon-box"><MapPin size={16} /></div>
                                        <div className="info-content">
                                            <span className="info-label">Localisation</span>
                                            {isEditing ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                                                    <input
                                                        type="text"
                                                        value={editFormData.address}
                                                        onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                                                        className="form-input-premium"
                                                        placeholder="Adresse"
                                                    />
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <input
                                                            type="text"
                                                            value={editFormData.city}
                                                            onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                                                            className="form-input-premium"
                                                            placeholder="Ville"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={editFormData.postal_code}
                                                            onChange={(e) => setEditFormData({ ...editFormData, postal_code: e.target.value })}
                                                            className="form-input-premium"
                                                            placeholder="Code Postal"
                                                            style={{ width: '80px' }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="info-value">{`${profile.address || ''} ${profile.city || ''} (${profile.postal_code || ''})`}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="premium-card">
                                <h3><ShieldAlert size={20} /> Informations</h3>
                                <div className="premium-info-list">
                                    <div className="premium-info-item">
                                        <div className="info-icon-box"><Briefcase size={16} /></div>
                                        <div className="info-content">
                                            <span className="info-label">Corps de métier</span>
                                            {isEditing ? (
                                                <select
                                                    value={editFormData.trade}
                                                    onChange={(e) => setEditFormData({ ...editFormData, trade: e.target.value })}
                                                    className="premium-select"
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                                                >
                                                    <option value="animalerie">Services Animaux</option>
                                                    <option value="automobile">Garage & Automobile</option>
                                                    <option value="batiment">Bâtiment & Rénovation</option>
                                                    <option value="boulangerie">Boulangerie & Pâtisserie</option>
                                                    <option value="boutique">Boutique & Commerce</option>
                                                    <option value="chauffage-climo">Chauffage & Climatisation</option>
                                                    <option value="coiffure">Coiffure & Beauté</option>
                                                    <option value="couvreur">Couvreur</option>
                                                    <option value="demenagement">Déménagement</option>
                                                    <option value="dentiste">Dentiste & Santé</option>
                                                    <option value="electricite">Électricité</option>
                                                    <option value="expert-comptable">Expert Comptable</option>
                                                    <option value="fleuriste">Fleuriste</option>
                                                    <option value="immobilier">Agence Immobilière</option>
                                                    <option value="informatique">Informatique & Réparation</option>
                                                    <option value="jardinage-paysage">Jardin & Paysage</option>
                                                    <option value="juridique">Services Juridiques</option>
                                                    <option value="loisirs">Loisirs & Divertissement</option>
                                                    <option value="maconnerie">Maçonnerie</option>
                                                    <option value="menuiserie">Menuiserie</option>
                                                    <option value="nettoyage-menage">Nettoyage & Ménage</option>
                                                    <option value="peinture-decoration">Peinture & Décoration</option>
                                                    <option value="photographe">Photographie</option>
                                                    <option value="plomberie">Plomberie & Assainissement</option>
                                                    <option value="restaurant">Restaurant & Café</option>
                                                    <option value="serrurerie">Serrurerie (Urgence)</option>
                                                    <option value="toiture-couverture">Toiture & Couverture</option>
                                                    <option value="vitrier">Vitrerie</option>
                                                    <option value="vtc">Transport & VTC</option>
                                                </select>
                                            ) : (
                                                <span className="info-value" style={{ textTransform: 'capitalize' }}>{profile.trade}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="premium-info-item">
                                        <div className="info-icon-box"><Globe size={16} /></div>
                                        <div className="info-content">
                                            <span className="info-label">Lien Google</span>
                                            {isEditing ? (
                                                <input
                                                    type="url"
                                                    value={editFormData.google_business_url}
                                                    onChange={(e) => setEditFormData({ ...editFormData, google_business_url: e.target.value })}
                                                    className="form-input-premium"
                                                    placeholder="https://g.page/..."
                                                />
                                            ) : (
                                                <a href={profile.google_business_url} target="_blank" rel="noopener noreferrer" className="info-value link">
                                                    Voir la fiche <ExternalLink size={12} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="premium-card">
                                <h3><ShieldAlert size={20} /> Sécurité</h3>
                                <div className="premium-info-list">
                                    <div className="premium-info-item">
                                        <div className="info-icon-box"><ShieldAlert size={16} /></div>
                                        <div className="info-content">
                                            <span className="info-label">Mot de passe</span>
                                            {isEditing ? (
                                                <div style={{ width: '100%' }}>
                                                    <input
                                                        type="text"
                                                        value={editFormData.password}
                                                        onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                                                        className="form-input-premium"
                                                        placeholder="Nouveau mot de passe (laisser vide pour ne pas changer)"
                                                    />
                                                    <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                                                        Sera mis à jour uniquement si vous saisissez une valeur.
                                                    </small>
                                                </div>
                                            ) : (
                                                <span className="info-value">••••••••••••</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="premium-card table-card" style={{ marginTop: '2rem' }}>
                            <h3><Zap size={20} /> Historique des Transactions (Recharges)</h3>
                            <div className="admin-table-wrapper">
                                <table className="premium-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Description</th>
                                            <th>Montant</th>
                                            <th>Type</th>
                                            <th>Statut</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments && payments.length > 0 ? payments.map(payment => (
                                            <tr key={payment.id}>
                                                <td>{new Date(payment.created_at).toLocaleDateString()}</td>
                                                <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={payment.description}>
                                                    {payment.description}
                                                </td>
                                                <td>{payment.amount}€</td>
                                                <td>
                                                    <span className={`premium-status-badge active`} style={{ background: '#f1f5f9', color: '#475569' }}>
                                                        {payment.type}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`premium-status-badge ${payment.status}`}>
                                                        {payment.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        {payment.status === 'completed' && payment.description.includes('(Activé par Admin)') && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleCancelPayment(payment.id)}
                                                                    title="Désactiver"
                                                                    style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '4px', background: '#fee2e2', border: 'none', cursor: 'pointer', color: '#b91c1c' }}
                                                                >
                                                                    Désactiver
                                                                </button>
                                                                <button
                                                                    onClick={() => handleBlockPayment(payment.id)}
                                                                    title="Bloquer"
                                                                    style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '4px', background: '#fef3c7', border: 'none', cursor: 'pointer', color: '#b45309' }}
                                                                >
                                                                    Bloquer
                                                                </button>
                                                            </>
                                                        )}
                                                        {(payment.status === 'cancelled' || payment.status === 'deactivated' || payment.status === 'blocked') && payment.description.includes('(Activé par Admin)') && (
                                                            <button
                                                                onClick={() => handleReactivatePayment(payment.id)}
                                                                title="Réactiver"
                                                                style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '4px', background: '#dcfce7', border: 'none', cursor: 'pointer', color: '#15803d' }}
                                                            >
                                                                Réactiver
                                                            </button>
                                                        )}
                                                        {payment.status !== 'deleted' && (
                                                            <button
                                                                onClick={() => handleDeletePaymentStatus(payment.id)}
                                                                title="Supprimer"
                                                                style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '4px', background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b' }}
                                                            >
                                                                Supprimer
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="text-center">Aucun paiement enregistré</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="premium-card table-card" style={{ marginTop: '2rem' }}>
                            <h3><Briefcase size={20} /> Historique des Missions (Commandes)</h3>
                            <div className="admin-table-wrapper">
                                <table className="premium-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Crédits</th>
                                            <th>Pack</th>
                                            <th>Statut</th>
                                            <th>Avis Validés</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders && orders.length > 0 ? orders.map(order => (
                                            <tr key={order.id}>
                                                <td>{new Date(order.created_at).toLocaleDateString()}</td>
                                                <td>{order.credits_purchased}</td>
                                                <td>{order.amount}€</td>
                                                <td>
                                                    <span className={`premium-status-badge ${order.status}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td>{order.validated_reviews_count || 0}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="text-center">Aucune mission en cours</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="detail-sidebar-sticky">
                        <div className="premium-card">
                            <h3>Statistiques</h3>
                            <div className="stats-premium-grid">
                                <div className="stat-premium-item">
                                    <span className="stat-p-value">{orders.length}</span>
                                    <span className="stat-p-label">Missions</span>
                                </div>
                                <div className="stat-premium-item">
                                    <span className="stat-p-value">
                                        {(payments || []).reduce((acc, curr) => acc + Number(curr.amount), 0)}€
                                    </span>
                                    <span className="stat-p-label">Investissement Total</span>
                                </div>
                            </div>
                        </div>

                        <div className="premium-card highlight">
                            <h3><Zap size={20} color="#f59e0b" /> Pack Actuel</h3>
                            <div style={{ padding: '0.5rem 0' }}>
                                <div className="active-pack-recap" style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.2rem' }}>
                                                Statut
                                            </div>
                                            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                                                {profile.active_pack_name || 'Aucun pack actif'}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.2rem' }}>
                                                Progression
                                            </div>
                                            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0ea5e9' }}>
                                                {profile.current_month_reviews} / {profile.monthly_reviews_quota}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                                        <div
                                            style={{
                                                width: `${Math.min(100, (profile.current_month_reviews / (profile.monthly_reviews_quota || 1)) * 100)}%`,
                                                height: '100%',
                                                background: '#0ea5e9',
                                                transition: 'width 0.3s ease'
                                            }}
                                        />
                                    </div>

                                    {profile.subscription_end_date && (
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                            Expire le : {new Date(profile.subscription_end_date).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>

                                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                                    Sélectionnez un pack à activer manuellement :
                                </p>
                                <select
                                    className="premium-select"
                                    value={selectedPackId}
                                    onChange={(e) => setSelectedPackId(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', marginBottom: '1rem', background: 'white' }}
                                >
                                    <option value="">Sélectionner un pack...</option>
                                    {packs.map(pack => (
                                        <option key={pack.id} value={pack.id}>
                                            {pack.name} ({pack.quantity} avis)
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleActivatePack}
                                    disabled={!selectedPackId || isActivating}
                                    className="premium-action-btn primary"
                                    style={{ width: '100%', background: '#0ea5e9', color: 'white' }}
                                >
                                    {isActivating ? <LoadingSpinner size="sm" /> : (
                                        <>
                                            <Zap size={18} />
                                            Activer le Pack
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="premium-card">
                            <h3>Actions Admin</h3>
                            <div className="action-premium-stack">
                                {profile.status === 'active' ? (
                                    <>
                                        <button onClick={() => handleStatusUpdate('suspended')} className="premium-action-btn suspend">
                                            <XCircle size={18} />
                                            Suspendre le compte
                                        </button>
                                        <button onClick={() => handleStatusUpdate('deactivated')} className="premium-action-btn" style={{ background: '#f1f5f9', color: '#475569' }}>
                                            <Power size={18} />
                                            Désactiver le compte
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={() => handleStatusUpdate('active')} className="premium-action-btn activate">
                                        <CheckCircle size={18} />
                                        Réactiver le compte
                                    </button>
                                )}
                                <button onClick={handleIssueWarning} className="premium-action-btn warn">
                                    <ShieldAlert size={18} />
                                    Envoyer un avertissement
                                </button>
                                <button onClick={handleDeleteUser} className="premium-action-btn delete" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                                    <Trash2 size={18} />
                                    Supprimer l'artisan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reviews Section */}
                <div className="premium-card table-card" style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3><MessageSquare size={20} /> Avis de cet Artisan</h3>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div className="search-box-premium" style={{ position: 'relative' }}>
                                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                <input
                                    type="text"
                                    placeholder="Rechercher..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        padding: '0.6rem 1rem 0.6rem 2.5rem',
                                        borderRadius: '10px',
                                        border: '1px solid var(--gray-200)',
                                        width: '220px',
                                        fontSize: '0.875rem'
                                    }}
                                />
                            </div>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <Filter size={16} style={{ position: 'absolute', left: '12px', color: 'var(--gray-500)', pointerEvents: 'none' }} />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    style={{
                                        padding: '0.6rem 2rem 0.6rem 2.25rem',
                                        borderRadius: '10px',
                                        border: '1px solid var(--gray-200)',
                                        background: 'white',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        color: 'var(--gray-700)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="all">Tous les statuts</option>
                                    <option value="pending">En attente</option>
                                    <option value="submitted">Soumis</option>
                                    <option value="validated">Validés</option>
                                    <option value="rejected">Rejetés</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="admin-table-wrapper" style={{ maxHeight: '600px', overflowY: 'auto', overflowX: 'auto' }}>
                        {submissionsLoading ? (
                            <div style={{ textAlign: 'center', padding: '3rem' }}>
                                <LoadingSpinner size="lg" text="Chargement des avis..." />
                            </div>
                        ) : (
                            <table className="premium-table">
                                <thead>
                                    <tr>
                                        <th>Fiche</th>
                                        <th>Guide</th>
                                        <th>Contenu</th>
                                        <th>Statut</th>
                                        <th>Date</th>
                                        <th>Preuve</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const filtered = submissions.filter(sub => {
                                            const matchesSearch =
                                                sub.fiche_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                sub.guide_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                sub.proposal_content?.toLowerCase().includes(searchTerm.toLowerCase());

                                            let matchesStatus = true;
                                            if (statusFilter === 'pending') {
                                                matchesStatus = !sub.submission_id || sub.submission_status === 'pending';
                                            } else if (statusFilter === 'submitted') {
                                                matchesStatus = !!sub.submission_id && !sub.submission_status;
                                            } else if (statusFilter === 'validated') {
                                                matchesStatus = sub.submission_status === 'validated';
                                            } else if (statusFilter === 'rejected') {
                                                matchesStatus = sub.submission_status === 'rejected';
                                            }

                                            return matchesSearch && matchesStatus;
                                        });

                                        if (filtered.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan={6} className="text-center" style={{ padding: '2rem', color: '#9ca3af' }}>
                                                        Aucun avis trouvé
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return filtered.map(sub => (
                                            <tr key={sub.proposal_id}>
                                                <td>
                                                    <div
                                                        style={{
                                                            fontWeight: 600,
                                                            color: '#374151',
                                                            cursor: 'pointer',
                                                            textDecoration: 'underline',
                                                            textUnderlineOffset: '2px',
                                                            maxWidth: '200px',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}
                                                        onClick={() => navigate(`/admin/fiches/${sub.order_id}`)}
                                                        title={sub.fiche_name}
                                                    >
                                                        {sub.fiche_name}
                                                    </div>
                                                </td>
                                                <td>
                                                    {sub.guide_name ? (
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                cursor: 'pointer',
                                                                textDecoration: 'underline',
                                                                textUnderlineOffset: '2px'
                                                            }}
                                                            onClick={() => navigate(`/admin/guides/${sub.guide_id}`)}
                                                        >
                                                            <User size={14} />
                                                            <span style={{ fontWeight: 600, color: '#111827', fontSize: '13px' }}>
                                                                {sub.guide_name}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#9ca3af', fontSize: '12px', fontStyle: 'italic' }}>
                                                            Non assigné
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div style={{ maxWidth: '250px' }}>
                                                        <div
                                                            style={{
                                                                fontWeight: 600,
                                                                color: '#374151',
                                                                fontSize: '13px',
                                                                maxWidth: '100%',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}
                                                            title={sub.proposal_author}
                                                        >
                                                            {sub.proposal_author}
                                                        </div>
                                                        <div
                                                            style={{
                                                                color: '#6b7280',
                                                                fontSize: '11px',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}
                                                            title={sub.proposal_content}
                                                        >
                                                            {sub.proposal_content}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    {sub.submission_id ? (
                                                        <span
                                                            className="premium-status-badge"
                                                            style={{
                                                                padding: '0.4rem 0.8rem',
                                                                borderRadius: '10px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 700,
                                                                textTransform: 'uppercase',
                                                                backgroundColor:
                                                                    sub.submission_status === 'validated' ? '#dcfce7' :
                                                                        sub.submission_status === 'rejected' ? '#fee2e2' :
                                                                            '#fef3c7',
                                                                color:
                                                                    sub.submission_status === 'validated' ? '#166534' :
                                                                        sub.submission_status === 'rejected' ? '#991b1b' :
                                                                            '#92400e'
                                                            }}
                                                        >
                                                            {sub.submission_status === 'validated' ? 'Validé' :
                                                                sub.submission_status === 'rejected' ? 'Rejeté' :
                                                                    'En attente'}
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className="premium-status-badge"
                                                            style={{
                                                                padding: '0.4rem 0.8rem',
                                                                borderRadius: '10px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 700,
                                                                textTransform: 'uppercase',
                                                                backgroundColor: '#f3f4f6',
                                                                color: '#4b5563'
                                                            }}
                                                        >
                                                            Non soumis
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div style={{ fontSize: '13px', color: '#111827', fontWeight: 600 }}>
                                                        {sub.submitted_at ?
                                                            new Date(sub.submitted_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) :
                                                            new Date(sub.proposal_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                                                        }
                                                    </div>
                                                </td>
                                                <td>
                                                    {sub.review_url ? (
                                                        <a
                                                            href={sub.review_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                padding: '0.4rem 0.8rem',
                                                                backgroundColor: '#f8fafc',
                                                                borderRadius: '8px',
                                                                color: 'var(--primary-brand)',
                                                                textDecoration: 'none',
                                                                fontSize: '0.8rem',
                                                                fontWeight: 600,
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            Voir <ExternalLink size={14} />
                                                        </a>
                                                    ) : (
                                                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};
