import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../context/authStore';

interface PermissionGuardProps {
    children: React.ReactNode;
    requiredPermission: string | string[]; // Can be a single permission or an array (OR logic)
    fallbackPath?: string;
}

/**
 * Protects a route/component, ensuring user has the required permission
 * Super admins bypass all checks
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
    children,
    requiredPermission
    // fallbackPath = '/admin'
}) => {
    const { user } = useAuthStore();
    const { hasPermission, isSuperAdmin } = usePermissions();

    // Not logged in
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Not an admin
    if (user.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    // Super admin has all access
    if (isSuperAdmin()) {
        return <>{children}</>;
    }

    // Check permissions
    let hasAccess = false;
    if (Array.isArray(requiredPermission)) {
        // OR logic: true if has ANY of the permissions
        hasAccess = requiredPermission.some(perm => hasPermission(perm));
    } else {
        hasAccess = hasPermission(requiredPermission);
    }

    if (hasAccess) {
        return <>{children}</>;
    }

    // No permission - show 403 message or redirect
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '2rem',
            textAlign: 'center'
        }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</h1>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Accès Refusé</h2>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
                Vous n'avez pas la permission d'accéder à cette page.
            </p>
            <button
                onClick={() => window.history.back()}
                style={{
                    padding: '0.75rem 1.5rem',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '1rem'
                }}
            >
                Retour
            </button>
        </div>
    );
};
