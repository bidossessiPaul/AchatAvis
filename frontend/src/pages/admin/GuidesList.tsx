import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminService } from '../../services/adminService';
import {
    Search,
    Trash2,
    CheckCircle,
    XCircle,
    Bell,
    Award,
    Eye
} from 'lucide-react';
import { showConfirm, showSuccess, showError, showInput, showPremiumWarningModal } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './AdminLists.css';

interface Guide {
    id: string;
    email: string;
    avatar_url: string | null;
    status: string;
    created_at: string;
    google_email: string;
    local_guide_level: number;
    total_reviews_count: number;
    city: string;
    warning_count: number;
}

export const GuidesList: React.FC = () => {
    const [guides, setGuides] = useState<Guide[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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

    const handleIssueWarning = async (guide: Guide) => {
        try {
            const reasonsData = await adminService.getSuspensionReasons();
            const reasons = reasonsData.warnings;

            const result = await showPremiumWarningModal(
                'Avertissement',
                `Envoyer un avertissement à ${guide.google_email}. Sélectionnez le motif :`,
                reasons
            );

            if (!result.isConfirmed || !result.value) return;

            let finalReason = result.value;

            if (finalReason === 'OTHER') {
                const manualInput = await showInput('Autre motif', 'Saisissez le motif de l\'avertissement :', 'Précisez la raison...');
                if (!manualInput.isConfirmed || !manualInput.value) return;
                finalReason = manualInput.value;
            }

            const response = await adminService.issueWarning(guide.id, finalReason);
            showSuccess('Succès', response.suspended ? 'Avertissement envoyé et compte suspendu !' : `Avertissement envoyé (${response.warningCount}/3).`);
            loadGuides(true);
        } catch (error) {
            showError('Erreur', "Erreur lors de l'envoi de l'avertissement");
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
                                        <th>Niveau</th>
                                        <th>Avis</th>
                                        <th>Avertissements</th>
                                        <th>Statut</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredGuides.map(guide => (
                                        <tr key={guide.id}>
                                            <td className="font-medium">
                                                <div className="guide-cell" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                                    {guide.avatar_url ? (
                                                        <img src={guide.avatar_url} alt="" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>
                                                            <div style={{ transform: 'scale(0.8)' }}><Award size={16} /></div>
                                                        </div>
                                                    )}
                                                    {guide.google_email}
                                                </div>

                                            </td>
                                            <td className="text-gray-500">{guide.email}</td>
                                            <td>{guide.city}</td>
                                            <td>
                                                <span className="level-badge">
                                                    <Award size={12} /> Niv. {guide.local_guide_level}
                                                </span>
                                            </td>
                                            <td>{guide.total_reviews_count}</td>
                                            <td>
                                                {guide.warning_count > 0 ? (
                                                    <span className="admin-badge warning" style={{ background: '#fff7ed', color: '#c2410c', borderColor: '#fdba74' }}>
                                                        {guide.warning_count}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">-</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className={`admin-badge ${guide.status || 'inactive'}`}>
                                                    {guide.status}
                                                </span>
                                            </td>
                                            <td className="actions-cell">
                                                <div className="action-buttons">
                                                    <>
                                                        <button
                                                            onClick={() => (window.location.href = `/admin/guides/${guide.id}`)}
                                                            className="action-btn"
                                                            title="Voir détails"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                        {guide.status === 'active' ? (
                                                            <button
                                                                onClick={() => handleStatusUpdate(guide.id, 'suspended')}
                                                                className="action-btn block-btn"
                                                                title="Suspendre"
                                                            >
                                                                <XCircle size={18} />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleStatusUpdate(guide.id, 'active')}
                                                                className="action-btn active-btn"
                                                                title="Activer"
                                                            >
                                                                <CheckCircle size={18} />
                                                            </button>
                                                        )}
                                                    </>
                                                    <button
                                                        onClick={() => handleIssueWarning(guide)}
                                                        className="action-btn warn-btn"
                                                        title="Avertir"
                                                    >
                                                        <Bell size={18} />
                                                    </button>
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
        </DashboardLayout>
    );
};
