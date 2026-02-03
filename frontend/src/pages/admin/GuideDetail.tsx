import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminService } from '../../services/adminService';
import {
    Mail,
    Phone,
    MapPin,
    ArrowLeft,
    Trash2,
    CheckCircle,
    XCircle,
    ExternalLink,
    BarChart3,
    Shield,
    Briefcase,
    Smartphone,
    MessageCircle
} from 'lucide-react';
import { getFileUrl } from '../../utils/url';
import { motion, AnimatePresence } from 'framer-motion';
import { showConfirm, showSuccess, showError, showInput, showSelection, showPremiumWarningModal } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './AdminDetail.css';

interface Submission {
    id: string;
    created_at: string;
    artisan_name: string;
    artisan_id: string;
    fiche_name: string;
    order_id: string;
    earnings: number;
    status: string;
    proof_url: string;
}

interface GuideProfile {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    google_email: string;
    status: string;
    warning_count: number;
    created_at: string;
    last_seen: string | null;
    local_guide_level: number;
    total_reviews_count: number;
    phone: string;
    whatsapp_number: string;
    city: string;
}

interface GmailAccount {
    id: number;
    email: string;
    trust_score: number;
    account_level: string;
    total_reviews_posted: number;
    successful_reviews: number;
    last_review_posted_at: string | null;
    monthly_quota_limit?: number;
}

interface GuideStats {
    total_submissions: number;
    validated_count: number;
    total_earnings: number;
}

export const GuideDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<GuideProfile | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [stats, setStats] = useState<GuideStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([]);
    const [expandedHistory, setExpandedHistory] = useState<number | null>(null);
    const [gmailHistory, setGmailHistory] = useState<Record<number, any[]>>({});
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editFormData, setEditFormData] = useState<any>(null);


    useEffect(() => {
        if (id) loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await adminService.getGuideDetail(id!);
            setProfile(data.profile);
            setSubmissions(data.submissions);
            setGmailAccounts(data.gmail_accounts || []);
            setStats(data.stats);

            setEditFormData({
                full_name: data.profile.full_name,
                email: data.profile.email,
                google_email: data.profile.google_email,
                phone: data.profile.phone,
                city: data.profile.city,
                whatsapp_number: data.profile.whatsapp_number,
                local_guide_level: data.profile.local_guide_level,
                total_reviews_count: data.profile.total_reviews_count,
                password: ''
            });
        } catch (error) {
            showError('Erreur', 'Erreur lors du chargement des données');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!id || !editFormData) return;
        setIsSaving(true);
        try {
            await adminService.updateGuide(id, editFormData);
            showSuccess('Succès', 'Profil guide mis à jour avec succès');
            setIsEditing(false);
            loadData();
        } catch (error: any) {
            showError('Erreur', error.response?.data?.error || 'Erreur lors de la mise à jour');
        } finally {
            setIsSaving(false);
        }
    };

    const fetchGmailHistory = async (accountId: number) => {
        try {
            setGmailHistory(prev => ({ ...prev, [accountId]: [] }));
            const historyData = await adminService.getGmailAccountHistory(accountId);
            setGmailHistory(prev => ({ ...prev, [accountId]: historyData }));
        } catch (error) {
            showError('Erreur', "Erreur lors du chargement de l'historique Gmail");
            setGmailHistory(prev => ({ ...prev, [accountId]: [] }));
        }
    };

    const handleIssueWarning = async () => {
        if (!profile) return;
        try {
            const reasonsData = await adminService.getSuspensionReasons();
            const reasons = [...reasonsData.warnings, 'Autre (Saisie manuelle)'];

            const result = await showPremiumWarningModal(
                'Avertissement',
                `Envoyer un avertissement à ${profile.full_name}. Sélectionnez le motif :`,
                reasons
            );

            if (!result.isConfirmed || !result.value) return;

            let finalReason = result.value;

            if (finalReason === 'OTHER') {
                const manualInput = await showInput('Autre motif', 'Saisissez le motif de l\'avertissement :', 'Précisez la raison...');
                if (!manualInput.isConfirmed || !manualInput.value) return;
                finalReason = manualInput.value;
            }

            const response = await adminService.issueWarning(id!, finalReason);
            showSuccess('Succès', response.suspended ? 'Avertissement envoyé et compte suspendu !' : `Avertissement envoyé (${response.warningCount}/3).`);
            loadData();
        } catch (error) {
            showError('Erreur', "Erreur lors de l'envoi de l'avertissement");
        }
    };

    const handleStatusUpdate = async (newStatus: string) => {
        const action = newStatus === 'suspended' ? 'suspendre' : 'activer';
        const confirmResult = await showConfirm('Confirmation', `Voulez-vous vraiment ${action} ce compte ?`);
        if (!confirmResult.isConfirmed) return;

        try {
            let reason = '';
            if (newStatus === 'suspended') {
                const reasonsData = await adminService.getSuspensionReasons();
                const suspReasons = [...reasonsData.suspensions, 'Autre (Saisie manuelle)'];

                const selectionResult = await showSelection(
                    'Motif de suspension',
                    `Pourquoi souhaitez-vous suspendre ${profile?.full_name} ?`,
                    suspReasons
                );

                if (!selectionResult.isConfirmed || !selectionResult.value) return;

                reason = selectionResult.value;
                if (reason === 'Autre (Saisie manuelle)') {
                    const manualResult = await showInput('Autre motif', 'Saisissez le motif de la suspension :', 'Précisez la raison...');
                    if (!manualResult.isConfirmed || !manualResult.value) return;
                    reason = manualResult.value;
                }
            }

            await adminService.updateUserStatus(id!, newStatus, reason);
            showSuccess('Succès', 'Statut mis à jour');
            loadData();
        } catch (error) {
            showError('Erreur', 'Erreur lors de la mise à jour');
        }
    };

    if (isLoading) return (
        <DashboardLayout title="Détails Guide">
            <div className="admin-loading">
                <LoadingSpinner size="lg" text="Chargement du profil guide..." />
            </div>
        </DashboardLayout>
    );

    if (!profile || !stats) return (
        <DashboardLayout title="Détails Guide">
            <div className="admin-error">Guide non trouvé</div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout title={`Guide : ${profile.full_name}`}>
            <div className="admin-dashboard detail-page revamped">
                <button onClick={() => navigate('/admin/guides')} className="back-btn">
                    <ArrowLeft size={18} />
                    Retour à la liste
                </button>

                <header className="detail-header-section">
                    <div className="header-content-flex">
                        <div className="header-main-info">
                            <div className="header-icon-badge">
                                {profile.avatar_url ? (
                                    <img src={getFileUrl(profile.avatar_url)} alt={profile.full_name} className="header-avatar" />
                                ) : (
                                    <div className="header-avatar-placeholder">
                                        <Briefcase size={32} />
                                    </div>
                                )}
                            </div>
                            <div className="header-titles">
                                {isEditing ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <input
                                            type="text"
                                            value={editFormData.full_name}
                                            onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                                            className="form-input-premium h2-style"
                                            placeholder="Nom complet"
                                        />
                                        <input
                                            type="text"
                                            value={editFormData.google_email}
                                            onChange={(e) => setEditFormData({ ...editFormData, google_email: e.target.value })}
                                            className="form-input-premium"
                                            style={{ background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.85rem' }}
                                            placeholder="Email Google Principal"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <span className="header-subtitle">Local Guide • Niveau {profile.local_guide_level}</span>
                                        <h2 style={{ fontSize: '1.5rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            {profile.full_name}
                                            {(() => {
                                                if (!profile.last_seen) return null;
                                                const lastSeenDate = new Date(profile.last_seen);
                                                const now = new Date();
                                                const diffInMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
                                                if (diffInMinutes < 5) {
                                                    return (
                                                        <span
                                                            title="En ligne"
                                                            style={{
                                                                width: '12px',
                                                                height: '12px',
                                                                backgroundColor: '#10b981',
                                                                borderRadius: '50%',
                                                                display: 'inline-block',
                                                                boxShadow: '0 0 0 2px #fff, 0 0 8px #10b98177'
                                                            }}
                                                        />
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </h2>
                                        <p style={{ opacity: 0.6, fontSize: '0.85rem', fontWeight: 600, marginTop: '0.1rem' }}>{profile.google_email}</p>
                                    </>
                                )}

                                <div className="status-row">
                                    <span className={`premium-status-badge ${profile.status}`}>
                                        {profile.status}
                                    </span>
                                    {profile.warning_count > 0 && (
                                        <span className="premium-status-badge warning" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Shield size={14} />
                                            {profile.warning_count} Avertissement(s)
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="header-actions">
                            {isEditing ? (
                                <div className="button-group" style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        className="premium-action-btn primary"
                                        onClick={handleSave}
                                        style={{ background: '#10b981', padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? <LoadingSpinner size="sm" /> : <>Confirmer</>}
                                    </button>
                                    <button
                                        className="premium-action-btn"
                                        style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                                        onClick={() => setIsEditing(false)}
                                    >
                                        Annuler
                                    </button>
                                </div>
                            ) : (
                                <button
                                    className="premium-action-btn primary"
                                    onClick={() => setIsEditing(true)}
                                    style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                                >
                                    Modifier le profil
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                <div className="detail-content-layout">
                    <div className="detail-main-columns">
                        <div className="info-cards-masonry">
                            <div className="premium-card">
                                <h3><Mail size={20} /> Informations de contact</h3>
                                <div className="premium-info-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div className="premium-info-item">
                                        <div className="info-icon-box"><Mail size={16} /></div>
                                        <div className="info-content">
                                            <span className="info-label">Email de connexion</span>
                                            {isEditing ? (
                                                <input
                                                    type="email"
                                                    value={editFormData.email}
                                                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                                    className="form-input-premium"
                                                />
                                            ) : (
                                                <span className="info-value">{profile.email}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="premium-info-item">
                                        <div className="info-icon-box"><Phone size={16} /></div>
                                        <div className="info-content">
                                            <span className="info-label">Téléphone</span>
                                            {isEditing ? (
                                                <input
                                                    type="tel"
                                                    value={editFormData.phone}
                                                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                                    className="form-input-premium"
                                                />
                                            ) : (
                                                <span className="info-value">{profile.phone || 'Non renseigné'}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="premium-info-item">
                                        <div className="info-icon-box" style={{ background: '#25d366', color: 'white' }}><Smartphone size={16} /></div>
                                        <div className="info-content">
                                            <span className="info-label">WhatsApp</span>
                                            {isEditing ? (
                                                <input
                                                    type="tel"
                                                    value={editFormData.whatsapp_number}
                                                    onChange={(e) => setEditFormData({ ...editFormData, whatsapp_number: e.target.value })}
                                                    className="form-input-premium"
                                                    placeholder="+33..."
                                                />
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span className="info-value">{profile.whatsapp_number || 'Non renseigné'}</span>
                                                    {profile.whatsapp_number && (
                                                        <a
                                                            href={`https://wa.me/${profile.whatsapp_number.replace(/[\s.+-]/g, '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="info-value link"
                                                            title="Ouvrir dans WhatsApp"
                                                            style={{ color: '#25d366' }}
                                                        >
                                                            <MessageCircle size={14} />
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="premium-info-item">
                                        <div className="info-icon-box"><MapPin size={16} /></div>
                                        <div className="info-content">
                                            <span className="info-label">Ville de résidence</span>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editFormData.city}
                                                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                                                    className="form-input-premium"
                                                />
                                            ) : (
                                                <span className="info-value">{profile.city || 'Inconnue'}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="premium-card">
                                <h3><Shield size={20} /> Sécurité du compte</h3>
                                <div className="premium-info-list">
                                    <div className="premium-info-item">
                                        <div className="info-icon-box"><Shield size={16} /></div>
                                        <div className="info-content" style={{ width: '100%' }}>
                                            <span className="info-label">Mot de passe</span>
                                            {isEditing ? (
                                                <div style={{ width: '100%' }}>
                                                    <input
                                                        type="text"
                                                        value={editFormData.password}
                                                        onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                                                        className="form-input-premium"
                                                        placeholder="Nouveau mot de passe"
                                                    />
                                                    <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '6px', display: 'block', fontWeight: 600 }}>
                                                        Laissez vide pour conserver le mot de passe actuel.
                                                    </small>
                                                </div>
                                            ) : (
                                                <span className="info-value">••••••••••••</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="premium-card table-card">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 2rem 0' }}>
                                <h3 style={{ margin: 0 }}><BarChart3 size={20} /> Historique des contributions</h3>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>
                                    Sous-total: {submissions.length} missions
                                </span>
                            </div>
                            <div className="admin-table-wrapper" style={{ borderTop: 'none', marginTop: '1.5rem' }}>
                                <table className="premium-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Fiche</th>
                                            <th>Artisan</th>
                                            <th>Rémunération</th>
                                            <th>Statut</th>
                                            <th>Justificatif</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {submissions.length > 0 ? submissions.map(sub => (
                                            <tr key={sub.id}>
                                                <td>{new Date(sub.created_at).toLocaleDateString()}</td>
                                                <td>
                                                    <div
                                                        style={{
                                                            fontWeight: 800,
                                                            cursor: 'pointer',
                                                            color: '#374151',
                                                            textDecoration: 'underline',
                                                            textUnderlineOffset: '2px',
                                                            maxWidth: '200px',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}
                                                        onClick={() => navigate(`/admin/fiches/${sub.order_id}`)}
                                                        title={sub.fiche_name}
                                                    >
                                                        {sub.fiche_name}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div
                                                        style={{
                                                            fontWeight: 800,
                                                            cursor: 'pointer',
                                                            color: '#111827',
                                                            textDecoration: 'underline',
                                                            textUnderlineOffset: '2px',
                                                            maxWidth: '180px',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}
                                                        onClick={() => navigate(`/admin/artisans/${sub.artisan_id}`)}
                                                        title={sub.artisan_name}
                                                    >
                                                        {sub.artisan_name}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span style={{ color: '#10b981', fontWeight: 800 }}>+{Number(sub.earnings).toFixed(2)}€</span>
                                                </td>
                                                <td>
                                                    <span className={`premium-status-badge ${sub.status}`}>
                                                        {sub.status === 'validated' ? 'Validé' : sub.status === 'pending' ? 'En attente' : 'Refusé'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <a href={sub.proof_url} target="_blank" rel="noopener noreferrer" className="info-value link">
                                                        <ExternalLink size={14} /> Voir la preuve
                                                    </a>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={6} className="text-center" style={{ padding: '3rem', color: '#94a3b8' }}>Aucune contribution enregistrée</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="premium-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fdfcfd 100%)', marginTop: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Shield size={22} color="#6366f1" />
                                    <h3 style={{ margin: 0 }}>Comptes Gmail Local Guide</h3>
                                </div>
                                <span className="premium-status-badge active" style={{ fontSize: '0.75rem' }}>
                                    {gmailAccounts.length} comptes actifs
                                </span>
                            </div>

                            <div style={{
                                maxHeight: '450px',
                                overflowY: 'auto',
                                paddingRight: '0.75rem',
                                scrollbarWidth: 'thin',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                                gap: '1.25rem'
                            }}>
                                {gmailAccounts.length > 0 ? gmailAccounts.map(account => (
                                    <div key={account.id} className="gmail-admin-card" style={{
                                        padding: '1.25rem',
                                        borderRadius: '20px',
                                        background: 'white',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div className="info-icon-box" style={{ background: '#f5f3ff', color: '#6366f1' }}>
                                                    <Mail size={18} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1rem' }}>{account.email}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.2rem' }}>
                                                        <span>Trust: <strong>{account.trust_score}%</strong></span>
                                                        <span>•</span>
                                                        <span>Lvl: <strong>{account.account_level}</strong></span>
                                                        <span>•</span>
                                                        <span>Quota: <strong>{account.monthly_quota_limit || 20}</strong>/mois</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '12px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Posted</div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b' }}>{account.total_reviews_posted}</div>
                                            </div>
                                            <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '12px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 800, textTransform: 'uppercase' }}>Success</div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#16a34a' }}>{account.successful_reviews}</div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={async () => {
                                                if (expandedHistory === account.id) {
                                                    setExpandedHistory(null);
                                                } else {
                                                    setExpandedHistory(account.id);
                                                    if (!gmailHistory[account.id]) {
                                                        await fetchGmailHistory(account.id);
                                                    }
                                                }
                                            }}
                                            className="premium-action-btn"
                                            style={{
                                                fontSize: '0.85rem',
                                                padding: '0.75rem',
                                                background: expandedHistory === account.id ? '#1e293b' : '#f1f5f9',
                                                color: expandedHistory === account.id ? 'white' : '#1e293b',
                                                width: '100%'
                                            }}
                                        >
                                            <BarChart3 size={16} />
                                            {expandedHistory === account.id ? "Masquer l'audit" : "Auditer l'activité"}
                                        </button>

                                        <AnimatePresence>
                                            {expandedHistory === account.id && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    style={{ overflow: 'hidden' }}
                                                >
                                                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                                                        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, margin: '0 0 1rem 0', color: '#64748b' }}>Dernières publications :</h4>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                            {!gmailHistory[account.id] ? (
                                                                <div style={{ textAlign: 'center', padding: '1rem' }}><LoadingSpinner size="sm" /></div>
                                                            ) : gmailHistory[account.id].length === 0 ? (
                                                                <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Aucune activité récente.</div>
                                                            ) : gmailHistory[account.id].map((h: any) => (
                                                                <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                                    <div>
                                                                        <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>{h.artisan_company}</div>
                                                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(h.submitted_at).toLocaleDateString()}</div>
                                                                    </div>
                                                                    <span className={`premium-status-badge ${h.status}`} style={{ fontSize: '0.65rem', padding: '0.25rem 0.5rem' }}>{h.status}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )) : (
                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', background: '#f8fafc', borderRadius: '24px', color: '#94a3b8', fontStyle: 'italic' }}>
                                        <Mail size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                        <p>Aucun compte Gmail enregistré pour ce guide.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="detail-sidebar-sticky">
                        <div className="premium-card highlight">
                            <h3>Activité financière</h3>
                            <div className="stats-premium-grid">
                                <div className="stat-premium-item" style={{ background: '#f5f3ff' }}>
                                    <span className="stat-p-value">{stats.validated_count}</span>
                                    <span className="stat-p-label">Avis payés</span>
                                </div>
                                <div className="stat-premium-item" style={{ background: '#ecfdf5' }}>
                                    <span className="stat-p-value" style={{ color: '#059669' }}>{Number(stats.total_earnings || 0).toFixed(2)}€</span>
                                    <span className="stat-p-label">Total généré</span>
                                </div>
                            </div>
                        </div>

                        <div className="premium-card">
                            <h3>Contrôle du compte</h3>
                            <div className="action-premium-stack" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {profile.status === 'active' ? (
                                    <button onClick={() => handleStatusUpdate('suspended')} className="premium-action-btn suspend">
                                        <XCircle size={18} />
                                        Suspendre l'accès
                                    </button>
                                ) : (
                                    <button onClick={() => handleStatusUpdate('active')} className="premium-action-btn activate">
                                        <CheckCircle size={18} />
                                        Réactiver le compte
                                    </button>
                                )}
                                <button onClick={handleIssueWarning} className="premium-action-btn warn">
                                    <Shield size={18} />
                                    Notifier un avertissement
                                </button>
                                <button onClick={() => showError('Attention', 'La suppression définitive est irréversible.')} className="premium-action-btn delete" >
                                    <Trash2 size={18} />
                                    Supprimer du registre
                                </button>
                            </div>
                        </div>

                        <div className="premium-card" style={{ background: '#f1f5f9', border: 'none' }}>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                <Shield size={18} color="#64748b" style={{ marginTop: '0.2rem' }} />
                                <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569', marginBottom: '0.4rem' }}>Sécurité & Conformité</div>
                                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                                        Toutes les actions administratives sur ce profil sont journalisées dans l'audit de sécurité.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};
