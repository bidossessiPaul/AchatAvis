// Vérifie le cooldown global entre 2 signalements sur le même avis.
// Règle métier : on espace les signalements pour rester crédible côté Google.
// Le cooldown est défini en heures dans signalement_config (défaut 2h).
//
// Le cooldown est appliqué sur l'AVIS, pas sur le guide. Si une preuve a été
// soumise (status submitted ou validated) il y a moins de N heures sur cet avis,
// aucun autre guide ne peut prendre un slot tant que le cooldown n'est pas écoulé.

import { query } from '../../config/database';

interface CooldownCheckResult {
    can_take: boolean;
    next_available_at: Date | null; // null si dispo immédiatement
    cooldown_hours: number;
}

export const getCooldownHours = async (): Promise<number> => {
    const rows: any = await query(
        `SELECT cooldown_hours_between_signalements
         FROM signalement_config WHERE id = 'global'`
    );
    return rows[0]?.cooldown_hours_between_signalements ?? 2;
};

/**
 * Vérifie si l'avis donné est en période de cooldown.
 * Retourne can_take=false avec next_available_at si trop tôt.
 */
export const checkCooldownForAvis = async (
    avisId: string
): Promise<CooldownCheckResult> => {
    const cooldownHours = await getCooldownHours();

    // Cherche la dernière proof submitted/validated sur cet avis.
    const rows: any = await query(
        `SELECT MAX(submitted_at) AS last_submitted
         FROM signalement_proofs
         WHERE avis_id = ?
           AND status IN ('pending', 'validated')
           AND deleted_at IS NULL`,
        [avisId]
    );

    const lastSubmitted: Date | null = rows[0]?.last_submitted
        ? new Date(rows[0].last_submitted)
        : null;

    if (!lastSubmitted) {
        // Aucun signalement encore fait → dispo immédiatement.
        return {
            can_take: true,
            next_available_at: null,
            cooldown_hours: cooldownHours,
        };
    }

    const nextAvailable = new Date(
        lastSubmitted.getTime() + cooldownHours * 60 * 60 * 1000
    );
    const now = new Date();

    if (now >= nextAvailable) {
        return {
            can_take: true,
            next_available_at: null,
            cooldown_hours: cooldownHours,
        };
    }

    return {
        can_take: false,
        next_available_at: nextAvailable,
        cooldown_hours: cooldownHours,
    };
};

/**
 * Variante batch : pour une liste d'avis_id, retourne ceux qui sont en cooldown
 * (pour filtrer la liste affichée au guide en une seule requête).
 */
export const getAvisInCooldown = async (
    avisIds: string[]
): Promise<Map<string, Date>> => {
    if (avisIds.length === 0) return new Map();

    const cooldownHours = await getCooldownHours();
    const placeholders = avisIds.map(() => '?').join(',');

    const rows: any = await query(
        `SELECT avis_id, MAX(submitted_at) AS last_submitted
         FROM signalement_proofs
         WHERE avis_id IN (${placeholders})
           AND status IN ('pending', 'validated')
           AND deleted_at IS NULL
         GROUP BY avis_id`,
        avisIds
    );

    const inCooldown = new Map<string, Date>();
    const now = Date.now();
    for (const row of rows) {
        const nextAvailable = new Date(
            new Date(row.last_submitted).getTime() + cooldownHours * 60 * 60 * 1000
        );
        if (nextAvailable.getTime() > now) {
            inCooldown.set(row.avis_id, nextAvailable);
        }
    }
    return inCooldown;
};
