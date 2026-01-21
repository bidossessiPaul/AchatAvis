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

import { GmailHistoryTable } from '../../components/AntiDetection/GmailHistoryTable';

interface Submission {
    id: string;
    artisan_company: string;
    review_url: string;
    google_email: string;
    status: 'pending' | 'validated' | 'rejected';
    earnings: number;
    submitted_at: string;
    sector_id: number;
    sector_name: string;
    sector_icon: string;
}

export const Submissions: React.FC = () => {
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
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

    if (isLoading) {
        return (
            <DashboardLayout title="Mes Contributions">
                <div className="loading-container">
                    <div className="spinner" />
                </div>
            </DashboardLayout>
        );
    }

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
                        <strong>Note sur la validation :</strong> Les gains sont définitivement validés <strong>une semaine</strong> après la publication de l'avis.
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
                    <div className="card-header" style={{ marginBottom: '1.5rem' }}>
                        <div>
                            <h2 className="card-title">Historique des contributions</h2>
                            <p className="card-subtitle">
                                Retrouvez le détail de vos avis soumis avec filtrage par secteur et artisan.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/guide')}
                            className="browse-btn"
                            style={{ padding: '0.6rem 1.2rem', borderRadius: '0.75rem', fontSize: '0.875rem' }}
                        >
                            Nouvelle fiche
                        </button>
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
                                Voir les fiches disponibles
                            </button>
                        </div>
                    ) : (
                        <GmailHistoryTable history={submissions} />
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

