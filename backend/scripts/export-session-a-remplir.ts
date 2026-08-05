// Génère le CSV de report de paiement à partir de la session ouverte.
// Lecture seule : aucune écriture en base.
//
// L'admin remplit les colonnes STATUT / MONTANT_VERSE / RAISON / PRECISION,
// puis le fichier est réinjecté par import-session-paiements.ts.
//
// Usage : npx tsx scripts/export-session-a-remplir.ts

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import * as service from '../src/services/paymentSessionService';
import { PAIEMENT_RAISONS_ECHEC } from '../src/constants/paiementRaisons';

const echapper = (valeur: string) => {
    // Neutralise l'injection de formule Excel, comme l'export existant
    const sain = /^[=+\-@\t\r]/.test(valeur) ? `'${valeur}` : valeur;
    return (sain.includes(',') || sain.includes('"') || sain.includes('\n'))
        ? `"${sain.replace(/"/g, '""')}"`
        : sain;
};

const main = async () => {
    const session = await service.getOpenSession();
    if (!session) {
        console.error('Aucune session ouverte. Ouvre une session depuis l\'écran Soldes Guides.');
        process.exit(1);
    }

    const detail = await service.getSessionDetail(session.id);

    const entetes = [
        'ligne_id',        // identifiant technique — NE PAS MODIFIER
        'Nom guide',
        'Email',
        'Moyen de paiement',
        'Montant du (EUR)',
        'STATUT',          // à remplir : paye | partiel | non_paye
        'MONTANT_VERSE',   // à remplir si paye ou partiel
        'RAISON',          // à remplir si partiel ou non_paye (code exact)
        'PRECISION',       // obligatoire seulement si RAISON = AUTRE
    ];

    const lignes = detail.lines
        .filter((l: any) => l.status === 'pending')
        .map((l: any) => [
            l.id,
            echapper(l.guide_name || l.guide_name_snapshot || ''),
            echapper(l.google_email || l.guide_email_snapshot || ''),
            echapper(l.payout_method_snapshot || ''),
            Number(l.amount_due).toFixed(2),
            '', '', '', '',
        ].join(','));

    const csv = '﻿' + [entetes.join(','), ...lignes].join('\n');
    const sortie = path.join(process.env.HOME || '.', 'Downloads', 'paiements-a-remplir.csv');
    fs.writeFileSync(sortie, csv, 'utf8');

    // Fichier compagnon : la liste exacte des codes acceptés en colonne RAISON
    const raisons = ['code,libelle affiche au guide']
        .concat(Object.entries(PAIEMENT_RAISONS_ECHEC).map(([cle, label]) => `${cle},${echapper(label)}`))
        .join('\n');
    const sortieRaisons = path.join(process.env.HOME || '.', 'Downloads', 'paiements-codes-raisons.csv');
    fs.writeFileSync(sortieRaisons, '﻿' + raisons, 'utf8');

    console.log(`Session  : ${detail.label || detail.id}`);
    console.log(`Lignes à traiter : ${lignes.length}`);
    console.log(`Total dû : ${detail.lines.reduce((s: number, l: any) => s + Number(l.amount_due), 0).toFixed(2)}EUR`);
    console.log(`\nFichiers générés :`);
    console.log(`  ${sortie}`);
    console.log(`  ${sortieRaisons}`);
    process.exit(0);
};

main().catch(err => {
    console.error('Erreur :', err.message);
    process.exit(1);
});
