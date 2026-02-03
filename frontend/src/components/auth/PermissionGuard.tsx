import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../context/authStore';
import { toast } from 'react-hot-toast';

interface PermissionGuardProps {
    children: React.ReactNode;
    requiredPermission: string | string[];
}

/**
 * Protects a route/component, ensuring user has the required permission
 * Super admins bypass all checks
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
    children,
    requiredPermission
}) => {
    const { user } = useAuthStore();
    const { hasPermission, isSuperAdmin } = usePermissions();
    const navigate = useNavigate();

    // Check permissions
    const hasAccess = React.useMemo(() => {
        if (!user || user.role !== 'admin') return false;
        if (isSuperAdmin()) return true;

        if (Array.isArray(requiredPermission)) {
            return requiredPermission.some(perm => hasPermission(perm));
        }
        return hasPermission(requiredPermission);
    }, [user, requiredPermission, hasPermission, isSuperAdmin]);

    useEffect(() => {
        if (user && user.role === 'admin' && !isSuperAdmin() && !hasAccess) {
            toast.error("Accès refusé : Vous n'avez pas les permissions nécessaires.");
            navigate('/admin', { replace: true });
        }
    }, [user, hasAccess, navigate, isSuperAdmin]);

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

    if (hasAccess) {
        return <>{children}</>;
    }

    // While redirecting
    return null;
};
