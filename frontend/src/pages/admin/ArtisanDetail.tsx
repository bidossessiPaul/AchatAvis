import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminService } from '../../services/adminService';
import {
    Briefcase,
    Mail,
    Phone,
    MapPin,
    Calendar,
    ArrowLeft,
    ShieldAlert,
    Trash2,
    CheckCircle,
    XCircle,
    Globe,
    ExternalLink,
    Zap,
    Power
} from 'lucide-react';
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
        warning_count: number;
        company_name: string;
        trade: string;
        phone: string;
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

    useEffect(() => {
        if (id) {
            loadDetail();
            fetchPacks();
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
                password: ''
            });
        } catch (error) {
            showError('Erreur', 'Erreur lors du chargement des détails');
        } finally {
            setIsLoading(false);
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
                                    <img src={profile.avatar_url} alt={profile.full_name} className="header-avatar" />
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
                                        <h2>{profile.company_name}</h2>
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
                                                    {payment.status === 'completed' && payment.description.includes('(Activé par Admin)') && (
                                                        <button
                                                            onClick={() => handleCancelPayment(payment.id)}
                                                            className="text-red-500 hover:text-red-700"
                                                            style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '4px', background: '#fee2e2', border: 'none', cursor: 'pointer' }}
                                                        >
                                                            Désactiver
                                                        </button>
                                                    )}
                                                    {(payment.status === 'cancelled' || payment.status === 'deactivated') && payment.description.includes('(Activé par Admin)') && (
                                                        <button
                                                            onClick={() => handleReactivatePayment(payment.id)}
                                                            className="text-green-500 hover:text-green-700"
                                                            style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '4px', background: '#dcfce7', border: 'none', cursor: 'pointer' }}
                                                        >
                                                            Réactiver
                                                        </button>
                                                    )}
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
            </div>
        </DashboardLayout>
    );
};
