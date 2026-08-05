// Génère le CSV de contrôle : pour chaque guide de la session, la raison déduite
// du fichier source et l'état réel en base.
// LECTURE SEULE — aucune écriture.
//
// Usage : npx tsx scripts/export-raisons-controle.ts "<csv source>"

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
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

const INDICATIFS_ETRANGERS = ['228', '225', '226', '221', '227', '223', '224', '237', '242', '250', '33', '32', '212'];

const estBeninois = (reference: string): boolean => {
    const brut = (reference || '').trim();
    if (!brut) return false;
    if (/^[A-Z]{2}\d{2}/i.test(brut.replace(/\s/g, ''))) return false;
    const chiffres = brut.replace(/[^\d]/g, '');
    if (!chiffres) return false;
    if (chiffres.startsWith('229')) return true;
    for (const ind of INDICATIFS_ETRANGERS) if (chiffres.startsWith(ind)) return false;
    return chiffres.length <= 10;
};

const deduireRaison = (moyen: string, reference: string): string => {
    if (!moyen.trim() || !reference.trim()) return 'COORDONNEES_ABSENTES';
    if (!estBeninois(reference)) return 'MOYEN_INDISPONIBLE_PAYS';
    return 'NOM_BENEFICIAIRE_DIFFERENT';
};

const echapper = (v: string) => {
    const sain = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return (sain.includes(',') || sain.includes('"') || sain.includes('\n'))
        ? `"${sain.replace(/"/g, '""')}"` : sain;
};

const ETAT_LISIBLE: Record<string, string> = {
    pending: 'EN ATTENTE - rien ecrit, modifiable',
    paid: 'DEJA PAYE - fige, argent verse',
    partial: 'PARTIEL - fige',
    failed: 'ECHEC ENREGISTRE - corrigeable',
};

const main = async () => {
    const chemin = process.argv[2];
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

    const entetes = [
        'Nom guide', 'Email', 'Moyen de paiement', 'Reference (colonne F)',
        'Statut dans ton fichier', 'Montant a verser (EUR)', 'Montant du en session (EUR)',
        'RAISON_DEDUITE', 'Libelle vu par le guide',
        'ETAT ACTUEL EN BASE',
        'RAISON_CORRIGEE',   // colonne à remplir si la déduction est fausse
    ];

    const lignes: string[] = [];
    for (const ligne of lignesCsv.slice(1)) {
        const c = parseLigne(ligne);
        const nom = (c[0] || '').trim();
        const email = (c[1] || '').trim().toLowerCase();
        const moyen = (c[3] || '').trim();
        const reference = (c[5] || '').trim();
        const net = montant(c[13]);
        const statutCsv = (c[15] || '').trim().toUpperCase() === 'PAYE' ? 'PAYE' : 'NON PAYE';

        if (!nom && !email) continue;
        const ligneSession = email.includes('@') ? parEmail.get(email) : null;

        const raison = statutCsv === 'PAYE' ? '' : deduireRaison(moyen, reference);

        lignes.push([
            echapper(nom),
            echapper(email),
            echapper(moyen || '(vide)'),
            echapper(reference || '(vide)'),
            statutCsv,
            Number.isFinite(net) ? net.toFixed(2) : '',
            ligneSession ? Number(ligneSession.amount_due).toFixed(2) : 'ABSENT DE LA SESSION',
            raison,
            echapper(raison ? (PAIEMENT_RAISONS_ECHEC as any)[raison] : ''),
            echapper(ligneSession ? ETAT_LISIBLE[ligneSession.status] : 'non rattache'),
            '',
        ].join(','));
    }

    const sortie = path.join(process.env.HOME || '.', 'Downloads', 'controle-raisons-paiement.csv');
    fs.writeFileSync(sortie, '﻿' + [entetes.join(','), ...lignes].join('\n'), 'utf8');

    // Récapitulatif de l'état réel
    const parStatut = detail.lines.reduce((acc: Record<string, number>, l: any) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
    }, {});

    console.log('Etat reel de la session :');
    for (const [s, n] of Object.entries(parStatut)) console.log(`   ${s.padEnd(8)} ${n}`);
    console.log(`\nFichier genere : ${sortie}`);
    console.log(`${lignes.length} lignes`);
    process.exit(0);
};

main().catch(err => { console.error('Erreur :', err.message); process.exit(1); });
