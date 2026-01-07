import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminService } from '../../services/adminService';
import {
    Search,
    Trash2,
    CheckCircle,
    XCircle,
    Bell,
    Eye,
    Briefcase
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

    useEffect(() => {
        loadArtisans();
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
            </div>
        </DashboardLayout>
    );
};
