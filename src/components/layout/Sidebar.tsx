import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import {
    LayoutDashboard,
    Package,
    Star,
    CreditCard,
    Settings,
    MapPin,
    DollarSign,
    User,
    Users,
    Building2,
    FileCheck,
    Briefcase,
    ShieldCheck,
    LogOut,
    Mail,
    Shield
} from 'lucide-react';
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
                    { label: 'Mes établissements', path: '/artisan/establishments', icon: <Building2 size={20} /> },
                    { label: 'Avis reçus', path: '/artisan/reviews', icon: <Star size={20} /> },
                    { label: 'Facturation', path: '/artisan/billing', icon: <CreditCard size={20} /> },
                    { label: 'Mon profil', path: '/profile', icon: <User size={20} /> },
                    { label: 'Paramètres', path: '/artisan/settings', icon: <Settings size={20} /> },
                ];
            case 'guide':
                return [
                    { label: 'Missions', path: '/guide', icon: <MapPin size={20} /> },
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
                    { label: 'Gestion des Packs', path: '/admin/packs', icon: <Package size={20} />, permissions: ['can_view_payments'] },
                    { label: 'Validation Avis', path: '/admin/reviews', icon: <FileCheck size={20} />, permissions: ['can_manage_reviews', 'can_validate_reviews'] },
                    { label: 'Établissements', path: '/admin/establishments', icon: <Building2 size={20} />, permissions: ['can_manage_reviews', 'can_validate_reviews'] },
                    { label: 'Missions', path: '/admin/missions', icon: <Briefcase size={20} />, permissions: ['can_manage_missions', 'can_validate_missions'] },
                    { label: 'Paiements', path: '/admin/payments', icon: <DollarSign size={20} />, permissions: ['can_view_payments'] },
                    { label: 'Gestion Suspensions', path: '/admin/suspensions', icon: <Shield size={20} />, permissions: ['can_manage_users', 'super_admin'] },
                    { label: 'Équipe', path: '/admin/team', icon: <ShieldCheck size={20} />, permissions: ['super_admin'] },
                    // { label: 'Logs & Système', path: '/admin/logs', icon: <Shield size={20} />, permissions: ['can_view_stats'] },
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
                    Achat<span className="text-brand">Avis</span>
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
                        <img src={user.avatar_url} alt={user.full_name} className="sidebar-avatar" />
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
