import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import {
    Shield,
    Users,
    Save,
    ToggleLeft,
    ToggleRight,
    RefreshCcw,
    Ban,
    Plus,
    X
} from 'lucide-react';
import api from '../../services/api';
import { showConfirm, showSuccess, showError } from '../../utils/Swal';
import { suspensionApi } from '../../services/api';
import { adminService } from '../../services/adminService';

const SuspendedUsersQueue = () => {
    const [suspensions, setSuspensions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchSuspensions = async (silent = false) => {
        if (!silent) setIsRefreshing(true);
        try {
            console.log('Fetching active suspensions...');
            const response = await suspensionApi.getActiveSuspensions();
            console.log('Suspensions Refresh Response:', response);
            setSuspensions(response.data || []);
        } catch (error) {
            console.error('Failed to fetch suspensions:', error);
            if (!silent) showError('Erreur', 'Erreur lors de la mise à jour de la liste');
        } finally {
            if (!silent) {
                setLoading(false);
                setIsRefreshing(false);
            }
        }
    };

    useEffect(() => {
        fetchSuspensions();
        // Mettre à jour automatiquement toutes les 10 secondes (silencieusement)
        const interval = setInterval(() => fetchSuspensions(true), 10000);
        return () => clearInterval(interval);
    }, []);

    const handleApprove = async (id: number) => {
        const result = await showConfirm(
            'Lever la suspension ?',
            'Voulez-vous vraiment lever cette suspension ?'
        );

        if (!result.isConfirmed) return;

        try {
            console.log(`Approving suspension ID: ${id}`);
            await suspensionApi.approveSuspension(id);
            showSuccess('Compte approuvé/débloqué');
            // Wait a small bit to let DB update propagate if needed, though awaited should be enough
            await fetchSuspensions();
        } catch (error: any) {
            console.error('Error approving suspension:', error);
            showError('Erreur', error.response?.data?.message || 'Erreur lors du déblocage');
        }
    };

    if (loading) return (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <RefreshCcw className="animate-spin" size={24} style={{ margin: '0 auto 1rem', display: 'block', color: '#64748b' }} />
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Chargement de la file d'attente...</div>
        </div>
    );

    return (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0, color: suspensions.length > 0 ? '#dc2626' : '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Shield size={16} /> File d'Attente ({suspensions.length})
                </h4>
                <button
                    onClick={() => fetchSuspensions()}
                    disabled={isRefreshing}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '0.25rem' }}
                >
                    <RefreshCcw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
            </div>

            {suspensions.length === 0 ? (
                <p style={{ fontSize: '0.8125rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '1rem', margin: 0 }}>
                    Aucun utilisateur suspendu actuellement.
                </p>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {suspensions.map((susp) => (
                        <div key={susp.id} style={{ padding: '0.75rem', background: '#fef2f2', borderRadius: '0.75rem', border: '1px solid #fee2e2', opacity: isRefreshing ? 0.7 : 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#991b1b' }}>{susp.full_name || 'Utilisateur'}</span>
                                <span style={{ fontSize: '0.75rem', background: '#991b1b', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '0.25rem' }}>
                                    {susp.last_detected_country || '??'}
                                </span>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: '#7f1d1d', margin: '0 0 0.5rem 0' }}>
                                {susp.reason_details}
                            </p>
                            <button
                                onClick={() => handleApprove(susp.id)}
                                disabled={isRefreshing}
                                style={{
                                    width: '100%',
                                    background: 'white',
                                    border: '1px solid #fecaca',
                                    color: '#dc2626',
                                    padding: '0.4rem',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: isRefreshing ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => { if (!isRefreshing) e.currentTarget.style.background = '#fef2f2' }}
                                onMouseOut={(e) => { if (!isRefreshing) e.currentTarget.style.background = 'white' }}
                            >
                                {isRefreshing ? 'Traitement...' : 'Approuver (Débloquer)'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const SuspensionAdminPage: React.FC = () => {
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newCountry, setNewCountry] = useState('');
    const [newExemptCountry, setNewExemptCountry] = useState('');
    const [newExemptUserId, setNewExemptUserId] = useState('');
    const [diag, setDiag] = useState<any>(null);

    const fetchConfig = async () => {
        try {
            const response = await api.get('/suspensions/config');
            setConfig(response.data.data);
        } catch (error) {
            showError('Erreur', 'Erreur lors du chargement de la configuration');
            console.error('Error fetching suspension config:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDiag = async () => {
        try {
            const response = await api.get('/suspensions/check-my-ip-status');
            setDiag(response.data.data);
        } catch (error) {
            console.error('Error fetching diag:', error);
        }
    };

    useEffect(() => {
        fetchConfig();
        fetchDiag();
        fetchUsers(); // Fetch users on load for the whitelist management
    }, []);

    const handleSaveConfig = async (newConfig?: any) => {
        const configToSave = newConfig || config;
        setSaving(true);
        try {
            await api.put('/suspensions/config', configToSave);
            showSuccess('Configuration enregistrée');
            if (newConfig) setConfig(newConfig);
        } catch (error) {
            showError('Erreur', 'Erreur lors de l\'enregistrement');
        } finally {
            setSaving(true); // Small delay before allowing next action
            setTimeout(() => setSaving(false), 500);
        }
    };

    const [showSuspendModal, setShowSuspendModal] = useState(false);
    const [suspendForm, setSuspendForm] = useState({
        user_id: '',
        reason: '',
        level: 1
    });
    const [users, setUsers] = useState<any[]>([]);

    const handleManualSuspend = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await suspensionApi.createManualSuspension({
                user_id: suspendForm.user_id,
                reason_details: suspendForm.reason,
                suspension_level_id: suspendForm.level
            });
            showSuccess('Succès', 'Utilisateur suspendu avec succès');
            setShowSuspendModal(false);
            setSuspendForm({ user_id: '', reason: '', level: 1 });
            // The SuspendedUsersQueue component will not auto-refresh unless we refetch or use global state.
            // For now, closing the modal is fine.
        } catch (error: any) {
            showError('Erreur', error.response?.data?.message || 'Erreur lors de la suspension');
        }
    };

    const [reasons, setReasons] = useState<{ warnings: string[], suspensions: string[] }>({ warnings: [], suspensions: [] });

    const fetchUsers = async () => {
        // Fetch users independently
        try {
            const usersRes = await api.get('/admin/users');
            console.log("FETCHED USERS:", usersRes.data);
            setUsers(usersRes.data || []);
        } catch (e) {
            console.error("Failed to fetch users", e);
            showError('Erreur', "Impossible de charger la liste des utilisateurs");
        }

        // Fetch reasons independently
        try {
            const reasonsRes = await adminService.getSuspensionReasons();
            if (reasonsRes) {
                setReasons(reasonsRes);
            }
        } catch (e) {
            console.error("Failed to fetch suspension reasons", e);
            // Non-critical: modal will just have empty suggestions
        }
    };

    useEffect(() => {
        // fetchUsers is already called on mount now
    }, [showSuspendModal]);

    if (loading || !config) return <DashboardLayout title="Admin Suspensions">Chargement...</DashboardLayout>;

    return (
        <DashboardLayout title="Sécurité & Conformité">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
                <div style={{ display: 'grid', gap: '2rem' }}>
                    {/* Global Toggle Card */}
                    <div style={{ background: 'white', borderRadius: '1.25rem', padding: '2rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'black' }}>
                                    <Shield size={20} color="black" /> Système de Suspension Automatique
                                </h3>
                                <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                    Gérer l'activation globale et les déclencheurs intelligents.
                                </p>
                            </div>
                            <button
                                onClick={() => handleSaveConfig({ ...config, is_enabled: !config.is_enabled })}
                                style={{
                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                    color: config.is_enabled ? '#FF991F' : '#ef4444'
                                }}
                            >
                                {config.is_enabled ? <ToggleRight size={48} /> : <ToggleLeft size={48} />}
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                            <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '1rem', border: '1px solid #f1f5f9' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Mode Récidive</div>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Auto-escalade si violation pendant suspension.</p>
                                <div style={{ marginTop: '1rem' }} className="form-checkbox">
                                    <input type="checkbox" checked={config.auto_suspend_enabled} onChange={(e) => setConfig({ ...config, auto_suspend_enabled: e.target.checked })} /> Actif
                                </div>
                            </div>
                            <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '1rem', border: '1px solid #f1f5f9' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Seuil d'Avertissements</div>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Nombre d'alertes avant Niveau 1.</p>
                                <input
                                    type="number"
                                    value={config.max_warnings_before_suspend}
                                    onChange={(e) => setConfig({ ...config, max_warnings_before_suspend: parseInt(e.target.value) })}
                                    style={{ width: '100%', marginTop: '1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}
                                />
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={handleSaveConfig}
                                disabled={saving}
                                style={{
                                    background: '#0f172a', color: 'white', padding: '0.75rem 1.5rem',
                                    borderRadius: '0.75rem', border: 'none', fontWeight: 700,
                                    display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'
                                }}
                            >
                                {saving ? <RefreshCcw className="animate-spin" size={18} /> : <Save size={18} />} Enregistrer
                            </button>
                        </div>
                    </div>

                    {/* Exceptions & Blocking Card */}
                    <div style={{ background: 'white', borderRadius: '1.25rem', padding: '2rem', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'black' }}>
                            <Users size={18} color="black" /> Exemptions & Blocages Géo
                        </h3>
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#FF991F', marginBottom: '0.5rem' }}>PAYS EXEMPTÉS (ISO 2)</label>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (newExemptCountry.length === 2) {
                                            const current = config.exempted_countries || [];
                                            if (!current.includes(newExemptCountry)) {
                                                const updatedConfig = { ...config, exempted_countries: [...current, newExemptCountry] };
                                                handleSaveConfig(updatedConfig);
                                            } else {
                                                showError('Erreur', 'Déjà dans la liste');
                                            }
                                            setNewExemptCountry('');
                                        } else {
                                            showError('Erreur', 'Le code doit faire 2 lettres');
                                        }
                                    }}
                                    style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}
                                >
                                    <input
                                        type="text"
                                        value={newExemptCountry}
                                        onChange={(e) => setNewExemptCountry(e.target.value.toUpperCase().slice(0, 2))}
                                        placeholder="Code (ex: FR)"
                                        style={{
                                            flex: 1, padding: '0.625rem', borderRadius: '0.625rem',
                                            border: '1px solid #e2e8f0', fontSize: '0.875rem'
                                        }}
                                    />
                                    <button
                                        type="submit"
                                        style={{
                                            background: '#FF991F', color: 'white', border: 'none',
                                            padding: '0.625rem 1rem', borderRadius: '0.625rem',
                                            fontWeight: 700, cursor: 'pointer', display: 'flex',
                                            alignItems: 'center', gap: '0.25rem'
                                        }}
                                    >
                                        <Plus size={16} /> Autoriser
                                    </button>
                                </form>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', background: '#f0fdf4', padding: '1rem', borderRadius: '0.75rem', border: '1px dashed #bbf7d0' }}>
                                    {Array.isArray(config.exempted_countries) && config.exempted_countries.length > 0 ? (
                                        config.exempted_countries.map((code: string) => (
                                            <span key={code} style={{
                                                background: '#FF991F', color: 'white', padding: '0.25rem 0.625rem',
                                                borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 800,
                                                display: 'flex', alignItems: 'center', gap: '0.375rem'
                                            }}>
                                                {code}
                                                <X
                                                    size={14}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => {
                                                        const updatedConfig = {
                                                            ...config,
                                                            exempted_countries: (config.exempted_countries || []).filter((c: string) => c !== code)
                                                        };
                                                        handleSaveConfig(updatedConfig);
                                                    }}
                                                />
                                            </span>
                                        ))
                                    ) : (
                                        <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>Aucun pays exempté</span>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.5rem' }}>PAYS BLOQUÉS À L'INSCRIPTION (ISO 2)</label>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (newCountry.length === 2) {
                                            const current = config.blocked_countries || [];
                                            if (!current.includes(newCountry)) {
                                                const updatedConfig = { ...config, blocked_countries: [...current, newCountry] };
                                                handleSaveConfig(updatedConfig);
                                            } else {
                                                showError('Erreur', 'Déjà dans la liste');
                                            }
                                            setNewCountry('');
                                        } else {
                                            showError('Erreur', 'Le code doit faire 2 lettres');
                                        }
                                    }}
                                    style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}
                                >
                                    <input
                                        type="text"
                                        value={newCountry}
                                        onChange={(e) => setNewCountry(e.target.value.toUpperCase().slice(0, 2))}
                                        placeholder="Code (ex: RU)"
                                        style={{
                                            flex: 1, padding: '0.625rem', borderRadius: '0.625rem',
                                            border: '1px solid #e2e8f0', fontSize: '0.875rem'
                                        }}
                                    />
                                    <button
                                        type="submit"
                                        style={{
                                            background: '#ef4444', color: 'white', border: 'none',
                                            padding: '0.625rem 1rem', borderRadius: '0.625rem',
                                            fontWeight: 700, cursor: 'pointer', display: 'flex',
                                            alignItems: 'center', gap: '0.25rem'
                                        }}
                                    >
                                        <Plus size={16} /> Bloquer
                                    </button>
                                </form>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', background: '#fff1f2', padding: '1rem', borderRadius: '0.75rem', border: '1px dashed #fecaca' }}>
                                    {Array.isArray(config.blocked_countries) && config.blocked_countries.length > 0 ? (
                                        config.blocked_countries.map((code: string) => (
                                            <span key={code} style={{
                                                background: '#ef4444', color: 'white', padding: '0.25rem 0.625rem',
                                                borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 800,
                                                display: 'flex', alignItems: 'center', gap: '0.375rem'
                                            }}>
                                                {code}
                                                <X
                                                    size={14}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => {
                                                        const updatedConfig = {
                                                            ...config,
                                                            blocked_countries: (config.blocked_countries || []).filter((c: string) => c !== code)
                                                        };
                                                        handleSaveConfig(updatedConfig);
                                                    }}
                                                />
                                            </span>
                                        ))
                                    ) : (
                                        <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>Aucun pays bloqué</span>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>IDS UTILISATEURS EXEMPTÉS (WHITELIST)</label>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (newExemptUserId) {
                                            const current = config.exempted_user_ids || [];
                                            if (!current.includes(newExemptUserId)) {
                                                const updatedConfig = { ...config, exempted_user_ids: [...current, newExemptUserId] };
                                                handleSaveConfig(updatedConfig);
                                            } else {
                                                showError('Erreur', 'Déjà dans la liste');
                                            }
                                            setNewExemptUserId('');
                                        } else {
                                            showError('Erreur', 'Sélectionnez un utilisateur');
                                        }
                                    }}
                                    style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}
                                >
                                    <select
                                        value={newExemptUserId}
                                        onChange={(e) => setNewExemptUserId(e.target.value)}
                                        style={{
                                            flex: 1, padding: '0.625rem', borderRadius: '0.625rem',
                                            border: '1px solid #e2e8f0', fontSize: '0.875rem'
                                        }}
                                    >
                                        <option value="">Sélectionner un utilisateur...</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>
                                                {u.full_name} ({u.role}) - {u.email}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="submit"
                                        style={{
                                            background: '#0f172a', color: 'white', border: 'none',
                                            padding: '0.625rem 1rem', borderRadius: '0.625rem',
                                            fontWeight: 700, cursor: 'pointer', display: 'flex',
                                            alignItems: 'center', gap: '0.25rem'
                                        }}
                                    >
                                        <Plus size={16} /> Whitelister
                                    </button>
                                </form>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px dashed #e2e8f0' }}>
                                    {Array.isArray(config.exempted_user_ids) && config.exempted_user_ids.length > 0 ? (
                                        config.exempted_user_ids.map((uid: string) => {
                                            const u = users.find(user => user.id === uid);
                                            return (
                                                <span key={uid} style={{
                                                    background: '#0f172a', color: 'white', padding: '0.25rem 0.625rem',
                                                    borderRadius: '2rem', fontSize: '0.6875rem',
                                                    display: 'flex', alignItems: 'center', gap: '0.375rem'
                                                }}>
                                                    {u ? u.full_name : `${uid.slice(0, 8)}...`}
                                                    <X
                                                        size={12}
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={async () => {
                                                            const confirmRem = await showConfirm(`Retirer ${u ? u.full_name : 'cet utilisateur'} de la whitelist ?`, "L'utilisateur sera à nouveau soumis aux règles de sécurité.");
                                                            if (confirmRem.isConfirmed) {
                                                                const updatedConfig = {
                                                                    ...config,
                                                                    exempted_user_ids: (config.exempted_user_ids || []).filter((id: string) => id !== uid)
                                                                };
                                                                handleSaveConfig(updatedConfig);
                                                            }
                                                        }}
                                                    />
                                                </span>
                                            );
                                        })
                                    ) : (
                                        <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>Aucun utilisateur exempté</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Mini-Stats & Links */}
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', color: 'black' }}>Action Manuelle</h4>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1.25rem' }}>Bannir ou suspendre un utilisateur via son ID.</p>
                        <button
                            onClick={() => setShowSuspendModal(true)}
                            style={{ width: '100%', background: '#fee2e2', color: '#ef4444', border: 'none', padding: '0.75rem', borderRadius: '0.75rem', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        >
                            <Ban size={16} /> Suspendre Utilisateur
                        </button>
                    </div>

                    <SuspendedUsersQueue />

                    {diag && (
                        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>Diagnostic de Connexion</h4>
                            <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>Votre IP :</span>
                                    <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{diag.ip}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>Pays détecté :</span>
                                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{diag.country || 'Inconnu'}</span>
                                </div>
                                {diag.is_local && (
                                    <div style={{ background: '#fff8e1', color: '#FF991F', padding: '0.5rem', borderRadius: '0.5rem', fontWeight: 600 }}>
                                        Environnement Local (Détection fixée sur FR)
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Suspension Manuelle */}
            {showSuspendModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
                }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', width: '400px', maxWidth: '90%' }}>
                        <h3 style={{ marginTop: 0, color: '#0f172a' }}>Suspendre un Utilisateur</h3>
                        <form onSubmit={handleManualSuspend}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Utilisateur</label>
                                <select
                                    required
                                    value={suspendForm.user_id}
                                    onChange={(e) => setSuspendForm({ ...suspendForm, user_id: e.target.value })}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '0.25rem' }}
                                >
                                    <option value="">Sélectionner un utilisateur...</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.full_name} ({u.role}) - {u.email}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Niveau (1-5)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="5"
                                    value={suspendForm.level}
                                    onChange={(e) => setSuspendForm({ ...suspendForm, level: parseInt(e.target.value) })}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '0.25rem' }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Raison</label>
                                <select
                                    required
                                    value={suspendForm.reason}
                                    onChange={(e) => setSuspendForm({ ...suspendForm, reason: e.target.value })}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '0.25rem' }}
                                >
                                    <option value="">Sélectionner un motif...</option>
                                    {reasons?.suspensions?.map((r, i) => (
                                        <option key={i} value={r}>{r}</option>
                                    ))}
                                    <option value="Autre (Précisez)">Autre...</option>
                                </select>
                            </div>
                            {suspendForm.reason === 'Autre (Précisez)' && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <textarea
                                        placeholder="Précisez le motif..."
                                        onChange={(e) => setSuspendForm({ ...suspendForm, reason: e.target.value })}
                                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '0.25rem', minHeight: '60px' }}
                                    />
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowSuspendModal(false)}
                                    style={{ padding: '0.5rem 1rem', background: '#ccc', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '0.5rem 1rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                                >
                                    Confirmer Suspension
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};
