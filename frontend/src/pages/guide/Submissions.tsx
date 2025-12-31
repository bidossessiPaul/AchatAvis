import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { guideService } from '../../services/guideService';
import {
    Star,
    ExternalLink,
    CheckCircle2,
    Clock,
    AlertCircle,
    Calendar,
    Mail,
    DollarSign
} from 'lucide-react';
import './Submissions.css';

interface Submission {
    id: string;
    artisan_company: string;
    review_url: string;
    google_email: string;
    status: 'pending' | 'validated' | 'rejected';
    earnings: number;
    submitted_at: string;
}

export const Submissions: React.FC = () => {
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [filter, setFilter] = useState<'all' | 'pending' | 'validated' | 'rejected'>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadSubmissions();
    }, []);

    const loadSubmissions = async () => {
        setIsLoading(true);
        try {
            const data = await guideService.getSubmissions();
            setSubmissions(data);
        } catch (err: any) {
            console.error("Failed to load submissions", err);
            setError("Impossible de charger vos contributions.");
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'validated':
                return { bg: '#ecfdf5', color: '#065f46', icon: <CheckCircle2 size={16} /> };
            case 'rejected':
                return { bg: '#fef2f2', color: '#991b1b', icon: <AlertCircle size={16} /> };
            default:
                return { bg: '#fffbeb', color: '#92400e', icon: <Clock size={16} /> };
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'validated': return 'Validé';
            case 'rejected': return 'Rejeté';
            default: return 'En attente';
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout title="Mes Contributions">
                <div className="loading-container">
                    <div className="spinner" />
                </div>
            </DashboardLayout>
        );
    }

    const filteredSubmissions = submissions.filter(sub => {
        if (filter === 'all') return true;
        return sub.status === filter;
    });

    const totalEarnings = submissions.reduce((acc: number, sub: Submission) => sub.status === 'validated' ? acc + (Number(sub.earnings) || 0) : acc, 0);
    const pendingEarnings = submissions.reduce((acc: number, sub: Submission) => sub.status === 'pending' ? acc + (Number(sub.earnings) || 0) : acc, 0);
    const validatedCount = submissions.filter((s: Submission) => s.status === 'validated').length;

    return (
        <DashboardLayout title="Mes Contributions">
            <div className="submissions-page">
                {/* Info Banner */}
                <div className="submissions-info-banner">
                    <AlertCircle size={20} />
                    <p>
                        <strong>Note sur la validation :</strong> Les gains sont définitivement validés <strong>une semaine</strong> après la publication de l'avis, sous réserve que Google n'ait pas supprimé votre contribution d'ici là.
                    </p>
                </div>

                {/* Stats Section */}
                <div className="submissions-stats">
                    <div className="stat-card earnings">
                        <div className="stat-icon-wrapper">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className="stat-label">Gains validés</p>
                            <h3 className="stat-value">{Number(totalEarnings).toFixed(2)} €</h3>
                        </div>
                    </div>
                    <div className="stat-card pending-stats">
                        <div className="stat-icon-wrapper">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="stat-label">Gains en attente</p>
                            <h3 className="stat-value">{Number(pendingEarnings).toFixed(2)} €</h3>
                        </div>
                    </div>
                    <div className="stat-card count">
                        <div className="stat-icon-wrapper">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <p className="stat-label">Avis validés</p>
                            <h3 className="stat-value">{validatedCount}</h3>
                        </div>
                    </div>
                </div>

                <div className="submissions-main-card">
                    <div className="card-header">
                        <div>
                            <h2 className="card-title">Historique des contributions</h2>
                            <p className="card-subtitle">
                                Retrouvez le détail de vos avis soumis et suivez l'évolution de vos gains.
                            </p>
                        </div>

                        <div className="submissions-filters">
                            <button
                                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                                onClick={() => setFilter('all')}
                            >
                                Tous
                            </button>
                            <button
                                className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
                                onClick={() => setFilter('pending')}
                            >
                                En attente
                            </button>
                            <button
                                className={`filter-btn ${filter === 'validated' ? 'active' : ''}`}
                                onClick={() => setFilter('validated')}
                            >
                                Validés
                            </button>
                            <button
                                className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`}
                                onClick={() => setFilter('rejected')}
                            >
                                Rejetés
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="error-state">
                            <AlertCircle size={40} />
                            <p>{error}</p>
                            <button onClick={loadSubmissions} className="retry-btn">
                                Réessayer
                            </button>
                        </div>
                    )}

                    {!error && submissions.length === 0 ? (
                        <div className="empty-state">
                            <Star size={48} className="empty-icon" />
                            <p className="empty-text">Vous n'avez pas encore posté d'avis.</p>
                            <button onClick={() => navigate('/guide')} className="browse-btn">
                                Voir les missions disponibles
                            </button>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="modern-table">
                                <thead>
                                    <tr>
                                        <th>Entreprise</th>
                                        <th>Compte Google</th>
                                        <th>Date</th>
                                        <th>Statut</th>
                                        <th className="text-right">Gains</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSubmissions.map((sub: Submission) => {
                                        const statusStyle = getStatusStyle(sub.status);
                                        return (
                                            <tr key={sub.id}>
                                                <td className="company-column">
                                                    <span className="company-name">{sub.artisan_company}</span>
                                                </td>
                                                <td className="email-column">
                                                    <div className="info-with-icon">
                                                        <Mail size={14} /> {sub.google_email}
                                                    </div>
                                                </td>
                                                <td className="date-column">
                                                    <div className="info-with-icon">
                                                        <Calendar size={14} /> {new Date(sub.submitted_at).toLocaleDateString('fr-FR')}
                                                    </div>
                                                </td>
                                                <td className="status-column">
                                                    <span className={`status-badge ${sub.status}`}>
                                                        {statusStyle.icon}
                                                        {getStatusLabel(sub.status)}
                                                    </span>
                                                </td>
                                                <td className="earnings-column text-right">
                                                    <span className={`earnings-amount ${sub.status === 'validated' ? 'success' : ''}`}>
                                                        {Number(sub.earnings || 0).toFixed(2)} €
                                                    </span>
                                                </td>
                                                <td className="actions-column text-center">
                                                    <a
                                                        href={sub.review_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="action-link"
                                                        title="Voir la preuve"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </a>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};
