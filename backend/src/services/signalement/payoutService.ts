// Calcul de la balance guide pour le service signalement (séparée de la balance avis classique).
//
// Le pattern projet : la balance guide n'est pas stockée, elle est dynamique
// via SUM(earnings_cents WHERE status='validated').
//
// recordSignalementEarning() est un no-op fonctionnel en v1 — la validation
// d'une proof (proofService.validateProof) met déjà proof.status='validated'
// avec earnings_cents snapshotté, donc la balance se calcule à la lecture.
// Cette fonction existe pour qu'on puisse y ajouter plus tard un journal
// d'audit ou un webhook sans toucher au call-site.

import { query } from '../../config/database';

interface SignalementEarningInput {
    guideId: string;
    proofId: string;
    avisId: string;
    amountCents: number;
}

/**
 * No-op fonctionnel en v1. La proof.status='validated' suffit à créditer la
 * balance via le SUM dynamique. Hook prévu pour audit log futur.
 */
export const recordSignalementEarning = async (
    _input: SignalementEarningInput,
    _connection: any
): Promise<void> => {
    // intentionnellement vide en v1
    return;
};

/**
 * Balance signalement d'un guide = somme des earnings validés.
 * Retourne en cents.
 */
export const getGuideSignalementBalanceCents = async (
    guideId: string
): Promise<number> => {
    const rows: any = await query(
        `SELECT COALESCE(SUM(earnings_cents), 0) AS balance
         FROM signalement_proofs
         WHERE guide_id = ? AND status = 'validated' AND deleted_at IS NULL`,
        [guideId]
    );
    return Number(rows[0]?.balance ?? 0);
};

/**
 * Stats simples pour le dashboard guide (compteurs).
 */
export const getGuideSignalementStats = async (
    guideId: string
): Promise<{
    pending_count: number;
    validated_count: number;
    rejected_count: number;
    total_earnings_cents: number;
}> => {
    const rows: any = await query(
        `SELECT
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
            SUM(CASE WHEN status = 'validated' THEN 1 ELSE 0 END) AS validated_count,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count,
            COALESCE(SUM(CASE WHEN status = 'validated' THEN earnings_cents ELSE 0 END), 0) AS total_earnings_cents
         FROM signalement_proofs
         WHERE guide_id = ? AND deleted_at IS NULL`,
        [guideId]
    );
    const r = rows[0] || {};
    return {
        pending_count: Number(r.pending_count ?? 0),
        validated_count: Number(r.validated_count ?? 0),
        rejected_count: Number(r.rejected_count ?? 0),
        total_earnings_cents: Number(r.total_earnings_cents ?? 0),
    };
};

/**
 * Stats globales pour le dashboard admin (Stats bar de SignalementsList).
 */
export const getGlobalSignalementStats = async (): Promise<{
    avis_active: number;
    avis_terminated_success: number;
    avis_terminated_inconclusive: number;
    signalements_validated_this_month: number;
    pending_proofs_count: number;
}> => {
    const avisRows: any = await query(
        `SELECT
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS avis_active,
            SUM(CASE WHEN status = 'terminated_success' THEN 1 ELSE 0 END) AS avis_terminated_success,
            SUM(CASE WHEN status = 'terminated_inconclusive' THEN 1 ELSE 0 END) AS avis_terminated_inconclusive
         FROM signalement_avis WHERE deleted_at IS NULL`
    );

    const monthRows: any = await query(
        `SELECT COUNT(*) AS n FROM signalement_proofs
         WHERE status = 'validated' AND deleted_at IS NULL
           AND validated_at >= DATE_FORMAT(NOW(), '%Y-%m-01')`
    );

    const pendingRows: any = await query(
        `SELECT COUNT(*) AS n FROM signalement_proofs
         WHERE status = 'pending' AND deleted_at IS NULL`
    );

    const a = avisRows[0] || {};
    return {
        avis_active: Number(a.avis_active ?? 0),
        avis_terminated_success: Number(a.avis_terminated_success ?? 0),
        avis_terminated_inconclusive: Number(a.avis_terminated_inconclusive ?? 0),
        signalements_validated_this_month: Number(monthRows[0]?.n ?? 0),
        pending_proofs_count: Number(pendingRows[0]?.n ?? 0),
    };
};
