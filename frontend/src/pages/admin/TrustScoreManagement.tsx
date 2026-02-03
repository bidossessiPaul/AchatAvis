import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { trustScoreService } from '../../services/trustScoreService';
import {
    Search,
    Edit3,
    Shield,
    XCircle
} from 'lucide-react';
import { showSuccess, showError } from '../../utils/Swal';
import Swal from 'sweetalert2';
import '../admin/AdminLists.css';

interface TrustAccount {
    id: number;
    email: string;
    trust_score?: number;
    trust_score_value: number;
    trust_level: string;
    google_maps_profile_url: string | null;
    phone_verified: boolean;
    is_active: number; // 0 or 1
    monthly_reviews_posted: number;
    monthly_quota_limit: number;
    sector_activity_log: any;
}

export const TrustScoreManagement: React.FC = () => {
    const [accounts, setAccounts] = useState<TrustAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [levelFilter, setLevelFilter] = useState('');

    useEffect(() => {
        loadAccounts();
    }, [levelFilter]);

    const loadAccounts = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const data = await trustScoreService.getAccounts({
                level: levelFilter || undefined,
                search: searchTerm || undefined
            });
            setAccounts(data);
        } catch (error) {
            showError('Erreur', 'Erreur lors du chargement des scores');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadAccounts();
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'PLATINUM': return '#8b5cf6';
            case 'GOLD': return '#3b82f6';
            case 'SILVER': return '#10b981';
            case 'BRONZE': return '#f59e0b';
            case 'BLOCKED': return '#ef4444';
            default: return '#64748b';
        }
    };



    const handleOverride = async (account: TrustAccount) => {
        const { value: formValues } = await Swal.fire({
            title: '<div style="font-size: 1.5rem; font-weight: 800; color: #1e293b;">Modifier le Trust Score</div>',
            html: `
                <div style="text-align: left; padding: 0.5rem;">
                    <div style="background: #f8fafc; padding: 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; margin-bottom: 1.5rem;">
                        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                            <div style="flex: 1;">
                                <label style="display: block; font-size: 0.875rem; color: #64748b; font-weight: 600; margin-bottom: 0.5rem;">Niveau de Confiance</label>
                                <select id="swal-level" class="swal2-input" style="margin: 0; width: 100%; font-size: 0.95rem; border-color: #cbd5e1; height: 42px;">
                                    <option value="BLOCKED" ${account.trust_level === 'BLOCKED' ? 'selected' : ''}>🔴 BLOQUÉ (0-20%)</option>
                                    <option value="BRONZE" ${account.trust_level === 'BRONZE' ? 'selected' : ''}>🟡 BRONZE (21-40%)</option>
                                    <option value="SILVER" ${account.trust_level === 'SILVER' ? 'selected' : ''}>🟢 ARGENT (41-70%)</option>
                                    <option value="GOLD" ${account.trust_level === 'GOLD' ? 'selected' : ''}>🔵 OR (71-90%)</option>
                                    <option value="PLATINUM" ${account.trust_level === 'PLATINUM' ? 'selected' : ''}>🟣 PLATINE (91-100%)</option>
                                </select>
                            </div>
                            <div style="width: 120px;">
                                <label style="display: block; font-size: 0.875rem; color: #64748b; font-weight: 600; margin-bottom: 0.5rem;">Score (0-100)</label>
                                <input id="swal-score" type="number" class="swal2-input" value="${account.trust_score_value}" min="0" max="100" style="margin: 0; width: 100%; font-size: 0.95rem; border-color: #cbd5e1; height: 42px;">
                            </div>
                        </div>
                        <div style="font-size: 0.75rem; color: #94a3b8; display: flex; align-items: center; gap: 6px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                            Le score s'adaptera automatiquement au niveau si inchangé.
                        </div>
                    </div>

                    <div style="margin-top: 1rem;">
                        <label style="display: block; font-size: 0.875rem; color: #64748b; font-weight: 600; margin-bottom: 0.5rem;">Note Administration (Interne)</label>
                        <textarea id="swal-notes" class="swal2-textarea" style="margin: 0; width: 100%; height: 100px; font-size: 0.9rem; border-color: #cbd5e1; padding: 0.75rem placeholder="Raison de la modification, détails sur le compte...""></textarea>
                    </div>
                </div>
            `,
            width: 500,
            showCloseButton: true,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Enregistrer',
            cancelButtonText: 'Annuler',
            confirmButtonColor: '#0ea5e9',
            cancelButtonColor: '#94a3b8',
            preConfirm: () => {
                return {
                    trustScore: (document.getElementById('swal-score') as HTMLInputElement).value,
                    trustLevel: (document.getElementById('swal-level') as HTMLSelectElement).value,
                    adminNotes: (document.getElementById('swal-notes') as HTMLTextAreaElement).value
                }
            }
        });

        if (formValues) {
            try {
                // If user didn't change the score input, send undefined/null so backend auto-calculates based on level
                // But Swal returns the value as string. We need to check if it was touched or we can rely on backend logic always updating if level changes?
                // The prompt shows current value. If user changes level but leaves score as is, we might want to update it.
                // Let's pass the score as is for now, the backend logic I added handles "if trustLevel && trustScore === undefined". 
                // But here I'm passing a value. 
                // Wait, the backend logic I wrote earlier: `if (trustLevel && trustScore === undefined)`. 
                // If I pass `trustScore` from the input, it will be defined.
                // So I should only pass `trustScore` if the user *explicitly* wants to set a specific number that differs from the default?
                // Actually, the user requirement "change aussi la valeur de score en fonction de la status" suggests automation.
                // Maybe I should hide the score input or make it optional?
                // Or better: clear the score input when level changes? Impossible in Swal HTML string easily.

                // Let's send the value from the input. Wait, looking at my backend change:
                // `if (trustLevel && trustScore === undefined) { autoScore... } else if (trustScore !== undefined) { use it }`
                // So if I send a score, it uses it.
                // The user wants: "cote admin au changement de la status, change aussi la valeur de score en fonction de la status".
                // This implies if I select "GOLD", the score should become e.g. 75. 
                // But in the modal, the score input is pre-filled with the *current* score.
                // If I change the dropdown to GOLD, the input value `75` won't magically appear in the Swal HTML unless I add JS listeners which is hard in Swal.
                // Alternative: I can decide in the onSubmit here. 
                // If the manually entered score is the *same* as the *old* score, BUT the level has changed, 
                // then I should probably let the backend decide (send undefined for score).
                // BUT maybe the user WANTS to keep the old score?
                // Given the request, automation is preferred.

                const newLevel = formValues.trustLevel;
                const newScore = parseInt(formValues.trustScore);


                // If level changed, let's auto-set the score to the standard for that level
                // UNLESS the user explicitly typed a different score? 
                // Simplest approach satisfying the request: 
                // In this frontend code, we don't know if the user typed or not easily. 
                // I will pass `trustScore` as `undefined` if I detect that the intention is just to change status.
                // How? I can't easily.

                // BETTER FIX: I'll rely on the user to manually change the score OR 
                // I will implement a "Smart Update" in the backend. 
                // Actually, the user said "change aussi la valeur".
                // If I send BOTH, my backend uses the sent score.
                // I'll update this frontend to NOT send the score if it matches the ORIGINAL score AND the level changed.
                // This implies "I want to change the level, please update the score accordingly".

                let finalScoreToSend: number | undefined = newScore;
                if (newLevel !== account.trust_level && newScore === account.trust_score_value) {
                    finalScoreToSend = undefined; // Trigger backend auto-calculation
                }

                await trustScoreService.overrideTrustScore(account.id, {
                    trustScore: finalScoreToSend,
                    trustLevel: newLevel,
                    adminNotes: formValues.adminNotes
                });
                showSuccess('Mis à jour', 'Les modifications ont été enregistrées.');
                loadAccounts(true);
            } catch (error) {
                showError('Erreur', 'Erreur lors de la mise à jour');
            }
        }
    };

    const handleShowSectorActivity = (account: TrustAccount) => {
        let activityLog: any = {};
        try {
            activityLog = typeof account.sector_activity_log === 'string'
                ? JSON.parse(account.sector_activity_log)
                : account.sector_activity_log || {};
        } catch (e) {
            activityLog = {};
        }

        const sectors = Object.keys(activityLog);

        if (sectors.length === 0) {
            Swal.fire({
                title: 'Activité par secteur',
                text: 'Aucune activité enregistrée pour ce compte.',
                icon: 'info',
                confirmButtonColor: '#0ea5e9',
            });
            return;
        }

        const activityHtml = `
            <div style="text-align: left; padding: 1.5rem; background: #fff; border-radius: 12px;">
                <div style="margin-bottom: 20px; border-left: 4px solid #0ea5e9; padding-left: 12px;">
                    <h3 style="margin: 0; color: #1e293b; font-size: 1.1rem; font-weight: 800;">Historique d'Activité</h3>
                    <p style="margin: 4px 0 0; color: #64748b; font-size: 0.85rem;">Répartition des avis postés par secteur d'activité.</p>
                </div>
                <table style="width: 100%; border-collapse: separate; border-spacing: 0 8px;">
                    <thead>
                        <tr>
                            <th style="padding: 0 12px 8px; text-align: left; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">Secteur</th>
                            <th style="padding: 0 12px 8px; text-align: center; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">Avis</th>
                            <th style="padding: 0 12px 8px; text-align: right; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">Dernier Post</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sectors.map(slug => {
            const data = activityLog[slug];
            const lastDate = data.last_posted ? new Date(data.last_posted).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '-';
            const percentage = Math.min(100, (data.count_this_month / 5) * 100);
            return `
                                <tr style="background: #f8fafc; transition: transform 0.2s;">
                                    <td style="padding: 12px; border-radius: 8px 0 0 8px;">
                                        <div style="font-weight: 700; color: #1e293b; text-transform: capitalize; font-size: 0.95rem;">${slug.replace(/-/g, ' ')}</div>
                                    </td>
                                    <td style="padding: 12px; text-align: center;">
                                        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                                            <span style="color: #0ea5e9; font-weight: 800; font-size: 1.1rem;">${data.count_this_month || 0}</span>
                                            <div style="width: 40px; height: 3px; background: #e2e8f0; border-radius: 2px; overflow: hidden;">
                                                <div style="width: ${percentage}%; height: 100%; background: #0ea5e9;"></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style="padding: 12px; text-align: right; border-radius: 0 8px 8px 0;">
                                        <span style="color: #64748b; font-size: 0.85rem; font-weight: 500;">${lastDate}</span>
                                    </td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        Swal.fire({
            title: `<div style="font-family: 'Inter', sans-serif; font-weight: 800; color: #1e293b; padding-top: 10px;">${account.email}</div>`,
            html: activityHtml,
            width: 550,
            showCloseButton: true,
            confirmButtonText: 'Fermer',
            confirmButtonColor: '#0ea5e9',
        });
    };

    const formatLastActive = (account: TrustAccount) => {
        let activityLog: any = {};
        try {
            activityLog = typeof account.sector_activity_log === 'string'
                ? JSON.parse(account.sector_activity_log)
                : account.sector_activity_log || {};
        } catch (e) {
            activityLog = {};
        }

        const dates = Object.values(activityLog)
            .map((data: any) => data.last_posted)
            .filter(date => !!date)
            .map(date => new Date(date).getTime());

        if (dates.length === 0) return 'Jamais';

        const lastDate = new Date(Math.max(...dates));
        const diffDays = Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 3600 * 24));

        if (diffDays === 0) return "Aujourd'hui";
        if (diffDays === 1) return 'Hier';
        return `Il y a ${diffDays} j.`;
    };

    return (
        <DashboardLayout title="Gestion du Trust Score">
            <div className="admin-dashboard revamped" style={{ padding: '1.5rem', background: '#f0f4f8', minHeight: '100vh' }}>
                <div className="admin-main-card" style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.8)',
                    borderRadius: '32px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.04)',
                    padding: '2rem'
                }}>
                    <div className="admin-card-header" style={{ padding: '0 0 2rem', borderBottom: '1px solid #eef2f6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{
                                background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
                                width: '56px',
                                height: '56px',
                                borderRadius: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 8px 16px rgba(14, 165, 233, 0.25)',
                                transform: 'rotate(-5deg)'
                            }}>
                                <Shield color="#fff" size={28} />
                            </div>
                            <div>
                                <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>Elite Trust Monitor</h1>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></div>
                                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>{accounts.length} comptes actifs sous haute surveillance</p>
                                </div>
                            </div>
                        </div>
                        <div className="admin-controls" style={{ display: 'flex', gap: '1.25rem' }}>
                            <div style={{ position: 'relative' }}>
                                <select
                                    className="admin-select"
                                    value={levelFilter}
                                    onChange={(e) => setLevelFilter(e.target.value)}
                                    style={{
                                        padding: '0.75rem 2.75rem 0.75rem 1.25rem',
                                        borderRadius: '16px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '0.9rem',
                                        fontWeight: 700,
                                        background: '#fff',
                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                                        cursor: 'pointer',
                                        appearance: 'none'
                                    }}
                                >
                                    <option value="">Tous les rangs</option>
                                    <option value="BLOCKED">🚫 BLOQUÉ</option>
                                    <option value="BRONZE">🥉 BRONZE</option>
                                    <option value="SILVER">🥈 ARGENT</option>
                                    <option value="GOLD">🥇 OR</option>
                                    <option value="PLATINUM">💎 PLATINE</option>
                                </select>
                            </div>
                            <form onSubmit={handleSearch} style={{ position: 'relative' }}>
                                <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    placeholder="Scannez un email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        width: '320px',
                                        padding: '0.75rem 1rem 0.75rem 3.5rem',
                                        borderRadius: '16px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '0.9rem',
                                        fontWeight: 500,
                                        background: '#fff',
                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                                        outline: 'none',
                                        transition: 'all 0.3s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#0ea5e9'}
                                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                />
                            </form>
                        </div>
                    </div>

                    <div className="admin-table-container" style={{ marginTop: '2rem', border: 'none', background: 'transparent', boxShadow: 'none' }}>
                        {isLoading ? (
                            <div className="admin-loading" style={{ padding: '6rem 0' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                                    <div className="loading-pulse" style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#0ea5e9', opacity: 0.2, animation: 'pulse 2s infinite' }}></div>
                                    <p style={{ color: '#0ea5e9', fontWeight: 700, letterSpacing: '0.05em' }}>SYNCHRONISATION DES FLUX...</p>
                                </div>
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 12px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '0 2rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Compte & Secteurs</th>
                                        <th style={{ padding: '0 1rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Trust Status</th>
                                        <th style={{ padding: '0 1rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Monitor Quota</th>
                                        <th style={{ padding: '0 1rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Last Pulse</th>
                                        <th style={{ padding: '0 2rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-20" style={{ background: '#f8fafc', borderRadius: '24px', color: '#94a3b8', fontWeight: 600 }}>Aucune entité détectée dans le périmètre</td>
                                        </tr>
                                    ) : (
                                        accounts.map(account => (
                                            <tr key={account.id} style={{
                                                background: account.is_active === 0 ? '#f8fafc' : '#fff',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                                                borderRadius: '20px',
                                                transition: 'transform 0.2s, box-shadow 0.2s',
                                                cursor: 'default'
                                            }}
                                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.02)'; }}
                                            >
                                                <td style={{ padding: '1.5rem 2rem', borderRadius: '20px 0 0 20px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <span style={{ color: '#0f172a', fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.01em' }}>{account.email}</span>
                                                        <button
                                                            onClick={() => handleShowSectorActivity(account)}
                                                            style={{
                                                                background: '#f0f9ff',
                                                                border: 'none',
                                                                padding: '4px 10px',
                                                                borderRadius: '8px',
                                                                color: '#0ea5e9',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                fontSize: '0.75rem',
                                                                width: 'fit-content',
                                                                transition: 'all 0.2s'
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = '#e0f2fe'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = '#f0f9ff'}
                                                        >
                                                            ⚡ Analyser les secteurs
                                                        </button>
                                                        {account.is_active === 0 && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                                                <XCircle size={12} color="#ef4444" />
                                                                <span style={{ fontSize: '10px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>Système désactivé</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{
                                                            padding: '6px 12px',
                                                            borderRadius: '12px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 900,
                                                            background: `${getLevelColor(account.trust_level)}15`,
                                                            color: getLevelColor(account.trust_level),
                                                            letterSpacing: '0.05em'
                                                        }}>
                                                            {account.trust_level}
                                                        </span>
                                                        <div style={{ fontSize: '1.1rem', fontWeight: 950, color: '#1e293b' }}>
                                                            {account.trust_score ?? account.trust_score_value}<span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>%</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ position: 'relative', width: '48px', height: '48px' }}>
                                                            <svg style={{ transform: 'rotate(-90deg)', width: '48px', height: '48px' }}>
                                                                <circle cx="24" cy="24" r="20" stroke="#f1f5f9" strokeWidth="4" fill="none" />
                                                                <circle cx="24" cy="24" r="20" stroke={account.monthly_reviews_posted >= account.monthly_quota_limit ? '#ef4444' : '#10b981'} strokeWidth="4" strokeDasharray={`${(Math.min(100, (account.monthly_reviews_posted / (account.monthly_quota_limit || 1)) * 100) / 100) * 125} 125`} fill="none" strokeLinecap="round" />
                                                            </svg>
                                                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
                                                                {account.monthly_reviews_posted}
                                                            </div>
                                                        </div>
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>Limite: {account.monthly_quota_limit}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{formatLastActive(account)}</span>
                                                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#0ea5e9' }}></div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1.5rem 2rem', textAlign: 'right', borderRadius: '0 20px 20px 0' }}>
                                                    <button
                                                        onClick={() => handleOverride(account)}
                                                        className="action-btn"
                                                        title="Ajustement manuel"
                                                        style={{
                                                            background: '#f8fafc',
                                                            border: '1px solid #e2e8f0',
                                                            color: '#64748b',
                                                            width: '42px',
                                                            height: '42px',
                                                            borderRadius: '14px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            margin: '0 0 0 auto',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#0ea5e9'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#0ea5e9'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                                    >
                                                        <Edit3 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(14, 165, 233, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(14, 165, 233, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(14, 165, 233, 0); }
                }
                .admin-select:focus {
                    border-color: #0ea5e9 !important;
                    box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.1) !important;
                    outline: none;
                }
            `}</style>
        </DashboardLayout>
    );
};
