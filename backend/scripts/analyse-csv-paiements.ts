// Analyse à blanc du CSV de report de paiement contre la session ouverte.
// LECTURE SEULE — aucune écriture en base, aucun mouvement d'argent.
//
// Objectif : mesurer exactement ce qui est exploitable avant toute saisie.
// Usage : npx tsx scripts/analyse-csv-paiements.ts "<chemin du csv>"

import 'dotenv/config';
import fs from 'fs';
import * as service from '../src/services/paymentSessionService';

// Parseur CSV minimal : gère les champs entre guillemets ("17,4")
const parseLigne = (ligne: string): string[] => {
    const champs: string[] = [];
    let courant = '';
    let dansGuillemets = false;
    for (let i = 0; i < ligne.length; i++) {
        const c = ligne[i];
        if (c === '"') {
            if (dansGuillemets && ligne[i + 1] === '"') { courant += '"'; i++; continue; }
            dansGuillemets = !dansGuillemets;
            continue;
        }
        if (c === ',' && !dansGuillemets) { champs.push(courant); courant = ''; continue; }
        courant += c;
    }
    champs.push(courant);
    return champs;
};

// "17,4" -> 17.4  |  "17.40" -> 17.4
const montant = (v: string): number => {
    const nettoye = (v || '').trim().replace(/\s/g, '');
    if (!nettoye) return NaN;
    return Number(nettoye.includes(',') ? nettoye.replace(',', '.') : nettoye);
};

const main = async () => {
    const chemin = process.argv[2];
    const brut = fs.readFileSync(chemin, 'utf8').replace(/^﻿/, '');
    const lignes = brut.split('\n').filter(l => l.trim().length > 0);

    const session = await service.getOpenSession();
    if (!session) { console.error('Aucune session ouverte.'); process.exit(1); }
    const detail = await service.getSessionDetail(session.id);

    // Index des lignes de session par email, en minuscules
    const parEmail = new Map<string, any>();
    for (const l of detail.lines) {
        const mail = (l.google_email || l.guide_email_snapshot || '').trim().toLowerCase();
        if (mail) parEmail.set(mail, l);
    }

    const payes: any[] = [];
    const nonPayes: any[] = [];
    const introuvables: string[] = [];
    const sansEmail: string[] = [];
    const ecarts: string[] = [];
    const emailsVus = new Set<string>();

    // Ligne 0 = en-têtes
    for (const ligne of lignes.slice(1)) {
        const c = parseLigne(ligne);
        const nom = (c[0] || '').trim();
        const email = (c[1] || '').trim().toLowerCase();
        const net = montant(c[13]);
        const statut = (c[15] || '').trim().toUpperCase();

        if (!nom && !email) continue;                       // ligne de total en fin de fichier
        if (!email || !email.includes('@')) { sansEmail.push(nom || '(sans nom)'); continue; }

        const ligneSession = parEmail.get(email);
        if (!ligneSession) { introuvables.push(`${nom} <${email}>`); continue; }
        emailsVus.add(email);

        if (statut === 'PAYE') {
            if (!Number.isFinite(net) || net <= 0) {
                ecarts.push(`${nom} : marqué PAYE mais montant illisible ("${c[13]}")`);
                continue;
            }
            const du = Number(ligneSession.amount_due);
            if (Math.abs(du - net) > 0.005) {
                ecarts.push(`${nom} : CSV ${net.toFixed(2)}EUR vs session ${du.toFixed(2)}EUR`);
            }
            payes.push({ nom, email, net, du });
        } else {
            nonPayes.push({ nom, email, du: Number(ligneSession.amount_due) });
        }
    }

    const jamaisDansCsv = detail.lines.filter((l: any) => {
        const mail = (l.google_email || l.guide_email_snapshot || '').trim().toLowerCase();
        return mail && !emailsVus.has(mail);
    });

    const totalPaye = payes.reduce((s, p) => s + p.net, 0);

    console.log('=========== ANALYSE (aucune écriture) ===========');
    console.log(`Session      : ${detail.label} — ${detail.lines.length} guides, ${detail.lines.reduce((s: number, l: any) => s + Number(l.amount_due), 0).toFixed(2)}EUR dus`);
    console.log(`CSV          : ${lignes.length - 1} lignes de données\n`);
    console.log(`A MARQUER PAYE      : ${payes.length} guides — ${totalPaye.toFixed(2)}EUR`);
    console.log(`A MARQUER NON PAYE  : ${nonPayes.length} guides (raison MANQUANTE dans le CSV)`);
    console.log(`INTROUVABLES en session : ${introuvables.length}`);
    console.log(`Lignes sans email valide : ${sansEmail.length}`);
    console.log(`Guides de la session absents du CSV : ${jamaisDansCsv.length}`);
    console.log(`Ecarts de montant CSV vs session : ${ecarts.length}`);

    if (introuvables.length) {
        console.log('\n--- Introuvables (10 premiers) ---');
        introuvables.slice(0, 10).forEach(x => console.log(`  ${x}`));
    }
    if (sansEmail.length) {
        console.log('\n--- Sans email valide ---');
        sansEmail.forEach(x => console.log(`  ${x}`));
    }
    if (ecarts.length) {
        console.log('\n--- Ecarts de montant (15 premiers) ---');
        ecarts.slice(0, 15).forEach(x => console.log(`  ${x}`));
    }
    if (nonPayes.length) {
        console.log('\n--- Non payés, en attente d\'une raison ---');
        nonPayes.forEach(x => console.log(`  ${x.nom} <${x.email}> — ${x.du.toFixed(2)}EUR`));
    }

    process.exit(0);
};

main().catch(err => { console.error('Erreur :', err.message); process.exit(1); });
