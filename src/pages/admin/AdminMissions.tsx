import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminApi } from '../../services/api';
import {
    Search,
    Filter,
    Clock,
    CheckCircle2,
    Trash2,
    Edit3,
    MapPin,
    Building2,
    Briefcase
} from 'lucide-react';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import './AdminLists.css';

interface Mission {
    id: string;
    artisan_id: string;
    artisan_name: string;
    company_name: string;
    original_company_name: string;
    quantity: number;
    price: number;
    status: 'draft' | 'submitted' | 'in_progress' | 'completed' | 'cancelled' | 'pending';
    created_at: string;
    published_at?: string;
    sector: string;
    desired_tone: string;
    reviews_received: number;
    google_business_url: string;
}

export const AdminMissions: React.FC = () => {
    const [missions, setMissions] = useState<Mission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        loadMissions();
    }, []);

    const loadMissions = async () => {
        setIsLoading(true);
        try {
            const data = await adminApi.getMissions();
            setMissions(data);
        } catch (error) {
            toast.error('Erreur lors du chargement des missions');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette mission ? Cette action est irréversible.')) {
            return;
        }

        try {
            await adminApi.deleteMission(id);
            toast.success('Mission supprimée');
            loadMissions();
        } catch (error) {
            toast.error('Erreur lors de la suppression');
        }
    };

    const stats = {
        total: missions.length,
        submitted: missions.filter(m => m.status === 'submitted').length,
        inProgress: missions.filter(m => m.status === 'in_progress').length,
        completed: missions.filter(m => m.status === 'completed').length,
    };

    const filteredMissions = missions.filter(m => {
        const matchesSearch =
            m.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.artisan_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.id.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || m.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'draft': return 'Brouillon';
            case 'submitted': return 'À valider';
            case 'in_progress': return 'En cours';
            case 'completed': return 'Terminé';
            case 'cancelled': return 'Annulé';
            case 'pending': return 'En attente';
            default: return status;
        }
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'in_progress': return 'active';
            case 'completed': return 'active';
            case 'submitted': return 'warning';
            case 'draft': return 'inactive';
            case 'cancelled': return 'suspended';
            default: return 'inactive';
        }
    };

    return (
        <DashboardLayout title="Gestion des Missions">
            <div className="admin-dashboard revamped">
                {/* Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div
                        className={`stat-card ${statusFilter === 'all' ? 'filter-active' : ''}`}
                        onClick={() => setStatusFilter('all')}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Total Missions</span>
                            <Briefcase size={20} color="var(--primary-red)" />
                        </div>
                        <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.total}</span>
                    </div>
                    <div
                        className={`stat-card ${statusFilter === 'submitted' ? 'filter-active' : ''}`}
                        onClick={() => setStatusFilter('submitted')}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>À valider</span>
                            <Clock size={20} color="#f59e0b" />
                        </div>
                        <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.submitted}</span>
                    </div>
                    <div
                        className={`stat-card ${statusFilter === 'in_progress' ? 'filter-active' : ''}`}
                        onClick={() => setStatusFilter('in_progress')}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>En cours</span>
                            <CheckCircle2 size={20} color="#10b981" />
                        </div>
                        <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.inProgress}</span>
                    </div>
                    <div
                        className={`stat-card ${statusFilter === 'completed' ? 'filter-active' : ''}`}
                        onClick={() => setStatusFilter('completed')}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Terminées</span>
                            <CheckCircle2 size={20} color="#3b82f6" />
                        </div>
                        <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.completed}</span>
                    </div>
                </div>

                <div className="admin-main-card">
                    <div className="admin-card-header">
                        <h2 className="card-title">Toutes les Missions</h2>
                        <div className="admin-controls">
                            <div className="search-box">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Rechercher une mission..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="filter-select-wrapper">
                                <Filter size={16} />
                                <select
                                    className="admin-select"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="all">Tous les statuts</option>
                                    <option value="draft">Brouillons</option>
                                    <option value="submitted">À valider</option>
                                    <option value="in_progress">En cours</option>
                                    <option value="completed">Terminées</option>
                                    <option value="cancelled">Annulées</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="admin-table-container">
                        {isLoading ? (
                            <div className="admin-loading">
                                <LoadingSpinner size="lg" text="Chargement des missions..." />
                            </div>
                        ) : (
                            <table className="admin-modern-table">
                                <thead>
                                    <tr>
                                        <th>Mission / Artisan</th>
                                        <th>Détails</th>
                                        <th>Progrès</th>
                                        <th>Statut</th>
                                        <th>Date</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMissions.length > 0 ? filteredMissions.map((mission) => (
                                        <tr key={mission.id} className={`tr-status-${mission.status}`}>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span className="font-medium" style={{ color: 'var(--gray-900)' }}>
                                                        {mission.company_name || mission.original_company_name}
                                                    </span>
                                                    <span style={{ fontSize: '12px', color: 'var(--gray-50)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Building2 size={12} /> {mission.artisan_name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <MapPin size={12} /> {mission.sector}
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                                                        Tone: {mission.desired_tone}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ width: '100px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                                                        <span style={{ fontWeight: 600 }}>{mission.reviews_received}/{mission.quantity}</span>
                                                        <span style={{ fontWeight: 600 }}>{Math.round((mission.reviews_received / mission.quantity) * 100)}%</span>
                                                    </div>
                                                    <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${(mission.reviews_received / mission.quantity) * 100}%`, height: '100%', background: 'var(--primary-red)' }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`admin-badge ${getStatusBadgeClass(mission.status)}`}>
                                                    {getStatusLabel(mission.status)}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                                                    {new Date(mission.created_at).toLocaleDateString()}
                                                </span>
                                            </td>
                                            <td className="actions-cell">
                                                <div className="action-buttons">
                                                    <button
                                                        className="action-btn"
                                                        title="Voir détails / Modifier"
                                                        onClick={() => navigate(`/admin/missions/${mission.id}`)}
                                                    >
                                                        <Edit3 size={18} />
                                                    </button>
                                                    <button
                                                        className="action-btn block-btn"
                                                        title="Supprimer"
                                                        onClick={() => handleDelete(mission.id)}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="text-center" style={{ padding: '40px', color: 'var(--gray-500)' }}>
                                                Aucune mission trouvée.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};
