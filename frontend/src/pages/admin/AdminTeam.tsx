import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { teamApi } from '../../services/api';
import { InviteMemberModal } from './components/InviteMemberModal';
import {
    Users, Plus, Shield, Mail, Calendar, Trash2, X, Check, Loader2
} from 'lucide-react';
import { showConfirm, showSuccess, showError } from '../../utils/Swal';
import './AdminTeam.css';

const PERMISSIONS = [
    { key: 'can_validate_profiles', label: 'Artisans, Guides & Pièces d\'identité', color: '#7c3aed' },
    { key: 'can_validate_reviews', label: 'Modération Avis', color: '#0369a1' },
    { key: 'can_validate_fiches', label: 'Fiches', color: '#0891b2' },
    { key: 'can_manage_sectors', label: 'Secteurs', color: '#059669' },
    { key: 'can_view_payments', label: 'Finance', color: '#d97706' },
    { key: 'can_manage_packs', label: 'Packs', color: '#ea580c' },
    { key: 'can_manage_trust_scores', label: 'Trust Scores', color: '#9333ea' },
    { key: 'can_manage_suspensions', label: 'Suspensions', color: '#dc2626' },
    { key: 'can_manage_team', label: 'Équipe', color: '#0f766e' },
    { key: 'can_view_stats', label: 'Statistiques', color: '#1d4ed8' },
    { key: 'can_manage_users', label: 'Utilisateurs', color: '#475569' },
    { key: 'can_manage_reviews', label: 'Gestion Avis', color: '#be123c' },
    { key: 'can_manage_fiches', label: 'Gestion Fiches', color: '#15803d' },
    { key: 'can_impersonate', label: 'Se connecter en tant que', color: '#2383e2' },
];

const parsePermissions = (raw: any): Record<string, boolean> => {
    let perms = raw;
    if (typeof perms === 'string') {
        try { perms = JSON.parse(perms); } catch { perms = {}; }
    }
    if (!perms || typeof perms !== 'object') return {};
    return perms;
};

export const AdminTeam = () => {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [drawerMember, setDrawerMember] = useState<any>(null);
    const [toggling, setToggling] = useState<string | null>(null);
    const drawerRef = useRef<HTMLDivElement>(null);

    const fetchMembers = async () => {
        try {
            const data = await teamApi.getTeamMembers();
            setMembers(data);
        } catch {
            showError('Erreur', "Impossible de charger l'équipe");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMembers(); }, []);

    // Sync drawer member when members list refreshes
    useEffect(() => {
        if (drawerMember) {
            const updated = members.find(m => m.id === drawerMember.id);
            if (updated) setDrawerMember(updated);
        }
    }, [members]);

    const handleInvite = async (email: string, permissions: any) => {
        await teamApi.inviteMember(email, permissions);
        showSuccess('Succès', "Invitation envoyée !");
        fetchMembers();
    };

    const handleDelete = async (id: string, type: 'active' | 'pending', email?: string) => {
        if (email === 'dossoumaxime888@gmail.com') {
            showError('Accès Refusé', "Le Super Administrateur ne peut pas être supprimé.");
            return;
        }
        const result = await showConfirm('Confirmation', "Êtes-vous sûr de vouloir supprimer ce membre ?");
        if (!result.isConfirmed) return;
        try {
            await teamApi.deleteMember(id, type);
            showSuccess('Succès', "Membre supprimé");
            if (drawerMember?.id === id) setDrawerMember(null);
            fetchMembers();
        } catch {
            showError('Erreur', "Erreur lors de la suppression");
        }
    };

    const handleTogglePermission = async (member: any, permKey: string) => {
        if (member.email === 'dossoumaxime888@gmail.com') return;
        const currentPerms = parsePermissions(member.permissions);
        const newPerms = { ...currentPerms, [permKey]: !currentPerms[permKey] };
        const key = `${member.id}:${permKey}`;
        setToggling(key);
        try {
            await teamApi.updatePermissions(member.id, newPerms);
            // Update locally without full refetch for instant feel
            setMembers(prev => prev.map(m =>
                m.id === member.id ? { ...m, permissions: newPerms } : m
            ));
        } catch {
            showError('Erreur', "Mise à jour impossible");
        } finally {
            setToggling(null);
        }
    };

    const isSuperAdmin = (member: any) => member.email === 'dossoumaxime888@gmail.com';

    const getActiveCount = (member: any) => {
        if (isSuperAdmin(member)) return 'Super Admin';
        const perms = parsePermissions(member.permissions);
        return `${Object.values(perms).filter(Boolean).length} / ${PERMISSIONS.length}`;
    };

    return (
        <DashboardLayout>
            <div className="admin-team-page">
                <div className="team-header">
                    <div className="team-header-bg-icon"><Users size={120} /></div>
                    <div className="team-header-content">
                        <div className="team-header-title">
                            <h1>Gestion de l'équipe</h1>
                            <p>Gérez les accès administrateurs et attribuez des permissions individuelles à chaque membre.</p>
                        </div>
                        <button onClick={() => setIsInviteModalOpen(true)} className="btn-invite-member">
                            <Plus size={20} style={{ color: '#FF991F' }} />
                            Inviter un membre
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-state">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4" />
                        <p>Chargement de l'équipe...</p>
                    </div>
                ) : (
                    <div className="team-grid">
                        {members.map((member) => {
                            const perms = parsePermissions(member.permissions);
                            const superAdmin = isSuperAdmin(member);
                            return (
                                <div key={member.id} className="team-card">
                                    <div className={`status-badge ${member.status}`}>
                                        <div className="status-dot" />
                                        {member.status === 'active' ? 'Actif' : 'En attente'}
                                    </div>

                                    <div className="team-card-inner">
                                        {/* User info */}
                                        <div className="user-info-row">
                                            <div className={`user-avatar-circle ${member.status}`}>
                                                {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="user-details">
                                                <h3>{member.full_name || '—'}</h3>
                                                <div className="user-email">
                                                    <Mail size={12} /> {member.email}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="card-stats-grid">
                                            <div className="stat-box">
                                                <div className="stat-box-icon"><Shield size={16} /></div>
                                                <div className="stat-box-label">Accès</div>
                                                <div className="stat-box-value">{getActiveCount(member)}</div>
                                            </div>
                                            <div className="stat-box">
                                                <div className="stat-box-icon"><Calendar size={16} /></div>
                                                <div className="stat-box-label">Depuis le</div>
                                                <div className="stat-box-value">{new Date(member.created_at).toLocaleDateString('fr-FR')}</div>
                                            </div>
                                        </div>

                                        {/* Active permissions badges */}
                                        {!superAdmin && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '14px' }}>
                                                {PERMISSIONS.filter(p => perms[p.key]).map(p => (
                                                    <span key={p.key} style={{
                                                        fontSize: '0.68rem',
                                                        fontWeight: 600,
                                                        padding: '2px 7px',
                                                        borderRadius: '999px',
                                                        background: p.color + '18',
                                                        color: p.color,
                                                        border: `1px solid ${p.color}30`,
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {p.label}
                                                    </span>
                                                ))}
                                                {Object.values(perms).filter(Boolean).length === 0 && (
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>Aucun accès</span>
                                                )}
                                            </div>
                                        )}
                                        {superAdmin && (
                                            <div style={{ marginBottom: '14px' }}>
                                                <span style={{ fontSize: '0.75rem', padding: '3px 10px', background: '#fff8e1', color: '#FF991F', border: '1px solid #FFE6A5', borderRadius: '999px', fontWeight: 700 }}>
                                                    ★ Accès complet
                                                </span>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="card-actions">
                                            {!superAdmin && (
                                                <button
                                                    onClick={() => setDrawerMember(member)}
                                                    className="btn-action-card edit"
                                                >
                                                    <Shield size={16} /> Gérer les accès
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(member.id, member.status, member.email)}
                                                className="btn-action-card delete"
                                            >
                                                <Trash2 size={16} />
                                                {member.status === 'active' ? 'Supprimer' : 'Annuler'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        <button onClick={() => setIsInviteModalOpen(true)} className="btn-add-card">
                            <div className="add-icon-circle">
                                <Plus size={32} className="text-blue-500" />
                            </div>
                            <div className="add-card-text">
                                <h3>Inviter un nouveau membre</h3>
                                <p>Ajoutez un collaborateur à l'équipe</p>
                            </div>
                        </button>
                    </div>
                )}
            </div>

            {/* Permissions Drawer */}
            {drawerMember && (
                <>
                    <div
                        onClick={() => setDrawerMember(null)}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
                            zIndex: 200, backdropFilter: 'blur(2px)'
                        }}
                    />
                    <div
                        ref={drawerRef}
                        style={{
                            position: 'fixed', top: 0, right: 0, bottom: 0,
                            width: '380px', background: 'white', zIndex: 201,
                            boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
                            display: 'flex', flexDirection: 'column', overflow: 'hidden'
                        }}
                    >
                        {/* Drawer header */}
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc' }}>
                            <div style={{
                                width: '42px', height: '42px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #FF991F, #FF6B35)',
                                color: 'white', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0
                            }}>
                                {drawerMember.full_name?.charAt(0) || drawerMember.email.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {drawerMember.full_name || drawerMember.email}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{drawerMember.email}</div>
                            </div>
                            <button
                                onClick={() => setDrawerMember(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', borderRadius: '6px' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                                {Object.values(parsePermissions(drawerMember.permissions)).filter(Boolean).length} / {PERMISSIONS.length} accès actifs
                            </span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                    onClick={async () => {
                                        const allPerms = Object.fromEntries(PERMISSIONS.map(p => [p.key, true]));
                                        setToggling('all');
                                        try {
                                            await teamApi.updatePermissions(drawerMember.id, allPerms);
                                            setMembers(prev => prev.map(m => m.id === drawerMember.id ? { ...m, permissions: allPerms } : m));
                                            setDrawerMember((prev: any) => ({ ...prev, permissions: allPerms }));
                                        } catch { showError('Erreur', 'Mise à jour impossible'); }
                                        finally { setToggling(null); }
                                    }}
                                    style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    Tout activer
                                </button>
                                <button
                                    onClick={async () => {
                                        const noPerms = Object.fromEntries(PERMISSIONS.map(p => [p.key, false]));
                                        setToggling('all');
                                        try {
                                            await teamApi.updatePermissions(drawerMember.id, noPerms);
                                            setMembers(prev => prev.map(m => m.id === drawerMember.id ? { ...m, permissions: noPerms } : m));
                                            setDrawerMember((prev: any) => ({ ...prev, permissions: noPerms }));
                                        } catch { showError('Erreur', 'Mise à jour impossible'); }
                                        finally { setToggling(null); }
                                    }}
                                    style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    Tout retirer
                                </button>
                            </div>
                        </div>

                        {/* Permissions list */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
                            {PERMISSIONS.map((perm) => {
                                const perms = parsePermissions(drawerMember.permissions);
                                const isActive = !!perms[perm.key];
                                const key = `${drawerMember.id}:${perm.key}`;
                                const isLoading = toggling === key || toggling === 'all';
                                return (
                                    <div
                                        key={perm.key}
                                        onClick={() => !isLoading && handleTogglePermission(drawerMember, perm.key)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            padding: '0.85rem 1.5rem',
                                            cursor: isLoading ? 'wait' : 'pointer',
                                            borderBottom: '1px solid #f8fafc',
                                            transition: 'background 0.15s',
                                            background: isActive ? `${perm.color}08` : 'white',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = isActive ? `${perm.color}14` : '#f8fafc')}
                                        onMouseLeave={e => (e.currentTarget.style.background = isActive ? `${perm.color}08` : 'white')}
                                    >
                                        {/* Toggle switch */}
                                        <div style={{
                                            width: '40px', height: '22px', borderRadius: '999px', flexShrink: 0,
                                            background: isActive ? perm.color : '#e2e8f0',
                                            position: 'relative', transition: 'background 0.2s',
                                            boxShadow: isActive ? `0 0 0 3px ${perm.color}25` : 'none'
                                        }}>
                                            <div style={{
                                                position: 'absolute', top: '3px',
                                                left: isActive ? '21px' : '3px',
                                                width: '16px', height: '16px', borderRadius: '50%',
                                                background: 'white', transition: 'left 0.2s',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                {isLoading && <Loader2 size={10} style={{ animation: 'spin 1s linear infinite', color: perm.color }} />}
                                                {!isLoading && isActive && <Check size={9} style={{ color: perm.color }} />}
                                            </div>
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: isActive ? '#0f172a' : '#475569' }}>
                                                {perm.label}
                                            </div>
                                        </div>

                                        <span style={{
                                            fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px',
                                            borderRadius: '999px',
                                            background: isActive ? `${perm.color}18` : '#f1f5f9',
                                            color: isActive ? perm.color : '#94a3b8',
                                        }}>
                                            {isActive ? 'Actif' : 'Inactif'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            <InviteMemberModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                onInvite={handleInvite}
            />
        </DashboardLayout>
    );
};
