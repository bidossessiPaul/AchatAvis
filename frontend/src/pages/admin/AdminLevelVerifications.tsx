import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminApi } from '../../services/api';
import {
    Search,
    CheckCircle2,
    XCircle,
    ExternalLink,
    Clock,
    Trophy,
    ArrowRight,
    Image as ImageIcon,
    User
} from 'lucide-react';
import { showSuccess, showError } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { getFileUrl } from '../../utils/url';
import './ReviewValidation.css';
import './AdminLists.css';

interface Verification {
    id: number;
    guide_id: string;
    gmail_account_id: number;
    screenshot_url: string;
    profile_link: string;
    claimed_level: number;
    current_level: number;
    status: 'pending' | 'approved' | 'rejected';
    admin_notes?: string;
    created_at: string;
    reviewed_at?: string;
    guide_name: string;
    guide_email: string;
    guide_avatar?: string;
    gmail_email: string;
    gmail_current_level: number;
    reviewer_name?: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'En attente', color: '#92400e', bg: '#fef3c7' },
    approved: { label: 'Approuvé', color: '#166534', bg: '#dcfce7' },
    rejected: { label: 'Refusé', color: '#991b1b', bg: '#fee2e2' },
};

export const AdminLevelVerifications: React.FC = () => {
    const navigate = useNavigate();
    const [verifications, setVerifications] = useState<Verification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('pending');

    // Reject modal state
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Screenshot preview
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const data = await adminApi.getLevelVerifications();
            setVerifications(data as Verification[]);
        } catch (error) {
            showError('Erreur', 'Erreur lors du chargement des vérifications');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const handleApprove = async (id: number) => {
        setIsActionLoading(true);
        try {
            await adminApi.reviewLevelVerification(id, { status: 'approved' });
            showSuccess('Niveau approuvé !', 'Le niveau du guide a été mis à jour.');
            fetchData(true);
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Erreur lors de l\'approbation';
            showError('Erreur', msg);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selectedId) return;
        setIsActionLoading(true);
        try {
            await adminApi.reviewLevelVerification(selectedId, {
                status: 'rejected',
                admin_notes: adminNotes
            });
            showSuccess('Demande rejetée');
            setShowRejectModal(false);
            setAdminNotes('');
            setSelectedId(null);
            fetchData(true);
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Erreur lors du rejet';
            showError('Erreur', msg);
        } finally {
            setIsActionLoading(false);
        }
    };

    const filtered = verifications.filter(v => {
        const matchesSearch = !searchTerm ||
            v.guide_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.gmail_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.guide_email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const pendingCount = verifications.filter(v => v.status === 'pending').length;

    if (isLoading) {
        return (
            <DashboardLayout title="Vérification Niveaux Local Guide">
                <div style={{ padding: '80px 0' }}>
                    <LoadingSpinner text="Chargement des vérifications..." size="lg" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Vérification Niveaux Local Guide">
            {/* Stats bar */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '1.5rem'
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    borderRadius: '1rem',
                    padding: '1.25rem 1.5rem',
                    color: 'white',
                    flex: 1
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800 }}>{pendingCount}</div>
                    <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 600 }}>En attente de validation</div>
                </div>
                <div style={{
                    background: 'white',
                    borderRadius: '1rem',
                    padding: '1.25rem 1.5rem',
                    border: '1px solid #e2e8f0',
                    flex: 1
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#166534' }}>
                        {verifications.filter(v => v.status === 'approved').length}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Approuvées</div>
                </div>
                <div style={{
                    background: 'white',
                    borderRadius: '1rem',
                    padding: '1.25rem 1.5rem',
                    border: '1px solid #e2e8f0',
                    flex: 1
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>
                        {verifications.length}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Total demandes</div>
                </div>
            </div>

            {/* Search & Filters */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '1.5rem',
                alignItems: 'center'
            }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        placeholder="Rechercher par nom ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.75rem 1rem 0.75rem 2.75rem',
                            borderRadius: '0.75rem',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.9rem',
                            outline: 'none'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[
                        { value: 'pending', label: 'En attente' },
                        { value: 'all', label: 'Tout' },
                        { value: 'approved', label: 'Approuvés' },
                        { value: 'rejected', label: 'Refusés' }
                    ].map(f => (
                        <button
                            key={f.value}
                            onClick={() => setStatusFilter(f.value)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '0.5rem',
                                border: '1px solid ' + (statusFilter === f.value ? '#2383e2' : '#e2e8f0'),
                                background: statusFilter === f.value ? '#eff6ff' : 'white',
                                color: statusFilter === f.value ? '#2383e2' : '#64748b',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', background: '#f8fafc', borderRadius: '1rem', border: '2px dashed #e2e8f0' }}>
                    <Trophy size={40} color="#94a3b8" style={{ marginBottom: '1rem' }} />
                    <p style={{ color: '#64748b', margin: 0, fontSize: '1rem' }}>
                        {statusFilter === 'pending' ? 'Aucune vérification en attente' : 'Aucune vérification trouvée'}
                    </p>
                </div>
            ) : (
                <div style={{
                    background: 'white',
                    borderRadius: '1rem',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Guide</th>
                                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Gmail</th>
                                <th style={{ padding: '0.875rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Niveau</th>
                                <th style={{ padding: '0.875rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Preuves</th>
                                <th style={{ padding: '0.875rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Statut</th>
                                <th style={{ padding: '0.875rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((v) => {
                                const config = statusConfig[v.status];
                                return (
                                    <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        {/* Guide */}
                                        <td style={{ padding: '0.875rem 1rem' }}>
                                            <div
                                                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
                                                onClick={() => navigate(`/admin/guides/${v.guide_id}`)}
                                            >
                                                {v.guide_avatar ? (
                                                    <img src={getFileUrl(v.guide_avatar)} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <User size={16} color="#94a3b8" />
                                                    </div>
                                                )}
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>{v.guide_name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{v.guide_email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Gmail */}
                                        <td style={{ padding: '0.875rem 1rem' }}>
                                            <span style={{ fontSize: '0.85rem', color: '#475569' }}>{v.gmail_email}</span>
                                        </td>
                                        {/* Level */}
                                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                                <span style={{
                                                    background: '#f1f5f9',
                                                    padding: '0.25rem 0.6rem',
                                                    borderRadius: '0.375rem',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 700,
                                                    color: '#64748b'
                                                }}>
                                                    {v.current_level}
                                                </span>
                                                <ArrowRight size={14} color="#94a3b8" />
                                                <span style={{
                                                    background: '#fef3c7',
                                                    padding: '0.25rem 0.6rem',
                                                    borderRadius: '0.375rem',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 700,
                                                    color: '#92400e'
                                                }}>
                                                    {v.claimed_level}
                                                </span>
                                            </div>
                                        </td>
                                        {/* Proofs */}
                                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => setPreviewUrl(v.screenshot_url)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                                                        background: '#f1f5f9', color: '#475569', border: 'none',
                                                        padding: '0.3rem 0.6rem', borderRadius: '0.375rem',
                                                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
                                                    }}
                                                    title="Voir la capture d'écran"
                                                >
                                                    <ImageIcon size={13} /> Capture
                                                </button>
                                                <a
                                                    href={v.profile_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                                                        background: '#eff6ff', color: '#2383e2', border: 'none',
                                                        padding: '0.3rem 0.6rem', borderRadius: '0.375rem',
                                                        fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none'
                                                    }}
                                                >
                                                    <ExternalLink size={13} /> Profil
                                                </a>
                                            </div>
                                        </td>
                                        {/* Status */}
                                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                                fontSize: '0.75rem', fontWeight: 700,
                                                padding: '0.2rem 0.6rem', borderRadius: '1rem',
                                                background: config.bg, color: config.color
                                            }}>
                                                {v.status === 'pending' && <Clock size={13} />}
                                                {v.status === 'approved' && <CheckCircle2 size={13} />}
                                                {v.status === 'rejected' && <XCircle size={13} />}
                                                {config.label}
                                            </span>
                                            {v.reviewer_name && (
                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                                    par {v.reviewer_name}
                                                </div>
                                            )}
                                        </td>
                                        {/* Actions */}
                                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                                            {v.status === 'pending' ? (
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={() => handleApprove(v.id)}
                                                        disabled={isActionLoading}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                                                            background: '#dcfce7', color: '#166534', border: 'none',
                                                            padding: '0.4rem 0.75rem', borderRadius: '0.5rem',
                                                            fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
                                                        }}
                                                        title="Approuver"
                                                    >
                                                        <CheckCircle2 size={15} /> Approuver
                                                    </button>
                                                    <button
                                                        onClick={() => { setSelectedId(v.id); setShowRejectModal(true); }}
                                                        disabled={isActionLoading}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                                                            background: '#fee2e2', color: '#991b1b', border: 'none',
                                                            padding: '0.4rem 0.75rem', borderRadius: '0.5rem',
                                                            fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
                                                        }}
                                                        title="Rejeter"
                                                    >
                                                        <XCircle size={15} /> Rejeter
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                    {v.reviewed_at ? new Date(v.reviewed_at).toLocaleDateString('fr-FR') : '—'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div
                        onClick={() => { setShowRejectModal(false); setAdminNotes(''); setSelectedId(null); }}
                        style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}
                    />
                    <div style={{
                        position: 'relative',
                        background: 'white',
                        borderRadius: '1.5rem',
                        padding: '2rem',
                        width: '100%',
                        maxWidth: '450px',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)'
                    }}>
                        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                            Rejeter la demande
                        </h3>
                        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
                            Indiquez la raison du rejet pour informer le guide.
                        </p>
                        <textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="Raison du rejet (optionnel)..."
                            rows={4}
                            style={{
                                width: '100%',
                                padding: '0.875rem',
                                borderRadius: '0.75rem',
                                border: '1px solid #e2e8f0',
                                fontSize: '0.9rem',
                                resize: 'vertical',
                                marginBottom: '1.5rem',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => { setShowRejectModal(false); setAdminNotes(''); setSelectedId(null); }}
                                style={{
                                    padding: '0.625rem 1.25rem',
                                    borderRadius: '0.75rem',
                                    border: '1px solid #e2e8f0',
                                    background: 'white',
                                    color: '#64748b',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={isActionLoading}
                                style={{
                                    padding: '0.625rem 1.25rem',
                                    borderRadius: '0.75rem',
                                    border: 'none',
                                    background: '#ef4444',
                                    color: 'white',
                                    fontSize: '0.875rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    opacity: isActionLoading ? 0.6 : 1
                                }}
                            >
                                {isActionLoading ? 'Rejet en cours...' : 'Confirmer le rejet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Screenshot Preview Modal */}
            {previewUrl && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
                    onClick={() => setPreviewUrl(null)}
                >
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)' }} />
                    <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
                        <img
                            src={previewUrl}
                            alt="Capture d'écran du niveau"
                            style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '1rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
                        />
                        <button
                            onClick={() => setPreviewUrl(null)}
                            style={{
                                position: 'absolute', top: '-12px', right: '-12px',
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: 'white', border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                fontSize: '1.1rem', fontWeight: 700, color: '#475569'
                            }}
                        >
                            X
                        </button>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};
