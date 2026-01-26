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

    useEffect(() => {
        if (!hasAccess) {
            toast.error("Accès refusé : Vous n'avez pas les permissions nécessaires.");
            navigate('/admin', { replace: true });
        }
    }, [hasAccess, navigate]);

    if (hasAccess) {
        return <>{children}</>;
    }

    // While redirecting
    return null;
};
