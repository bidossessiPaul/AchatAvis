/**
 * Source de vérité unique du solde d'un guide.
 *
 * Pourquoi ce fichier : la vue guide (Mes gains) et la vue admin (Soldes des
 * guides) calculaient chacune leur solde, avec des formules divergentes. Un
 * même compte pouvait afficher 0 € au guide et 20,10 € à l'admin. Toute
 * évolution de la règle doit désormais se faire ICI, et nulle part ailleurs.
 *
 * La requête ne renvoie que les COMPOSANTS bruts ; l'arbitrage métier est fait
 * en TypeScript par computeBalance(). C'est ce qui garantit que les deux vues
 * appliquent la même règle : l'admin lit tous les guides d'un coup, le guide
 * lit sa seule ligne, mais le calcul final est le même code.
 */
import { query } from '../config/database';

export interface BalanceComponents {
    guide_id: string;
    /** Avis validés */
    avis_earned: number;
    /** Somme algébrique de guide_bonuses (primes créditées ET leurs annulations) */
    bonus_sum: number;
    /** Bonus mensuels effectivement réclamés */
    monthly_claimed: number;
    /** Signalements validés / en attente de validation */
    sig_earned: number;
    sig_pending: number;
    /** Repost social : base validée + bonus de vues / base en attente */
    repost_earned: number;
    repost_pending: number;
    /** Versements */
    total_paid: number;
    total_pending: number;
}

export interface GuideBalance {
    totalEarned: number;
    totalBonuses: number;
    totalPaid: number;
    totalPending: number;
    sigPending: number;
    repostPending: number;
    balance: number;
}

/**
 * Applique la règle métier du solde.
 *
 * Les extras positifs (primes de niveau, bonus manuels) ne créditent PAS le
 * solde principal : ils ont été retirés de la plateforme le 19/06/2026. Mais
 * leurs annulations ne doivent pas non plus le débiter — sinon un guide se
 * voit reprendre une prime qui ne lui avait jamais été versée sur son solde.
 *
 * D'où `Math.min(0, bonus_sum)` : seul un solde d'extras NET négatif (avance
 * admin, reversement pour fraude) réduit le solde. Une prime annulée par son
 * propre retrait s'annule à zéro et reste neutre.
 *
 * Le solde n'est volontairement pas caponné à zéro : un sur-paiement doit
 * rester visible des deux côtés plutôt que d'être masqué.
 */
export const computeBalance = (c: BalanceComponents): GuideBalance => {
    const bonusEffectif = Math.min(0, c.bonus_sum);

    const totalEarned =
        c.avis_earned + c.sig_earned + c.repost_earned + c.monthly_claimed + bonusEffectif;

    return {
        totalEarned,
        totalBonuses: c.bonus_sum,
        totalPaid: c.total_paid,
        totalPending: c.total_pending,
        sigPending: c.sig_pending,
        repostPending: c.repost_pending,
        balance: totalEarned - c.total_paid - c.total_pending,
    };
};

/**
 * Composants bruts du solde. Sans guideId, renvoie tous les guides ayant au
 * moins un avis validé (périmètre historique de la vue admin) ; avec guideId,
 * renvoie la ligne de ce guide même s'il n'a aucun avis validé.
 */
export const listBalanceComponents = async (guideId?: string): Promise<BalanceComponents[]> => {
    const rows: any = await query(`
        SELECT
            u.id AS guide_id,
            COALESCE(sub.avis_earned, 0)        AS avis_earned,
            COALESCE(bon.bonus_sum, 0)          AS bonus_sum,
            COALESCE(mb.monthly_claimed, 0)     AS monthly_claimed,
            COALESCE(sig.sig_earned, 0)         AS sig_earned,
            COALESCE(sig.sig_pending, 0)        AS sig_pending,
            COALESCE(rb.base_earned, 0) + COALESCE(rv.view_earned, 0) AS repost_earned,
            COALESCE(rb.base_pending, 0)        AS repost_pending,
            COALESCE(pay.total_paid, 0)         AS total_paid,
            COALESCE(pay.total_pending, 0)      AS total_pending
        FROM users u
        ${guideId ? 'LEFT' : 'INNER'} JOIN (
            SELECT guide_id, COALESCE(SUM(earnings), 0) AS avis_earned
            FROM reviews_submissions WHERE status = 'validated' GROUP BY guide_id
        ) sub ON sub.guide_id = u.id
        LEFT JOIN (
            SELECT guide_id, COALESCE(SUM(amount), 0) AS bonus_sum
            FROM guide_bonuses GROUP BY guide_id
        ) bon ON bon.guide_id = u.id
        LEFT JOIN (
            SELECT guide_id, COALESCE(SUM(amount), 0) AS monthly_claimed
            FROM monthly_bonus_claims WHERE claimed_at IS NOT NULL GROUP BY guide_id
        ) mb ON mb.guide_id = u.id
        LEFT JOIN (
            SELECT guide_id,
                COALESCE(SUM(CASE WHEN status = 'validated' THEN earnings_cents ELSE 0 END), 0) / 100 AS sig_earned,
                COALESCE(SUM(CASE WHEN status = 'pending'   THEN earnings_cents ELSE 0 END), 0) / 100 AS sig_pending
            FROM signalement_proofs WHERE deleted_at IS NULL GROUP BY guide_id
        ) sig ON sig.guide_id = u.id
        LEFT JOIN (
            SELECT a.guide_id,
                COALESCE(SUM(CASE WHEN s.status = 'approved' THEN s.base_earnings_cents ELSE 0 END), 0) / 100 AS base_earned,
                COALESCE(SUM(CASE WHEN s.status = 'pending'  THEN s.base_earnings_cents ELSE 0 END), 0) / 100 AS base_pending
            FROM repost_accounts a
            JOIN repost_submissions s ON s.account_id = a.id AND s.deleted_at IS NULL
            GROUP BY a.guide_id
        ) rb ON rb.guide_id = u.id
        LEFT JOIN (
            SELECT a.guide_id, COALESCE(SUM(vu.credited_amount_cents), 0) / 100 AS view_earned
            FROM repost_accounts a
            JOIN repost_submissions s ON s.account_id = a.id AND s.deleted_at IS NULL
            JOIN repost_view_updates vu ON vu.submission_id = s.id AND vu.status = 'approved' AND vu.deleted_at IS NULL
            GROUP BY a.guide_id
        ) rv ON rv.guide_id = u.id
        LEFT JOIN (
            SELECT guide_id,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS total_paid,
                COALESCE(SUM(CASE WHEN status IN ('pending', 'in_revision') THEN amount ELSE 0 END), 0) AS total_pending
            FROM payout_requests GROUP BY guide_id
        ) pay ON pay.guide_id = u.id
        WHERE u.role = 'guide' ${guideId ? 'AND u.id = ?' : ''}
    `, guideId ? [guideId] : undefined);

    return rows.map((r: any) => ({
        guide_id: r.guide_id,
        avis_earned: Number(r.avis_earned),
        bonus_sum: Number(r.bonus_sum),
        monthly_claimed: Number(r.monthly_claimed),
        sig_earned: Number(r.sig_earned),
        sig_pending: Number(r.sig_pending),
        repost_earned: Number(r.repost_earned),
        repost_pending: Number(r.repost_pending),
        total_paid: Number(r.total_paid),
        total_pending: Number(r.total_pending),
    }));
};

/** Solde d'un guide unique. */
export const getBalance = async (guideId: string): Promise<GuideBalance> => {
    const [components] = await listBalanceComponents(guideId);
    if (!components) {
        return {
            totalEarned: 0, totalBonuses: 0, totalPaid: 0, totalPending: 0,
            sigPending: 0, repostPending: 0, balance: 0,
        };
    }
    return computeBalance(components);
};
