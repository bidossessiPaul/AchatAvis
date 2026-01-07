import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import { LoadingOverlay } from '../common/LoadingOverlay';

interface ProtectedRouteProps {
    allowedRoles?: ('artisan' | 'guide' | 'admin')[];
    children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
    const { isAuthenticated, user, isLoading, checkAuth } = useAuthStore();
    const location = useLocation();

    React.useEffect(() => {
        if (isAuthenticated) {
            // Check status on every navigation to catch suspensions in real-time
            checkAuth(true);
        }
    }, [location.pathname, checkAuth, isAuthenticated]);

    if (isLoading) {
        return <LoadingOverlay text="Vérification de l'accès..." />;
    }

    if (!isAuthenticated) {
        // Redirect to login while saving the attempted url
        return <Navigate to="/login" state={{ from: location }} replace />;
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
        if (user.role === 'artisan') return <Navigate to="/artisan" replace />;
        if (user.role === 'guide') return <Navigate to="/guide" replace />;
        if (user.role === 'admin') return <Navigate to="/admin" replace />;
        return <Navigate to="/" replace />;
    }

    return children ? <>{children}</> : <Outlet />;
};
