import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import {
    Globe,
    Plus,
    Edit3,
    Trash2,
    Search,
    ExternalLink,
    X,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
} from 'lucide-react';
import { showConfirm, showSuccess, showError } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import api from '../../services/api';

interface Platform {
    id: number;
    name: string;
    url: string;
    category: 'annuaire' | 'forum' | 'social' | 'blog';
    da_score: number | null;
    requires_account: boolean;
    reward_amount: number;
    notes: string | null;
    sector_tags: string | null;
    country: string | null;
    active: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
    annuaire: 'Annuaire',
    forum: 'Forum',
    social: 'Social',
    blog: 'Blog',
};

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
    annuaire: { bg: '#dbeafe', color: '#1e40af' },
    forum: { bg: '#ede9fe', color: '#6d28d9' },
    social: { bg: '#fce7f3', color: '#9d174d' },
    blog: { bg: '#d1fae5', color: '#065f46' },
};

const defaultForm = {
    name: '',
    url: '',
    category: 'annuaire' as Platform['category'],
    da_score: '' as number | '',
    requires_account: false,
    reward_amount: 0.15,
    notes: '',
    sector_tags: '',
    country: 'FR',
    active: true,
};

export const AdminGeoPlatforms: React.FC = () => {
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [activeFilter, setActiveFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
    const [formData, setFormData] = useState(defaultForm);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchPlatforms();
    }, []);

    const fetchPlatforms = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data } = await api.get('/geo/admin/platforms');
            setPlatforms(data);
        } catch {
            showError('Chargement impossible', 'Erreur lors du chargement des plateformes');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleOpenModal = (platform: Platform | null = null) => {
        if (platform) {
            setEditingPlatform(platform);
            setFormData({
                name: platform.name,
                url: platform.url,
                category: platform.category,
                da_score: platform.da_score ?? '',
                requires_account: platform.requires_account,
                reward_amount: Number(platform.reward_amount),
                notes: platform.notes ?? '',
                sector_tags: platform.sector_tags ?? '',
                country: platform.country ?? 'FR',
                active: platform.active,
            });
        } else {
            setEditingPlatform(null);
            setFormData(defaultForm);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const payload = {
            ...formData,
            da_score: formData.da_score === '' ? null : Number(formData.da_score),
        };
        try {
            if (editingPlatform) {
                await api.put(`/geo/admin/platforms/${editingPlatform.id}`, payload);
                showSuccess('Plateforme mise à jour');
            } else {
                await api.post('/geo/admin/platforms', payload);
                showSuccess('Plateforme créée');
            }
            setIsModalOpen(false);
            fetchPlatforms(true);
        } catch (err: any) {
            showError('Enregistrement impossible', err.response?.data?.error || 'Erreur serveur');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await showConfirm('Supprimer cette plateforme ?', 'Cette action est irréversible.');
        if (!result.isConfirmed) return;
        try {
            await api.delete(`/geo/admin/platforms/${id}`);
            showSuccess('Plateforme supprimée');
            fetchPlatforms(true);
        } catch {
            showError('Suppression impossible', 'Erreur lors de la suppression');
        }
    };

    const handleToggleActive = async (platform: Platform) => {
        try {
            await api.put(`/geo/admin/platforms/${platform.id}`, { ...platform, active: !platform.active });
            fetchPlatforms(true);
        } catch {
            showError('Erreur', 'Impossible de modifier le statut');
        }
    };

    const filtered = platforms.filter(p => {
        const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.url.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;
        const matchActive = activeFilter === 'all' || (activeFilter === 'active' ? p.active : !p.active);
        return matchSearch && matchCategory && matchActive;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, categoryFilter, activeFilter]);

    const stats = {
        total: platforms.length,
        active: platforms.filter(p => p.active).length,
        annuaire: platforms.filter(p => p.category === 'annuaire').length,
        forum: platforms.filter(p => p.category === 'forum').length,
        social: platforms.filter(p => p.category === 'social').length,
        blog: platforms.filter(p => p.category === 'blog').length,
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.65rem 0.85rem',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        fontSize: '0.875rem',
        outline: 'none',
        boxSizing: 'border-box',
    };

    const labelStyle: React.CSSProperties = {
        display: 'block',
        fontSize: '0.85rem',
        fontWeight: 600,
        color: '#374151',
        marginBottom: '0.35rem',
    };

    return (
        <DashboardLayout title="Plateformes GEO">
            <div style={{ padding: '0 0 3rem' }}>
                {/* Stats bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    {[
                        { label: 'Total', value: stats.total, color: '#2383e2', bg: '#eff6ff' },
                        { label: 'Actives', value: stats.active, color: '#059669', bg: '#f0fdf4' },
                        { label: 'Annuaires', value: stats.annuaire, color: '#1e40af', bg: '#dbeafe' },
                        { label: 'Forums', value: stats.forum, color: '#6d28d9', bg: '#ede9fe' },
                        { label: 'Sociaux', value: stats.social, color: '#9d174d', bg: '#fce7f3' },
                        { label: 'Blogs', value: stats.blog, color: '#065f46', bg: '#d1fae5' },
                    ].map(stat => (
                        <div key={stat.label} style={{ background: stat.bg, borderRadius: '1rem', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginTop: '2px' }}>{stat.label}</div>
                        </div>
                    ))}
                </div>

                <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Plateformes de citation</h2>
                            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748b' }}>{filtered.length} plateforme{filtered.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    placeholder="Rechercher..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    style={{ ...inputStyle, paddingLeft: '2rem', width: '220px' }}
                                />
                            </div>
                            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}>
                                <option value="all">Toutes catégories</option>
                                <option value="annuaire">Annuaire</option>
                                <option value="forum">Forum</option>
                                <option value="social">Social</option>
                                <option value="blog">Blog</option>
                            </select>
                            <select value={activeFilter} onChange={e => setActiveFilter(e.target.value)} style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}>
                                <option value="all">Tous statuts</option>
                                <option value="active">Actives</option>
                                <option value="inactive">Inactives</option>
                            </select>
                            <button
                                onClick={() => handleOpenModal()}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.6rem 1.25rem', borderRadius: '0.625rem', border: 'none', background: 'linear-gradient(135deg, #059669, #047857)', color: 'white', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}
                            >
                                <Plus size={16} />
                                Ajouter une plateforme
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center' }}>
                            <LoadingSpinner size="lg" text="Chargement..." />
                        </div>
                    ) : paginated.length === 0 ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                            <Globe size={48} style={{ opacity: 0.2, margin: '0 auto 1rem', display: 'block' }} />
                            <p style={{ fontWeight: 500 }}>Aucune plateforme trouvée</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        {['Nom', 'URL', 'Catégorie', 'DA', 'Compte requis', 'Rémunération', 'Statut', 'Actions'].map(h => (
                                            <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map(p => {
                                        const catColor = CATEGORY_COLORS[p.category];
                                        return (
                                            <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '0.875rem 1rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Globe size={14} color="#64748b" />
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>{p.name}</div>
                                                            {p.country && <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{p.country}</div>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '0.875rem 1rem' }}>
                                                    <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#2383e2', fontSize: '0.8rem', textDecoration: 'none', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        <ExternalLink size={12} />
                                                        {p.url.replace(/^https?:\/\//, '')}
                                                    </a>
                                                </td>
                                                <td style={{ padding: '0.875rem 1rem' }}>
                                                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', background: catColor.bg, color: catColor.color }}>
                                                        {CATEGORY_LABELS[p.category]}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '0.875rem 1rem', fontWeight: 700, color: '#475569', fontSize: '0.875rem' }}>
                                                    {p.da_score ?? '—'}
                                                </td>
                                                <td style={{ padding: '0.875rem 1rem' }}>
                                                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', background: p.requires_account ? '#fef3c7' : '#f1f5f9', color: p.requires_account ? '#92400e' : '#64748b' }}>
                                                        {p.requires_account ? 'Oui' : 'Non'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '0.875rem 1rem', fontWeight: 700, color: '#059669', fontSize: '0.875rem' }}>
                                                    {Number(p.reward_amount ?? 0).toFixed(2)} €
                                                </td>
                                                <td style={{ padding: '0.875rem 1rem' }}>
                                                    <button
                                                        onClick={() => handleToggleActive(p)}
                                                        style={{ padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', border: 'none', cursor: 'pointer', background: p.active ? '#dcfce7' : '#fee2e2', color: p.active ? '#166534' : '#991b1b' }}
                                                    >
                                                        {p.active ? 'Active' : 'Inactive'}
                                                    </button>
                                                </td>
                                                <td style={{ padding: '0.875rem 1rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button onClick={() => handleOpenModal(p)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Modifier">
                                                            <Edit3 size={14} color="#475569" />
                                                        </button>
                                                        <button onClick={() => handleDelete(p.id)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#fee2e2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Supprimer">
                                                            <Trash2 size={14} color="#991b1b" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && filtered.length > itemsPerPage && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>{startIndex + 1}–{Math.min(startIndex + itemsPerPage, filtered.length)} sur {filtered.length}</span>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: currentPage === 1 ? '#f1f5f9' : 'white', color: currentPage === 1 ? '#94a3b8' : '#374151', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 600 }}>
                                    <ChevronLeft size={16} />Précédent
                                </button>
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', padding: '0 0.5rem' }}>Page {currentPage} / {totalPages}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: currentPage === totalPages ? '#f1f5f9' : 'white', color: currentPage === totalPages ? '#94a3b8' : '#374151', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 600 }}>
                                    Suivant<ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal création / édition */}
            {isModalOpen && (
                <div onClick={() => setIsModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '1.25rem', width: '100%', maxWidth: '620px', maxHeight: 'calc(100vh - 2rem)', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #059669, #047857)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {editingPlatform ? <Edit3 size={20} color="white" /> : <Plus size={20} color="white" />}
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{editingPlatform ? 'Modifier la plateforme' : 'Nouvelle plateforme'}</h3>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Annuaire, forum, réseau social ou blog</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                <X size={22} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto' }}>
                            <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={labelStyle}>Nom de la plateforme *</label>
                                    <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Pages Jaunes" style={inputStyle} />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={labelStyle}>URL *</label>
                                    <input type="url" required value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} placeholder="https://..." style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Catégorie *</label>
                                    <select required value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as Platform['category'] })} style={{ ...inputStyle, cursor: 'pointer' }}>
                                        <option value="annuaire">Annuaire</option>
                                        <option value="forum">Forum</option>
                                        <option value="social">Social</option>
                                        <option value="blog">Blog</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Pays</label>
                                    <input type="text" value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} placeholder="FR" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Score DA</label>
                                    <input type="number" min="0" max="100" value={formData.da_score} onChange={e => setFormData({ ...formData, da_score: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Ex: 45" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Rémunération (€) *</label>
                                    <input type="number" required min="0" step="0.01" value={formData.reward_amount} onChange={e => setFormData({ ...formData, reward_amount: parseFloat(e.target.value) || 0 })} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Tags secteurs</label>
                                    <input type="text" value={formData.sector_tags} onChange={e => setFormData({ ...formData, sector_tags: e.target.value })} placeholder="restaurant,hotel,spa" style={inputStyle} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.5rem' }}>
                                    <input type="checkbox" id="requires_account" checked={formData.requires_account} onChange={e => setFormData({ ...formData, requires_account: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: '#059669', cursor: 'pointer' }} />
                                    <label htmlFor="requires_account" style={{ ...labelStyle, margin: 0, cursor: 'pointer' }}>Compte requis</label>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={labelStyle}>Notes</label>
                                    <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Instructions, restrictions..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                                </div>
                                {editingPlatform && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input type="checkbox" id="platform_active" checked={formData.active} onChange={e => setFormData({ ...formData, active: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: '#059669', cursor: 'pointer' }} />
                                        <label htmlFor="platform_active" style={{ ...labelStyle, margin: 0, cursor: 'pointer' }}>Plateforme active</label>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1.25rem 1.5rem', borderTop: '1px solid #f1f5f9' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '0.65rem 1.25rem', borderRadius: '0.625rem', border: '1px solid #e2e8f0', background: 'white', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
                                    Annuler
                                </button>
                                <button type="submit" disabled={isSubmitting} style={{ padding: '0.65rem 1.5rem', borderRadius: '0.625rem', border: 'none', background: 'linear-gradient(135deg, #059669, #047857)', color: 'white', fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px', opacity: isSubmitting ? 0.7 : 1 }}>
                                    {isSubmitting && <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                                    {editingPlatform ? 'Enregistrer' : 'Créer la plateforme'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};
