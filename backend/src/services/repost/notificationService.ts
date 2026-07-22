// Notification email des guides lors du lancement d'une campagne vidéo.
// Règles métier :
//   - Cible uniquement les guides "actifs" : dernière connexion < 3 mois
//     ET au moins un avis déjà soumis (habitude de contribuer).
//   - Maximum 100 emails par lancement (base > 3000 guides). Chaque relance
//     envoie aux 100 guides actifs suivants jamais notifiés pour cette vidéo
//     (déduplication via repost_video_notifications).
//   - Les plus récemment actifs sont servis en premier.

import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/database';
import { sendNewRepostVideoEmail } from '../emailService';
import { RepostVideo } from '../../types/repost';

const BATCH_LIMIT = 100;

/** Barème affiché dans l'email : gain de base + bonus vues max par palier actif. */
const getEarningsTable = async () => {
    const rows: any = await query(`
        SELECT t.label, t.amount_cents,
               (SELECT MAX(v.amount_cents)
                FROM repost_view_tiers v
                WHERE v.subscriber_tier_id = t.id
                  AND v.deleted_at IS NULL AND v.is_active = 1) as max_view_bonus_cents
        FROM repost_tiers t
        WHERE t.deleted_at IS NULL AND t.is_active = 1
        ORDER BY t.sort_order, t.min_followers
    `);
    return rows as { label: string; amount_cents: number; max_view_bonus_cents: number | null }[];
};

/** Condition SQL commune : guides actifs éligibles pas encore notifiés pour la vidéo. */
const ELIGIBLE_WHERE = `
    u.role = 'guide'
    AND u.status = 'active'
    AND u.deleted_at IS NULL
    AND u.last_login IS NOT NULL
    AND u.last_login >= (UTC_TIMESTAMP() - INTERVAL 3 MONTH)
    AND EXISTS (SELECT 1 FROM reviews_submissions s WHERE s.guide_id = u.id)
    AND NOT EXISTS (
        SELECT 1 FROM repost_video_notifications n
        WHERE n.video_id = ? AND n.guide_id = u.id
    )
`;

export const notifyGuidesForVideo = async (
    video: RepostVideo,
    baseUrl?: string
): Promise<{ sent: number; remaining: number; already_notified: number }> => {
    const eligibleCountRows: any = await query(
        `SELECT COUNT(*) as total FROM users u WHERE ${ELIGIBLE_WHERE}`,
        [video.id]
    );
    const eligibleTotal = Number(eligibleCountRows[0]?.total || 0);

    const alreadyRows: any = await query(
        `SELECT COUNT(*) as total FROM repost_video_notifications WHERE video_id = ?`,
        [video.id]
    );
    const alreadyNotified = Number(alreadyRows[0]?.total || 0);

    if (eligibleTotal === 0) {
        return { sent: 0, remaining: 0, already_notified: alreadyNotified };
    }

    // Gotcha mysql2 : LIMIT non paramétrable avec query() → entier inliné
    const guides: any = await query(
        `SELECT u.id, u.email FROM users u
         WHERE ${ELIGIBLE_WHERE}
         ORDER BY u.last_login DESC
         LIMIT ${BATCH_LIMIT}`,
        [video.id]
    );

    const tiers = await getEarningsTable();
    await sendNewRepostVideoEmail(
        guides.map((g: any) => g.email),
        video,
        tiers,
        baseUrl
    );

    // Enregistre APRES l'envoi réussi : si le SMTP échoue, rien n'est marqué
    // comme notifié et un relancement retentera les mêmes guides.
    const values = guides.map((g: any) => [uuidv4(), video.id, g.id]);
    await query(
        `INSERT IGNORE INTO repost_video_notifications (id, video_id, guide_id)
         VALUES ${values.map(() => '(?, ?, ?)').join(', ')}`,
        values.flat()
    );

    return {
        sent: guides.length,
        remaining: Math.max(0, eligibleTotal - guides.length),
        already_notified: alreadyNotified,
    };
};

/**
 * Dernière vidéo active que ce guide n'a pas encore repostée (aucune
 * soumission sur aucun de ses comptes) — pour le modal auto du dashboard.
 */
export const getNewVideoAlertForGuide = async (guideId: string) => {
    const videos: any = await query(
        `SELECT v.id, v.title, v.description, v.platforms, v.thumbnail_url, v.created_at
         FROM repost_videos v
         WHERE v.deleted_at IS NULL AND v.is_active = 1
           AND NOT EXISTS (
               SELECT 1 FROM repost_submissions s
               JOIN repost_accounts a ON a.id = s.account_id
               WHERE s.video_id = v.id AND a.guide_id = ? AND s.deleted_at IS NULL
           )
         ORDER BY v.created_at DESC
         LIMIT 1`,
        [guideId]
    );
    if (!videos[0]) return null;

    // Fourchette de gains pour un message explicite dans le modal
    const earningsRows: any = await query(`
        SELECT MIN(t.amount_cents) as min_base, MAX(t.amount_cents) as max_base,
               (SELECT MAX(v.amount_cents) FROM repost_view_tiers v
                JOIN repost_tiers rt ON rt.id = v.subscriber_tier_id
                WHERE v.deleted_at IS NULL AND v.is_active = 1
                  AND rt.deleted_at IS NULL AND rt.is_active = 1) as max_view_bonus
        FROM repost_tiers t
        WHERE t.deleted_at IS NULL AND t.is_active = 1
    `);

    return {
        video: videos[0],
        earnings: {
            min_base_cents: Number(earningsRows[0]?.min_base || 0),
            max_base_cents: Number(earningsRows[0]?.max_base || 0),
            max_view_bonus_cents: Number(earningsRows[0]?.max_view_bonus || 0),
        },
    };
};
