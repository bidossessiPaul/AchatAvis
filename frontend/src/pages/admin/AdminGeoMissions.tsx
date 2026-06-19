import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import {
    MapPin,
    Plus,
    Edit3,
    Search,
    ChevronLeft,
    X,
    RefreshCw,
    BarChart2,
    Eye,
} from 'lucide-react';
import { showSuccess, showError } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import api from '../../services/api';

interface Mission {
    id: number;
    artisan_id: string;
    artisan_name: string;
    artisan_email: string;
    name: string;
    activity_type: string;
    city: string;
    website: string | null;
    phone: string | null;
    address: string | null;
    description: string | null;
    citation_target: number;
    reward_per_submission: number;
    status: 'active' | 'paused' | 'completed';
    validated_count: number;
    pending_count: number;
    created_at: string;
}

interface Artisan {
    id: string;
    full_name: string;
    email: string;
    company_name: string;
    trade: string;
    phone: string;
    city: string;
}

const STATUS_LABELS: Record<string, string> = {
    active: 'Active',
    paused: 'En pause',
    completed: 'Terminée',
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
    active: { bg: '#dcfce7', color: '#166534' },
    paused: { bg: '#fef3c7', color: '#92400e' },
    completed: { bg: '#dbeafe', color: '#1e40af' },
};

const defaultForm = {
    name: '',
    description: '',
    activity_type: '',
    city: '',
    website: '',
    phone: '',
    address: '',
    citation_target: 30,
    reward_per_submission: 0.15,
    status: 'active' as Mission['status'],
};

export const AdminGeoMissions: React.FC = () => {
    const [missions, setMissions] = useState<Mission[]>([]);
    const [artisans, setArtisans] = useState<Artisan[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedRow, setExpandedRow] = useState<number | null>(null);
    const itemsPerPage = 20;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMission, setEditingMission] = useState<Mission | null>(null);
    const [formData, setFormData] = useState(defaultForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedArtisans, setSelectedArtisans] = useState<Artisan[]>([]);
    const [artisanSearch, setArtisanSearch] = useState('');
    const [artisanDropdownOpen, setArtisanDropdownOpen] = useState(false);
    const artisanSearchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchMissions();
        fetchArtisans();
    }, []);

    const fetchMissions = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data } = await api.get('/geo/admin/missions');
            setMissions(data);
        } catch {
            showError('Chargement impossible', 'Erreur lors du chargement des missions');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const fetchArtisans = async () => {
        try {
            const { data } = await api.get('/admin/artisans');
            setArtisans(data);
        } catch {
            // Silencieux — artisans non critiques au chargement
        }
    };

    const handleOpenModal = (mission: Mission | null = null) => {
        setArtisanSearch('');
        setArtisanDropdownOpen(false);
        if (mission) {
            setEditingMission(mission);
            setSelectedArtisans([{
                id: mission.artisan_id,
                full_name: mission.artisan_name,
                email: mission.artisan_email,
                company_name: '',
                trade: mission.activity_type,
                phone: mission.phone || '',
                city: mission.city,
            }]);
            setFormData({
                name: mission.name,
                description: mission.description ?? '',
                activity_type: mission.activity_type,
                city: mission.city,
                website: mission.website ?? '',
                phone: mission.phone ?? '',
                address: mission.address ?? '',
                citation_target: mission.citation_target,
                reward_per_submission: mission.reward_per_submission,
                status: mission.status,
            });
        } else {
            setEditingMission(null);
            setSelectedArtisans([]);
            setFormData(defaultForm);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMission && selectedArtisans.length === 0) {
            showError('Artisan requis', 'Veuillez sélectionner au moins un artisan');
            return;
        }
        setIsSubmitting(true);
        try {
            if (editingMission) {
                await api.put(`/geo/admin/missions/${editingMission.id}`, {
                    name: formData.name,
                    activity_type: formData.activity_type,
                    city: formData.city,
                    website: formData.website || null,
                    phone: formData.phone || null,
                    address: formData.address || null,
                    description: formData.description || null,
                    citation_target: formData.citation_target,
                    reward_per_submission: formData.reward_per_submission,
                    status: formData.status,
                });
                showSuccess('Mission mise à jour');
            } else {
                // Une mission par artisan sélectionné
                for (const artisan of selectedArtisans) {
                    const missionName = formData.name || `Citations GEO — ${artisan.company_name || artisan.full_name}`;
                    await api.post('/geo/admin/missions', {
                        artisan_id: artisan.id,
                        name: missionName,
                        activity_type: artisan.trade || '',
                        city: artisan.city || '',
                        website: formData.website || null,
                        phone: artisan.phone || null,
                        address: formData.address || null,
                        description: formData.description || null,
                        citation_target: formData.citation_target,
                        reward_per_submission: formData.reward_per_submission,
                        status: formData.status,
                    });
                }
                showSuccess(selectedArtisans.length > 1 ? `${selectedArtisans.length} missions créées` : 'Mission créée');
            }
            setIsModalOpen(false);
            fetchMissions(true);
        } catch (err: any) {
            showError('Enregistrement impossible', err.response?.data?.error || 'Erreur serveur');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredArtisans = artisans.filter(a => {
        if (!artisanSearch) return true;
        const q = artisanSearch.toLowerCase();
        return (
            a.full_name?.toLowerCase().includes(q) ||
            a.email?.toLowerCase().includes(q) ||
            a.company_name?.toLowerCase().includes(q) ||
            a.phone?.toLowerCase().includes(q) ||
            a.city?.toLowerCase().includes(q)
        );
    }).filter(a => !selectedArtisans.some(s => s.id === a.id));

    const handleSelectArtisan = (a: Artisan) => {
        setSelectedArtisans(prev => [...prev, a]);
        setArtisanSearch('');
        setArtisanDropdownOpen(false);
    };

    const handleRemoveArtisan = (id: string) => {
        setSelectedArtisans(prev => prev.filter(a => a.id !== id));
    };

    const filtered = missions.filter(m => {
        const matchSearch = !searchTerm || m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.artisan_name.toLowerCase().includes(searchTerm.toLowerCase()) || m.city.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'all' || m.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

    const stats = {
        total: missions.length,
        active: missions.filter(m => m.status === 'active').length,
        paused: missions.filter(m => m.status === 'paused').length,
        completed: missions.filter(m => m.status === 'completed').length,
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
        <DashboardLayout title="Missions GEO">
            <div style={{ padding: '0 0 3rem' }}>
                {/* Stats bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    {[
                        { label: 'Total missions', value: stats.total, color: '#2383e2', bg: '#eff6ff' },
                        { label: 'Actives', value: stats.active, color: '#059669', bg: '#f0fdf4' },
                        { label: 'En pause', value: stats.paused, color: '#d97706', bg: '#fffbeb' },
                        { label: 'Terminées', value: stats.completed, color: '#1e40af', bg: '#dbeafe' },
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
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Missions de citation</h2>
                            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748b' }}>{filtered.length} mission{filtered.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input type="text" placeholder="Mission, artisan, ville..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...inputStyle, paddingLeft: '2rem', width: '240px' }} />
                            </div>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}>
                                <option value="all">Tous statuts</option>
                                <option value="active">Active</option>
                                <option value="paused">En pause</option>
                                <option value="completed">Terminée</option>
                            </select>
                            <button onClick={() => handleOpenModal()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.6rem 1.25rem', borderRadius: '0.625rem', border: 'none', background: 'linear-gradient(135deg, #059669, #047857)', color: 'white', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
                                <Plus size={16} />
                                Créer une mission
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
                            <MapPin size={48} style={{ opacity: 0.2, margin: '0 auto 1rem', display: 'block' }} />
                            <p style={{ fontWeight: 500 }}>Aucune mission trouvée</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        {['Mission', 'Artisan', 'Ville / Activité', 'Progression', 'Rémunération', 'Statut', 'Actions'].map(h => (
                                            <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map(m => {
                                        const statusColor = STATUS_COLORS[m.status];
                                        const progress = m.citation_target > 0 ? Math.min(100, Math.round((m.validated_count / m.citation_target) * 100)) : 0;
                                        const isExpanded = expandedRow === m.id;
                                        return (
                                            <React.Fragment key={m.id}>
                                                <tr style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: isExpanded ? '#f8fafc' : 'white' }} onClick={() => setExpandedRow(isExpanded ? null : m.id)}>
                                                    <td style={{ padding: '0.875rem 1rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <Eye size={13} color="#94a3b8" />
                                                            <div>
                                                                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>{m.name}</div>
                                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{new Date(m.created_at).toLocaleDateString('fr-FR')}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.875rem 1rem' }}>
                                                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>{m.artisan_name}</div>
                                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{m.artisan_email}</div>
                                                    </td>
                                                    <td style={{ padding: '0.875rem 1rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', color: '#374151', fontWeight: 600 }}>
                                                            <MapPin size={12} color="#64748b" />
                                                            {m.city}
                                                        </div>
                                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{m.activity_type}</div>
                                                    </td>
                                                    <td style={{ padding: '0.875rem 1rem', minWidth: '160px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                                                <div style={{ height: '100%', width: `${progress}%`, background: progress >= 100 ? '#059669' : '#2383e2', borderRadius: '3px', transition: 'width 0.3s' }} />
                                                            </div>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>{m.validated_count} / {m.citation_target}</span>
                                                        </div>
                                                        {m.pending_count > 0 && (
                                                            <div style={{ fontSize: '0.7rem', color: '#d97706', marginTop: '2px' }}>{m.pending_count} en attente</div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '0.875rem 1rem', fontWeight: 700, color: '#059669', fontSize: '0.875rem' }}>
                                                        {Number(m.reward_per_submission).toFixed(2)} €
                                                    </td>
                                                    <td style={{ padding: '0.875rem 1rem' }}>
                                                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', background: statusColor.bg, color: statusColor.color }}>
                                                            {STATUS_LABELS[m.status]}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.875rem 1rem' }} onClick={e => e.stopPropagation()}>
                                                        <button onClick={() => handleOpenModal(m)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Modifier">
                                                            <Edit3 size={14} color="#475569" />
                                                        </button>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr style={{ background: '#f8fafc' }}>
                                                        <td colSpan={7} style={{ padding: '1rem 1.5rem 1.25rem', borderBottom: '2px solid #e2e8f0' }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                                                <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
                                                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <BarChart2 size={12} />Statistiques
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                                                                        <div>
                                                                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>{m.validated_count}</div>
                                                                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Validées</div>
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706' }}>{m.pending_count}</div>
                                                                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>En attente</div>
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{m.citation_target}</div>
                                                                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Objectif</div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {m.description && (
                                                                    <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
                                                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Description</div>
                                                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#374151', lineHeight: 1.5 }}>{m.description}</p>
                                                                    </div>
                                                                )}
                                                                {(m.website || m.phone || m.address) && (
                                                                    <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
                                                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Coordonnées</div>
                                                                        {m.website && <div style={{ fontSize: '0.8rem', color: '#2383e2', marginBottom: '2px' }}>{m.website}</div>}
                                                                        {m.phone && <div style={{ fontSize: '0.8rem', color: '#374151', marginBottom: '2px' }}>{m.phone}</div>}
                                                                        {m.address && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{m.address}</div>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
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
                                    Suivant<ChevronLeft size={16} style={{ transform: 'scaleX(-1)' }} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal création / édition */}
            {isModalOpen && (
                <div onClick={() => setIsModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '1.25rem', width: '100%', maxWidth: '680px', maxHeight: 'calc(100vh - 2rem)', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #059669, #047857)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {editingMission ? <Edit3 size={20} color="white" /> : <Plus size={20} color="white" />}
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{editingMission ? 'Modifier la mission' : 'Créer une mission'}</h3>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Assignez une mission de citation à un artisan</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                <X size={22} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto' }}>
                            <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                                {/* Sélecteur artisan avec recherche + multi-select */}
                                <div style={{ gridColumn: '1 / -1' }} ref={artisanSearchRef}>
                                    <label style={labelStyle}>Artisan(s) *</label>

                                    {/* Chips des artisans sélectionnés */}
                                    {selectedArtisans.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                            {selectedArtisans.map(a => (
                                                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '4px 10px', fontSize: '0.8rem', fontWeight: 600, color: '#166534' }}>
                                                    <span>{a.company_name || a.full_name}</span>
                                                    {a.city && <span style={{ color: '#64748b', fontWeight: 400 }}>— {a.city}</span>}
                                                    {!editingMission && (
                                                        <button type="button" onClick={() => handleRemoveArtisan(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                                                            <X size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Zone de recherche — masquée en mode édition */}
                                    {!editingMission && (
                                        <div style={{ position: 'relative' }}>
                                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                                            <input
                                                type="text"
                                                placeholder="Rechercher par nom, email, téléphone, ville..."
                                                value={artisanSearch}
                                                onChange={e => { setArtisanSearch(e.target.value); setArtisanDropdownOpen(true); }}
                                                onFocus={() => setArtisanDropdownOpen(true)}
                                                onBlur={() => setTimeout(() => setArtisanDropdownOpen(false), 150)}
                                                style={{ ...inputStyle, paddingLeft: '2rem' }}
                                            />
                                            {artisanDropdownOpen && (
                                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 3000, maxHeight: '220px', overflowY: 'auto', marginTop: '4px' }}>
                                                    {filteredArtisans.length === 0 ? (
                                                        <div style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: '#94a3b8' }}>Aucun résultat</div>
                                                    ) : filteredArtisans.slice(0, 20).map(a => (
                                                        <button
                                                            key={a.id}
                                                            type="button"
                                                            onMouseDown={() => handleSelectArtisan(a)}
                                                            style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid #f8fafc', padding: '0.75rem 1rem', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '2px' }}
                                                            onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                                                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                                        >
                                                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                                                                {a.company_name || a.full_name}
                                                                {a.company_name && a.full_name !== a.company_name && (
                                                                    <span style={{ fontWeight: 400, color: '#64748b', marginLeft: '6px' }}>({a.full_name})</span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                                                <span>{a.email}</span>
                                                                {a.city && <span>{a.city}</span>}
                                                                {a.trade && <span style={{ color: '#2383e2' }}>{a.trade}</span>}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Nom de la mission */}
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={labelStyle}>
                                        Nom de la mission
                                        {selectedArtisans.length > 0 && !editingMission && (
                                            <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: '6px', fontSize: '0.78rem' }}>Laissez vide pour auto-générer</span>
                                        )}
                                    </label>
                                    <input type="text" required={!selectedArtisans.length || !!editingMission} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder={selectedArtisans.length > 0 ? `Citations GEO — ${selectedArtisans[0].company_name || selectedArtisans[0].full_name}` : 'Ex: Citations plombier Paris 15e'} style={inputStyle} />
                                </div>

                                {/* Champs NAP — affichés seulement si aucun artisan sélectionné OU en mode édition */}
                                {(selectedArtisans.length === 0 || !!editingMission) && (
                                    <>
                                        <div>
                                            <label style={labelStyle}>Type d'activité *</label>
                                            <input type="text" required value={formData.activity_type} onChange={e => setFormData({ ...formData, activity_type: e.target.value })} placeholder="Ex: Plombier" style={inputStyle} />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Ville *</label>
                                            <input type="text" required value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} placeholder="Ex: Paris" style={inputStyle} />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Téléphone</label>
                                            <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="01 23 45 67 89" style={inputStyle} />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Site web</label>
                                            <input type="url" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} placeholder="https://..." style={inputStyle} />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={labelStyle}>Adresse</label>
                                            <textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="12 rue des Lilas, 75015 Paris" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                                        </div>
                                    </>
                                )}

                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={labelStyle}>Description</label>
                                    <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Instructions pour les guides..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Objectif citations *</label>
                                    <input type="number" required min="1" value={formData.citation_target} onChange={e => setFormData({ ...formData, citation_target: parseInt(e.target.value) || 30 })} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Rémunération / soumission (€) *</label>
                                    <input type="number" required min="0" step="0.01" value={formData.reward_per_submission} onChange={e => setFormData({ ...formData, reward_per_submission: parseFloat(e.target.value) || 0 })} style={inputStyle} />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={labelStyle}>Statut</label>
                                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as Mission['status'] })} style={{ ...inputStyle, cursor: 'pointer' }}>
                                        <option value="active">Active</option>
                                        <option value="paused">En pause</option>
                                        <option value="completed">Terminée</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1.25rem 1.5rem', borderTop: '1px solid #f1f5f9' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '0.65rem 1.25rem', borderRadius: '0.625rem', border: '1px solid #e2e8f0', background: 'white', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
                                    Annuler
                                </button>
                                <button type="submit" disabled={isSubmitting} style={{ padding: '0.65rem 1.5rem', borderRadius: '0.625rem', border: 'none', background: 'linear-gradient(135deg, #059669, #047857)', color: 'white', fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px', opacity: isSubmitting ? 0.7 : 1 }}>
                                    {isSubmitting && <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                                    {editingMission ? 'Enregistrer' : selectedArtisans.length > 1 ? `Créer ${selectedArtisans.length} missions` : 'Créer la mission'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};
