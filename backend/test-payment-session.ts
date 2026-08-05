// Test de fumée des sessions de paiement, à lancer avec : npx tsx test-payment-session.ts
//
// Ne teste QUE les chemins sans effet de bord : ouverture (snapshot), lecture,
// listing. Les chemins "payé" (mouvement d'argent réel) et "échec" (notification
// envoyée au guide) sont volontairement exclus.
// La session de test est supprimée dans le finally, quoi qu'il arrive.

import 'dotenv/config';
import { query } from './src/config/database';
import * as service from './src/services/paymentSessionService';

const main = async () => {
    let sessionId: string | null = null;

    try {
        const dejaOuverte = await service.getOpenSession();
        if (dejaOuverte) {
            console.log('Une session est déjà ouverte — test annulé pour ne pas interférer.');
            return;
        }

        console.log('1. Ouverture de la session de test...');
        const session = await service.openSession(
            (await query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`))[0].id,
            '[TEST AUTOMATIQUE — à ignorer]'
        );
        sessionId = session.id;
        console.log(`   OK — ${session.lines.length} guide(s) figé(s) dans le snapshot`);

        const total = session.lines.reduce((s: number, l: any) => s + Number(l.amount_due), 0);
        console.log(`   Total dû figé : ${total.toFixed(2)}€`);

        const enPending = session.lines.filter((l: any) => l.status === 'pending').length;
        console.log(`2. Toutes les lignes démarrent en "pending" : ${enPending === session.lines.length ? 'OK' : 'ECHEC'}`);

        console.log('3. Double ouverture interdite...');
        try {
            await service.openSession('peu-importe', 'doublon');
            console.log('   ECHEC — une seconde session a pu être ouverte');
        } catch (err: any) {
            console.log(`   OK — refusée : "${err.message}"`);
        }

        console.log('4. Lecture du détail et du listing...');
        const detail = await service.getSessionDetail(sessionId);
        const liste = await service.listSessions();
        console.log(`   Détail : ${detail.lines.length} ligne(s) — Listing : ${liste.length} session(s)`);

        console.log('5. Invisible côté guide tant que non fermée...');
        const premierGuide = session.lines[0]?.guide_id;
        if (premierGuide) {
            const vueGuide = await service.getGuideSessions(premierGuide);
            const voitLaSession = vueGuide.some((l: any) => l.session_id === sessionId);
            console.log(`   ${voitLaSession ? 'ECHEC — le guide voit une session ouverte' : 'OK — rien de visible'}`);
        }
    } catch (err: any) {
        console.error('ERREUR :', err.message);
    } finally {
        if (sessionId) {
            // CASCADE supprime les lignes associées
            await query(`DELETE FROM payment_sessions WHERE id = ?`, [sessionId]);
            const reste = await query(`SELECT COUNT(*) AS n FROM payment_sessions WHERE id = ?`, [sessionId]);
            console.log(`6. Nettoyage : session de test supprimée (${reste[0].n === 0 ? 'OK' : 'ECHEC'})`);
        }
        process.exit(0);
    }
};

main();
