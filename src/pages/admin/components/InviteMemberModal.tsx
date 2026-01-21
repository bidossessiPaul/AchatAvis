import React, { useState } from 'react';
import { X, Mail, Shield, Check, Loader } from 'lucide-react';

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInvite: (email: string, permissions: any) => Promise<void>;
    onUpdate?: (userId: string, permissions: any) => Promise<void>;
    memberToEdit?: any;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ isOpen, onClose, onInvite, onUpdate, memberToEdit }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    // Default permissions: all false
    const [permissions, setPermissions] = useState({
        can_validate_profiles: false,
        can_validate_reviews: false,
        can_validate_fiches: false,
        can_view_payments: false,
        can_view_stats: false,
        can_manage_users: false
    });

    // Initialize with member data if editing
    React.useEffect(() => {
        if (memberToEdit) {
            setEmail(memberToEdit.email);
            // Handle permissions being a string or object
            let parsedPermissions = memberToEdit.permissions;
            if (typeof parsedPermissions === 'string') {
                try {
                    parsedPermissions = JSON.parse(parsedPermissions);
                } catch (e) {
                    parsedPermissions = {};
                }
            }
            // Ensure we have an object, default to empty
            parsedPermissions = parsedPermissions || {};

            setPermissions({
                can_validate_profiles: !!parsedPermissions.can_validate_profiles,
                can_validate_reviews: !!parsedPermissions.can_validate_reviews,
                can_validate_fiches: !!parsedPermissions.can_validate_fiches,
                can_view_payments: !!parsedPermissions.can_view_payments,
                can_view_stats: !!parsedPermissions.can_view_stats,
                can_manage_users: !!parsedPermissions.can_manage_users
            });
        } else {
            // Reset for new invite
            setEmail('');
            setPermissions({
                can_validate_profiles: false,
                can_validate_reviews: false,
                can_validate_fiches: false,
                can_view_payments: false,
                can_view_stats: false,
                can_manage_users: false
            });
        }
    }, [memberToEdit, isOpen]);

    if (!isOpen) return null;

    const handleCheckboxChange = (key: string) => {
        setPermissions(prev => ({
            ...prev,
            // @ts-ignore
            [key]: !prev[key]
        }));
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
            if (!memberToEdit) {
                setEmail('');
                setPermissions({
                    can_validate_profiles: false,
                    can_validate_reviews: false,
                    can_validate_fiches: false,
                    can_view_payments: false,
                    can_view_stats: false,
                    can_manage_users: false
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const permissionConfig = [
        { key: 'can_validate_profiles', label: 'Validation des Profils', desc: 'Approuver ou rejeter les nouveaux artisans/guides' },
        { key: 'can_validate_reviews', label: 'Validation des Avis', desc: 'Modérer les soufiches d\'avis des guides' },
        { key: 'can_validate_fiches', label: 'Validation des fiches', desc: 'Approuver les fiches créées par les artisans' },
        { key: 'can_view_payments', label: 'Aperçu sur les Paiements', desc: 'Voir l\'historique des transactions Stripe' },
        { key: 'can_view_stats', label: 'Accès aux Statistiques', desc: 'Voir les graphiques et KPI globaux' },
        { key: 'can_manage_users', label: 'Liste des Utilisateurs', desc: 'Voir et rechercher dans la liste des utilisateurs' }
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
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Shield size={16} className="text-blue-600" />
                            Permissions d'accès
                        </label>
                        <div className="permission-list">
                            {permissionConfig.map((perm) => (
                                <label key={perm.key} className="permission-item">
                                    <div className={`checkbox-visual ${
                                        // @ts-ignore
                                        permissions[perm.key] ? 'checked' : ''
                                        }`}>
                                        {/* @ts-ignore */}
                                        {permissions[perm.key] && <Check size={12} className="text-white" />}
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden-checkbox"
                                        // @ts-ignore
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
