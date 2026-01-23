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
    Building2,
    Briefcase
} from 'lucide-react';
import { showConfirm, showSuccess, showError } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import './AdminLists.css';

interface fiche {
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

export const AdminFiches: React.FC = () => {
    const [fiches, setfiches] = useState<fiche[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        loadfiches();
    }, []);

    const loadfiches = async () => {
        setIsLoading(true);
        try {
            const data = await adminApi.getfiches();
            setfiches(data);
        } catch (error) {
            showError('Erreur', 'Erreur lors du chargement des fiches');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        const result = await showConfirm(
            'Supprimer cette fiche ?',
            'Cette action est irréversible et supprimera toutes les données associées.'
        );

        if (!result.isConfirmed) return;

        try {
            await adminApi.deletefiche(id);
            showSuccess('Succès', 'fiche supprimée');
            loadfiches();
        } catch (error) {
            showError('Erreur', 'Erreur lors de la suppression');
        }
    };

    const stats = {
        total: fiches.length,
        submitted: fiches.filter(m => m.status === 'submitted').length,
        inProgress: fiches.filter(m => m.status === 'in_progress').length,
        completed: fiches.filter(m => m.status === 'completed').length,
    };

    const filteredfiches = fiches.filter(m => {
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


    return (
        <DashboardLayout title="Gestion des Campagnes">
            <div className="admin-dashboard revamped" style={{ padding: '2rem' }}>
                {/* Premium Header */}
                <div style={{ marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <div style={{ backgroundColor: '#fff', padding: '0.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                            <Briefcase size={24} color="var(--artisan-primary)" />
                        </div>
                        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                            Gestion des fiches
                        </h1>
                    </div>
                    <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
                        Supervisez et gérez toutes les campagnes d'avis de la plateforme.
                    </p>
                </div>

                {/* Glassmorphism Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                    <div
                        className={`stat-card ${statusFilter === 'all' ? 'filter-active' : ''}`}
                        onClick={() => setStatusFilter('all')}
                        style={{ border: 'none', background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div style={{ padding: '0.75rem', borderRadius: '12px', backgroundColor: 'rgba(255, 153, 31, 0.1)' }}>
                                <Briefcase size={22} color="var(--artisan-primary)" />
                            </div>
                            <span style={{ fontSize: '2rem', fontWeight: 800, color: '#111827' }}>{stats.total}</span>
                        </div>
                        <span style={{ color: '#4b5563', fontSize: '0.9rem', fontWeight: 600 }}>Total Campagnes</span>
                    </div>

                    <div
                        className={`stat-card ${statusFilter === 'submitted' ? 'filter-active' : ''}`}
                        onClick={() => setStatusFilter('submitted')}
                        style={{ border: 'none', background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div style={{ padding: '0.75rem', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                                <Clock size={22} color="#f59e0b" />
                            </div>
                            <span style={{ fontSize: '2rem', fontWeight: 800, color: '#111827' }}>{stats.submitted}</span>
                        </div>
                        <span style={{ color: '#4b5563', fontSize: '0.9rem', fontWeight: 600 }}>À Valider</span>
                    </div>

                    <div
                        className={`stat-card ${statusFilter === 'in_progress' ? 'filter-active' : ''}`}
                        onClick={() => setStatusFilter('in_progress')}
                        style={{ border: 'none', background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div style={{ padding: '0.75rem', borderRadius: '12px', backgroundColor: 'rgba(255, 153, 31, 0.1)' }}>
                                <CheckCircle2 size={22} color="#FF991F" />
                            </div>
                            <span style={{ fontSize: '2rem', fontWeight: 800, color: '#111827' }}>{stats.inProgress}</span>
                        </div>
                        <span style={{ color: '#4b5563', fontSize: '0.9rem', fontWeight: 600 }}>En Cours</span>
                    </div>

                    <div
                        className={`stat-card ${statusFilter === 'completed' ? 'filter-active' : ''}`}
                        onClick={() => setStatusFilter('completed')}
                        style={{ border: 'none', background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div style={{ padding: '0.75rem', borderRadius: '12px', backgroundColor: 'rgba(255, 107, 53, 0.1)' }}>
                                <CheckCircle2 size={22} color="#FF6B35" />
                            </div>
                            <span style={{ fontSize: '2rem', fontWeight: 800, color: '#111827' }}>{stats.completed}</span>
                        </div>
                        <span style={{ color: '#4b5563', fontSize: '0.9rem', fontWeight: 600 }}>Terminées</span>
                    </div>
                </div>

                <div className="admin-main-card" style={{ border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', borderRadius: '24px' }}>
                    <div className="admin-card-header" style={{ padding: '0.5rem 0 1.5rem 0' }}>
                        <h2 className="card-title" style={{ fontSize: '1.25rem', fontWeight: 700 }}>Liste des fiches</h2>
                        <div className="admin-controls">
                            <div className="search-box">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Rechercher par entreprise, artisan..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ borderRadius: '14px', border: '1px solid #e5e7eb', padding: '0.75rem 1rem 0.75rem 2.75rem' }}
                                />
                            </div>

                            <div className="filter-select-wrapper">
                                <Filter size={16} />
                                <select
                                    className="admin-select"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    style={{ borderRadius: '14px', border: '1px solid #e5e7eb', height: '100%' }}
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
                                <LoadingSpinner size="lg" text="Chargement des fiches..." />
                            </div>
                        ) : (
                            <table className="admin-modern-table" style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                                <thead>
                                    <tr style={{ background: 'transparent' }}>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>fiche / Artisan</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Détails</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Progrès</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Statut</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Date</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }} className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredfiches.length > 0 ? filteredfiches.map((fiche) => (
                                        <tr key={fiche.id} style={{ backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', borderRadius: '16px', overflow: 'hidden' }}>
                                            <td style={{ padding: '1.25rem 1.5rem', border: 'none', borderRadius: '16px 0 0 16px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span className="font-medium" style={{ color: '#111827', fontWeight: 600 }}>
                                                        {fiche.company_name || fiche.original_company_name}
                                                    </span>
                                                    <span style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                                        <Building2 size={12} color="var(--artisan-primary)" /> {fiche.artisan_name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ border: 'none' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', color: '#374151' }}>
                                                        <span style={{ color: 'var(--artisan-primary)' }}>•</span> {fiche.sector}
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500 }}>
                                                        Ton: {fiche.desired_tone}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ border: 'none' }}>
                                                <div style={{ width: '120px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                                                        <span style={{ fontWeight: 700, color: '#111827' }}>{fiche.reviews_received}/{fiche.quantity}</span>
                                                        <span style={{ fontWeight: 700, color: 'var(--artisan-primary)' }}>{Math.round((fiche.reviews_received / fiche.quantity) * 100)}%</span>
                                                    </div>
                                                    <div style={{ width: '100%', height: '8px', background: '#f3f4f6', borderRadius: '10px', overflow: 'hidden' }}>
                                                        <div
                                                            style={{
                                                                width: `${(fiche.reviews_received / fiche.quantity) * 100}%`,
                                                                height: '100%',
                                                                background: 'linear-gradient(90deg, var(--artisan-primary), #FF6B35)',
                                                                borderRadius: '10px',
                                                                transition: 'width 1s ease-in-out'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ border: 'none' }}>
                                                <span
                                                    className={`admin-badge`}
                                                    style={{
                                                        padding: '0.4rem 0.8rem',
                                                        borderRadius: '10px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.025em',
                                                        backgroundColor:
                                                            fiche.status === 'completed' ? '#dcfce7' :
                                                                fiche.status === 'in_progress' ? '#fff7ed' :
                                                                    fiche.status === 'submitted' ? '#fef3c7' :
                                                                        fiche.status === 'cancelled' ? '#fee2e2' : '#f3f4f6',
                                                        color:
                                                            fiche.status === 'completed' ? '#166534' :
                                                                fiche.status === 'in_progress' ? '#9a3412' :
                                                                    fiche.status === 'submitted' ? '#92400e' :
                                                                        fiche.status === 'cancelled' ? '#991b1b' : '#4b5563'
                                                    }}
                                                >
                                                    {getStatusLabel(fiche.status)}
                                                </span>
                                            </td>
                                            <td style={{ border: 'none' }}>
                                                <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>
                                                    {new Date(fiche.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                </span>
                                            </td>
                                            <td className="actions-cell" style={{ border: 'none', borderRadius: '0 16px 16px 0' }}>
                                                <div className="action-buttons">
                                                    <button
                                                        className="action-btn"
                                                        style={{ backgroundColor: '#f9fafb', borderRadius: '10px', color: '#4b5563' }}
                                                        title="Voir détails / Modifier"
                                                        onClick={() => navigate(`/admin/fiches/${fiche.id}`)}
                                                    >
                                                        <Edit3 size={18} />
                                                    </button>
                                                    <button
                                                        className="action-btn block-btn"
                                                        style={{ backgroundColor: '#fff1f2', borderRadius: '10px', color: '#e11d48' }}
                                                        title="Supprimer"
                                                        onClick={() => handleDelete(fiche.id)}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="text-center" style={{ padding: '60px', color: '#9ca3af' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                                    <Search size={48} style={{ opacity: 0.2 }} />
                                                    <p style={{ fontSize: '1.125rem', fontWeight: 500 }}>Aucune fiche trouvée.</p>
                                                </div>
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
