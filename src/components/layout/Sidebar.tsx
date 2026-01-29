import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import {
    LayoutDashboard,
    Package,
    Star,
    CreditCard,
    MapPin,
    DollarSign,
    User,
    Users,
    FileCheck,
    Briefcase,
    ShieldCheck,
    LogOut,
    Mail,
    Shield,
    Layers
} from 'lucide-react';
import { getFileUrl } from '../../utils/url';
import './Layout.css';

interface NavItem {
    label: string;
    path: string;
    icon: React.ReactNode;
    permissions?: string[]; // Array of permissions (OR logic): has at least one
}

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const { user, logout } = useAuthStore();
    const { hasPermission, isSuperAdmin } = usePermissions();
    const location = useLocation();

    // Close sidebar when route changes (mobile)
    const handleLinkClick = () => {
        if (window.innerWidth < 768) {
            onClose();
        }
    };

    const getNavItems = (): NavItem[] => {
        if (!user) return [];

        switch (user.role) {
            case 'artisan':
                return [
                    { label: 'Vue d\'ensemble', path: '/artisan', icon: <LayoutDashboard size={20} /> },
                    { label: 'Mes commandes', path: '/artisan/orders', icon: <Package size={20} /> },
                    { label: 'Avis reçus', path: '/artisan/reviews', icon: <Star size={20} /> },
                    { label: 'Facturation', path: '/artisan/billing', icon: <CreditCard size={20} /> },
                    { label: 'Mon profil', path: '/profile', icon: <User size={20} /> },
                ];
            case 'guide':
                return [
                    { label: 'Tableau de bord', path: '/guide', icon: <LayoutDashboard size={20} /> },
                    { label: 'Toutes les fiches', path: '/guide/fiches', icon: <MapPin size={20} /> },
                    { label: 'Mes contributions', path: '/guide/submissions', icon: <Star size={20} /> },
                    { label: 'Mes gains', path: '/guide/earnings', icon: <DollarSign size={20} /> },
                    { label: 'Anti-Détection', path: '/guide/anti-detection', icon: <ShieldCheck size={20} /> },
                    { label: 'Mon profil', path: '/profile', icon: <User size={20} /> },
                    { label: 'Mes Gmails', path: '/profile?tab=gmail', icon: <Mail size={20} /> },
                ];
            case 'admin': {
                const allAdminItems: NavItem[] = [
                    { label: 'Vue d\'ensemble', path: '/admin', icon: <LayoutDashboard size={20} />, permissions: ['can_view_stats'] },
                    { label: 'Artisans', path: '/admin/artisans', icon: <Users size={20} />, permissions: ['can_manage_users', 'can_validate_profiles'] },
                    { label: 'Local Guides', path: '/admin/guides', icon: <MapPin size={20} />, permissions: ['can_manage_users', 'can_validate_profiles'] },
                    { label: 'Abonnements', path: '/admin/subscriptions', icon: <CreditCard size={20} />, permissions: ['can_view_payments'] },
                    { label: 'Gestion des Packs', path: '/admin/packs', icon: <Package size={20} />, permissions: ['can_manage_packs'] },
                    { label: 'Validation Avis', path: '/admin/reviews', icon: <FileCheck size={20} />, permissions: ['can_manage_reviews', 'can_validate_reviews'] },
                    { label: 'Suivi 360', path: '/admin/reviews-360', icon: <ShieldCheck size={20} />, permissions: ['can_manage_reviews', 'can_validate_reviews'] },
                    { label: 'Fiches', path: '/admin/fiches', icon: <Briefcase size={20} />, permissions: ['can_manage_fiches', 'can_validate_fiches'] },
                    { label: 'Paiements', path: '/admin/payments', icon: <DollarSign size={20} />, permissions: ['can_view_payments'] },
                    { label: 'Gestion Suspensions', path: '/admin/suspensions', icon: <Shield size={20} />, permissions: ['can_manage_suspensions'] },
                    { label: 'Trust Scores', path: '/admin/trust-scores', icon: <ShieldCheck size={20} />, permissions: ['can_manage_trust_scores'] },
                    { label: 'Équipe', path: '/admin/team', icon: <ShieldCheck size={20} />, permissions: ['can_manage_team'] },
                    { label: 'Secteurs d\'activité', path: '/admin/sectors', icon: <Layers size={20} />, permissions: ['can_manage_sectors'] },
                    { label: 'Mon profil', path: '/profile', icon: <User size={20} /> }, // Always visible
                ];

                // Filter based on permissions (super admin sees all)
                if (isSuperAdmin()) {
                    return allAdminItems;
                }

                return allAdminItems.filter(item => {
                    // No permission required = always show
                    if (!item.permissions || item.permissions.length === 0) return true;
                    // Check if user has AT LEAST ONE of the required permissions
                    return item.permissions.some(perm => hasPermission(perm));
                });
            }
            default:
                return [];
        }
    };

    const navItems = getNavItems();

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <Link to="/" className="sidebar-brand">
                    <img src="/logo.png" alt="AchatAvis" style={{ width: '220px', height: '100px' }} className="sidebar-logo-img" />
                </Link>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        onClick={handleLinkClick}
                        className={`sidebar-link ${(location.pathname === item.path || (item.path !== '/artisan' && item.path !== '/admin' && item.path !== '/guide' && location.pathname.startsWith(item.path + '/'))) ? 'active' : ''}`}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="user-profile-summary">
                    {user?.avatar_url ? (
                        <img src={getFileUrl(user.avatar_url)} alt={user.full_name} className="sidebar-avatar" />
                    ) : (
                        <div className="sidebar-avatar-placeholder">
                            {user?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="user-info">
                        <p className="user-email">{user?.email}</p>
                        <span className="user-role">{user?.role}</span>
                    </div>
                </div>
                <button onClick={() => logout()} className="logout-btn">
                    <LogOut size={16} />
                    <span>Se déconnecter</span>
                </button>
            </div>
        </aside>
    );
};
