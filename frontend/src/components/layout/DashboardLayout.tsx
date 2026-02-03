import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useAuthStore } from '../../context/authStore';
import { useNotifications } from '../../hooks/useNotifications';
import { WhatsAppModal } from '../common/WhatsAppModal';
import { AlertCircle } from 'lucide-react';
import './Layout.css';

interface DashboardLayoutProps {
    children: React.ReactNode;
    title?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title }) => {
    const { user } = useAuthStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    useNotifications(); // Initialize real-time connection

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    return (
        <div className={`dashboard-layout ${user?.role === 'guide' ? 'theme-guide' : user?.role === 'artisan' ? 'theme-artisan' : ''}`}>
            <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div className="sidebar-overlay" onClick={closeSidebar} />
            )}

            <div className="main-content">
                <TopBar title={title} onMenuClick={toggleSidebar} />
                <main className="page-content">
                    {user?.role === 'artisan' && !user?.whatsapp_number && (
                        <div className="whatsapp-alert" style={{
                            background: '#fff7ed',
                            border: '1px solid #ffedd5',
                            borderRadius: '12px',
                            padding: '1rem',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ background: '#f97316', padding: '0.5rem', borderRadius: '8px', color: 'white' }}>
                                <AlertCircle size={20} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#9a3412', fontWeight: 600 }}>Numéro WhatsApp manquant</h4>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#b45309' }}>Veuillez ajouter votre numéro WhatsApp pour recevoir les notifications de vos campagnes.</p>
                            </div>
                        </div>
                    )}
                    {children}
                </main>
                <WhatsAppModal />
            </div>
        </div>
    );
};
