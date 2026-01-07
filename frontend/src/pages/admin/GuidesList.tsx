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
import toast from 'react-hot-toast';
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
            toast.error('Erreur lors du chargement des guides');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const handleStatusUpdate = async (userId: string, newStatus: string) => {
        if (!confirm(`Changer le statut en ${newStatus} ?`)) return;
        try {
            await adminService.updateUserStatus(userId, newStatus);
            toast.success('Statut mis à jour');
            loadGuides(true);
        } catch (error) {
            toast.error('Erreur lors de la mise à jour');
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('Supprimer définitivement ce compte ? Cette action est irréversible.')) return;
        try {
            await adminService.deleteUser(userId);
            toast.success('Compte supprimé');
            loadGuides(true);
        } catch (error) {
            toast.error('Erreur lors de la suppression');
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
                                                        onClick={() => toast('Avertissement envoyé (simulation)')}
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
