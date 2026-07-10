import { query } from '../config/database';
import crypto from 'crypto';
import { antiDetectionService } from './antiDetectionService';
import { notificationService } from './notificationService';
import { sendAdminEventNotification, sendMonthlyBonusAvailableEmail } from './emailService';
import { parseImages } from './artisanService';

// Durée pendant laquelle un slot est réservé activement à un guide (le temps de poster sur Google).
const RESERVATION_MINUTES = 25;
// Pause après expiration : le slot reste invisible aux autres guides ET réclamable
// uniquement par le guide d'origine s'il revient. Évite qu'un autre guide reposte
// pendant qu'un premier est encore en train de publier son avis.
const COOLDOWN_MINUTES = 20;
// Un slot est "occupé" (bloque les autres + compte dans le quota) tant qu'il est
// dans la fenêtre réservation + pause. Au-delà, il redevient libre pour tout le monde.

// --- Cadence / étalement des avis dans la journée ---
// Après CHAQUE avis soumis, la fiche se met en pause pour une durée aléatoire entre
// PAUSE_MIN_MINUTES et PAUSE_MAX_MINUTES. Pendant cette pause, la fiche disparaît pour
// tous les guides, puis réapparaît — jusqu'à ce que reviews_per_day soit atteint le jour.
// But : éviter que tous les avis d'une fiche tombent en 15 min (plainte client).
const PAUSE_MIN_MINUTES = 60;   // 1h
const PAUSE_MAX_MINUTES = 240;  // 4h

// --- Échauffement (warm-up) ---
// Avant ses WARMUP_DAILY_LIMIT premières fiches du jour, le guide doit d'abord visiter
// quelques autres fiches clients (interactions réelles, sans avis) pour générer du
// trafic et crédibiliser son profil. Au-delà, accès direct aux fiches.
const WARMUP_DAILY_LIMIT = 3;       // nb de warm-ups exigés par jour avant accès direct
const WARMUP_MIN_FICHES = 3;        // borne basse du tirage aléatoire
const WARMUP_MAX_FICHES = 5;        // borne haute (max 5 fiches à visiter)
const WARMUP_MIN_DURATION_SEC = 10; // temps minimum sur une fiche pour valider la visite

export const guideService = {
    /**
     * Libère les slots des rejets allow_resubmit dont le délai de 24h est dépassé.
     * Appelé en lazy : à chaque getAvailablefiches.
     * - Décrémente reviews_received de l'order correspondant
     * - Désactive allow_resubmit (le guide ne peut plus corriger)
     * - Marque slot_released_at = NOW()
     */
    async releaseExpiredResubmitSlots() {
        const expired: any = await query(`
            SELECT id, order_id FROM reviews_submissions
            WHERE status = 'rejected'
              AND allow_resubmit = 1
              AND slot_released_at IS NULL
              AND rejected_at IS NOT NULL
              AND rejected_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `);

        if (!expired || expired.length === 0) return;

        for (const row of expired) {
            if (row.order_id) {
                await query(`
                    UPDATE reviews_orders
                    SET reviews_received = GREATEST(0, COALESCE(reviews_received, 1) - 1),
                        status = CASE WHEN status = 'completed' THEN 'in_progress' ELSE status END
                    WHERE id = ?
                `, [row.order_id]);
            }

            await query(`
                UPDATE reviews_submissions
                SET slot_released_at = NOW(),
                    allow_resubmit = 0
                WHERE id = ?
            `, [row.id]);
        }
    },

    /**
     * Get fiches available for a specific guide
     * A fiche is available if:
     * 1. The order status is not 'draft' or 'cancelled'
     * 2. The order is not yet fully completed (reviews_received < quantity)
     * 3. The guide hasn't already submitted a review for this order
     */
    async getAvailablefiches(guideId: string) {
        // Libérer en amont les slots expirés (rejets allow_resubmit > 24h)
        await this.releaseExpiredResubmitSlots();

        return query(`
            SELECT o.*,
                   (SELECT COUNT(*) FROM reviews_submissions s2
                    WHERE s2.order_id = o.id AND s2.status != 'rejected') as active_submissions,
                   (SELECT COUNT(*) FROM reviews_submissions s4
                    WHERE s4.order_id = o.id AND s4.status = 'validated') as validated_count,
                   o.locked_by,
                   o.locked_until,
                   sd.sector_name as sector,
                   sd.difficulty,
                   sd.icon_emoji as sector_icon,
                   sd.required_gmail_level,
                   (
                       SELECT COUNT(*)
                       FROM reviews_submissions s
                       WHERE s.order_id = o.id
                       AND DATE(s.submitted_at) = CURDATE()
                       AND s.status != 'rejected'
                   ) as daily_submissions_count,
                   IF(
                       TIMESTAMPDIFF(HOUR,
                           COALESCE(
                               (SELECT MAX(s_last.submitted_at) FROM reviews_submissions s_last
                                WHERE s_last.order_id = o.id AND s_last.status != 'rejected'),
                               o.published_at,
                               o.created_at
                           ),
                           NOW()
                       ) >= 48,
                       0.15,
                       0
                   ) as urgency_bonus
            FROM reviews_orders o
            LEFT JOIN sector_difficulty sd ON o.sector_id = sd.id
            WHERE o.status IN ('in_progress') AND o.deleted_at IS NULL
            AND (SELECT COUNT(*) FROM reviews_submissions s3
                 WHERE s3.order_id = o.id AND s3.status != 'rejected') < o.quantity
            -- Pause post-soumission : la fiche est masquée tant que la pause court (étalement).
            AND (o.paused_until IS NULL OR o.paused_until < NOW())
            AND (o.locked_by IS NULL OR o.locked_until < NOW() OR o.locked_by = ?)
            -- Masque la fiche si son quota journalier est déjà pris (preuves du jour +
            -- slots tenus par d'autres guides, réservation ou pause en cours), sauf si CE
            -- guide détient déjà son propre slot. Évite d'afficher une fiche inouvrable.
            AND (
                EXISTS (
                    SELECT 1 FROM review_proposals pme
                    WHERE pme.order_id = o.id AND pme.reserved_by = ?
                      AND pme.reserved_until > NOW() - INTERVAL ${COOLDOWN_MINUTES} MINUTE
                      AND pme.deleted_at IS NULL
                )
                OR (
                    (SELECT COUNT(*) FROM reviews_submissions sq
                     WHERE sq.order_id = o.id AND DATE(sq.submitted_at) = CURDATE() AND sq.status != 'rejected')
                    +
                    (SELECT COUNT(*) FROM review_proposals pq
                     WHERE pq.order_id = o.id AND pq.deleted_at IS NULL
                       AND pq.reserved_by IS NOT NULL AND pq.reserved_by != ?
                       AND pq.reserved_until > NOW() - INTERVAL ${COOLDOWN_MINUTES} MINUTE
                       AND pq.id NOT IN (
                           SELECT proposal_id FROM reviews_submissions
                           WHERE order_id = o.id AND status != 'rejected' AND proposal_id IS NOT NULL
                       ))
                ) < o.reviews_per_day
            )
            ORDER BY
                -- Fiches où le guide a déjà un slot actif : toujours visibles en premier
                CASE WHEN o.locked_by = ? THEN 0 ELSE 1 END,
                -- Rotation quotidienne déterministe : même 10 fiches toute la journée,
                -- différentes chaque jour, différentes par guide
                RAND(CRC32(CONCAT(?, DATE_FORMAT(NOW(), '%Y%m%d'))))
            LIMIT 10
        `, [guideId, guideId, guideId, guideId, guideId]);
    },

    async getficheDetails(order_id: string, guide_id: string) {
        // Fetch order basic info
        const orderResult: any = await query(`
            SELECT o.*, a.company_name as artisan_company, a.city,
                   sd.difficulty, sd.icon_emoji as sector_icon, sd.sector_name,
                   sd.required_gmail_level,
                   IF(
                       TIMESTAMPDIFF(HOUR,
                           COALESCE(
                               (SELECT MAX(s_last.submitted_at) FROM reviews_submissions s_last
                                WHERE s_last.order_id = o.id AND s_last.status != 'rejected'),
                               o.published_at,
                               o.created_at
                           ),
                           NOW()
                       ) >= 48,
                       0.15,
                       0
                   ) as urgency_bonus
            FROM reviews_orders o
            JOIN artisans_profiles a ON o.artisan_id = a.user_id
            LEFT JOIN sector_difficulty sd ON o.sector_id = sd.id
            WHERE o.id = ?
        `, [order_id]);

        if (!orderResult || orderResult.length === 0) {
            throw new Error('fiche non trouvée');
        }

        const order = orderResult[0];

        // Vérifier si la fiche est verrouillée par un autre guide
        if (order.locked_by && order.locked_by !== guide_id && order.locked_until && new Date(order.locked_until) > new Date()) {
            throw new Error('fiche_LOCKED');
        }

        // 1. Quota Check (Total) — count only active (non-rejected) submissions
        const activeSubStats: any = await query(`
            SELECT COUNT(*) as count
            FROM reviews_submissions
            WHERE order_id = ? AND status != 'rejected'
        `, [order_id]);
        const activeSubmissionsCount = activeSubStats[0].count;
        if (activeSubmissionsCount >= order.quantity) {
            throw new Error('fiche_FULL');
        }

        // 2. Quota journalier — on compte les "occupations" du jour, PAS seulement les preuves
        //    soumises. Une occupation = une preuve soumise aujourd'hui OU un slot encore tenu
        //    par un autre guide (réservation active OU pause après expiration : il est peut-être
        //    en train de poster sur Google ou va revenir). Sans ça, plusieurs guides entrent
        //    pendant qu'un autre poste → doublons Google.
        //    Le guide qui détient déjà un slot (actif ou en pause) n'est jamais compté contre lui-même.
        const dailyStats: any = await query(`
            SELECT
                (SELECT COUNT(*) FROM reviews_submissions
                 WHERE order_id = ? AND DATE(submitted_at) = CURDATE() AND status != 'rejected') AS submitted_today,
                (SELECT COUNT(*) FROM review_proposals
                 WHERE order_id = ? AND deleted_at IS NULL
                   AND reserved_by IS NOT NULL AND reserved_by != ?
                   AND reserved_until > NOW() - INTERVAL ${COOLDOWN_MINUTES} MINUTE
                   AND id NOT IN (
                       SELECT proposal_id FROM reviews_submissions
                       WHERE order_id = ? AND status != 'rejected' AND proposal_id IS NOT NULL
                   )) AS reserved_by_others
        `, [order_id, order_id, guide_id, order_id]);

        const dailyCount = dailyStats[0].submitted_today + dailyStats[0].reserved_by_others;
        // Le guide garde l'accès s'il détient déjà un slot (réservation active ou pause en cours).
        const hasOwnActiveSlot: any = await query(`
            SELECT COUNT(*) AS count FROM review_proposals
            WHERE order_id = ? AND reserved_by = ?
              AND reserved_until > NOW() - INTERVAL ${COOLDOWN_MINUTES} MINUTE
              AND deleted_at IS NULL
        `, [order_id, guide_id]);
        if (dailyCount >= order.reviews_per_day && hasOwnActiveSlot[0].count === 0) {
            throw new Error('DAILY_QUOTA_FULL');
        }

        // 2.b Pause post-soumission — la fiche est en pause depuis le dernier avis (étalement).
        //     Ne bloque pas un guide qui détient déjà son propre slot : il peut finir de poster.
        if (order.paused_until && new Date(order.paused_until) > new Date() && hasOwnActiveSlot[0].count === 0) {
            const remainingMin = Math.max(1, Math.ceil((new Date(order.paused_until).getTime() - Date.now()) / 60000));
            throw new Error(`fiche_PAUSED:${remainingMin}`);
        }

        // 3. Plage horaire de disponibilité (Europe/Paris) — toujours appliqué.
        const nowParis = new Date().toLocaleString('en-GB', {
            timeZone: 'Europe/Paris',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
        const fromStr = String(order.available_from || '07:00:00').slice(0, 8);
        const toStr = String(order.available_to || '23:00:00').slice(0, 8);
        const inWindow = fromStr <= toStr
            ? (nowParis >= fromStr && nowParis <= toStr)
            : (nowParis >= fromStr || nowParis <= toStr);
        if (!inWindow) {
            throw new Error(`fiche_OUTSIDE_HOURS:${fromStr.slice(0, 5)}-${toStr.slice(0, 5)}`);
        }

        // 4. Libère UNIQUEMENT les slots d'autres guides dont la réservation ET la pause
        // sont terminées (fenêtre réservation + pause écoulée). Pendant la pause, le slot
        // reste réservé au guide d'origine — invisible aux autres, réclamable par lui seul.
        // Le contenu n'est JAMAIS réécrit — l'avis fourni par l'artisan reste intact.
        await query(`
            UPDATE review_proposals
            SET reserved_by = NULL, reserved_until = NULL
            WHERE order_id = ?
              AND deleted_at IS NULL
              AND reserved_by IS NOT NULL
              AND reserved_by != ?
              AND reserved_until < NOW() - INTERVAL ${COOLDOWN_MINUTES} MINUTE
              AND id NOT IN (
                  SELECT proposal_id FROM reviews_submissions
                  WHERE order_id = ? AND status != 'rejected' AND proposal_id IS NOT NULL
              )
        `, [order_id, guide_id, order_id]);

        // 5. Trouver/assigner un slot pour ce guide.
        // Priorité : son propre slot s'il en détient un (réclamable même pendant la pause),
        // sinon un slot totalement libre (jamais réservé OU dont la pause est écoulée).
        // ROTATION anti-doublons : l'avis le moins récemment montré d'abord.
        const availableSlotRows: any[] = await query(`
            SELECT * FROM review_proposals
            WHERE order_id = ?
              AND deleted_at IS NULL
              AND (
                  reserved_by = ?
                  OR reserved_by IS NULL
                  OR reserved_until < NOW() - INTERVAL ${COOLDOWN_MINUTES} MINUTE
              )
              AND id NOT IN (
                  SELECT proposal_id FROM reviews_submissions
                  WHERE order_id = ? AND status != 'rejected' AND proposal_id IS NOT NULL
              )
            ORDER BY
              CASE WHEN reserved_by = ? THEN 0 ELSE 1 END,
              COALESCE(last_shown_at, '1970-01-01') ASC,
              created_at ASC
            LIMIT 1
        `, [order_id, guide_id, order_id, guide_id]);

        if (!availableSlotRows || availableSlotRows.length === 0) {
            throw new Error('NO_SLOT_AVAILABLE');
        }

        const slot = availableSlotRows[0];

        // Réserver le slot ET la fiche. last_shown_at = NOW() → cet avis part en bas de la rotation.
        await query(`
            UPDATE review_proposals
            SET reserved_by = ?, reserved_until = DATE_ADD(NOW(), INTERVAL ${RESERVATION_MINUTES} MINUTE),
                last_shown_at = NOW()
            WHERE id = ?
        `, [guide_id, slot.id]);

        await query(`
            UPDATE reviews_orders
            SET locked_by = ?, locked_until = DATE_ADD(NOW(), INTERVAL ${RESERVATION_MINUTES} MINUTE)
            WHERE id = ?
        `, [guide_id, order_id]);

        slot.reserved_until = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000).toISOString();
        slot.images = parseImages(slot.images);

        // Fetch ALL submissions for this order (from ALL guides)
        const submissions = await query(`
            SELECT s.*, u.full_name as guide_name, u.avatar_url as guide_avatar
            FROM reviews_submissions s
            LEFT JOIN users u ON s.guide_id = u.id
            WHERE s.order_id = ?
            ORDER BY s.submitted_at DESC
        `, [order_id]);

        // Signalements liés à cette fiche (avis Google à signaler)
        const signalements: any[] = await query(`
            SELECT sa.id AS avis_id, sa.google_review_url, sa.raison, sa.raison_details,
                   sa.payout_per_signalement_cents, sa.nb_signalements_target,
                   sa.nb_signalements_validated, sa.status AS avis_status,
                   (SELECT COUNT(*) FROM signalement_slots ss
                    WHERE ss.avis_id = sa.id AND ss.status = 'available') AS nb_slots_remaining,
                   (SELECT COUNT(*) FROM signalement_slots ss2
                    WHERE ss2.avis_id = sa.id AND ss2.reserved_by_guide_id = ?
                      AND ss2.status IN ('reserved', 'submitted', 'validated')) AS guide_has_slot
            FROM signalement_avis sa
            WHERE sa.order_id = ? AND sa.status = 'active' AND sa.deleted_at IS NULL
            ORDER BY sa.created_at ASC
        `, [guide_id, order_id]);

        // Récupérer les proposals des soumissions actives pour la section "publiés" en sidebar.
        // Le slot assigné au guide EST la seule proposal "en attente" retournée.
        const activeSubIds: string[] = (submissions as any[])
            .filter((s: any) => s.status !== 'rejected' && s.proposal_id && s.proposal_id !== slot.id)
            .map((s: any) => s.proposal_id as string);

        let proposals: any[] = [slot];

        if (activeSubIds.length > 0) {
            const uniqueIds = [...new Set(activeSubIds)];
            const placeholders = uniqueIds.map(() => '?').join(',');
            const publishedProps: any[] = await query(
                `SELECT * FROM review_proposals WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
                uniqueIds
            );
            for (const p of publishedProps) {
                p.images = parseImages(p.images);
            }
            proposals = [slot, ...publishedProps];
        }

        return {
            ...order,
            proposals,
            submissions,
            daily_submissions_count: dailyCount,
            signalements,
        };
    },

    // Nombre de warm-ups complétés aujourd'hui par le guide (compteur journalier).
    async countCompletedWarmupsToday(guideId: string): Promise<number> {
        const r: any = await query(`
            SELECT COUNT(*) AS n FROM fiche_warmup_sessions
            WHERE guide_id = ? AND completed_at IS NOT NULL AND DATE(completed_at) = CURDATE()
        `, [guideId]);
        return Number(r[0].n);
    },

    // Crée une session d'échauffement : tire N fiches (aléatoire, max 5) à faible trafic,
    // hors cible, et insère une visite "à faire" pour chacune.
    // Renvoie null s'il n'y a aucune autre fiche disponible à réchauffer.
    async createWarmupSession(guideId: string, targetOrderId: string) {
        const n = WARMUP_MIN_FICHES + Math.floor(Math.random() * (WARMUP_MAX_FICHES - WARMUP_MIN_FICHES + 1));

        // Priorité aux fiches qui ont reçu le moins de visites warm-up (distribue le trafic),
        // puis aléatoire. On exige une URL Google pour que les interactions aient un sens.
        const candidates: any[] = await query(`
            SELECT o.id
            FROM reviews_orders o
            WHERE o.status = 'in_progress'
              AND o.deleted_at IS NULL
              AND o.id != ?
              AND o.google_business_url IS NOT NULL AND o.google_business_url != ''
            ORDER BY (
                SELECT COUNT(*) FROM fiche_warmup_visits w
                WHERE w.order_id = o.id AND w.is_done = 1
            ) ASC, RAND()
            LIMIT ${n}
        `, [targetOrderId]);
        // n est un entier maîtrisé (3-5) : inliné car mysql2 refuse un placeholder sur LIMIT
        // en requête préparée ("Incorrect arguments to mysqld_stmt_execute").

        if (!candidates || candidates.length === 0) return null;

        const sessionId = crypto.randomUUID();
        await query(`
            INSERT INTO fiche_warmup_sessions (id, guide_id, target_order_id, required_count, created_at)
            VALUES (?, ?, ?, ?, NOW())
        `, [sessionId, guideId, targetOrderId, candidates.length]);

        for (const c of candidates) {
            await query(
                `INSERT INTO fiche_warmup_visits (id, session_id, guide_id, order_id) VALUES (?, ?, ?, ?)`,
                [crypto.randomUUID(), sessionId, guideId, c.id]
            );
        }

        return { id: sessionId, required_count: candidates.length };
    },

    // État de l'échauffement pour une fiche cible. Crée la session au besoin.
    // - required=false  → accès direct (quota du jour atteint ou aucune fiche à réchauffer)
    // - completed=true  → warm-up déjà fait pour cette cible aujourd'hui
    // - sinon           → liste des fiches à visiter + progression
    async getWarmupForTarget(guideId: string, targetOrderId: string) {
        const sessionsToday = await this.countCompletedWarmupsToday(guideId);

        // Au-delà du quota du jour → plus aucun warm-up requis.
        if (sessionsToday >= WARMUP_DAILY_LIMIT) {
            return { required: false, completed: true, sessionsToday, dailyLimit: WARMUP_DAILY_LIMIT };
        }

        // Warm-up déjà complété pour CETTE cible aujourd'hui → ne pas le refaire.
        const alreadyDone: any[] = await query(`
            SELECT id FROM fiche_warmup_sessions
            WHERE guide_id = ? AND target_order_id = ? AND completed_at IS NOT NULL
              AND DATE(completed_at) = CURDATE()
            LIMIT 1
        `, [guideId, targetOrderId]);
        if (alreadyDone.length > 0) {
            return { required: true, completed: true, sessionsToday, dailyLimit: WARMUP_DAILY_LIMIT };
        }

        // Session en cours pour cette cible (créée aujourd'hui, non complétée) ?
        let session: any = (await query(`
            SELECT * FROM fiche_warmup_sessions
            WHERE guide_id = ? AND target_order_id = ? AND completed_at IS NULL
              AND DATE(created_at) = CURDATE()
            ORDER BY created_at DESC LIMIT 1
        `, [guideId, targetOrderId]))[0];

        // Sinon en créer une.
        if (!session) {
            session = await this.createWarmupSession(guideId, targetOrderId);
            if (!session) {
                // Aucune autre fiche à réchauffer → on n'impose rien.
                return { required: false, completed: true, sessionsToday, dailyLimit: WARMUP_DAILY_LIMIT, reason: 'NO_FICHE_TO_WARMUP' };
            }
        }

        const visits: any[] = await query(`
            SELECT v.id, v.order_id, v.did_itinerary, v.did_website, v.did_contact,
                   v.is_done, v.duration_sec,
                   o.company_name, o.google_business_url,
                   a.city, sd.icon_emoji AS sector_icon, sd.sector_name
            FROM fiche_warmup_visits v
            JOIN reviews_orders o ON v.order_id = o.id
            LEFT JOIN artisans_profiles a ON o.artisan_id = a.user_id
            LEFT JOIN sector_difficulty sd ON o.sector_id = sd.id
            WHERE v.session_id = ?
            ORDER BY v.created_at ASC
        `, [session.id]);

        const completedCount = visits.filter((v: any) => v.is_done).length;

        return {
            required: true,
            completed: false,
            sessionId: session.id,
            requiredCount: session.required_count,
            completedCount,
            sessionsToday,
            dailyLimit: WARMUP_DAILY_LIMIT,
            visits,
        };
    },

    // Valide une visite d'échauffement : les 3 interactions sont obligatoires + durée minimale.
    // Marque la session complétée quand toutes ses visites sont faites.
    async recordWarmupVisit(guideId: string, data: {
        visitId: string,
        didItinerary: boolean,
        didWebsite: boolean,
        didContact: boolean,
        durationSec: number,
    }) {
        const rows: any[] = await query(`
            SELECT v.id, v.session_id FROM fiche_warmup_visits v
            WHERE v.id = ? AND v.guide_id = ?
        `, [data.visitId, guideId]);
        if (!rows || rows.length === 0) throw new Error('VISIT_NOT_FOUND');
        const visit = rows[0];

        if (!data.didItinerary || !data.didWebsite || !data.didContact) {
            throw new Error('ACTIONS_REQUISES');
        }
        if (Number(data.durationSec) < WARMUP_MIN_DURATION_SEC) {
            throw new Error('DUREE_INSUFFISANTE');
        }

        await query(`
            UPDATE fiche_warmup_visits
            SET did_itinerary = 1, did_website = 1, did_contact = 1,
                duration_sec = ?, is_done = 1, visited_at = NOW()
            WHERE id = ?
        `, [Number(data.durationSec), visit.id]);

        const remaining: any = await query(
            `SELECT COUNT(*) AS n FROM fiche_warmup_visits WHERE session_id = ? AND is_done = 0`,
            [visit.session_id]
        );
        const isComplete = Number(remaining[0].n) === 0;
        if (isComplete) {
            await query(
                `UPDATE fiche_warmup_sessions SET completed_at = NOW() WHERE id = ? AND completed_at IS NULL`,
                [visit.session_id]
            );
        }

        const doneCount: any = await query(
            `SELECT COUNT(*) AS n FROM fiche_warmup_visits WHERE session_id = ? AND is_done = 1`,
            [visit.session_id]
        );

        return { success: true, completed: isComplete, completedCount: Number(doneCount[0].n) };
    },

    async releaseficheLock(_order_id: string, _guide_id: string) {
        // IMPORTANT : quitter la page NE libère PLUS le slot.
        // Le guide peut être en train de poster sur Google ou revenir plus tard ;
        // sa réservation court jusqu'à son terme (réservation + pause), période pendant
        // laquelle la fiche reste invisible aux autres et réclamable par lui seul.
        // Le slot est libéré automatiquement à la prochaine consultation d'un autre guide,
        // une fois la fenêtre réservation + pause écoulée (cf. getficheDetails étape 4).
        return { success: true };
    },

    // Renouvelle la réservation du slot actuel du guide (appelé sur "J'ai compris").
    // Le contenu n'est JAMAIS modifié — l'avis est retourné tel que fourni par l'artisan.
    // Le guide peut reprendre son slot même pendant la pause (réservation expirée mais
    // dans la fenêtre de pause).
    async refreshCurrentSlot(orderId: string, guideId: string) {
        const slots: any[] = await query(`
            SELECT p.id FROM review_proposals p
            WHERE p.order_id = ? AND p.reserved_by = ?
              AND p.reserved_until > NOW() - INTERVAL ${COOLDOWN_MINUTES} MINUTE
              AND p.deleted_at IS NULL
              AND p.id NOT IN (
                  SELECT proposal_id FROM reviews_submissions
                  WHERE order_id = ? AND status != 'rejected' AND proposal_id IS NOT NULL
              )
            LIMIT 1
        `, [orderId, guideId, orderId]);

        if (!slots || slots.length === 0) throw new Error('NO_ACTIVE_SLOT');

        const proposalId = slots[0].id;
        await query(
            `UPDATE review_proposals SET reserved_until = DATE_ADD(NOW(), INTERVAL ${RESERVATION_MINUTES} MINUTE) WHERE id = ? AND reserved_by = ?`,
            [proposalId, guideId]
        );
        const same: any[] = await query(
            `SELECT id, content, author_name, experience_type, rating FROM review_proposals WHERE id = ?`,
            [proposalId]
        );
        if (!same || same.length === 0) throw new Error('PROPOSAL_NOT_FOUND');
        return same[0];
    },

    async getMySubmissions(guideId: string) {
        return query(`
            SELECT 
                s.*, 
                COALESCE(o.company_name, 'Établissement inconnu') as artisan_company,
                sd.id as sector_id,
                COALESCE(sd.sector_name, 'Général') as sector_name,
                COALESCE(sd.icon_emoji, '🌐') as sector_icon
            FROM reviews_submissions s
            JOIN reviews_orders o ON s.order_id = o.id
            LEFT JOIN sector_difficulty sd ON o.sector_id = sd.id
            WHERE s.guide_id = ?
            ORDER BY s.submitted_at DESC
        `, [guideId]);
    },

    async submitReviewProof(guideId: string, data: {
        orderId: string,
        proposalId: string,
        reviewUrl: string,
        googleEmail: string,
        artisanId: string,
        gmailAccountId?: number,
        screenshotUrl?: string,
        baseUrl?: string
    }) {
        // 0bis. Garde-fou échauffement : empêche un guide de contourner le warm-up en forçant
        // la soumission via l'API. On s'appuie sur la MÊME logique que le gate front
        // (getWarmupForTarget) → on bloque uniquement si le warm-up est réellement requis pour
        // cette cible ET pas encore complété. Évite le faux positif WARMUP_REQUIRED quand il n'y
        // a aucune autre fiche à réchauffer (NO_FICHE_TO_WARMUP) ou que le quota du jour est atteint.
        const warmupState = await this.getWarmupForTarget(guideId, data.orderId);
        if (warmupState.required && !warmupState.completed) {
            throw new Error('WARMUP_REQUIRED');
        }

        // 0. 🎯 TRUST SCORE: Vérifier quota mensuel du compte Gmail sélectionné
        if (data.gmailAccountId) {
            const gmailAccountResult: any = await query(`
                SELECT * FROM guide_gmail_accounts 
                WHERE id = ? AND user_id = ?
            `, [data.gmailAccountId, guideId]);

            if (gmailAccountResult && gmailAccountResult.length > 0) {
                const gmailAccount = gmailAccountResult[0];

                // Vérifier si bloqué
                if (gmailAccount.is_blocked === true) {
                    throw new Error('ce compte mail est bloqué par l\'administration.');
                }

                // Auto-suspend au 1er mai 2026 si le compte Gmail n'a pas été vérifié manuellement
                const deadline = new Date('2026-05-01');
                if (new Date() >= deadline && gmailAccount.manual_verification_status !== 'verified') {
                    await query('UPDATE guide_gmail_accounts SET is_blocked = 1 WHERE id = ?', [data.gmailAccountId]);
                    throw new Error('Ce compte Gmail a été suspendu : vérification d\'identité requise avant le 1er mai 2026.');
                }

                // Vérifier quota mensuel (Min 20)
                const monthlyLimit = Math.max(20, gmailAccount.monthly_quota_limit || 0);
                const monthlyUsed = gmailAccount.monthly_reviews_posted || 0;

                if (monthlyUsed >= monthlyLimit) {
                    throw new Error(`Quota mensuel atteint pour ce mail (${monthlyUsed}/${monthlyLimit} avis).`);
                }
            }
        }

        // 1. VÉRIFICATION ANTI-DÉTECTION (si gmailAccountId est fourni)
        let currentSectorSlug = '';
        let payoutAmount = 2.00; // Default value
        if (data.gmailAccountId) {
            // ✅ NOUVEAU : Vérifier si le compte Gmail spécifique est actif
            const gmailAccount: any = await query('SELECT is_active FROM guide_gmail_accounts WHERE id = ?', [data.gmailAccountId]);
            if (gmailAccount && gmailAccount.length > 0 && gmailAccount[0].is_active === 0) {
                throw new Error('ce compte mail est bloqué par l\'administration et ne peut plus soumettre d\'avis.');
            }

            const compatibility = await antiDetectionService.canTakefiche(guideId, data.orderId, data.gmailAccountId);
            if (!compatibility.can_take) {
                throw new Error(`Anti-Détection: ${compatibility.message}`);
            }

            // Récupérer le slug du secteur pour plus tard et le payout_per_review
            const orderInfo: any = await query(`
                SELECT o.payout_per_review, sd.sector_slug 
                FROM reviews_orders o
                LEFT JOIN sector_difficulty sd ON o.sector_id = sd.id
                WHERE o.id = ?
            `, [data.orderId]);

            if (orderInfo && orderInfo.length > 0) {
                currentSectorSlug = orderInfo[0].sector_slug || '';
                payoutAmount = Number(orderInfo[0].payout_per_review || 1.00);
            }
        } else {
            // Fallback fetch if no gmail account used (should not happen in prod for most cases but good for safety)
            const orderInfo: any = await query('SELECT payout_per_review FROM reviews_orders WHERE id = ?', [data.orderId]);
            payoutAmount = Number(orderInfo[0]?.payout_per_review || 1.00);
        }

        // Bonus urgence : +0,15€ si aucune soumission valide depuis 48h sur cette fiche
        const urgencyResult: any = await query(`
            SELECT IF(
                TIMESTAMPDIFF(HOUR,
                    COALESCE(
                        (SELECT MAX(s.submitted_at) FROM reviews_submissions s
                         WHERE s.order_id = ? AND s.status != 'rejected'),
                        (SELECT published_at FROM reviews_orders WHERE id = ?),
                        (SELECT created_at FROM reviews_orders WHERE id = ?)
                    ),
                    NOW()
                ) >= 48,
                0.15,
                0
            ) as urgency_bonus
        `, [data.orderId, data.orderId, data.orderId]);
        payoutAmount += Number(urgencyResult[0]?.urgency_bonus || 0);

        // 1. Check if this guide already submitted for THIS proposal
        const existingProp: any = await query(`
            SELECT id FROM reviews_submissions
            WHERE guide_id = ? AND proposal_id = ?
        `, [guideId, data.proposalId]);

        if (existingProp && existingProp.length > 0) {
            throw new Error('Vous avez déjà soumis une preuve pour cet avis.');
        }

        // 2. Check if this Google email was already used for this specific fiche (order)
        // On ignore les rejets : un avis rejeté ne "brûle" pas le compte Gmail sur la fiche,
        // sinon le guide ne peut plus resoumettre ni réutiliser son compte (pool limité).
        // Cohérent avec le reste du service qui compte les soumissions actives via status != 'rejected'.
        const existingEmail: any = await query(`
            SELECT id FROM reviews_submissions
            WHERE order_id = ? AND google_email = ? AND status != 'rejected'
        `, [data.orderId, data.googleEmail]);

        if (existingEmail && existingEmail.length > 0) {
            throw new Error('ce compte mail a déjà été utiliser pour ce projet.');
        }

        const submissionId = crypto.randomUUID();

        // 3. Create submission record
        await query(`
            INSERT INTO reviews_submissions
            (id, guide_id, artisan_id, order_id, proposal_id, review_url, screenshot_url, google_email, gmail_account_id, status, earnings, submitted_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())
        `, [submissionId, guideId, data.artisanId, data.orderId, data.proposalId, data.reviewUrl, data.screenshotUrl || null, data.googleEmail, data.gmailAccountId || null, payoutAmount]);

        // 4. Increment reviews_received + libérer la réservation du slot.
        // La soumission existe → le slot est "consommé", plus besoin de réservation.
        // + Pause aléatoire (1-4h) : la fiche se cache pour tous les guides jusqu'à
        //   paused_until, pour étaler les avis dans la journée (plainte client : tout
        //   en 15 min). reviews_per_day reste la limite du nombre d'avis par jour.
        const pauseMinutes = PAUSE_MIN_MINUTES + Math.floor(Math.random() * (PAUSE_MAX_MINUTES - PAUSE_MIN_MINUTES + 1));
        await query(`
            UPDATE reviews_orders
            SET reviews_received = reviews_received + 1,
                locked_by = NULL,
                locked_until = NULL,
                paused_until = DATE_ADD(NOW(), INTERVAL ? MINUTE)
            WHERE id = ?
        `, [pauseMinutes, data.orderId]);

        await query(`
            UPDATE review_proposals
            SET reserved_by = NULL, reserved_until = NULL
            WHERE id = ?
        `, [data.proposalId]);

        // 5. Mettre à jour les logs d'activité anti-détection
        if (data.gmailAccountId && currentSectorSlug) {
            await antiDetectionService.updateGmailActivity(data.gmailAccountId, currentSectorSlug);
        }



        // 7. Notify Artisan
        notificationService.sendToUser(data.artisanId, {
            type: 'order_update',
            title: 'Nouvel avis reçu ! ✨',
            message: 'Un guide vient de soumettre une preuve pour votre fiche.',
            link: '/artisan/dashboard'
        });

        // 8. Notify Admin — new review proof submitted
        const orderDetails: any = await query(
            `SELECT company_name, quantity, reviews_received FROM reviews_orders WHERE id = ?`,
            [data.orderId]
        );
        const guideInfo: any = await query('SELECT full_name FROM users WHERE id = ?', [guideId]);
        const od = orderDetails?.[0];
        const guideName = guideInfo?.[0]?.full_name || 'Guide';

        sendAdminEventNotification({
            emoji: '📝',
            title: `Nouvel avis soumis — ${od?.company_name || 'Fiche'}`,
            details: [
                { label: 'Guide', value: guideName },
                { label: 'Email Google', value: data.googleEmail },
                { label: 'Entreprise', value: od?.company_name || '—' },
                { label: 'Progression', value: `${od?.reviews_received || '?'}/${od?.quantity || '?'} avis` },
            ],
            ctaLabel: 'Voir les soumissions',
            ctaUrl: '/admin/submissions',
        }, data.baseUrl).catch(() => {});

        // 9. Notify Admin if order just completed
        if (od && od.reviews_received >= od.quantity) {
            sendAdminEventNotification({
                emoji: '✅',
                title: `Fiche complétée — ${od.company_name}`,
                details: [
                    { label: 'Entreprise', value: od.company_name },
                    { label: 'Total avis', value: `${od.quantity}` },
                ],
                ctaLabel: 'Voir les fiches',
                ctaUrl: '/admin/fiches',
            }, data.baseUrl).catch(() => {});
        }

        return { id: submissionId, success: true };
    },

    async getBonusDetails(guideId: string) {
        const fromReviews: any = await query(`
            SELECT COALESCE(SUM(CASE WHEN status = 'validated' THEN earnings ELSE 0 END), 0) as total
            FROM reviews_submissions
            WHERE guide_id = ?
        `, [guideId]);

        const extras: any = await query(`
            SELECT
                COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS total_added,
                COALESCE(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END), 0) AS total_reversed
            FROM guide_bonuses
            WHERE guide_id = ?
        `, [guideId]);

        // Détail des reversements pour affichage guide
        const reversals: any = await query(`
            SELECT amount, reason, created_at
            FROM guide_bonuses
            WHERE guide_id = ? AND amount < 0
            ORDER BY created_at DESC
        `, [guideId]);

        return {
            totalFromReviews: Number(fromReviews[0].total),
            totalExtrasAdded: Number(extras[0].total_added),
            totalReversed: Number(extras[0].total_reversed),
            reversals: reversals as { amount: number; reason: string; created_at: string }[],
        };
    },

    async getEarningsStats(guideId: string) {
        const stats: any = await query(`
            SELECT
                COALESCE(SUM(CASE WHEN status = 'validated' THEN earnings ELSE 0 END), 0) as total_earned
            FROM reviews_submissions
            WHERE guide_id = ?
        `, [guideId]);

        const bonuses: any = await query(`
            SELECT
                COALESCE(SUM(amount), 0) as total_bonuses,
                COALESCE(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END), 0) as total_negative
            FROM guide_bonuses
            WHERE guide_id = ?
        `, [guideId]);

        // Les extras positifs (guide_bonuses > 0) ne rentrent plus dans le solde principal.
        // Les entrées négatives (reversements, avances admin) réduisent toujours le solde.

        const payouts: any = await query(`
            SELECT
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_paid,
                COALESCE(SUM(CASE WHEN status IN ('pending', 'in_revision') THEN amount ELSE 0 END), 0) as total_pending
            FROM payout_requests
            WHERE guide_id = ?
        `, [guideId]);

        // Gains signalement : validés = s'ajoutent au solde, en attente = affichés séparément
        const sigStats: any = await query(`
            SELECT
                COALESCE(SUM(CASE WHEN status = 'validated' THEN earnings_cents ELSE 0 END), 0) AS sig_earned_cents,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN earnings_cents ELSE 0 END), 0) AS sig_pending_cents
            FROM signalement_proofs
            WHERE guide_id = ? AND deleted_at IS NULL
        `, [guideId]);

        const sigEarned = Number(sigStats[0].sig_earned_cents) / 100;
        const sigPending = Number(sigStats[0].sig_pending_cents) / 100;

        // Gains repost social : montant de base (post validé) + bonus vues (déclarations validées)
        const repostBaseStats: any = await query(`
            SELECT
                COALESCE(SUM(CASE WHEN s.status = 'approved' THEN s.base_earnings_cents ELSE 0 END), 0) AS repost_base_earned_cents,
                COALESCE(SUM(CASE WHEN s.status = 'pending' THEN s.base_earnings_cents ELSE 0 END), 0) AS repost_base_pending_cents
            FROM repost_submissions s
            JOIN repost_accounts a ON a.id = s.account_id
            WHERE a.guide_id = ? AND s.deleted_at IS NULL
        `, [guideId]);
        const repostViewStats: any = await query(`
            SELECT COALESCE(SUM(vu.credited_amount_cents), 0) AS repost_view_earned_cents
            FROM repost_view_updates vu
            JOIN repost_submissions s ON s.id = vu.submission_id
            JOIN repost_accounts a ON a.id = s.account_id
            WHERE a.guide_id = ? AND vu.status = 'approved' AND vu.deleted_at IS NULL
        `, [guideId]);
        const repostEarned = (Number(repostBaseStats[0].repost_base_earned_cents) + Number(repostViewStats[0].repost_view_earned_cents)) / 100;
        const repostPending = Number(repostBaseStats[0].repost_base_pending_cents) / 100;

        // Bonus mensuels réclamés — s'ajoutent directement au solde
        const monthlyBonusRows: any = await query(`
            SELECT COALESCE(SUM(amount), 0) AS total_claimed
            FROM monthly_bonus_claims
            WHERE guide_id = ? AND claimed_at IS NOT NULL
        `, [guideId]);
        const monthlyBonusClaimed = Number(monthlyBonusRows[0].total_claimed);

        // Solde principal = avis validés + signalements + repost + entrées négatives (reversements/avances) + bonus mensuels réclamés
        const totalEarned = Number(stats[0].total_earned) + sigEarned + repostEarned + Number(bonuses[0].total_negative) + monthlyBonusClaimed;
        const totalBonuses = Number(bonuses[0].total_bonuses);
        const totalPaid = Number(payouts[0].total_paid);
        const totalPending = Number(payouts[0].total_pending);
        // Le solde guide ne peut pas être négatif côté guide — on cap à 0.
        const balance = Math.max(0, totalEarned - totalPaid - totalPending);

        return {
            totalEarned,
            totalBonuses,
            totalPaid,
            totalPending,
            sigPending,   // montant en attente de validation (signalements soumis)
            repostPending, // montant en attente de validation (reposts soumis)
            balance,
        };
    },

    async getPayoutHistory(guideId: string) {
        return query(`
            SELECT * FROM payout_requests
            WHERE guide_id = ?
            ORDER BY requested_at DESC
        `, [guideId]);
    },

    async requestPayout(guideId: string) {
        const existingPending: any = await query(`
            SELECT COUNT(*) as count FROM payout_requests
            WHERE guide_id = ? AND status IN ('pending', 'in_revision')
        `, [guideId]);

        if (existingPending[0].count > 0) {
            throw new Error('Vous avez déjà une demande de retrait en attente.');
        }

        const stats = await this.getEarningsStats(guideId);

        if (stats.balance < 10) {
            throw new Error('Le montant minimum pour un retrait est de 10€.');
        }

        const payoutId = crypto.randomUUID();
        await query(`
            INSERT INTO payout_requests (id, guide_id, amount, status, requested_at)
            VALUES (?, ?, ?, 'pending', NOW())
        `, [payoutId, guideId, stats.balance]);

        // Notify admin of payout request
        const guideUser: any = await query('SELECT full_name, email FROM users WHERE id = ?', [guideId]);
        const gu = guideUser?.[0];
        sendAdminEventNotification({
            emoji: '💰',
            title: `Demande de retrait — ${gu?.full_name || 'Guide'}`,
            details: [
                { label: 'Guide', value: gu?.full_name || '—' },
                { label: 'Email', value: gu?.email || '—' },
                { label: 'Montant', value: `${stats.balance.toFixed(2)}€` },
            ],
            ctaLabel: 'Gérer les retraits',
            ctaUrl: '/admin/payouts',
        }).catch(() => {});

        return {
            id: payoutId,
            amount: stats.balance
        };
    },

    /**
     * Get statistics for guide dashboard
     */
    async getGuideStats(guideId: string) {
        // 1. Daily Earnings (last 7 days)
        const dailyEarnings: any = await query(`
            SELECT 
                DATE(submitted_at) as date,
                SUM(earnings) as amount,
                COUNT(*) as count
            FROM reviews_submissions
            WHERE guide_id = ? 
            AND status = 'validated'
            AND submitted_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            GROUP BY DATE(submitted_at)
            ORDER BY DATE(submitted_at) ASC
        `, [guideId]);

        // 2. Success rate (validated vs rejected vs pending)
        const successRate: any = await query(`
            SELECT 
                status, 
                COUNT(*) as count
            FROM reviews_submissions
            WHERE guide_id = ?
            GROUP BY status
        `, [guideId]);

        // 3. Global Stats
        const globalStats = await this.getEarningsStats(guideId);

        // Map daily earnings to ensure we have all 7 days
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const found = (dailyEarnings as any[]).find(d => d.date.toISOString().split('T')[0] === dateStr);
            last7Days.push({
                day: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
                amount: found ? Number(found.amount) : 0,
                count: found ? found.count : 0
            });
        }

        return {
            dailyEarnings: last7Days,
            statusDistribution: successRate,
            ...globalStats
        };
    },

    async getGmailQuotasForFiche(userId: string, ficheId: string) {
        const { getGmailQuotasForFiche } = await import('./gmailQuotaService');
        return getGmailQuotasForFiche(userId, ficheId);
    },

    async getPaymentMethod(userId: string) {
        const result: any = await query(`
            SELECT preferred_payout_method, payout_details
            FROM guides_profiles
            WHERE user_id = ?
        `, [userId]);

        if (!result || result.length === 0) return null;

        return {
            method: result[0].preferred_payout_method,
            details: result[0].payout_details
        };
    },

    async updatePaymentMethod(userId: string, method: string, details: any) {
        const result: any = await query(`
            UPDATE guides_profiles
            SET preferred_payout_method = ?, payout_details = ?
            WHERE user_id = ?
        `, [method, JSON.stringify(details), userId]);

        if (result && result.affectedRows === 0) {
            throw new Error('Profil guide introuvable. Veuillez contacter le support.');
        }

        return result;
    },

    async updateSubmission(guideId: string, submissionId: string, data: { reviewUrl?: string, googleEmail?: string }) {
        // 1. Verify submission exists and belongs to the guide
        const existing: any = await query(`
            SELECT s.id, s.status, s.allow_resubmit, s.allow_appeal, p.order_id
            FROM reviews_submissions s
            LEFT JOIN review_proposals p ON s.proposal_id = p.id
            WHERE s.id = ? AND s.guide_id = ?
        `, [submissionId, guideId]);

        if (!existing || existing.length === 0) {
            throw new Error('Soumission non trouvée ou non autorisée');
        }

        const submission = existing[0];
        const isCorrection = submission.status === 'rejected' && submission.allow_resubmit === 1;
        const isAppeal = submission.status === 'rejected' && submission.allow_appeal === 1;

        if (submission.status !== 'pending' && !isCorrection && !isAppeal) {
            throw new Error('Seules les soumissions en attente peuvent être modifiées');
        }

        // 2. Prepare update fields
        const updates: string[] = [];
        const params: any[] = [];

        if (data.reviewUrl) {
            updates.push('review_url = ?');
            params.push(data.reviewUrl);
        }

        if (data.googleEmail) {
            updates.push('google_email = ?');
            params.push(data.googleEmail);
        }

        if (updates.length === 0) return { success: true, message: 'Aucune modification' };

        // 3. If this is a correction or appeal, reset status to pending
        if (isCorrection || isAppeal) {
            updates.push('status = ?');
            params.push('pending');
            updates.push('allow_resubmit = ?');
            params.push(0);
            updates.push('allow_appeal = ?');
            params.push(0);
            updates.push('rejection_reason = ?');
            params.push(null);
        }

        params.push(submissionId);

        // 4. Perform update
        await query(`
            UPDATE reviews_submissions
            SET ${updates.join(', ')}
            WHERE id = ?
        `, params);

        // 5. Réincrémenter uniquement pour appel (où le slot avait été libéré au rejet).
        // Pour allow_resubmit, le slot était conservé donc pas besoin de réincrémenter.
        if (isAppeal && submission.order_id) {
            await query(`
                UPDATE reviews_orders
                SET reviews_received = COALESCE(reviews_received, 0) + 1
                WHERE id = ?
            `, [submission.order_id]);
        }

        // Marquer la submission comme "slot à nouveau actif" : reset rejected_at et slot_released_at
        if (isCorrection || isAppeal) {
            await query(`
                UPDATE reviews_submissions
                SET slot_released_at = NULL, rejected_at = NULL
                WHERE id = ?
            `, [submissionId]);
        }

        return { success: true, message: (isCorrection || isAppeal) ? 'Avis relancé avec succès' : 'Soumission mise à jour avec succès' };
    },

    async getCorrectableSubmissions(guideId: string) {
        return query(`
            SELECT s.id, s.review_url, s.google_email, s.rejection_reason, s.submitted_at, s.earnings,
                   s.allow_resubmit, s.allow_appeal,
                   ro.company_name as artisan_company, ro.sector
            FROM reviews_submissions s
            LEFT JOIN review_proposals p ON s.proposal_id = p.id
            LEFT JOIN reviews_orders ro ON p.order_id = ro.id
            WHERE s.guide_id = ? AND s.status = 'rejected' AND (s.allow_resubmit = 1 OR s.allow_appeal = 1)
            ORDER BY s.submitted_at DESC
        `, [guideId]);
    },

    async getLeaderboard(currentGuideId: string) {
        const rows: any = await query(`
            SELECT
                u.id,
                u.full_name,
                COUNT(s.id) as total_posted,
                SUM(CASE WHEN s.status = 'validated' THEN 1 ELSE 0 END) as total_validated,
                SUM(CASE WHEN s.status = 'pending' THEN 1 ELSE 0 END) as total_pending,
                SUM(CASE WHEN s.status = 'rejected' THEN 1 ELSE 0 END) as total_rejected,
                ROUND(
                    SUM(CASE WHEN s.status = 'validated' THEN 1 ELSE 0 END) * 100.0 /
                    NULLIF(COUNT(s.id), 0)
                , 1) as validation_rate
            FROM users u
            INNER JOIN reviews_submissions s ON s.guide_id = u.id
            WHERE u.role = 'guide'
            GROUP BY u.id, u.full_name
            HAVING total_posted > 0
            ORDER BY total_validated DESC, validation_rate DESC
            LIMIT 20
        `);

        return rows.map((row: any, index: number) => ({
            rank: index + 1,
            name: row.full_name || 'Guide Anonyme',
            totalPosted: Number(row.total_posted),
            totalValidated: Number(row.total_validated),
            totalPending: Number(row.total_pending),
            totalRejected: Number(row.total_rejected),
            validationRate: Number(row.validation_rate) || 0,
            isCurrentUser: row.id === currentGuideId
        }));
    },

    async getMonthlyBonusStatus(guideId: string) {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const THRESHOLD = 25;
        const BONUS_AMOUNT = 5.00;

        const countRows: any = await query(`
            SELECT COUNT(*) AS n
            FROM reviews_submissions
            WHERE guide_id = ?
              AND status = 'validated'
              AND MONTH(validated_at) = ?
              AND YEAR(validated_at) = ?
        `, [guideId, month, year]);

        const validatedCount = Number(countRows[0].n);
        const eligible = validatedCount >= THRESHOLD;

        const claimRows: any = await query(`
            SELECT * FROM monthly_bonus_claims
            WHERE guide_id = ? AND month = ? AND year = ?
        `, [guideId, month, year]);

        const claim = claimRows[0] || null;

        // Envoie le mail de notification une seule fois quand le guide devient éligible
        if (eligible && !claim?.notified_at) {
            const userRows: any = await query(
                `SELECT email, full_name FROM users WHERE id = ? AND deleted_at IS NULL`,
                [guideId]
            );
            if (userRows[0]) {
                const { email, full_name } = userRows[0];
                await sendMonthlyBonusAvailableEmail(email, full_name || 'Guide');
                if (claim) {
                    await query(
                        `UPDATE monthly_bonus_claims SET notified_at = NOW() WHERE guide_id = ? AND month = ? AND year = ?`,
                        [guideId, month, year]
                    );
                } else {
                    const { v4: uuidv4 } = await import('uuid');
                    await query(`
                        INSERT INTO monthly_bonus_claims (id, guide_id, month, year, validated_count, notified_at, amount)
                        VALUES (?, ?, ?, ?, ?, NOW(), ?)
                    `, [uuidv4(), guideId, month, year, validatedCount, BONUS_AMOUNT]);
                }
            }
        }

        return {
            validatedCount,
            threshold: THRESHOLD,
            eligible,
            claimed: !!claim?.claimed_at,
            claimedAt: claim?.claimed_at || null,
            amount: BONUS_AMOUNT,
            month,
            year,
        };
    },

    async claimMonthlyBonus(guideId: string) {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const THRESHOLD = 25;
        const BONUS_AMOUNT = 5.00;

        const countRows: any = await query(`
            SELECT COUNT(*) AS n
            FROM reviews_submissions
            WHERE guide_id = ?
              AND status = 'validated'
              AND MONTH(validated_at) = ?
              AND YEAR(validated_at) = ?
        `, [guideId, month, year]);

        if (Number(countRows[0].n) < THRESHOLD) {
            throw new Error('Pas encore 25 avis validés ce mois-ci.');
        }

        const claimRows: any = await query(`
            SELECT claimed_at FROM monthly_bonus_claims WHERE guide_id = ? AND month = ? AND year = ?
        `, [guideId, month, year]);

        if (claimRows[0]?.claimed_at) {
            throw new Error('Bonus déjà réclamé pour ce mois.');
        }

        const { v4: uuidv4 } = await import('uuid');
        await query(`
            INSERT INTO monthly_bonus_claims (id, guide_id, month, year, validated_count, claimed_at, amount)
            VALUES (?, ?, ?, ?, ?, NOW(), ?)
            ON DUPLICATE KEY UPDATE claimed_at = NOW(), validated_count = VALUES(validated_count)
        `, [uuidv4(), guideId, month, year, Number(countRows[0].n), BONUS_AMOUNT]);

        return { success: true, amount: BONUS_AMOUNT };
    }
};
