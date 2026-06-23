import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import {
    Globe, Link, CheckCircle2, XCircle, Clock,
    Copy, ChevronRight, MapPin, Phone, Globe2, Building2,
    FileText, Send, Search, BarChart2, Wallet, Star,
    Camera, Image as ImageIcon, Check
} from 'lucide-react';
import api from '../../services/api';
import Swal from 'sweetalert2';

// ─── Types ─────────────────────────────────────────────────────────────────

interface GeoMission {
    id: number;
    name: string;
    artisan_name: string;
    activity_type: string;
    city: string;
    phone: string;
    website: string;
    address: string;
    description: string;
    citation_target: number;
    reward_per_submission: number;
    my_submissions_count: number;
    validated_count: number;
}

interface GeoPlatform {
    id: number;
    name: string;
    url: string;
    category: 'annuaire' | 'forum' | 'social' | 'blog';
    da_score: number;
    requires_account: boolean;
    reward_amount: number;
    notes: string;
    my_status: null | 'pending' | 'validated' | 'rejected';
    my_submission_id: number | null;
    submission_url: string | null;
    submission_screenshot_url: string | null;
}

interface GeoSubmissionHistory {
    id: number;
    platform_name: string;
    mission_name: string;
    status: 'pending' | 'validated' | 'rejected';
    created_at: string;
    reward_amount: number;
    screenshot_url: string | null;
}

// ─── Constantes couleurs catégories ────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; color: string; border: string; label: string }> = {
    annuaire: { bg: '#dcfce7', color: '#166534', border: '#bbf7d0', label: 'Annuaire' },
    forum:    { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe', label: 'Forum' },
    social:   { bg: '#ede9fe', color: '#6d28d9', border: '#ddd6fe', label: 'Réseau social' },
    blog:     { bg: '#fef3c7', color: '#92400e', border: '#fde68a', label: 'Blog' },
};

const STATUS_CONFIG = {
    pending:   { bg: '#fef3c7', color: '#92400e', border: '#fde68a', label: 'En attente de validation' },
    validated: { bg: '#dcfce7', color: '#166534', border: '#bbf7d0', label: 'Validé' },
    rejected:  { bg: '#fee2e2', color: '#991b1b', border: '#fecaca', label: 'Rejeté' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function Badge({
    bg, color, border, children
}: { bg: string; color: string; border: string; children: React.ReactNode }) {
    return (
        <span style={{
            background: bg, color, border: `1px solid ${border}`,
            borderRadius: '1rem', padding: '0.2rem 0.6rem',
            fontSize: '0.7rem', fontWeight: 700, display: 'inline-flex',
            alignItems: 'center', gap: '3px', whiteSpace: 'nowrap'
        }}>
            {children}
        </span>
    );
}

// ─── Composant principal ───────────────────────────────────────────────────

export const GuideCitations: React.FC = () => {
    const [missions, setMissions] = useState<GeoMission[]>([]);
    const [selectedMission, setSelectedMission] = useState<GeoMission | null>(null);
    const [platforms, setPlatforms] = useState<GeoPlatform[]>([]);
    const [history, setHistory] = useState<GeoSubmissionHistory[]>([]);
    const [loadingMissions, setLoadingMissions] = useState(true);
    const [loadingPlatforms, setLoadingPlatforms] = useState(false);
    const [activeTab, setActiveTab] = useState<'tous' | 'annuaire' | 'forum' | 'social' | 'blog'>('tous');

    // Formulaire inline par plateforme
    const [openFormId, setOpenFormId] = useState<number | null>(null);
    const [formUrl, setFormUrl] = useState('');
    const [formScreenshot, setFormScreenshot] = useState<File | null>(null);
    const [formScreenshotPreview, setFormScreenshotPreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [copied, setCopied] = useState(false);
    // copié l'URL d'une plateforme : stocke l'id de la plateforme copiée
    const [copiedPlatformId, setCopiedPlatformId] = useState<number | null>(null);

    // ── Chargement initial ──────────────────────────────────────────────────
    useEffect(() => {
        loadMissions();
        loadHistory();
    }, []);

    const loadMissions = async () => {
        setLoadingMissions(true);
        try {
            const res = await api.get('/geo/missions');
            setMissions(res.data);
        } catch (err) {
            console.error('Erreur chargement missions GEO', err);
        } finally {
            setLoadingMissions(false);
        }
    };

    const loadPlatforms = async (missionId: number) => {
        setLoadingPlatforms(true);
        try {
            const res = await api.get(`/geo/missions/${missionId}/platforms`);
            setPlatforms(res.data);
        } catch (err) {
            console.error('Erreur chargement plateformes', err);
        } finally {
            setLoadingPlatforms(false);
        }
    };

    const loadHistory = async () => {
        try {
            const res = await api.get('/geo/my-submissions');
            setHistory(res.data);
        } catch (err) {
            console.error('Erreur chargement historique GEO', err);
        }
    };

    // ── Sélection d'une mission ─────────────────────────────────────────────
    const selectMission = (mission: GeoMission) => {
        setSelectedMission(mission);
        setActiveTab('tous');
        closeForm();
        loadPlatforms(mission.id);
    };

    const backToList = () => {
        setSelectedMission(null);
        setPlatforms([]);
        closeForm();
    };

    const closeForm = () => {
        setOpenFormId(null);
        setFormUrl('');
        setFormScreenshot(null);
        setFormScreenshotPreview(null);
    };

    // ── Screenshot ─────────────────────────────────────────────────────────
    const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFormScreenshot(file);
        const reader = new FileReader();
        reader.onload = ev => setFormScreenshotPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    // ── Texte NAP ──────────────────────────────────────────────────────────
    const buildNapText = (m: GeoMission) => {
        const lines: string[] = [];
        lines.push(`${m.artisan_name}`);
        lines.push(`${m.activity_type.charAt(0).toUpperCase() + m.activity_type.slice(1)} — ${m.city}`);
        if (m.address && m.address !== 'null') lines.push(`Adresse : ${m.address}`);
        if (m.phone && m.phone !== 'null') lines.push(`Tél. : ${m.phone}`);
        if (m.website && m.website !== 'null') lines.push(`Site : ${m.website}`);
        if (m.description && m.description !== 'null') lines.push(`\n${m.description}`);
        return lines.join('\n');
    };

    const copyNap = () => {
        if (!selectedMission) return;
        navigator.clipboard.writeText(buildNapText(selectedMission)).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    // ── Copier URL plateforme ──────────────────────────────────────────────
    const copyPlatformUrl = (platform: GeoPlatform) => {
        navigator.clipboard.writeText(platform.url).then(() => {
            setCopiedPlatformId(platform.id);
            setTimeout(() => setCopiedPlatformId(null), 2000);
        });
    };

    // ── Soumission citation (FormData pour le screenshot) ──────────────────
    const submitCitation = async (platform: GeoPlatform) => {
        if (!selectedMission) return;
        if (!formUrl.trim() || !formUrl.startsWith('http')) {
            Swal.fire({
                icon: 'warning',
                title: 'URL invalide',
                text: "Entrez l'URL complète de votre citation commençant par http:// ou https://",
                confirmButtonColor: '#059669'
            });
            return;
        }
        if (!formScreenshot) {
            Swal.fire({
                icon: 'warning',
                title: 'Capture requise',
                text: "Joignez une capture d'écran prouvant que la citation a bien été créée.",
                confirmButtonColor: '#059669'
            });
            return;
        }
        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('missionId', String(selectedMission.id));
            fd.append('platformId', String(platform.id));
            fd.append('submissionUrl', formUrl.trim());
            fd.append('screenshot', formScreenshot);

            await api.post('/geo/submissions', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Mise à jour locale sans rechargement complet
            setPlatforms(prev =>
                prev.map(p => p.id === platform.id
                    ? { ...p, my_status: 'pending' }
                    : p
                )
            );
            closeForm();
            await Swal.fire({
                icon: 'success',
                title: 'Citation soumise !',
                text: "Votre citation est en attente de validation.",
                confirmButtonColor: '#059669',
                timer: 3000,
                timerProgressBar: true
            });
            loadHistory();
        } catch (err: any) {
            Swal.fire({
                icon: 'error',
                title: 'Erreur',
                text: err?.response?.data?.message || err?.response?.data?.error || 'Une erreur est survenue lors de la soumission.',
                confirmButtonColor: '#dc2626'
            });
        } finally {
            setSubmitting(false);
        }
    };

    // ── Stats calculées ─────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const totalMissions = missions.length;
        const totalSubmitted = missions.reduce((s, m) => s + (m.my_submissions_count || 0), 0);
        const totalValidated = missions.reduce((s, m) => s + (m.validated_count || 0), 0);
        const totalGains = history
            .filter(h => h.status === 'validated')
            .reduce((s, h) => s + Number(h.reward_amount || 0), 0);
        return { totalMissions, totalSubmitted, totalValidated, totalGains };
    }, [missions, history]);

    // ── Filtres plateformes ─────────────────────────────────────────────────
    const filteredPlatforms = useMemo(() => {
        let result = platforms;
        if (activeTab !== 'tous') result = result.filter(p => p.category === activeTab);
        return result;
    }, [platforms, activeTab]);

    // ── Filtres missions ────────────────────────────────────────────────────
    const filteredMissions = useMemo(() => {
        if (!searchQuery.trim()) return missions;
        const q = searchQuery.toLowerCase();
        return missions.filter(m =>
            m.artisan_name.toLowerCase().includes(q) ||
            m.city.toLowerCase().includes(q) ||
            m.activity_type.toLowerCase().includes(q)
        );
    }, [missions, searchQuery]);

    // ── Tabs ────────────────────────────────────────────────────────────────
    const tabs: { key: typeof activeTab; label: string }[] = [
        { key: 'tous', label: 'Tous' },
        { key: 'annuaire', label: 'Annuaires' },
        { key: 'forum', label: 'Forums' },
        { key: 'social', label: 'Réseaux sociaux' },
        { key: 'blog', label: 'Blogs' },
    ];

    // ─── Rendu vue liste missions ──────────────────────────────────────────
    const renderMissionList = () => (
        <>
            {/* En-tête */}
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Citations GEO
                </h2>
                <p style={{ color: '#64748b', marginTop: '0.3rem', fontSize: '0.95rem' }}>
                    Créez des citations pour booster la visibilité des artisans
                </p>
            </div>

            {/* Stats cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, #059669, #047857)',
                    borderRadius: '1rem', padding: '1.25rem', color: 'white'
                }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.85, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Globe size={14} /> MISSIONS DISPONIBLES
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.totalMissions}</div>
                </div>
                <div style={{
                    background: 'white', borderRadius: '1rem', padding: '1.25rem',
                    border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Send size={14} /> MES CITATIONS SOUMISES
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>{stats.totalSubmitted}</div>
                </div>
                <div style={{
                    background: 'white', borderRadius: '1rem', padding: '1.25rem',
                    border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={14} color="#059669" /> VALIDÉES
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#059669' }}>{stats.totalValidated}</div>
                </div>
                <div style={{
                    background: 'white', borderRadius: '1rem', padding: '1.25rem',
                    border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Wallet size={14} color="#059669" /> GAINS GEO
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#059669' }}>{stats.totalGains.toFixed(2)}€</div>
                </div>
            </div>

            {/* Barre de recherche */}
            <div style={{ position: 'relative', marginBottom: '1.5rem', maxWidth: '420px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                    type="text"
                    placeholder="Rechercher par artisan, ville, activité..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                        width: '100%', padding: '0.65rem 0.85rem 0.65rem 36px',
                        borderRadius: '8px', border: '1px solid #e2e8f0',
                        fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
                    }}
                />
            </div>

            {/* Grille de missions */}
            {loadingMissions ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                    <Clock size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.75rem' }} />
                    <p>Chargement des missions...</p>
                </div>
            ) : filteredMissions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <Globe size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                    <h3 style={{ color: '#475569', fontWeight: 700 }}>Aucune mission disponible</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                        {searchQuery ? 'Essayez un autre terme de recherche.' : 'Revenez plus tard pour découvrir de nouvelles missions GEO.'}
                    </p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '1.25rem',
                    marginBottom: '3rem'
                }}>
                    {filteredMissions.map(mission => {
                        const progressPct = Math.min(100, ((mission.my_submissions_count || 0) / Math.max(1, mission.citation_target)) * 100);
                        return (
                            <div
                                key={mission.id}
                                style={{
                                    background: 'white', borderRadius: '1rem',
                                    border: '1px solid #e2e8f0',
                                    padding: '1.25rem',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    display: 'flex', flexDirection: 'column', gap: '0.75rem'
                                }}
                            >
                                {/* En-tête carte mission */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                            <Building2 size={14} color="#64748b" />
                                            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                                                {mission.artisan_name}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <Badge bg="#f1f5f9" color="#475569" border="#e2e8f0">
                                                {mission.activity_type}
                                            </Badge>
                                            <Badge bg="#f0fdf4" color="#166534" border="#bbf7d0">
                                                <MapPin size={10} /> {mission.city}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div style={{
                                        background: '#f0fdf4', color: '#059669',
                                        border: '1px solid #bbf7d0', borderRadius: '0.5rem',
                                        padding: '0.3rem 0.6rem', fontSize: '0.85rem', fontWeight: 800,
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {Number(mission.reward_per_submission).toFixed(2)}€ / citation
                                    </div>
                                </div>

                                {/* Barre de progression */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginBottom: '5px' }}>
                                        <span>Mes citations</span>
                                        <span style={{ fontWeight: 700 }}>
                                            {mission.my_submissions_count || 0}/{mission.citation_target}
                                        </span>
                                    </div>
                                    <div style={{ background: '#f1f5f9', borderRadius: '3px', height: '6px', position: 'relative', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${progressPct}%`, height: '100%',
                                            background: '#059669', borderRadius: '3px',
                                            transition: 'width 0.3s ease'
                                        }} />
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                                        {mission.validated_count || 0} validée{(mission.validated_count || 0) > 1 ? 's' : ''}
                                    </div>
                                </div>

                                {/* Bouton action */}
                                <button
                                    onClick={() => selectMission(mission)}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                        background: 'linear-gradient(135deg, #059669, #047857)',
                                        color: 'white', border: 'none', borderRadius: '0.625rem',
                                        padding: '0.6rem 1.25rem', fontWeight: 700, fontSize: '0.9rem',
                                        cursor: 'pointer', marginTop: 'auto'
                                    }}
                                >
                                    Voir les plateformes <ChevronRight size={16} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Historique mes soumissions GEO */}
            {history.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart2 size={18} color="#2383e2" /> Mes soumissions GEO
                    </h3>
                    <div style={{
                        background: 'white', borderRadius: '1rem',
                        border: '1px solid #e2e8f0', overflow: 'hidden'
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={thStyle}>Plateforme</th>
                                    <th style={thStyle}>Mission</th>
                                    <th style={thStyle}>Statut</th>
                                    <th style={thStyle}>Capture</th>
                                    <th style={thStyle}>Date</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Gains</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map(h => {
                                    const sc = STATUS_CONFIG[h.status] || STATUS_CONFIG.pending;
                                    return (
                                        <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={tdStyle}>
                                                <span style={{ fontWeight: 600, color: '#0f172a' }}>{h.platform_name}</span>
                                            </td>
                                            <td style={{ ...tdStyle, color: '#64748b', fontSize: '0.85rem' }}>
                                                {h.mission_name}
                                            </td>
                                            <td style={tdStyle}>
                                                <Badge bg={sc.bg} color={sc.color} border={sc.border}>
                                                    {h.status === 'validated' && <CheckCircle2 size={10} />}
                                                    {h.status === 'rejected' && <XCircle size={10} />}
                                                    {h.status === 'pending' && <Clock size={10} />}
                                                    {sc.label}
                                                </Badge>
                                            </td>
                                            <td style={tdStyle}>
                                                {h.screenshot_url ? (
                                                    <a
                                                        href={h.screenshot_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#2383e2', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none' }}
                                                    >
                                                        <ImageIcon size={14} /> Voir
                                                    </a>
                                                ) : (
                                                    <span style={{ color: '#cbd5e1', fontSize: '0.78rem' }}>—</span>
                                                )}
                                            </td>
                                            <td style={{ ...tdStyle, color: '#94a3b8', fontSize: '0.82rem' }}>
                                                {new Date(h.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: h.status === 'validated' ? '#059669' : '#94a3b8' }}>
                                                {h.status === 'validated' ? `+${Number(h.reward_amount).toFixed(2)}€` : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
    );

    // ─── Rendu vue détail mission ──────────────────────────────────────────
    const renderMissionDetail = () => {
        if (!selectedMission) return null;
        const nap = buildNapText(selectedMission);

        return (
            <>
                {/* Retour */}
                <button
                    onClick={backToList}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: 'none', border: 'none', color: '#2383e2',
                        fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                        padding: '0 0 1.25rem 0'
                    }}
                >
                    ← Toutes les missions
                </button>

                {/* En-tête mission */}
                <div style={{
                    background: 'white', borderRadius: '1rem',
                    border: '1px solid #e2e8f0', padding: '1.5rem',
                    marginBottom: '1.25rem',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                        <div>
                            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>
                                {selectedMission.name || selectedMission.artisan_name}
                            </h2>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.88rem', color: '#64748b' }}>
                                {selectedMission.city && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <MapPin size={14} color="#059669" /> {selectedMission.city}
                                    </span>
                                )}
                                {selectedMission.phone && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Phone size={14} color="#2383e2" /> {selectedMission.phone}
                                    </span>
                                )}
                                {selectedMission.website && (
                                    <a
                                        href={selectedMission.website}
                                        target="_blank" rel="noreferrer"
                                        style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#2383e2', textDecoration: 'none' }}
                                    >
                                        <Globe2 size={14} /> {selectedMission.website}
                                    </a>
                                )}
                            </div>
                        </div>
                        <Badge bg="#f0fdf4" color="#059669" border="#bbf7d0">
                            <Star size={11} /> {Number(selectedMission.reward_per_submission).toFixed(2)}€ par citation
                        </Badge>
                    </div>
                </div>

                {/* Bloc NAP copiable */}
                <div style={{
                    background: '#f8fafc', borderRadius: '1rem',
                    border: '2px dashed #cbd5e1', padding: '1.25rem',
                    marginBottom: '1.5rem', position: 'relative'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem', color: '#475569' }}>
                            <FileText size={16} color="#7c3aed" />
                            Texte NAP — copiez ce texte pour créer votre citation
                        </div>
                        <button
                            onClick={copyNap}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: copied ? '#dcfce7' : 'white',
                                color: copied ? '#166534' : '#475569',
                                border: `1px solid ${copied ? '#bbf7d0' : '#e2e8f0'}`,
                                borderRadius: '0.5rem', padding: '0.4rem 0.85rem',
                                fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Copy size={14} />
                            {copied ? 'Copié !' : 'Copier le texte'}
                        </button>
                    </div>
                    <pre style={{
                        margin: 0, fontFamily: 'inherit', fontSize: '0.88rem',
                        color: '#334155', lineHeight: 1.65, whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                    }}>
                        {nap}
                    </pre>
                </div>

                {/* Tabs catégories */}
                <div style={{
                    display: 'flex', gap: '0.5rem', flexWrap: 'wrap',
                    borderBottom: '2px solid #f1f5f9', marginBottom: '1.25rem', paddingBottom: '0'
                }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                background: 'none', border: 'none', padding: '0.55rem 1rem',
                                fontSize: '0.88rem', fontWeight: activeTab === tab.key ? 700 : 500,
                                color: activeTab === tab.key ? '#059669' : '#64748b',
                                cursor: 'pointer',
                                borderBottom: activeTab === tab.key ? '2px solid #059669' : '2px solid transparent',
                                marginBottom: '-2px',
                                transition: 'color 0.15s'
                            }}
                        >
                            {tab.label}
                            {tab.key !== 'tous' && (
                                <span style={{
                                    marginLeft: '5px', background: '#f1f5f9', color: '#64748b',
                                    borderRadius: '1rem', padding: '1px 6px', fontSize: '0.7rem', fontWeight: 700
                                }}>
                                    {platforms.filter(p => p.category === tab.key).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Liste plateformes */}
                {loadingPlatforms ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                        <Clock size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
                        <p>Chargement des plateformes...</p>
                    </div>
                ) : filteredPlatforms.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                        <Link size={40} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                        <p style={{ color: '#94a3b8' }}>Aucune plateforme dans cette catégorie.</p>
                    </div>
                ) : (
                    <div style={{ maxHeight: '620px', overflowY: 'auto', paddingRight: '6px', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {filteredPlatforms.map(platform => {
                            const catConfig = CATEGORY_COLORS[platform.category] || CATEGORY_COLORS.annuaire;
                            const isFormOpen = openFormId === platform.id;
                            const isCopiedUrl = copiedPlatformId === platform.id;

                            return (
                                <div key={platform.id} style={{
                                    background: 'white', borderRadius: '1rem',
                                    border: '1px solid #e2e8f0',
                                    overflow: 'hidden',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                                }}>
                                    {/* Ligne principale plateforme */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '1rem',
                                        padding: '1.1rem 1.25rem', flexWrap: 'wrap'
                                    }}>
                                        {/* Gauche : nom + badges + lien */}
                                        <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                                                    {platform.name}
                                                </span>
                                                <Badge bg={catConfig.bg} color={catConfig.color} border={catConfig.border}>
                                                    {catConfig.label}
                                                </Badge>
                                                <span style={{
                                                    background: '#f1f5f9', color: '#475569',
                                                    border: '1px solid #e2e8f0', borderRadius: '1rem',
                                                    padding: '0.1rem 0.5rem', fontSize: '0.7rem', fontWeight: 700
                                                }}>
                                                    DA {platform.da_score}
                                                </span>
                                                {platform.requires_account && (
                                                    <Badge bg="#fef3c7" color="#92400e" border="#fde68a">
                                                        Compte requis
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Lien plateforme : copier uniquement */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <button
                                                    onClick={() => copyPlatformUrl(platform)}
                                                    title="Copier le lien"
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                        background: isCopiedUrl ? '#dcfce7' : '#f1f5f9',
                                                        color: isCopiedUrl ? '#166534' : '#64748b',
                                                        border: `1px solid ${isCopiedUrl ? '#bbf7d0' : '#e2e8f0'}`,
                                                        borderRadius: '0.4rem', padding: '0.15rem 0.55rem',
                                                        fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                                                        transition: 'all 0.15s'
                                                    }}
                                                >
                                                    {isCopiedUrl ? <Check size={12} /> : <Copy size={12} />}
                                                    {isCopiedUrl ? 'Copié !' : 'Copier le lien'}
                                                </button>
                                            </div>

                                            {platform.notes && (
                                                <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.4 }}>
                                                    {platform.notes}
                                                </p>
                                            )}
                                        </div>

                                        {/* Droite : reward + statut + action */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                            <span style={{
                                                background: '#f0fdf4', color: '#059669',
                                                border: '1px solid #bbf7d0', borderRadius: '0.5rem',
                                                padding: '0.25rem 0.65rem', fontSize: '0.85rem', fontWeight: 800
                                            }}>
                                                +{Number(platform.reward_amount).toFixed(2)}€
                                            </span>

                                            {platform.my_status === null && !isFormOpen && (
                                                <button
                                                    onClick={() => {
                                                        setOpenFormId(platform.id);
                                                        setFormUrl('');
                                                        setFormScreenshot(null);
                                                        setFormScreenshotPreview(null);
                                                    }}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '5px',
                                                        background: 'linear-gradient(135deg, #059669, #047857)',
                                                        color: 'white', border: 'none',
                                                        borderRadius: '0.5rem', padding: '0.5rem 1rem',
                                                        fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                                                    }}
                                                >
                                                    <Send size={14} /> Faire cette citation
                                                </button>
                                            )}

                                            {platform.my_status === 'pending' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Badge bg={STATUS_CONFIG.pending.bg} color={STATUS_CONFIG.pending.color} border={STATUS_CONFIG.pending.border}>
                                                        <Clock size={10} /> En attente de validation
                                                    </Badge>
                                                    {platform.submission_screenshot_url && (
                                                        <a
                                                            href={platform.submission_screenshot_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            title="Voir la capture"
                                                            style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                                color: '#2383e2', fontSize: '0.78rem', fontWeight: 600,
                                                                textDecoration: 'none'
                                                            }}
                                                        >
                                                            <ImageIcon size={14} /> Capture
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            {platform.my_status === 'validated' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Badge bg={STATUS_CONFIG.validated.bg} color={STATUS_CONFIG.validated.color} border={STATUS_CONFIG.validated.border}>
                                                        <CheckCircle2 size={10} /> Validé — +{Number(platform.reward_amount).toFixed(2)}€
                                                    </Badge>
                                                    {platform.submission_screenshot_url && (
                                                        <a
                                                            href={platform.submission_screenshot_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            title="Voir la capture"
                                                            style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                                color: '#059669', fontSize: '0.78rem', fontWeight: 600,
                                                                textDecoration: 'none'
                                                            }}
                                                        >
                                                            <ImageIcon size={14} /> Capture
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            {platform.my_status === 'rejected' && !isFormOpen && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Badge bg={STATUS_CONFIG.rejected.bg} color={STATUS_CONFIG.rejected.color} border={STATUS_CONFIG.rejected.border}>
                                                        <XCircle size={10} /> Rejeté
                                                    </Badge>
                                                    <button
                                                        onClick={() => {
                                                            setOpenFormId(platform.id);
                                                            setFormUrl('');
                                                            setFormScreenshot(null);
                                                            setFormScreenshotPreview(null);
                                                        }}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '5px',
                                                            background: '#fee2e2', color: '#991b1b',
                                                            border: '1px solid #fecaca', borderRadius: '0.5rem',
                                                            padding: '0.4rem 0.85rem', fontWeight: 700,
                                                            fontSize: '0.82rem', cursor: 'pointer'
                                                        }}
                                                    >
                                                        <Send size={13} /> Réessayer
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Formulaire inline de soumission */}
                                    {isFormOpen && (
                                        <div style={{
                                            background: '#f8fafc', borderTop: '1px solid #e2e8f0',
                                            padding: '1.25rem'
                                        }}>
                                            <p style={{ margin: '0 0 1rem', fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                                                <strong>Mode opératoire :</strong> Ouvrez la plateforme via le lien ci-dessus, créez votre citation avec le texte NAP, puis collez l'URL de la page créée et joignez une capture d'écran comme preuve.
                                            </p>

                                            {/* Champ URL de preuve */}
                                            <div style={{ marginBottom: '0.85rem' }}>
                                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                                                    URL de la citation *
                                                </label>
                                                <input
                                                    type="url"
                                                    placeholder="https://www.nomdusite.fr/votre-citation-créée"
                                                    value={formUrl}
                                                    onChange={e => setFormUrl(e.target.value)}
                                                    style={{
                                                        width: '100%', padding: '0.65rem 0.85rem',
                                                        borderRadius: '8px',
                                                        border: formUrl && !formUrl.startsWith('http')
                                                            ? '2px solid #dc2626'
                                                            : formUrl ? '2px solid #059669' : '1px solid #e2e8f0',
                                                        fontSize: '0.88rem', outline: 'none',
                                                        boxSizing: 'border-box'
                                                    }}
                                                />
                                            </div>

                                            {/* Upload screenshot */}
                                            <div style={{ marginBottom: '1rem' }}>
                                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '6px' }}>
                                                    Capture d'écran (preuve) *
                                                </label>
                                                <input
                                                    id="screenshot-file-input"
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp"
                                                    onChange={handleScreenshotChange}
                                                    style={{ display: 'none' }}
                                                />
                                                {formScreenshotPreview ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                        <div style={{ position: 'relative' }}>
                                                            <img
                                                                src={formScreenshotPreview}
                                                                alt="Aperçu capture"
                                                                style={{
                                                                    width: '120px', height: '80px',
                                                                    objectFit: 'cover', borderRadius: '8px',
                                                                    border: '2px solid #059669'
                                                                }}
                                                            />
                                                            <div style={{
                                                                position: 'absolute', bottom: '4px', right: '4px',
                                                                background: '#059669', borderRadius: '50%',
                                                                width: '18px', height: '18px',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                            }}>
                                                                <Check size={11} color="white" />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#059669', marginBottom: '3px' }}>
                                                                Capture prête
                                                            </div>
                                                            <label
                                                                htmlFor="screenshot-file-input"
                                                                style={{
                                                                    display: 'inline-block',
                                                                    background: 'none', border: '1px solid #e2e8f0',
                                                                    borderRadius: '0.4rem', padding: '0.25rem 0.65rem',
                                                                    fontSize: '0.78rem', fontWeight: 600, color: '#64748b',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                Changer
                                                            </label>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <label
                                                        htmlFor="screenshot-file-input"
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '8px',
                                                            background: 'white',
                                                            border: '2px dashed #cbd5e1',
                                                            borderRadius: '8px', padding: '0.75rem 1.25rem',
                                                            color: '#64748b', fontSize: '0.85rem', fontWeight: 600,
                                                            cursor: 'pointer', width: '100%', justifyContent: 'center',
                                                            boxSizing: 'border-box'
                                                        }}
                                                    >
                                                        <Camera size={16} color="#94a3b8" />
                                                        Joindre une capture d'écran (JPG, PNG, WEBP — 5MB max)
                                                    </label>
                                                )}
                                            </div>

                                            {/* Boutons Soumettre / Annuler */}
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <button
                                                    onClick={() => submitCitation(platform)}
                                                    disabled={submitting}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '5px',
                                                        background: 'linear-gradient(135deg, #059669, #047857)',
                                                        color: 'white', border: 'none',
                                                        borderRadius: '0.5rem', padding: '0.6rem 1.25rem',
                                                        fontWeight: 700, fontSize: '0.85rem',
                                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                                        opacity: submitting ? 0.7 : 1
                                                    }}
                                                >
                                                    <Send size={14} /> {submitting ? 'Envoi en cours...' : 'Soumettre la citation'}
                                                </button>
                                                <button
                                                    onClick={closeForm}
                                                    disabled={submitting}
                                                    style={{
                                                        background: 'white', color: '#64748b',
                                                        border: '1px solid #e2e8f0', borderRadius: '0.5rem',
                                                        padding: '0.6rem 1rem', fontWeight: 700,
                                                        fontSize: '0.85rem', cursor: 'pointer'
                                                    }}
                                                >
                                                    Annuler
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    </div>
                )}
            </>
        );
    };

    return (
        <DashboardLayout title="Citations GEO">
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
            {selectedMission ? renderMissionDetail() : renderMissionList()}
        </DashboardLayout>
    );
};

// ─── Styles partagés tableau ───────────────────────────────────────────────

const thStyle: React.CSSProperties = {
    padding: '0.875rem 1.5rem',
    textAlign: 'left',
    fontSize: '0.72rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#64748b',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap'
};

const tdStyle: React.CSSProperties = {
    padding: '0.875rem 1.5rem',
    fontSize: '0.88rem',
    color: '#334155',
    verticalAlign: 'middle'
};
