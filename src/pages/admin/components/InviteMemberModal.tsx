import React, { useState } from 'react';
import { X, Mail, Shield, Check, Loader } from 'lucide-react';

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInvite: (email: string, permissions: any) => Promise<void>;
    onUpdate?: (userId: string, permissions: any) => Promise<void>;
    memberToEdit?: any;
}

interface PermissionsState {
    can_validate_profiles: boolean;
    can_validate_reviews: boolean;
    can_validate_fiches: boolean;
    can_view_payments: boolean;
    can_view_stats: boolean;
    can_manage_users: boolean;
    can_manage_sectors: boolean;
    can_manage_trust_scores: boolean;
    can_manage_suspensions: boolean;
    can_manage_packs: boolean;
    can_manage_team: boolean;
    can_manage_reviews: boolean;
    can_manage_fiches: boolean;
}

const initialPermissions: PermissionsState = {
    can_validate_profiles: false,
    can_validate_reviews: false,
    can_validate_fiches: false,
    can_view_payments: false,
    can_view_stats: false,
    can_manage_users: false,
    can_manage_sectors: false,
    can_manage_trust_scores: false,
    can_manage_suspensions: false,
    can_manage_packs: false,
    can_manage_team: false,
    can_manage_reviews: false,
    can_manage_fiches: false
};

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ isOpen, onClose, onInvite, onUpdate, memberToEdit }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [permissions, setPermissions] = useState<PermissionsState>(initialPermissions);

    // Initialize with member data if editing
    React.useEffect(() => {
        if (memberToEdit && isOpen) {
            setEmail(memberToEdit.email);
            let parsedPermissions = memberToEdit.permissions;
            if (typeof parsedPermissions === 'string') {
                try {
                    parsedPermissions = JSON.parse(parsedPermissions);
                } catch (e) {
                    parsedPermissions = {};
                }
            }
            parsedPermissions = parsedPermissions || {};

            setPermissions({
                can_validate_profiles: !!parsedPermissions.can_validate_profiles,
                can_validate_reviews: !!parsedPermissions.can_validate_reviews,
                can_validate_fiches: !!parsedPermissions.can_validate_fiches,
                can_view_payments: !!parsedPermissions.can_view_payments,
                can_view_stats: !!parsedPermissions.can_view_stats,
                can_manage_users: !!parsedPermissions.can_manage_users,
                can_manage_sectors: !!parsedPermissions.can_manage_sectors,
                can_manage_trust_scores: !!parsedPermissions.can_manage_trust_scores,
                can_manage_suspensions: !!parsedPermissions.can_manage_suspensions,
                can_manage_packs: !!parsedPermissions.can_manage_packs,
                can_manage_team: !!parsedPermissions.can_manage_team,
                can_manage_reviews: !!parsedPermissions.can_manage_reviews,
                can_manage_fiches: !!parsedPermissions.can_manage_fiches
            });
        } else if (isOpen) {
            setEmail('');
            setPermissions(initialPermissions);
        }
    }, [memberToEdit, isOpen]);

    if (!isOpen) return null;

    const handleCheckboxChange = (key: keyof PermissionsState) => {
        setPermissions(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSelectAll = (e: React.MouseEvent) => {
        e.preventDefault();
        const allSelected = Object.values(permissions).every(p => p === true);
        const newState = { ...permissions };
        Object.keys(newState).forEach(key => {
            (newState as any)[key] = !allSelected;
        });
        setPermissions(newState);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (memberToEdit && onUpdate) {
                await onUpdate(memberToEdit.id, permissions);
            } else {
                await onInvite(email, permissions);
            }
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const permissionConfig: { key: keyof PermissionsState; label: string; desc: string }[] = [
        { key: 'can_validate_profiles', label: 'Artisans & Guides', desc: 'Gestion des comptes et validation des profils' },
        { key: 'can_validate_reviews', label: 'Modération Avis', desc: 'Validation et rejet des avis soumis par les guides' },
        { key: 'can_validate_fiches', label: 'Gestion des Fiches', desc: 'Approuver les fiches et gérer les secteurs' },
        { key: 'can_manage_sectors', label: 'Secteurs d\'activité', desc: 'Accès complet à la configuration des secteurs' },
        { key: 'can_view_payments', label: 'Finance & Paiements', desc: 'Consulter les transactions et abonnements' },
        { key: 'can_manage_packs', label: 'Gestion des Packs', desc: 'Créer et modifier les offres d\'abonnement' },
        { key: 'can_manage_trust_scores', label: 'Trust Scores', desc: 'Ajuster les algorithmes de score de confiance' },
        { key: 'can_manage_suspensions', label: 'Suspensions & Bans', desc: 'Gérer les restrictions de compte et bannissements' },
        { key: 'can_manage_team', label: 'Gestion d\'Équipe', desc: 'Inviter et gérer les autres administrateurs' },
        { key: 'can_view_stats', label: 'Statistiques', desc: 'Accès au tableau de bord des performances' }
    ];

    const isEditing = !!memberToEdit;

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <div className="modal-header">
                    <div className="modal-title">
                        <h2>{isEditing ? 'Modifier les permissions' : 'Inviter un membre'}</h2>
                        <p>{isEditing ? 'Ajustez les droits d\'accès pour ce membre.' : 'Envoyez une invitation par email pour rejoindre l\'équipe.'}</p>
                    </div>
                    <button onClick={onClose} className="btn-close-modal">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label>Adresse Email</label>
                        <div className="input-wrapper">
                            <Mail className="input-icon" size={20} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="form-input"
                                placeholder="collegue@entreprise.com"
                                disabled={isEditing}
                                style={isEditing ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                <Shield size={16} className="text-blue-600" />
                                Permissions d'accès
                            </label>
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className="select-all-btn"
                            >
                                {Object.values(permissions).every(p => p === true) ? 'Tout désélectionner' : 'Tout sélectionner'}
                            </button>
                        </div>
                        <div className="permission-list">
                            {permissionConfig.map((perm) => (
                                <label key={perm.key} className="permission-item">
                                    <div className={`checkbox-visual ${permissions[perm.key] ? 'checked' : ''}`}>
                                        {permissions[perm.key] && <Check size={12} className="text-white" />}
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden-checkbox"
                                        checked={permissions[perm.key]}
                                        onChange={() => handleCheckboxChange(perm.key)}
                                    />
                                    <div className="perm-details">
                                        <div className="perm-label">{perm.label}</div>
                                        <div className="perm-desc">{perm.desc}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-cancel"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-submit"
                        >
                            {loading ? (
                                <>
                                    <Loader size={20} className="animate-spin" />
                                    Enregistrement...
                                </>
                            ) : (
                                <>
                                    {isEditing ? <Check size={18} /> : <Mail size={18} />}
                                    {isEditing ? 'Sauvegarder les modifications' : 'Envoyer l\'invitation'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
