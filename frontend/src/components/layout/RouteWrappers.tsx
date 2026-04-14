import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import { LoadingOverlay } from '../common/LoadingOverlay';

interface ProtectedRouteProps {
    allowedRoles?: ('artisan' | 'guide' | 'admin')[];
    children?: React.ReactNode;
}

// Throttle checkAuth revalidations on navigation.
// Without this, every single route change triggered a /auth/me call and a full
// user-object re-assignation in the store, which in turn cascaded into SSE
// reconnections and a pool-saturating burst of requests.
// 60s is low enough to pick up suspensions quickly, high enough to stop spam.
const AUTH_REVALIDATE_INTERVAL_MS = 60 * 1000;
let lastAuthCheckAt = 0;

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
    const { isAuthenticated, user, isLoading, checkAuth } = useAuthStore();
    const location = useLocation();

    React.useEffect(() => {
        if (!isAuthenticated) return;

        const now = Date.now();
        if (now - lastAuthCheckAt < AUTH_REVALIDATE_INTERVAL_MS) return;

        lastAuthCheckAt = now;
        checkAuth(true);
    }, [location.pathname, checkAuth, isAuthenticated]);

    if (isLoading) {
        return <LoadingOverlay text="Vérification de l'accès..." />;
    }

    if (!isAuthenticated) {
        // Redirect to login while saving the attempted url
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Users suspended for identity verification may only access the verification page
    if (
        user?.status === 'suspended' &&
        user?.suspension_reason === 'identity_verification_required' &&
        location.pathname !== '/identity-verification'
    ) {
        return <Navigate to="/identity-verification" replace />;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // Role based access control
        // Redirect to appropriate dashboard based on actual role
        if (user.role === 'artisan') return <Navigate to="/artisan" replace />;
        if (user.role === 'guide') return <Navigate to="/guide" replace />;
        if (user.role === 'admin') return <Navigate to="/admin" replace />;
        return <Navigate to="/" replace />;
    }

    return children ? <>{children}</> : <Outlet />;
};

export const PublicRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, user, isLoading } = useAuthStore();

    if (isLoading) {
        return <LoadingOverlay text="Chargement..." />;
    }

    if (isAuthenticated && user) {
        // Redirect authenticated users away from public pages like login/register
        if (user.status === 'suspended' && user.suspension_reason === 'identity_verification_required') {
            return <Navigate to="/identity-verification" replace />;
        }
        if (user.role === 'artisan') return <Navigate to="/artisan" replace />;
        if (user.role === 'guide') return <Navigate to="/guide" replace />;
        if (user.role === 'admin') return <Navigate to="/admin" replace />;
        return <Navigate to="/" replace />;
    }

    return children ? <>{children}</> : <Outlet />;
};
