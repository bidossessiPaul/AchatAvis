import React from 'react';
import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import './Layout.css';

interface TopBarProps {
    title?: string;
    onMenuClick: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ title, onMenuClick }) => {
    const { user } = useAuthStore();

    return (
        <header className="topbar">
            <div className="topbar-content">
                <div className="topbar-left">
                    <button className="mobile-menu-btn" onClick={onMenuClick}>
                        <Menu size={24} />
                    </button>
                    <h2 className="page-title">{title || 'Dashboard'}</h2>
                </div>

                <div className="topbar-actions">
                    {/* Region Display */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.75rem',
                        color: '#64748b',
                        background: '#f1f5f9',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '2rem'
                    }}>
                        <span style={{ fontSize: '1rem' }}>🌍</span>
                        <strong>{user?.last_detected_country || 'FR'}</strong>
                    </div>

                    <Link to="/profile" className="user-avatar-wrapper" title="Mon Profil">
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} alt={user.full_name} className="topbar-avatar" />
                        ) : (
                            <div className="user-avatar">
                                {user?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </Link>
                </div>
            </div>
        </header>
    );
};
