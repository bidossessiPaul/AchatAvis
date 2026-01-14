import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { teamApi } from '../../services/api';
import { InviteMemberModal } from './components/InviteMemberModal';
// import { useAuthStore } from '../../context/authStore';
// import { usePermissions } from '../../hooks/usePermissions';
import {
    Users,
    Plus,
    Shield,
    Mail,
    Calendar,
    Trash2,
    Edit2
} from 'lucide-react';
import { showConfirm, showSuccess, showError } from '../../utils/Swal';
import './AdminTeam.css';

export const AdminTeam = () => {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [memberToEdit, setMemberToEdit] = useState<any>(null);
    // const { user } = useAuthStore();
    // const { isSuperAdmin } = usePermissions();

    const fetchMembers = async () => {
        try {
            const data = await teamApi.getTeamMembers();
            setMembers(data);
        } catch (error) {
            console.error(error);
            showError('Erreur', "Impossible de charger l'équipe");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const handleInvite = async (email: string, permissions: any) => {
        try {
            await teamApi.inviteMember(email, permissions);
            showSuccess('Succès', "Invitation envoyée !");
            fetchMembers();
        } catch (error: any) {
            showError('Erreur', error.response?.data?.error || "Erreur lors de l'invitation");
            throw error;
        }
    };

    const handleUpdate = async (userId: string, permissions: any) => {
        try {
            await teamApi.updatePermissions(userId, permissions);
            showSuccess('Succès', "Permissions mises à jour !");
            fetchMembers();
            setMemberToEdit(null);
            setIsInviteModalOpen(false);
        } catch (error: any) {
            showError('Erreur', error.response?.data?.error || "Erreur lors de la mise à jour");
            throw error;
        }
    };

    const handleEdit = (member: any) => {
        setMemberToEdit(member);
        setIsInviteModalOpen(true);
    };

    const handleDelete = async (id: string, type: 'active' | 'pending') => {
        const result = await showConfirm(
            'Confirmation',
            "Êtes-vous sûr de vouloir supprimer ce membre ?"
        );

        if (!result.isConfirmed) return;

        try {
            await teamApi.deleteMember(id, type);
            showSuccess('Succès', "Membre supprimé");
            fetchMembers();
        } catch (error) {
            showError('Erreur', "Erreur lors de la suppression");
        }
    };

    /*
    const countPermissions = (perms: any) => {
        if (!perms) return "Accès total";
        // Handle if perms comes as string
        if (typeof perms === 'string') {
            try {
                perms = JSON.parse(perms);
            } catch (e) {
                return "Erreur lecture";
            }
        }
        const count = Object.values(perms).filter(Boolean).length;
        return `${count} accès autorisés`;
    };
    */

    const handleCloseModal = () => {
        setIsInviteModalOpen(false);
        setMemberToEdit(null);
    };

    // Helper to safely get permission count
    const getPermissionCount = (member: any) => {
        // If super admin (no permissions object or empty) usually means full access
        // But for invited members, undefined/null might check differently based on implementation
        if (!member.permissions || (typeof member.permissions === 'object' && Object.keys(member.permissions).length === 0)) {
            // Check if it's the main admin (you might need a better check than this, e.g. specific ID or email)
            return 'Admin';
        }

        let perms = member.permissions;
        if (typeof perms === 'string') {
            try {
                perms = JSON.parse(perms);
            } catch (e) {
                return '0';
            }
        }
        return Object.values(perms).filter(Boolean).length;
    };

    return (
        <DashboardLayout>
            <div className="admin-team-page">
                {/* Header */}
                <div className="team-header">
                    <div className="team-header-bg-icon">
                        <Users size={120} />
                    </div>
                    <div className="team-header-content">
                        <div className="team-header-title">
                            <h1>Gestion de l'équipe</h1>
                            <p>
                                Gérez les accès administrateurs, attribuez des permissions granulaires et suivez l'activité de votre équipe en temps réel.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setMemberToEdit(null);
                                setIsInviteModalOpen(true);
                            }}
                            className="btn-invite-member"
                        >
                            <Plus size={20} style={{ color: '#FF991F' }} />
                            Inviter un membre
                        </button>
                    </div>
                </div>

                {/* Team Grid */}
                {loading ? (
                    <div className="loading-state">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                        <p>Chargement de l'équipe...</p>
                    </div>
                ) : (
                    <div className="team-grid">
                        {members.map((member) => (
                            <div key={member.id} className="team-card">
                                {/* Status Indicator */}
                                <div className={`status-badge ${member.status}`}>
                                    <div className="status-dot"></div>
                                    {member.status === 'active' ? 'Actif' : 'En attente'}
                                </div>

                                <div className="team-card-inner">
                                    {/* User Info */}
                                    <div className="user-info-row">
                                        <div className={`user-avatar-circle ${member.status}`}>
                                            {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="user-details">
                                            <h3>{member.full_name || '—'}</h3>
                                            <div className="user-email">
                                                <Mail size={12} />
                                                {member.email}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="card-stats-grid">
                                        <div className="stat-box">
                                            <div className="stat-box-icon">
                                                <Shield size={16} />
                                            </div>
                                            <div className="stat-box-label">Permissions</div>
                                            <div className="stat-box-value">
                                                {getPermissionCount(member)}
                                            </div>
                                        </div>
                                        <div className="stat-box">
                                            <div className="stat-box-icon">
                                                <Calendar size={16} />
                                            </div>
                                            <div className="stat-box-label">Depuis le</div>
                                            <div className="stat-box-value">
                                                {new Date(member.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="card-actions">
                                        {/* Only show edit if active and we are super admin or have rights (logic simplified) */}
                                        <button
                                            onClick={() => handleEdit(member)}
                                            className="btn-action-card edit"
                                            title="Modifier les permissions"
                                        >
                                            <Edit2 size={16} />
                                            Modifier
                                        </button>

                                        <button
                                            onClick={() => handleDelete(member.id, member.status)}
                                            className="btn-action-card delete"
                                            title={member.status === 'active' ? 'Supprimer l\'accès' : 'Annuler l\'invitation'}
                                        >
                                            <Trash2 size={16} />
                                            {member.status === 'active' ? 'Supprimer' : 'Annuler'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Add New Card */}
                        <button
                            onClick={() => {
                                setMemberToEdit(null);
                                setIsInviteModalOpen(true);
                            }}
                            className="btn-add-card"
                        >
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

            <InviteMemberModal
                isOpen={isInviteModalOpen}
                onClose={handleCloseModal}
                onInvite={handleInvite}
                onUpdate={handleUpdate}
                memberToEdit={memberToEdit}
            />
        </DashboardLayout>
    );
};
