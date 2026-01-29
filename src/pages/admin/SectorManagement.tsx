import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import {
    Plus,
    Edit2,
    Trash2,
    Search,
    Loader2,
    X,
    Info,
    LayoutGrid,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { showConfirm, showSuccess, showError } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './AdminLists.css';

interface Sector {
    id: number;
    sector_name: string;
    sector_slug: string;
    difficulty: 'easy' | 'medium' | 'hard';
    google_strictness_level: number;
    icon_emoji: string;
    max_reviews_per_month_per_email: number | null;
    min_days_between_reviews: number;
    is_active: boolean;
}

export const SectorManagement: React.FC = () => {
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSector, setEditingSector] = useState<Sector | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        sector_name: '',
        sector_slug: '',
        difficulty: 'easy' as 'easy' | 'medium' | 'hard',
        google_strictness_level: 2,
        icon_emoji: '',
        max_reviews_per_month_per_email: null as number | null,
        min_days_between_reviews: 3,
        is_active: true
    });

    useEffect(() => {
        fetchSectors();
    }, []);

    const fetchSectors = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await adminService.getSectors();
            setSectors(data);
        } catch (error) {
            console.error('Error fetching sectors:', error);
            showError('Erreur', 'Erreur lors du chargement des secteurs');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleOpenModal = (sector: Sector | null = null) => {
        if (sector) {
            setEditingSector(sector);
            setFormData({
                sector_name: sector.sector_name,
                sector_slug: sector.sector_slug,
                difficulty: sector.difficulty,
                google_strictness_level: sector.google_strictness_level,
                icon_emoji: sector.icon_emoji,
                max_reviews_per_month_per_email: sector.max_reviews_per_month_per_email,
                min_days_between_reviews: sector.min_days_between_reviews,
                is_active: !!sector.is_active
            });
        } else {
            setEditingSector(null);
            setFormData({
                sector_name: '',
                sector_slug: '',
                difficulty: 'easy',
                google_strictness_level: 2,
                icon_emoji: '',
                max_reviews_per_month_per_email: 5,
                min_days_between_reviews: 3,
                is_active: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (editingSector) {
                await adminService.updateSector(editingSector.sector_slug, formData);
                showSuccess('Succès', 'Secteur mis à jour');
            } else {
                await adminService.createSector(formData);
                showSuccess('Succès', 'Secteur créé');
            }
            setIsModalOpen(false);
            fetchSectors(true);
        } catch (error: any) {
            console.error('Error saving sector:', error);
            showError('Erreur', error.response?.data?.error || 'Erreur lors de l\'enregistrement');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (slug: string) => {
        const result = await showConfirm('Supprimer ce secteur ?', 'Cette action est irréversible.');
        if (!result.isConfirmed) return;

        try {
            await adminService.deleteSector(slug);
            showSuccess('Succès', 'Secteur supprimé');
            fetchSectors(true);
        } catch (error) {
            console.error('Error deleting sector:', error);
            showError('Erreur', 'Erreur lors de la suppression');
        }
    };

    const filteredSectors = sectors.filter(s => {
        const matchesSearch = s.sector_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.sector_slug.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const totalPages = Math.ceil(filteredSectors.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedSectors = filteredSectors.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const getDifficultyBadge = (difficulty: string) => {
        switch (difficulty) {
            case 'easy':
                return <span className="admin-badge active" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>Facile</span>;
            case 'medium':
                return <span className="admin-badge warning" style={{ background: '#fffbeb', color: '#d97706', borderColor: '#fde68a' }}>Moyen</span>;
            case 'hard':
                return <span className="admin-badge rejected" style={{ background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}>Difficile</span>;
            default:
                return <span className="admin-badge gray">{difficulty}</span>;
        }
    };

    return (
        <DashboardLayout title="Gestion des Secteurs">
            <div className="admin-dashboard revamped">
                <div className="admin-main-card">
                    <div className="admin-card-header">
                        <h2 className="card-title">Secteurs & Activités</h2>
                        <div className="admin-controls">
                            <button className="admin-btn-primary" onClick={() => handleOpenModal()} style={{ marginRight: 'var(--space-4)' }}>
                                <Plus size={18} />
                                Nouveau Secteur
                            </button>
                            <div className="search-box">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Rechercher un secteur..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="admin-table-container">
                        {loading ? (
                            <div className="admin-loading">
                                <LoadingSpinner size="lg" text="Chargement des secteurs..." />
                            </div>
                        ) : filteredSectors.length > 0 ? (
                            <table className="admin-modern-table">
                                <thead>
                                    <tr>
                                        <th>Secteur</th>
                                        <th className="text-center">Difficulté</th>
                                        <th className="text-center">Sévérité G</th>
                                        <th className="text-center">Quota/Mois</th>
                                        <th className="text-center">Délai (j)</th>
                                        <th className="text-center">Statut</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedSectors.map((sector) => (
                                        <tr key={sector.id}>
                                            <td className="font-medium">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'var(--gray-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                                                        {sector.icon_emoji || <LayoutGrid size={16} />}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold">{sector.sector_name}</div>
                                                        <div className="text-gray-400 text-xs">{sector.sector_slug}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-center">{getDifficultyBadge(sector.difficulty)}</td>
                                            <td className="text-center">
                                                <span className="admin-badge" style={{ background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1' }}>
                                                    Niv. {sector.google_strictness_level}
                                                </span>
                                            </td>
                                            <td className="text-center font-medium">{sector.max_reviews_per_month_per_email || '∞'}</td>
                                            <td className="text-center">{sector.min_days_between_reviews}j</td>
                                            <td className="text-center">
                                                {sector.is_active ? (
                                                    <span className="admin-badge active">Actif</span>
                                                ) : (
                                                    <span className="admin-badge rejected">Inactif</span>
                                                )}
                                            </td>
                                            <td className="actions-cell">
                                                <div className="action-buttons">
                                                    <button className="action-btn" onClick={() => handleOpenModal(sector)} title="Modifier">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button className="action-btn delete-btn" onClick={() => handleDelete(sector.sector_slug)} title="Supprimer">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>

                                                {!loading && filteredSectors.length > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--gray-50)', borderRadius: '12px', flexWrap: 'wrap', gap: '1rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)', fontWeight: 500 }}>Afficher :</span>
                                                            <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--gray-300)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', backgroundColor: 'white' }}>
                                                                <option value={20}>20 secteurs</option>
                                                                <option value={50}>50 secteurs</option>
                                                                <option value={100}>100 secteurs</option>
                                                                <option value={200}>200 secteurs</option>
                                                            </select>
                                                            <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>{startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredSectors.length)} sur {filteredSectors.length}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--gray-300)', backgroundColor: currentPage === 1 ? 'var(--gray-100)' : 'white', color: currentPage === 1 ? 'var(--gray-400)' : 'var(--gray-700)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s' }}><ChevronLeft size={16} />Précédent</button>
                                                            <span style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)' }}>Page {currentPage} / {totalPages}</span>
                                                            <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--gray-300)', backgroundColor: currentPage === totalPages ? 'var(--gray-100)' : 'white', color: currentPage === totalPages ? 'var(--gray-400)' : 'var(--gray-700)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s' }}>Suivant<ChevronRight size={16} /></button>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--gray-400)' }}>
                                <Info size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                                <p>Aucun secteur correspondant à votre recherche.</p>
                            </div>
                        )}
                    </div>
                </div>

                {isModalOpen && (
                    <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                            <div className="modal-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                                    <div style={{ width: '40px', height: '40px', background: 'var(--artisan-gradient)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                        {editingSector ? <Edit2 size={20} /> : <Plus size={20} />}
                                    </div>
                                    <div>
                                        <h2 style={{ margin: 0 }}>{editingSector ? 'Éditer le secteur' : 'Nouveau Secteur'}</h2>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gray-500)' }}>Configurez les règles d'anti-détection</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <X size={24} color="var(--gray-400)" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="modal-body" style={{ padding: '2rem' }}>
                                    <div className="admin-form-grid" style={{ padding: 0 }}>
                                        <div className="admin-col-span-2">
                                            <label className="form-label-premium">Nom du secteur</label>
                                            <input
                                                type="text"
                                                className="form-input-premium"
                                                value={formData.sector_name}
                                                onChange={(e) => {
                                                    const name = e.target.value;
                                                    setFormData({
                                                        ...formData,
                                                        sector_name: name,
                                                        sector_slug: editingSector ? formData.sector_slug : name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                                                    });
                                                }}
                                                placeholder="Ex: Restaurant"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label-premium">Slug (Identifiant)</label>
                                            <input
                                                type="text"
                                                className="form-input-premium"
                                                value={formData.sector_slug}
                                                onChange={(e) => setFormData({ ...formData, sector_slug: e.target.value })}
                                                disabled={!!editingSector}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label-premium">Difficulté</label>
                                            <select
                                                className="form-input-premium"
                                                value={formData.difficulty}
                                                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
                                                style={{ appearance: 'auto' }}
                                            >
                                                <option value="easy">Facile</option>
                                                <option value="medium">Moyen</option>
                                                <option value="hard">Difficile</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="form-label-premium">Icone (Emoji)</label>
                                            <input
                                                type="text"
                                                className="form-input-premium"
                                                value={formData.icon_emoji}
                                                onChange={(e) => setFormData({ ...formData, icon_emoji: e.target.value })}
                                                placeholder="🍴"
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label-premium">Sévérité Google (1-5)</label>
                                            <input
                                                type="number"
                                                className="form-input-premium"
                                                min="1" max="5"
                                                value={formData.google_strictness_level}
                                                onChange={(e) => setFormData({ ...formData, google_strictness_level: parseInt(e.target.value) || 1 })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label-premium">Max avis / mois</label>
                                            <input
                                                type="number"
                                                className="form-input-premium"
                                                value={formData.max_reviews_per_month_per_email === null ? '' : formData.max_reviews_per_month_per_email}
                                                onChange={(e) => setFormData({ ...formData, max_reviews_per_month_per_email: e.target.value === '' ? null : parseInt(e.target.value) })}
                                                placeholder="Laisser vide pour illimité"
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label-premium">Délai (jours)</label>
                                            <input
                                                type="number"
                                                className="form-input-premium"
                                                value={formData.min_days_between_reviews}
                                                onChange={(e) => setFormData({ ...formData, min_days_between_reviews: parseInt(e.target.value) || 0 })}
                                                required
                                            />
                                        </div>
                                        <div className="admin-col-span-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <input
                                                type="checkbox"
                                                id="is_active"
                                                checked={formData.is_active}
                                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                                style={{ width: '20px', height: '20px', accentColor: 'var(--artisan-primary)' }}
                                            />
                                            <label htmlFor="is_active" className="font-medium" style={{ cursor: 'pointer' }}>Secteur actif et visible</label>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)} style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-lg)' }}>
                                        Annuler
                                    </button>
                                    <button type="submit" className="admin-btn-primary" disabled={isSubmitting} style={{ padding: '0.75rem 2rem' }}>
                                        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (editingSector ? 'Enregistrer les modifications' : 'Créer le secteur')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};
