import crypto from 'crypto';
import { query, pool } from '../config/database';
import { notificationService } from './notificationService';
import { forcePayGuide, getGuidesWithBalance } from './adminService';
import { isValidRaisonPaiement, PAIEMENT_RAISONS_ECHEC } from '../constants/paiementRaisons';

/**
 * Sessions de paiement des guides.
 *
 * Flux : ouvrir -> la liste des guides à payer est figée (snapshot des montants
 * dus) -> l'admin renseigne chaque ligne (payé / partiel / échec + raison) ->
 * fermer, ce qui calcule les statistiques définitives et rend le récap visible
 * par les guides concernés.
 */

export type LineStatus = 'pending' | 'paid' | 'partial' | 'failed';

/**
 * Session actuellement ouverte, ou null. Il ne peut y en avoir qu'une à la fois :
 * deux vagues simultanées rendraient le "qui a été payé dans quelle vague"
 * ininterprétable.
 */
export const getOpenSession = async () => {
    const rows = await query(`
        SELECT * FROM payment_sessions
        WHERE status = 'open' AND deleted_at IS NULL
        ORDER BY opened_at DESC
        LIMIT 1
    `);
    return rows[0] || null;
};

/**
 * Ouvre une session et fige dedans tous les guides ayant un net à payer > 0.
 * Le net repris est le même que celui affiché dans l'écran des soldes :
 * demandes en attente + solde disponible.
 */
export const openSession = async (adminId: string, label?: string) => {
    const existing = await getOpenSession();
    if (existing) {
        throw new Error('Une session de paiement est déjà ouverte. Ferme-la avant d\'en ouvrir une nouvelle.');
    }

    const guides: any[] = await getGuidesWithBalance();
    const aPayer = guides.filter(g => Number(g.total_pending) + Number(g.balance) > 0);

    if (aPayer.length === 0) {
        throw new Error('Aucun guide n\'a de montant à payer pour le moment.');
    }

    const sessionId = crypto.randomUUID();
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        await connection.execute(`
            INSERT INTO payment_sessions (id, label, status, opened_by, opened_at)
            VALUES (?, ?, 'open', ?, NOW())
        `, [sessionId, label?.trim() || null, adminId]);

        for (const g of aPayer) {
            const net = Number(g.total_pending) + Number(g.balance);
            await connection.execute(`
                INSERT INTO payment_session_lines
                    (id, session_id, guide_id, amount_due, guide_name_snapshot,
                     guide_email_snapshot, payout_method_snapshot, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
            `, [
                crypto.randomUUID(),
                sessionId,
                g.id,
                net.toFixed(2),
                g.full_name || null,
                g.google_email || g.email || null,
                g.preferred_payout_method || null,
            ]);
        }

        await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }

    return await getSessionDetail(sessionId);
};

/**
 * Session + ses lignes, enrichies du label lisible de la raison d'échec.
 */
export const getSessionDetail = async (sessionId: string) => {
    const sessions = await query(`
        SELECT s.*,
               opener.full_name AS opened_by_name,
               closer.full_name AS closed_by_name
        FROM payment_sessions s
        LEFT JOIN users opener ON opener.id = s.opened_by
        LEFT JOIN users closer ON closer.id = s.closed_by
        WHERE s.id = ? AND s.deleted_at IS NULL
    `, [sessionId]);

    const session = sessions[0];
    if (!session) throw new Error('Session de paiement introuvable.');

    const lines = await query(`
        SELECT l.*,
               u.full_name AS guide_name,
               u.avatar_url,
               gp.google_email,
               gp.phone,
               gp.preferred_payout_method,
               gp.payout_details
        FROM payment_session_lines l
        JOIN users u ON u.id = l.guide_id
        LEFT JOIN guides_profiles gp ON gp.user_id = l.guide_id
        WHERE l.session_id = ?
        ORDER BY l.status = 'pending' DESC, l.amount_due DESC
    `, [sessionId]);

    return {
        ...session,
        lines: lines.map((l: any) => ({
            ...l,
            failure_reason_label: l.failure_reason
                ? (PAIEMENT_RAISONS_ECHEC as any)[l.failure_reason] || l.failure_reason
                : null,
        })),
    };
};

/**
 * Historique des sessions, la plus récente en premier. Les statistiques des
 * sessions fermées sont lues telles quelles ; pour la session encore ouverte on
 * les recalcule à la volée pour afficher une progression en direct.
 */
export const listSessions = async () => {
    return await query(`
        SELECT s.id, s.label, s.status, s.opened_at, s.closed_at,
               s.stats_guides_total, s.stats_paid_count, s.stats_failed_count,
               s.stats_pending_count, s.stats_amount_due, s.stats_amount_paid,
               s.admin_note,
               opener.full_name AS opened_by_name,
               closer.full_name AS closed_by_name,
               COUNT(l.id) AS lines_count,
               COALESCE(SUM(CASE WHEN l.status IN ('paid', 'partial') THEN 1 ELSE 0 END), 0) AS live_paid_count,
               COALESCE(SUM(CASE WHEN l.status = 'failed' THEN 1 ELSE 0 END), 0) AS live_failed_count,
               COALESCE(SUM(CASE WHEN l.status = 'pending' THEN 1 ELSE 0 END), 0) AS live_pending_count,
               COALESCE(SUM(l.amount_due), 0) AS live_amount_due,
               COALESCE(SUM(l.amount_paid), 0) AS live_amount_paid
        FROM payment_sessions s
        LEFT JOIN users opener ON opener.id = s.opened_by
        LEFT JOIN users closer ON closer.id = s.closed_by
        LEFT JOIN payment_session_lines l ON l.session_id = s.id
        WHERE s.deleted_at IS NULL
        GROUP BY s.id
        ORDER BY s.opened_at DESC
    `);
};

/**
 * Enregistre le résultat d'un virement pour une ligne.
 *
 * Un paiement effectif (paid / partial) déclenche le vrai mouvement de solde via
 * forcePayGuide. Une ligne déjà payée n'est donc plus modifiable : re-jouer
 * l'enregistrement créerait un second versement. Une ligne en échec, elle, reste
 * corrigeable tant que la session est ouverte — aucun argent n'a bougé.
 */
export const recordLine = async (
    sessionId: string,
    lineId: string,
    adminId: string,
    payload: {
        status: LineStatus;
        amountPaid?: number;
        failureReason?: string;
        failureNote?: string;
    }
) => {
    const session = (await query(
        `SELECT * FROM payment_sessions WHERE id = ? AND deleted_at IS NULL`,
        [sessionId]
    ))[0];
    if (!session) throw new Error('Session de paiement introuvable.');
    if (session.status !== 'open') throw new Error('Cette session est fermée, elle ne peut plus être modifiée.');

    const line = (await query(
        `SELECT * FROM payment_session_lines WHERE id = ? AND session_id = ?`,
        [lineId, sessionId]
    ))[0];
    if (!line) throw new Error('Ligne de paiement introuvable.');
    if (line.status === 'paid' || line.status === 'partial') {
        throw new Error('Ce guide a déjà été payé dans cette session — le versement ne peut pas être rejoué.');
    }

    const { status } = payload;
    const amountPaid = Number(payload.amountPaid ?? 0);

    if (status === 'pending') {
        throw new Error('Statut invalide : choisis payé, partiel ou non payé.');
    }

    // Un échec ou un partiel doit toujours porter une raison : c'est précisément
    // ce que le guide verra dans son historique.
    if (status === 'failed' || status === 'partial') {
        if (!payload.failureReason || !isValidRaisonPaiement(payload.failureReason)) {
            throw new Error('Raison obligatoire : sélectionne pourquoi le guide n\'a pas été payé intégralement.');
        }
        if (payload.failureReason === 'AUTRE' && !payload.failureNote?.trim()) {
            throw new Error('Précise la raison dans le champ de texte.');
        }
    }

    if (status === 'paid' || status === 'partial') {
        if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
            throw new Error('Montant invalide : saisis un montant supérieur à 0.');
        }
    }

    if (status === 'partial' && amountPaid >= Number(line.amount_due)) {
        throw new Error('Un paiement partiel doit être inférieur au montant dû. Utilise "payé" sinon.');
    }

    // Garde symétrique : marquer "payé" un versement inférieur au dû faisait
    // disparaître le reliquat sans trace (le guide restait créancier sans que
    // personne ne le voie). Un versement incomplet est un paiement PARTIEL,
    // qui exige une raison et laisse le reste dû visible.
    // Tolérance d'un centime pour les arrondis de montants décimaux.
    if (status === 'paid' && amountPaid < Number(line.amount_due) - 0.01) {
        const reste = (Number(line.amount_due) - amountPaid).toFixed(2);
        throw new Error(
            `Montant inférieur au dû (${Number(line.amount_due).toFixed(2)}€) : il manque ${reste}€. ` +
            `Choisis "paiement partiel" et indique la raison — le reliquat restera dû au guide.`
        );
    }

    // Le mouvement de solde réel passe par la mécanique existante (payout_requests)
    if (status === 'paid' || status === 'partial') {
        const note = payload.failureNote?.trim()
            ? `Session de paiement — ${payload.failureNote.trim()}`
            : 'Session de paiement';
        await forcePayGuide(line.guide_id, amountPaid, note);
    }

    await query(`
        UPDATE payment_session_lines
        SET status = ?,
            amount_paid = ?,
            failure_reason = ?,
            failure_note = ?,
            processed_at = NOW(),
            processed_by = ?
        WHERE id = ?
    `, [
        status,
        status === 'failed' ? 0 : amountPaid,
        status === 'paid' ? null : payload.failureReason || null,
        payload.failureNote?.trim() || null,
        adminId,
        lineId,
    ]);

    // Le guide est prévenu immédiatement d'un échec : c'est souvent à lui de
    // corriger ses coordonnées pour que le prochain cycle passe.
    if (status === 'failed') {
        try {
            notificationService.sendToUser(line.guide_id, {
                type: 'payout_failed',
                title: 'Paiement non effectué',
                message: `Votre paiement de ${Number(line.amount_due).toFixed(2)}€ n'a pas pu être effectué : ${(PAIEMENT_RAISONS_ECHEC as any)[payload.failureReason!]}`,
                data: { amount: Number(line.amount_due), reason: payload.failureReason },
            });
        } catch (err) {
            console.error('Notification échec paiement (non bloquant):', err);
        }
    }

    return await getSessionDetail(sessionId);
};

/**
 * Ferme la session et fige ses statistiques. Les lignes jamais traitées restent
 * en 'pending' et sont comptées comme telles — on ne les requalifie pas en échec,
 * l'admin doit pouvoir distinguer "non payé pour telle raison" de "pas traité".
 */
export const closeSession = async (sessionId: string, adminId: string, adminNote?: string) => {
    const session = (await query(
        `SELECT * FROM payment_sessions WHERE id = ? AND deleted_at IS NULL`,
        [sessionId]
    ))[0];
    if (!session) throw new Error('Session de paiement introuvable.');
    if (session.status === 'closed') throw new Error('Cette session est déjà fermée.');

    const stats = (await query(`
        SELECT
            COUNT(*) AS guides_total,
            COALESCE(SUM(CASE WHEN status IN ('paid', 'partial') THEN 1 ELSE 0 END), 0) AS paid_count,
            COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed_count,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_count,
            COALESCE(SUM(amount_due), 0) AS amount_due,
            COALESCE(SUM(amount_paid), 0) AS amount_paid
        FROM payment_session_lines
        WHERE session_id = ?
    `, [sessionId]))[0];

    await query(`
        UPDATE payment_sessions
        SET status = 'closed',
            closed_by = ?,
            closed_at = NOW(),
            admin_note = ?,
            stats_guides_total = ?,
            stats_paid_count = ?,
            stats_failed_count = ?,
            stats_pending_count = ?,
            stats_amount_due = ?,
            stats_amount_paid = ?
        WHERE id = ?
    `, [
        adminId,
        adminNote?.trim() || null,
        stats.guides_total,
        stats.paid_count,
        stats.failed_count,
        stats.pending_count,
        stats.amount_due,
        stats.amount_paid,
        sessionId,
    ]);

    return await getSessionDetail(sessionId);
};

/**
 * Tableau de paiement public, consultable par n'importe quel guide connecté.
 *
 * Objectif : transparence collective. Chaque guide voit qui a été payé et qui ne
 * l'a pas été lors d'une vague donnée, ce qui coupe court aux contestations du
 * type "untel a reçu son argent et pas moi".
 *
 * Ne sont JAMAIS exposés : email, téléphone, coordonnées bancaires ou mobile.
 * La raison d'un non-paiement n'est renvoyée qu'au guide concerné — c'est une
 * information personnelle (compte suspendu, KYC, nom qui ne correspond pas).
 */
export const getPaymentBoard = async (guideId: string, sessionId?: string) => {
    // Les 12 dernières vagues suffisent : au-delà l'information n'est plus
    // consultée et la requête grossit inutilement.
    const sessions = await query(`
        SELECT id, label, closed_at,
               stats_guides_total, stats_paid_count, stats_failed_count,
               stats_pending_count, stats_amount_paid
        FROM payment_sessions
        WHERE status = 'closed' AND deleted_at IS NULL
        ORDER BY closed_at DESC
        LIMIT 12
    `);

    if (sessions.length === 0) return { sessions: [], selected: null, lines: [] };

    // Session demandée, ou la plus récente par défaut
    const selected = sessionId
        ? sessions.find((s: any) => s.id === sessionId) || sessions[0]
        : sessions[0];

    const lines = await query(`
        SELECT l.id, l.guide_id, l.amount_due, l.amount_paid, l.status,
               l.failure_reason,
               COALESCE(u.full_name, l.guide_name_snapshot) AS guide_name
        FROM payment_session_lines l
        LEFT JOIN users u ON u.id = l.guide_id
        WHERE l.session_id = ?
        ORDER BY l.status = 'paid' DESC, l.amount_paid DESC, guide_name ASC
    `, [selected.id]);

    return {
        sessions: sessions.map((s: any) => ({
            id: s.id,
            label: s.label,
            closed_at: s.closed_at,
            stats_guides_total: s.stats_guides_total,
            stats_paid_count: s.stats_paid_count,
            stats_failed_count: s.stats_failed_count,
            stats_pending_count: s.stats_pending_count,
            stats_amount_paid: s.stats_amount_paid,
        })),
        selected: {
            id: selected.id,
            label: selected.label,
            closed_at: selected.closed_at,
            stats_guides_total: selected.stats_guides_total,
            stats_paid_count: selected.stats_paid_count,
            stats_failed_count: selected.stats_failed_count,
            stats_pending_count: selected.stats_pending_count,
            stats_amount_paid: selected.stats_amount_paid,
        },
        lines: lines.map((l: any) => {
            const estMoi = l.guide_id === guideId;
            return {
                id: l.id,
                guide_name: l.guide_name || 'Guide',
                amount_due: l.amount_due,
                amount_paid: l.amount_paid,
                status: l.status,
                is_me: estMoi,
                // La raison reste privée : seul le guide concerné la voit
                failure_reason_label: estMoi && l.failure_reason
                    ? (PAIEMENT_RAISONS_ECHEC as any)[l.failure_reason] || l.failure_reason
                    : null,
            };
        }),
    };
};

/**
 * Annule une session ouverte : elle disparaît de l'historique et les guides
 * redeviennent disponibles pour une nouvelle vague.
 *
 * Refusé dès qu'un virement a été enregistré : l'argent a réellement bougé via
 * forcePayGuide, effacer la session effacerait la trace du versement sans
 * l'annuler pour autant. Dans ce cas il faut fermer, pas annuler.
 */
export const cancelSession = async (sessionId: string) => {
    const session = (await query(
        `SELECT * FROM payment_sessions WHERE id = ? AND deleted_at IS NULL`,
        [sessionId]
    ))[0];
    if (!session) throw new Error('Session de paiement introuvable.');
    if (session.status === 'closed') throw new Error('Une session fermée ne peut plus être annulée.');

    const verses = (await query(`
        SELECT COUNT(*) AS n, COALESCE(SUM(amount_paid), 0) AS total
        FROM payment_session_lines
        WHERE session_id = ? AND status IN ('paid', 'partial')
    `, [sessionId]))[0];

    if (Number(verses.n) > 0) {
        throw new Error(
            `Annulation impossible : ${verses.n} paiement(s) déjà enregistré(s) pour ${Number(verses.total).toFixed(2)}€. ` +
            `L'argent a réellement été versé — ferme la session pour en garder la trace.`
        );
    }

    // Soft-delete : on garde la ligne en base pour l'audit, elle n'apparaît plus nulle part.
    await query(
        `UPDATE payment_sessions SET deleted_at = NOW() WHERE id = ?`,
        [sessionId]
    );

    return { success: true };
};

/**
 * Historique vu par un guide : uniquement les sessions fermées le concernant.
 * Une session ouverte est un brouillon de travail côté admin — la montrer
 * ferait paniquer un guide encore en 'pending'.
 */
export const getGuideSessions = async (guideId: string) => {
    const lines = await query(`
        SELECT l.id, l.amount_due, l.amount_paid, l.status,
               l.failure_reason, l.failure_note, l.processed_at,
               s.id AS session_id, s.label, s.opened_at, s.closed_at
        FROM payment_session_lines l
        JOIN payment_sessions s ON s.id = l.session_id
        WHERE l.guide_id = ?
          AND s.status = 'closed'
          AND s.deleted_at IS NULL
        ORDER BY s.closed_at DESC
    `, [guideId]);

    return lines.map((l: any) => ({
        ...l,
        failure_reason_label: l.failure_reason
            ? (PAIEMENT_RAISONS_ECHEC as any)[l.failure_reason] || l.failure_reason
            : null,
    }));
};
