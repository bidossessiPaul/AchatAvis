// Reporte dans la session de paiement ouverte les résultats saisis dans le CSV.
//
// Passe par service.recordLine, exactement comme le fait l'interface admin :
// mêmes validations, même mouvement de solde via forcePayGuide, mêmes
// notifications. Les traces en base sont donc identiques à une saisie manuelle.
//
// Usage :
//   npx tsx scripts/import-csv-paiements.ts "<csv>"            -> simulation
//   npx tsx scripts/import-csv-paiements.ts "<csv>" --executer -> écriture réelle

import 'dotenv/config';
import fs from 'fs';
import * as service from '../src/services/paymentSessionService';
import { PAIEMENT_RAISONS_ECHEC } from '../src/constants/paiementRaisons';

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

const montant = (v: string): number => {
    const net = (v || '').trim().replace(/\s/g, '');
    if (!net) return NaN;
    return Number(net.includes(',') ? net.replace(',', '.') : net);
};

/**
 * Indicatifs des pays voisins présents dans le fichier. Un numéro portant l'un
 * d'eux n'est pas joignable par les canaux Mobile Money béninois utilisés pour
 * les virements, d'où la raison "moyen indisponible dans le pays".
 */
const INDICATIFS_ETRANGERS = ['228', '225', '226', '221', '227', '223', '224', '237', '242', '250', '33', '32', '212'];

const estBeninois = (reference: string): boolean => {
    const brut = (reference || '').trim();
    if (!brut) return false;

    // IBAN européen : pas un numéro mobile béninois
    if (/^[A-Z]{2}\d{2}/i.test(brut.replace(/\s/g, ''))) return false;

    const chiffres = brut.replace(/[^\d]/g, '');
    if (!chiffres) return false;

    if (chiffres.startsWith('229')) return true;      // +229 ou 2290...
    for (const ind of INDICATIFS_ETRANGERS) {
        if (chiffres.startsWith(ind)) return false;
    }
    // Sans indicatif : numéro local béninois (8 à 10 chiffres)
    return chiffres.length <= 10;
};

/**
 * Déduit la raison de non-paiement à partir des seules données du fichier.
 * Règle arrêtée avec Maxime — aucune raison n'est inventée hors de ces trois cas.
 */
const deduireRaison = (moyen: string, reference: string): string => {
    if (!moyen.trim() || !reference.trim()) return 'COORDONNEES_ABSENTES';
    if (!estBeninois(reference)) return 'MOYEN_INDISPONIBLE_PAYS';
    return 'NOM_BENEFICIAIRE_DIFFERENT';
};

const main = async () => {
    const chemin = process.argv[2];
    const executer = process.argv.includes('--executer');

    const brut = fs.readFileSync(chemin, 'utf8').replace(/^﻿/, '');
    const lignesCsv = brut.split('\n').filter(l => l.trim().length > 0);

    const session = await service.getOpenSession();
    if (!session) { console.error('Aucune session ouverte.'); process.exit(1); }
    const detail = await service.getSessionDetail(session.id);

    const parEmail = new Map<string, any>();
    for (const l of detail.lines) {
        const mail = (l.google_email || l.guide_email_snapshot || '').trim().toLowerCase();
        if (mail) parEmail.set(mail, l);
    }

    type Action = {
        nom: string; email: string; ligneId: string;
        statut: 'paid' | 'failed'; montantVerse: number; raison?: string;
    };
    const actions: Action[] = [];
    const ignorees: string[] = [];

    for (const ligne of lignesCsv.slice(1)) {
        const c = parseLigne(ligne);
        const nom = (c[0] || '').trim();
        const email = (c[1] || '').trim().toLowerCase();
        const moyen = (c[3] || '').trim();
        const reference = (c[5] || '').trim();     // colonne F : IBAN / Numéro / Email paiement
        const net = montant(c[13]);
        const statutCsv = (c[15] || '').trim().toUpperCase();

        if (!nom && !email) continue;
        if (!email.includes('@')) { ignorees.push(`${nom || '(sans nom)'} — pas d'email exploitable`); continue; }

        const ligneSession = parEmail.get(email);
        if (!ligneSession) { ignorees.push(`${nom} <${email}> — absent de la session`); continue; }
        if (ligneSession.status !== 'pending') { ignorees.push(`${nom} — déjà traité (${ligneSession.status})`); continue; }

        if (statutCsv === 'PAYE') {
            if (!Number.isFinite(net) || net <= 0) { ignorees.push(`${nom} — PAYE mais montant illisible`); continue; }
            actions.push({ nom, email, ligneId: ligneSession.id, statut: 'paid', montantVerse: net });
        } else {
            actions.push({
                nom, email, ligneId: ligneSession.id, statut: 'failed',
                montantVerse: 0, raison: deduireRaison(moyen, reference),
            });
        }
    }

    const payes = actions.filter(a => a.statut === 'paid');
    const echecs = actions.filter(a => a.statut === 'failed');
    const parRaison = echecs.reduce((acc: Record<string, number>, a) => {
        acc[a.raison!] = (acc[a.raison!] || 0) + 1;
        return acc;
    }, {});

    console.log(`=== ${executer ? 'EXECUTION REELLE' : 'SIMULATION (aucune écriture)'} ===`);
    console.log(`Session : ${detail.label}`);
    console.log(`A payer  : ${payes.length} guides — ${payes.reduce((s, p) => s + p.montantVerse, 0).toFixed(2)}EUR`);
    console.log(`En échec : ${echecs.length} guides`);
    for (const [cle, n] of Object.entries(parRaison)) {
        console.log(`   ${n.toString().padStart(3)} x ${(PAIEMENT_RAISONS_ECHEC as any)[cle]}`);
    }
    if (ignorees.length) {
        console.log(`Ignorées : ${ignorees.length}`);
        ignorees.forEach(x => console.log(`   ${x}`));
    }

    if (!executer) {
        console.log('\nSimulation terminée. Relance avec --executer pour écrire.');
        process.exit(0);
    }

    console.log('\n--- Enregistrement ---');
    let ok = 0;
    const erreurs: string[] = [];

    for (const [i, a] of actions.entries()) {
        try {
            await service.recordLine(session.id, a.ligneId, session.opened_by, {
                status: a.statut,
                amountPaid: a.montantVerse,
                failureReason: a.raison,
                failureNote: a.statut === 'paid'
                    ? 'Report du fichier de paiement du 30/07'
                    : undefined,
            });
            ok++;
            if ((i + 1) % 25 === 0) console.log(`   ${i + 1}/${actions.length}...`);
        } catch (err: any) {
            erreurs.push(`${a.nom} : ${err.message}`);
        }
    }

    console.log(`\nEnregistrés : ${ok}/${actions.length}`);
    if (erreurs.length) {
        console.log(`Erreurs : ${erreurs.length}`);
        erreurs.forEach(x => console.log(`   ${x}`));
    }
    process.exit(0);
};

main().catch(err => { console.error('Erreur :', err.message); process.exit(1); });
