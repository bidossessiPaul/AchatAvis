import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminApi } from '../../services/api';
import {
    Search,
    CheckCircle2,
    ExternalLink,
    User,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
    XCircle,
    Clock,
    PlayCircle,
    Loader2,
    Pencil,
    RefreshCw,
    X,
    Save
} from 'lucide-react';
import { showSuccess, showError, showConfirm } from '../../utils/Swal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './AdminLists.css';

interface RejectedRow {
    id: string;
    review_url: string;
    google_email?: string;
    rejection_reason?: string;
    rejected_at?: string;
    submitted_at: string;
    earnings: number;
    allow_resubmit: 0 | 1;
    allow_appeal: 0 | 1;
    slot_released_at?: string | null;

    proposal_id?: string;
    review_text?: string;

    guide_id: string;
    guide_name: string;
    guide_email: string;

    order_id?: string;
    company_name?: string;
    quantity?: number;
    reviews_received?: number;
    reviews_validated?: number;
    order_status?: string;

    artisan_id?: string;
    artisan_name?: string;
}

export const RejectedReviews: React.FC = () => {
    const navigate = useNavigate();
    const [rows, setRows] = useState<RejectedRow[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [searchReason, setSearchReason] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkLoading, setIsBulkLoading] = useState(false);
    const [editingRow, setEditingRow] = useState<RejectedRow | null>(null);
    const [editContent, setEditContent] = useState('');
    const [isSavingContent, setIsSavingContent] = useState(false);
    const [isResetLoading, setIsResetLoading] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [regenProgress, setRegenProgress] = useState({ current: 0, total: 0 });

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const result = await adminApi.getRejectedSubmissions({
                q: searchReason || undefined,
                page,
                limit,
            });
            setRows(result.rows || []);
            setTotal(result.total || 0);
        } catch (error) {
            showError('Erreur', 'Impossible de charger les avis rejetés');
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, [searchReason, page, limit]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRevalidate = async (row: RejectedRow) => {
        const result = await showConfirm(
            'Revalider cet avis ?',
            `Cet avis sera marqué comme validé et les statistiques de l'artisan seront mises à jour.`
        );
        if (!result.isConfirmed) return;

        setActionLoadingId(row.id);
        try {
            await adminApi.updateSubmissionStatus(row.id, { status: 'validated' });
            showSuccess('Avis revalidé avec succès');
            fetchData(true);
        } catch (error) {
            showError('Erreur', 'Impossible de revalider cet avis');
        } finally {
            setActionLoadingId(null);
        }
    };

    const toggleRow = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const togglePageSelection = () => {
        const pageIds = rows.map(r => r.id);
        const allSelected = pageIds.every(id => selectedIds.has(id));
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allSelected) {
                pageIds.forEach(id => next.delete(id));
            } else {
                pageIds.forEach(id => next.add(id));
            }
            return next;
        });
    };

    const clearSelection = () => setSelectedIds(new Set());

    const handleBulkRevalidate = async (mode: 'selection' | 'all') => {
        const count = mode === 'all' ? total : selectedIds.size;
        if (count === 0) return;

        const result = await showConfirm(
            mode === 'all' ? `Revalider TOUS les ${total} avis rejetés ?` : `Revalider ${count} avis ?`,
            mode === 'all'
                ? `Les ${total} avis rejetés${searchReason ? ' correspondant au filtre' : ''} seront marqués comme validés.`
                : `Les ${count} avis sélectionnés seront marqués comme validés et les statistiques mises à jour.`
        );
        if (!result.isConfirmed) return;

        setIsBulkLoading(true);
        try {
            const payload = mode === 'all'
                ? { all: true as const, q: searchReason || undefined }
                : { ids: Array.from(selectedIds) };
            const res = await adminApi.bulkRevalidateSubmissions(payload);
            const msg = res.failed > 0
                ? `${res.success} avis revalidés, ${res.failed} échec(s)`
                : `${res.success} avis revalidés avec succès`;
            showSuccess('Revalidation en lot terminée', msg);
            clearSelection();
            fetchData(true);
        } catch (error: any) {
            const errMsg = error?.response?.data?.error || 'Impossible de revalider les avis sélectionnés';
            showError('Erreur', errMsg);
        } finally {
            setIsBulkLoading(false);
        }
    };

    const handleRegenAndRevalidateAll = async () => {
        if (total === 0) return;

        const result = await showConfirm(
            `Régénérer et revalider TOUS les ${total} avis ?`,
            `L'IA va régénérer le contenu de chaque avis un par un, puis chaque avis sera revalidé automatiquement. Cette opération peut prendre plusieurs minutes, laissez la page ouverte.`
        );
        if (!result.isConfirmed) return;

        setIsRegenerating(true);
        setRegenProgress({ current: 0, total: total });

        let regenSuccess = 0;
        let regenFailed = 0;
        let revalidateSuccess = 0;
        let revalidateFailed = 0;

        try {
            // Fetch ALL rejected submissions page by page
            const allRows: RejectedRow[] = [];
            const batchSize = 100;
            const totalPages = Math.ceil(total / batchSize);

            for (let p = 1; p <= totalPages; p++) {
                const res = await adminApi.getRejectedSubmissions({
                    q: searchReason || undefined,
                    page: p,
                    limit: batchSize,
                });
                allRows.push(...(res.rows || []));
            }

            setRegenProgress({ current: 0, total: allRows.length });

            // Process each review one by one: regenerate then revalidate
            for (let i = 0; i < allRows.length; i++) {
                setRegenProgress({ current: i + 1, total: allRows.length });
                const row = allRows[i];

                // Step 1: Regenerate if proposal exists
                if (row.proposal_id) {
                    try {
                        await adminApi.regenerateProposal(row.proposal_id);
                        regenSuccess++;
                    } catch {
                        regenFailed++;
                    }
                }

                // Step 2: Revalidate the submission
                try {
                    await adminApi.updateSubmissionStatus(row.id, { status: 'validated' });
                    revalidateSuccess++;
                    // Remove from list immediately
                    setRows(prev => prev.filter(r => r.id !== row.id));
                    setTotal(prev => Math.max(0, prev - 1));
                    setSelectedIds(prev => {
                        const next = new Set(prev);
                        next.delete(row.id);
                        return next;
                    });
                } catch {
                    revalidateFailed++;
                }
            }

            const parts: string[] = [];
            parts.push(`${regenSuccess} avis régénérés`);
            if (regenFailed > 0) parts.push(`${regenFailed} régénération(s) échouée(s)`);
            parts.push(`${revalidateSuccess} avis revalidés`);
            if (revalidateFailed > 0) parts.push(`${revalidateFailed} revalidation(s) échouée(s)`);
            showSuccess('Opération terminée', parts.join(', ') + '.');
            clearSelection();
            fetchData(true);
        } catch (error: any) {
            showError('Erreur', 'Une erreur est survenue pendant l\'opération.');
        } finally {
            setIsRegenerating(false);
            setRegenProgress({ current: 0, total: 0 });
        }
    };

    const handleEditContent = (row: RejectedRow) => {
        setEditingRow(row);
        setEditContent(row.review_text || '');
    };

    const handleSaveContent = async () => {
        if (!editingRow?.proposal_id) return;
        setIsSavingContent(true);
        try {
            await adminApi.updateProposal(editingRow.proposal_id, { content: editContent });
            showSuccess('Contenu modifié', 'Le texte de l\'avis a été mis à jour.');
            setEditingRow(null);
            fetchData(true);
        } catch (error) {
            showError('Erreur', 'Impossible de modifier le contenu de l\'avis');
        } finally {
            setIsSavingContent(false);
        }
    };

    const handleRegenerateInModal = async () => {
        if (!editingRow?.proposal_id) return;
        setIsRegenerating(true);
        try {
            const result = await adminApi.regenerateProposal(editingRow.proposal_id);
            setEditContent(result.content);
            setEditingRow({ ...editingRow, review_text: result.content });
            showSuccess('Avis régénéré', 'Le texte a été régénéré par l\'IA. Enregistrez pour confirmer ou modifiez-le.');
        } catch (error) {
            showError('Erreur', 'Impossible de régénérer l\'avis');
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleBulkEditContent = () => {
        const selectedRows = rows.filter(r => selectedIds.has(r.id));
        if (selectedRows.length >= 1) {
            handleEditContent(selectedRows[0]);
        }
    };

    const handleBulkRegenerateAndRelaunch = async () => {
        const selectedRows = rows.filter(r => selectedIds.has(r.id) && r.proposal_id);
        const count = selectedRows.length;
        if (count === 0) return;

        const result = await showConfirm(
            `Régénérer et relancer ${count} avis ?`,
            `L'IA va régénérer le contenu de chaque avis un par un, puis tous seront remis en "non publié" (pending). Cette opération peut prendre du temps.`
        );
        if (!result.isConfirmed) return;

        setIsRegenerating(true);
        setRegenProgress({ current: 0, total: count });

        let regenSuccess = 0;
        let regenFailed = 0;

        // Step 1: Regenerate each proposal one by one
        for (let i = 0; i < selectedRows.length; i++) {
            setRegenProgress({ current: i + 1, total: count });
            try {
                await adminApi.regenerateProposal(selectedRows[i].proposal_id!);
                regenSuccess++;
            } catch {
                regenFailed++;
            }
        }

        // Step 2: Reset all to pending
        try {
            const ids = selectedRows.map(r => r.id);
            await adminApi.bulkResetToPending(ids);
            const msg = regenFailed > 0
                ? `${regenSuccess} avis régénérés (${regenFailed} échec(s)), tous remis en ligne.`
                : `${regenSuccess} avis régénérés et remis en ligne avec succès.`;
            showSuccess('Régénération terminée', msg);
            clearSelection();
            fetchData(true);
        } catch (error: any) {
            showError('Erreur', 'Les avis ont été régénérés mais la relance a échoué.');
        } finally {
            setIsRegenerating(false);
            setRegenProgress({ current: 0, total: 0 });
        }
    };

    const handleBulkResetToPending = async () => {
        const count = selectedIds.size;
        if (count === 0) return;

        const result = await showConfirm(
            `Relancer ${count} avis ?`,
            `Les ${count} avis sélectionnés seront remis en "non publié" (pending). Le guide pourra les re-soumettre et l'admin pourra les revalider.`
        );
        if (!result.isConfirmed) return;

        setIsResetLoading(true);
        try {
            const res = await adminApi.bulkResetToPending(Array.from(selectedIds));
            const msg = res.failed > 0
                ? `${res.success} avis relancé(s), ${res.failed} échec(s)`
                : `${res.success} avis relancé(s) avec succès`;
            showSuccess('Relance terminée', msg);
            clearSelection();
            fetchData(true);
        } catch (error: any) {
            const errMsg = error?.response?.data?.error || 'Impossible de relancer les avis';
            showError('Erreur', errMsg);
        } finally {
            setIsResetLoading(false);
        }
    };

    const handleForceRelist = async (orderId?: string) => {
        if (!orderId) return;
        const result = await showConfirm(
            'Forcer la remise en ligne ?',
            'La fiche sera remise en statut "in_progress" et redeviendra visible aux guides.'
        );
        if (!result.isConfirmed) return;

        try {
            await adminApi.forceRelistOrder(orderId);
            showSuccess('Fiche remise en ligne');
            fetchData(true);
        } catch (error) {
            showError('Erreur', 'Impossible de remettre la fiche en ligne');
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / limit));

    const getSlotStatus = (row: RejectedRow): { label: string; color: string; bg: string } => {
        if (row.allow_resubmit && !row.slot_released_at && row.rejected_at) {
            const rejectedDate = new Date(row.rejected_at).getTime();
            const expireDate = rejectedDate + 24 * 60 * 60 * 1000;
            const remainingMs = expireDate - Date.now();
            if (remainingMs > 0) {
                const hours = Math.floor(remainingMs / (1000 * 60 * 60));
                const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
                return {
                    label: `Réservé ${hours}h${minutes.toString().padStart(2, '0')}`,
                    color: '#92400e',
                    bg: '#fef3c7'
                };
            }
            return { label: 'Slot expiré', color: '#6b7280', bg: '#f3f4f6' };
        }
        if (row.slot_released_at) {
            return { label: 'Libéré', color: '#6b7280', bg: '#f3f4f6' };
        }
        return { label: 'Libéré', color: '#6b7280', bg: '#f3f4f6' };
    };

    const getFlagsBadge = (row: RejectedRow) => {
        if (row.allow_resubmit) {
            return { label: 'Resubmit', color: '#0c4a6e', bg: '#e0f2fe' };
        }
        if (row.allow_appeal) {
            return { label: 'Appel', color: '#312e81', bg: '#e0e7ff' };
        }
        return { label: 'Rejet sec', color: '#991b1b', bg: '#fee2e2' };
    };

    return (
        <DashboardLayout title="Avis Rejetés">
            <div className="admin-dashboard revamped">
                <div className="admin-main-card">
                    <div className="admin-card-header" style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '1.5rem' }}>
                            <div>
                                <h2 className="card-title" style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <XCircle size={24} color="#dc2626" />
                                    Avis Rejetés
                                </h2>
                                <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginTop: '4px' }}>
                                    {total} avis rejetés au total
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div style={{ position: 'relative' }}>
                                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                    <input
                                        type="text"
                                        placeholder="Rechercher dans les raisons..."
                                        value={searchReason}
                                        onChange={(e) => { setSearchReason(e.target.value); setPage(1); clearSelection(); }}
                                        style={{
                                            padding: '0.75rem 1rem 0.75rem 2.5rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--gray-200)',
                                            width: '320px',
                                            fontSize: '0.875rem'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bulk action bar */}
                    {(selectedIds.size > 0 || total > 0) && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1rem',
                            background: selectedIds.size > 0 ? '#ecfdf5' : '#f9fafb',
                            border: '1px solid ' + (selectedIds.size > 0 ? '#a7f3d0' : '#e5e7eb'),
                            borderRadius: '12px',
                            padding: '0.75rem 1.25rem',
                            marginBottom: '1rem',
                            flexWrap: 'wrap'
                        }}>
                            <div style={{ fontSize: '0.875rem', color: '#374151', fontWeight: 600 }}>
                                {selectedIds.size > 0 ? (
                                    <>
                                        <strong>{selectedIds.size}</strong> avis sélectionné{selectedIds.size > 1 ? 's' : ''}
                                        <button
                                            onClick={clearSelection}
                                            style={{
                                                marginLeft: '0.75rem',
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#6b7280',
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                textDecoration: 'underline'
                                            }}
                                        >
                                            Désélectionner
                                        </button>
                                    </>
                                ) : (
                                    <span style={{ color: '#6b7280' }}>Aucune sélection — utilisez les cases pour choisir des avis ou revalidez tout d'un coup</span>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {selectedIds.size > 0 && (
                                    <>
                                        <button
                                            onClick={handleBulkEditContent}
                                            disabled={isBulkLoading || isResetLoading}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                borderRadius: '8px',
                                                border: '1px solid #6366f1',
                                                background: '#eef2ff',
                                                color: '#4338ca',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                fontSize: '0.8rem',
                                                fontWeight: 700
                                            }}
                                        >
                                            <Pencil size={14} />
                                            Modifier le contenu
                                        </button>
                                        <button
                                            onClick={handleBulkRegenerateAndRelaunch}
                                            disabled={isRegenerating || isBulkLoading || isResetLoading}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                borderRadius: '8px',
                                                border: '1px solid #8b5cf6',
                                                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                                                color: 'white',
                                                cursor: isRegenerating ? 'not-allowed' : 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                opacity: isRegenerating ? 0.7 : 1
                                            }}
                                        >
                                            {isRegenerating
                                                ? <><Loader2 size={14} className="animate-spin" /> {regenProgress.current}/{regenProgress.total}</>
                                                : <><RotateCcw size={14} /> Régénérer + Relancer</>
                                            }
                                        </button>
                                        <button
                                            onClick={handleBulkResetToPending}
                                            disabled={isResetLoading || isBulkLoading || isRegenerating}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                borderRadius: '8px',
                                                border: '1px solid #f59e0b',
                                                background: '#f59e0b',
                                                color: 'white',
                                                cursor: isResetLoading ? 'not-allowed' : 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                opacity: isResetLoading ? 0.6 : 1
                                            }}
                                        >
                                            {isResetLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                            Relancer la sélection
                                        </button>
                                        <button
                                            onClick={() => handleBulkRevalidate('selection')}
                                            disabled={isBulkLoading}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                borderRadius: '8px',
                                                border: '1px solid #10b981',
                                                background: '#10b981',
                                                color: 'white',
                                                cursor: isBulkLoading ? 'not-allowed' : 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                opacity: isBulkLoading ? 0.6 : 1
                                            }}
                                        >
                                            {isBulkLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                            Revalider la sélection
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={handleRegenAndRevalidateAll}
                                    disabled={isRegenerating || isBulkLoading || total === 0}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '8px',
                                        border: '1px solid #8b5cf6',
                                        background: isRegenerating
                                            ? 'linear-gradient(135deg, #7c3aed, #6366f1)'
                                            : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                                        color: 'white',
                                        cursor: isRegenerating || isBulkLoading || total === 0 ? 'not-allowed' : 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        opacity: isRegenerating || isBulkLoading || total === 0 ? 0.8 : 1,
                                        minWidth: isRegenerating ? '260px' : 'auto',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {isRegenerating && regenProgress.total > 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            bottom: 0,
                                            width: `${(regenProgress.current / regenProgress.total) * 100}%`,
                                            background: 'rgba(255,255,255,0.15)',
                                            transition: 'width 0.3s ease'
                                        }} />
                                    )}
                                    {isRegenerating
                                        ? <><Loader2 size={14} className="animate-spin" /> Régénération {regenProgress.current}/{regenProgress.total}...</>
                                        : <><RotateCcw size={14} /> Revalider tout ({total})</>
                                    }
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="admin-table-container">
                        {isLoading ? (
                            <div className="admin-loading">
                                <LoadingSpinner size="lg" text="Chargement..." />
                            </div>
                        ) : rows.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                                <XCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
                                <p>Aucun avis rejeté à afficher.</p>
                            </div>
                        ) : (
                            <table className="admin-modern-table" style={{ borderCollapse: 'separate', borderSpacing: '0 10px' }}>
                                <thead>
                                    <tr style={{ background: 'transparent' }}>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem', width: '40px' }}>
                                            <input
                                                type="checkbox"
                                                aria-label="Sélectionner toute la page"
                                                checked={rows.length > 0 && rows.every(r => selectedIds.has(r.id))}
                                                ref={(el) => {
                                                    if (el) {
                                                        const someSelected = rows.some(r => selectedIds.has(r.id));
                                                        const allSelected = rows.length > 0 && rows.every(r => selectedIds.has(r.id));
                                                        el.indeterminate = someSelected && !allSelected;
                                                    }
                                                }}
                                                onChange={togglePageSelection}
                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                            />
                                        </th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Date rejet</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Fiche / Artisan</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Guide</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Lien & Email</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Raison</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Type</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Slot</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }}>Progression</th>
                                        <th style={{ background: 'transparent', border: 'none', paddingBottom: '1rem' }} className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => {
                                        const slotStatus = getSlotStatus(row);
                                        const flags = getFlagsBadge(row);
                                        const isChecked = selectedIds.has(row.id);
                                        return (
                                            <tr key={row.id} style={{
                                                backgroundColor: isChecked ? '#f0fdf4' : '#fff',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                                borderRadius: '16px'
                                            }}>
                                                <td style={{ padding: '1.25rem 0 1.25rem 1.5rem', border: 'none', borderRadius: '16px 0 0 16px', width: '40px' }}>
                                                    <input
                                                        type="checkbox"
                                                        aria-label={`Sélectionner l'avis ${row.id}`}
                                                        checked={isChecked}
                                                        onChange={() => toggleRow(row.id)}
                                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '1.25rem 1rem', border: 'none' }}>
                                                    <div style={{ fontSize: '0.8125rem', color: '#374151', fontWeight: 600 }}>
                                                        {row.rejected_at ? new Date(row.rejected_at).toLocaleDateString('fr-FR') : '-'}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                                                        {row.rejected_at ? new Date(row.rejected_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                    </div>
                                                </td>
                                                <td style={{ border: 'none' }}>
                                                    <div style={{
                                                        color: '#111827',
                                                        fontWeight: 700,
                                                        fontSize: '0.875rem',
                                                        maxWidth: '200px',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }} title={row.company_name}>
                                                        {row.company_name || '-'}
                                                    </div>
                                                    {row.artisan_id && row.artisan_name && (
                                                        <div
                                                            style={{
                                                                color: '#6b7280',
                                                                fontSize: '0.75rem',
                                                                cursor: 'pointer',
                                                                textDecoration: 'underline',
                                                                textUnderlineOffset: '2px'
                                                            }}
                                                            onClick={() => navigate(`/admin/artisans/${row.artisan_id}`)}
                                                            title={row.artisan_name}
                                                        >
                                                            {row.artisan_name}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ border: 'none' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>
                                                            <User size={16} />
                                                        </div>
                                                        <span
                                                            style={{
                                                                fontWeight: 600,
                                                                color: '#111827',
                                                                cursor: 'pointer',
                                                                textDecoration: 'underline',
                                                                textUnderlineOffset: '2px',
                                                                maxWidth: '150px',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                fontSize: '0.8125rem'
                                                            }}
                                                            onClick={() => navigate(`/admin/guides/${row.guide_id}`)}
                                                            title={row.guide_name}
                                                        >
                                                            {row.guide_name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ border: 'none' }}>
                                                    <a
                                                        href={row.review_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.25rem',
                                                            color: '#2563eb',
                                                            fontSize: '0.75rem',
                                                            textDecoration: 'none',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        <ExternalLink size={12} /> Lien
                                                    </a>
                                                    {row.google_email && (
                                                        <div style={{
                                                            fontSize: '0.7rem',
                                                            color: '#6b7280',
                                                            marginTop: '4px',
                                                            maxWidth: '160px',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }} title={row.google_email}>
                                                            {row.google_email}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ border: 'none', maxWidth: '220px' }}>
                                                    <div style={{
                                                        fontSize: '0.75rem',
                                                        color: '#4b5563',
                                                        fontStyle: 'italic',
                                                        lineHeight: 1.4,
                                                        maxHeight: '3em',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical'
                                                    }} title={row.rejection_reason}>
                                                        {row.rejection_reason || '—'}
                                                    </div>
                                                </td>
                                                <td style={{ border: 'none' }}>
                                                    <span style={{
                                                        padding: '0.25rem 0.6rem',
                                                        borderRadius: '9999px',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        backgroundColor: flags.bg,
                                                        color: flags.color
                                                    }}>
                                                        {flags.label}
                                                    </span>
                                                </td>
                                                <td style={{ border: 'none' }}>
                                                    <span style={{
                                                        padding: '0.25rem 0.6rem',
                                                        borderRadius: '9999px',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        backgroundColor: slotStatus.bg,
                                                        color: slotStatus.color,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}>
                                                        {row.allow_resubmit && !row.slot_released_at && <Clock size={11} />}
                                                        {slotStatus.label}
                                                    </span>
                                                </td>
                                                <td style={{ border: 'none' }}>
                                                    <div style={{ fontSize: '0.75rem', color: '#374151', fontWeight: 600 }}>
                                                        {row.reviews_validated ?? 0} / {row.quantity ?? 0}
                                                    </div>
                                                    <div style={{ fontSize: '0.65rem', color: '#9ca3af' }}>
                                                        {row.order_status || '-'}
                                                    </div>
                                                </td>
                                                <td style={{ border: 'none', borderRadius: '0 16px 16px 0', padding: '1rem' }} className="text-center">
                                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                                                        {row.proposal_id && (
                                                            <button
                                                                onClick={() => handleEditContent(row)}
                                                                title="Modifier le contenu de l'avis"
                                                                style={{
                                                                    padding: '0.4rem',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid #6366f1',
                                                                    background: '#eef2ff',
                                                                    color: '#4338ca',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 700
                                                                }}
                                                            >
                                                                <Pencil size={13} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleRevalidate(row)}
                                                            disabled={actionLoadingId === row.id}
                                                            title="Revalider l'avis"
                                                            style={{
                                                                padding: '0.5rem',
                                                                borderRadius: '8px',
                                                                border: '1px solid #10b981',
                                                                background: '#ecfdf5',
                                                                color: '#10b981',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                fontSize: '0.7rem',
                                                                fontWeight: 700,
                                                                opacity: actionLoadingId === row.id ? 0.5 : 1
                                                            }}
                                                        >
                                                            {actionLoadingId === row.id ? <RotateCcw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                            Revalider
                                                        </button>
                                                        {row.order_id && (
                                                            <button
                                                                onClick={() => handleForceRelist(row.order_id)}
                                                                title="Forcer la remise en ligne de la fiche"
                                                                style={{
                                                                    padding: '0.5rem',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid #FF991F',
                                                                    background: '#fff7ed',
                                                                    color: '#c2410c',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 700
                                                                }}
                                                            >
                                                                <PlayCircle size={14} />
                                                                Relancer
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        borderRadius: '8px',
                                        border: '1px solid #e5e7eb',
                                        background: 'white',
                                        cursor: page === 1 ? 'not-allowed' : 'pointer',
                                        opacity: page === 1 ? 0.4 : 1,
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: 600 }}>
                                    Page {page} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        borderRadius: '8px',
                                        border: '1px solid #e5e7eb',
                                        background: 'white',
                                        cursor: page === totalPages ? 'not-allowed' : 'pointer',
                                        opacity: page === totalPages ? 0.4 : 1,
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit content modal */}
            {editingRow && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '1rem'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        width: '100%',
                        maxWidth: '640px',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1.25rem 1.5rem',
                            borderBottom: '1px solid #e5e7eb'
                        }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>
                                    Modifier le contenu de l'avis
                                </h3>
                                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
                                    Fiche : <strong>{editingRow.company_name}</strong> — Guide : <strong>{editingRow.guide_name}</strong>
                                </p>
                            </div>
                            <button
                                onClick={() => setEditingRow(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                            >
                                <X size={20} color="#6b7280" />
                            </button>
                        </div>

                        <div style={{ padding: '1.5rem' }}>
                            {editingRow.rejection_reason && (
                                <div style={{
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    borderRadius: '12px',
                                    padding: '0.75rem 1rem',
                                    marginBottom: '1rem',
                                    fontSize: '0.8rem',
                                    color: '#991b1b'
                                }}>
                                    <strong>Raison du rejet :</strong> {editingRow.rejection_reason}
                                </div>
                            )}

                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.5rem' }}>
                                Texte de l'avis (modifiez sans changer le sens)
                            </label>
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                rows={8}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '0.9rem',
                                    lineHeight: 1.6,
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />

                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', marginTop: '1.25rem', alignItems: 'center' }}>
                                <button
                                    onClick={handleRegenerateInModal}
                                    disabled={isRegenerating || !editingRow.proposal_id}
                                    style={{
                                        padding: '0.6rem 1.25rem',
                                        borderRadius: '10px',
                                        border: '1px solid #8b5cf6',
                                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                                        color: 'white',
                                        cursor: isRegenerating || !editingRow.proposal_id ? 'not-allowed' : 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        opacity: isRegenerating ? 0.7 : 1
                                    }}
                                >
                                    {isRegenerating ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                                    {isRegenerating ? 'Régénération...' : 'Régénérer (IA)'}
                                </button>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button
                                        onClick={() => setEditingRow(null)}
                                        style={{
                                            padding: '0.6rem 1.25rem',
                                            borderRadius: '10px',
                                            border: '1px solid #d1d5db',
                                            background: 'white',
                                            color: '#374151',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            fontWeight: 600
                                        }}
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={handleSaveContent}
                                        disabled={isSavingContent || editContent === editingRow.review_text}
                                        style={{
                                            padding: '0.6rem 1.25rem',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: editContent === editingRow.review_text ? '#d1d5db' : '#6366f1',
                                            color: 'white',
                                            cursor: isSavingContent || editContent === editingRow.review_text ? 'not-allowed' : 'pointer',
                                            fontSize: '0.85rem',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            opacity: isSavingContent ? 0.6 : 1
                                        }}
                                    >
                                        {isSavingContent ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Enregistrer
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};
