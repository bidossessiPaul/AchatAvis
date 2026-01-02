import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminApi } from '../../services/api';
import './AdminLists.css';
import { Shield, ChevronLeft, ChevronRight, Activity } from 'lucide-react';

interface AdminLog {
    id: number;
    admin_id: number;
    action: string;
    target_type: string;
    target_id?: number;
    details?: any;
    ip_address?: string;
    created_at: string;
    admin_name?: string;
    admin_email?: string;
}

export const AdminLogs: React.FC = () => {
    const [logs, setLogs] = useState<AdminLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 50;
    const totalPages = Math.ceil(total / limit);

    useEffect(() => {
        fetchLogs();
    }, [page]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await adminApi.getLogs(page);
            setLogs(data.logs);
            setTotal(data.total);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getActionBadgeColor = (action: string) => {
        if (action.includes('DELETE') || action.includes('REVOKE')) return 'bg-red-100 text-red-800';
        if (action.includes('UPDATE')) return 'bg-yellow-100 text-yellow-800';
        if (action.includes('INVITE') || action.includes('CREATE')) return 'bg-green-100 text-green-800';
        return 'bg-gray-100 text-gray-800';
    };

    return (
        <DashboardLayout title="Logs & Système">
            <div className="admin-dashboard revamped">
                <div className="admin-main-card">
                    <div className="admin-card-header">
                        <h2 className="card-title">
                            <Shield size={24} className="text-brand mr-2" />
                            Activité Système
                        </h2>
                        <div className="admin-controls">
                            <button
                                className="btn-next"
                                onClick={fetchLogs}
                                disabled={loading}
                            >
                                <Activity size={18} />
                                Actualiser
                            </button>
                        </div>
                    </div>

                    <div className="admin-table-container">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">Chargement...</div>
                        ) : (
                            <table className="admin-modern-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Admin</th>
                                        <th>Action</th>
                                        <th>Cible</th>
                                        <th>Détails</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id}>
                                            <td className="whitespace-nowrap text-gray-500">
                                                {formatDate(log.created_at)}
                                            </td>
                                            <td>
                                                <div className="font-medium text-gray-900">{log.admin_name || 'Système'}</div>
                                                <div className="text-xs text-gray-500">{log.admin_email}</div>
                                            </td>
                                            <td>
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${getActionBadgeColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="text-sm font-medium">{log.target_type}</div>
                                                {log.target_id && <div className="text-xs text-gray-400">ID: {log.target_id}</div>}
                                            </td>
                                            <td className="max-w-xs truncate text-xs font-mono text-gray-600" title={JSON.stringify(log.details, null, 2)}>
                                                {JSON.stringify(log.details)}
                                            </td>
                                        </tr>
                                    ))}
                                    {logs.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="text-center py-8 text-gray-500">
                                                Aucun log enregistré.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="flex justify-between items-center mt-6">
                        <span className="text-sm text-gray-500">
                            Page {page} sur {Math.max(1, totalPages)}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                className="action-btn"
                                disabled={page === 1 || loading}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                className="action-btn"
                                disabled={page >= totalPages || loading}
                                onClick={() => setPage(p => p + 1)}
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};
