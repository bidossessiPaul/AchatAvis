import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Star,
    CreditCard,
    Settings,
    MapPin,
    DollarSign,
    User,
    Users,
    FileCheck,
    Shield,
    LogOut
} from 'lucide-react';
import './Layout.css';

interface NavItem {
    label: string;
    path: string;
    icon: React.ReactNode;
}

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const { user, logout } = useAuthStore();
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
                    { label: 'Commander des avis', path: '/artisan/order', icon: <ShoppingCart size={20} /> },
                    { label: 'Mes commandes', path: '/artisan/orders', icon: <Package size={20} /> },
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
                    { label: 'Mon profil', path: '/profile', icon: <User size={20} /> },
                ];
            case 'admin':
                return [
                    { label: 'Vue d\'ensemble', path: '/admin', icon: <LayoutDashboard size={20} /> },
                    { label: 'Artisans', path: '/admin/artisans', icon: <Users size={20} /> },
                    { label: 'Local Guides', path: '/admin/guides', icon: <MapPin size={20} /> },
                    { label: 'Abonnements', path: '/admin/subscriptions', icon: <CreditCard size={20} /> },
                    { label: 'Gestion des Packs', path: '/admin/packs', icon: <Package size={20} /> },
                    { label: 'Validation Avis', path: '/admin/reviews', icon: <FileCheck size={20} /> },
                    { label: 'Paiements', path: '/admin/payments', icon: <DollarSign size={20} /> },
                    { label: 'Logs & Système', path: '/admin/logs', icon: <Shield size={20} /> },
                    { label: 'Mon profil', path: '/profile', icon: <User size={20} /> },
                ];
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
