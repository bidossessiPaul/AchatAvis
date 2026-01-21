import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { trustScoreService } from '../../services/trustScoreService';
import {
    Search,
    RefreshCw,
    Edit3,
    ExternalLink,
    Shield,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import { showSuccess, showError } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
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

    const handleToggleActive = async (account: TrustAccount) => {
        try {
            const newStatus = account.is_active === 1 ? false : true;
            await trustScoreService.toggleAccountActivation(account.id, newStatus);
            showSuccess('Succès', `Compte ${newStatus ? 'activé' : 'désactivé'}`);
            // Update local state to avoid full reload
            setAccounts(prev => prev.map(acc =>
                acc.id === account.id ? { ...acc, is_active: newStatus ? 1 : 0 } : acc
            ));
        } catch (error) {
            showError('Erreur', 'Impossible de modifier le statut');
        }
    };

    const handleRecalculate = async (account: TrustAccount) => {
        try {
            setIsLoading(true);
            await trustScoreService.recalculateAccount(account.id);
            showSuccess('Succès', 'Score recalculé avec succès');
            loadAccounts(true);
        } catch (error) {
            showError('Erreur', 'Erreur lors du recalcul');
        } finally {
            setIsLoading(false);
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
                                    <option value="BLOCKED" ${account.trust_level === 'BLOCKED' ? 'selected' : ''}>🔴 BLOQUÉ</option>
                                    <option value="BRONZE" ${account.trust_level === 'BRONZE' ? 'selected' : ''}>🟡 BRONZE</option>
                                    <option value="SILVER" ${account.trust_level === 'SILVER' ? 'selected' : ''}>🟢 ARGENT</option>
                                    <option value="GOLD" ${account.trust_level === 'GOLD' ? 'selected' : ''}>🔵 OR</option>
                                    <option value="PLATINUM" ${account.trust_level === 'PLATINUM' ? 'selected' : ''}>🟣 PLATINE</option>
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

                let payloadScore = newScore;

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

    return (
        <DashboardLayout title="Gestion du Trust Score">
            <div className="admin-dashboard revamped">
                <div className="admin-main-card">
                    <div className="admin-card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Shield color="#0ea5e9" size={24} />
                            <h2 className="card-title">Comptes Gmail & Trust Scores</h2>
                        </div>
                        <div className="admin-controls" style={{ display: 'flex', gap: '1rem' }}>
                            <select
                                className="admin-select"
                                value={levelFilter}
                                onChange={(e) => setLevelFilter(e.target.value)}
                                style={{
                                    padding: '0.5rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #e2e8f0',
                                    outline: 'none'
                                }}
                            >
                                <option value="">Tous les niveaux</option>
                                <option value="BLOCKED">BLOQUÉ</option>
                                <option value="BRONZE">BRONZE</option>
                                <option value="SILVER">ARGENT</option>
                                <option value="GOLD">OR</option>
                                <option value="PLATINUM">PLATINE</option>
                            </select>
                            <form onSubmit={handleSearch} className="search-box">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Rechercher par email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </form>
                        </div>
                    </div>

                    <div className="admin-table-container">
                        {isLoading ? (
                            <div className="admin-loading">
                                <LoadingSpinner size="lg" text="Chargement des scores..." />
                            </div>
                        ) : (
                            <table className="admin-modern-table">
                                <thead>
                                    <tr>
                                        <th>Email</th>
                                        <th>Trust Level</th>
                                        <th className="text-center">Score</th>
                                        <th>Profil Maps</th>
                                        <th className="text-center">Statut</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center text-gray-400 py-8">Aucun compte trouvé</td>
                                        </tr>
                                    ) : (
                                        accounts.map(account => (
                                            <tr key={account.id} className={account.is_active === 0 ? 'opacity-75 bg-gray-50' : ''}>
                                                <td className="font-medium">
                                                    {account.email}
                                                    {account.is_active === 0 && <span style={{ fontSize: '10px', color: 'red', display: 'block' }}>🚫 DÉSACTIVÉ</span>}
                                                </td>
                                                <td>
                                                    <span
                                                        className="admin-badge"
                                                        style={{
                                                            background: `${getLevelColor(account.trust_level)}15`,
                                                            color: getLevelColor(account.trust_level),
                                                            borderColor: `${getLevelColor(account.trust_level)}30`,
                                                            fontWeight: 700
                                                        }}
                                                    >
                                                        {account.trust_level}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{account.trust_score ?? account.trust_score_value}</div>
                                                </td>
                                                <td>
                                                    {account.google_maps_profile_url ? (
                                                        <a
                                                            href={account.google_maps_profile_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="action-btn"
                                                            title="Voir le profil Maps"
                                                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9' }}
                                                        >
                                                            <ExternalLink size={18} />
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-300">-</span>
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={account.is_active === 1}
                                                            onChange={() => handleToggleActive(account)}
                                                        />
                                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                    </label>
                                                </td>
                                                <td className="actions-cell">
                                                    <div className="action-buttons">
                                                        <button
                                                            onClick={() => handleRecalculate(account)}
                                                            className="action-btn"
                                                            title="Recalculer auto"
                                                        >
                                                            <RefreshCw size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOverride(account)}
                                                            className="action-btn"
                                                            title="Modifier manuellement"
                                                            style={{ color: '#0ea5e9' }}
                                                        >
                                                            <Edit3 size={18} />
                                                        </button>
                                                    </div>
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
        </DashboardLayout>
    );
};
