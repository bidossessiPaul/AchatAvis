import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../context/authStore';
import { ShieldOff } from 'lucide-react';

interface PermissionGuardProps {
    children: React.ReactNode;
    requiredPermission: string | string[];
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ children, requiredPermission }) => {
    const { user } = useAuthStore();
    const { hasPermission, isSuperAdmin } = usePermissions();
    const navigate = useNavigate();

    if (!user) return <Navigate to="/login" replace />;
    if (user.role !== 'admin') return <Navigate to="/" replace />;
    if (isSuperAdmin()) return <>{children}</>;

    const hasAccess = Array.isArray(requiredPermission)
        ? requiredPermission.some(p => hasPermission(p))
        : hasPermission(requiredPermission);

    if (hasAccess) return <>{children}</>;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            gap: '1.25rem',
            textAlign: 'center',
            padding: '2rem',
            color: '#475569',
        }}>
            <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.5rem',
            }}>
                <ShieldOff size={32} style={{ color: '#94a3b8' }} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                Accès restreint
            </h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', maxWidth: '340px', lineHeight: 1.6 }}>
                Vous n'avez pas les droits nécessaires pour consulter cette section.
                Contactez le propriétaire du compte si vous pensez qu'il s'agit d'une erreur.
            </p>
            <button
                onClick={() => navigate('/admin')}
                style={{
                    marginTop: '0.5rem',
                    padding: '0.6rem 1.5rem',
                    background: '#0f172a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                }}
            >
                Retour au tableau de bord
            </button>
        </div>
    );
};
