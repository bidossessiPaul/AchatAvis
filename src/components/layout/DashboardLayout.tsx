import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useAuthStore } from '../../context/authStore';
import { useNotifications } from '../../hooks/useNotifications';
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
                    {children}
                </main>
            </div>
        </div>
    );
};
