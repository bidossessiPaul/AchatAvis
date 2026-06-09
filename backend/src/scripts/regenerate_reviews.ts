/**
 * Script : régénération des avis non publiés (sans soumission guide)
 * npx tsx src/scripts/regenerate_reviews.ts [--all] [--preview] [--skip=<id>] [--fiche=<id>] [--force]
 * --all     : traite toutes les fiches en une passe (fetch IDs upfront, pas de boucle infinie)
 * --preview : affiche sans écrire en DB
 * --force   : régénère aussi les proposals déjà soumis (mais pas validés)
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { query } from '../config/database';
import { aiService } from '../services/aiService';

// Taille de chunk par défaut, surchargeable via --chunk=<n>
const DEFAULT_CHUNK_SIZE = 25;

async function generateForFiche(fiche: any, proposals: any[], chunkSize: number = DEFAULT_CHUNK_SIZE): Promise<any[]> {
    const allReviews: any[] = [];
    const nbChunks = Math.ceil(proposals.length / chunkSize);

    for (let i = 0; i < proposals.length; i += chunkSize) {
        const chunk = proposals.slice(i, i + chunkSize);
        if (nbChunks > 1) process.stdout.write(`  Chunk ${Math.floor(i / chunkSize) + 1}/${nbChunks}... `);

        const chunkReviews = await aiService.generateReviews({
            companyName: fiche.company_name || fiche.fiche_name,
            ficheName: fiche.fiche_name,
            trade: fiche.sector_name || fiche.sector || 'Artisan',
            quantity: chunk.length,
            sector: fiche.sector_name || fiche.sector,
            sectorSlug: fiche.sector_slug,
            zones: fiche.zones || fiche.city,
            services: fiche.services,
            staffNames: fiche.staff_names,
            specificInstructions: fiche.specific_instructions,
        });

        if (chunkReviews && chunkReviews.length > 0) {
            allReviews.push(...chunkReviews);
            if (nbChunks > 1) process.stdout.write(`${chunkReviews.length} ok\n`);
        }
    }

    return allReviews;
}

async function processOneFiche(fiche: any, force: boolean, preview: boolean, chunkSize: number = DEFAULT_CHUNK_SIZE): Promise<boolean> {
    const ficheName = fiche.fiche_name || fiche.company_name;
    console.log(`\n=== "${ficheName}" (${fiche.sector_slug || fiche.sector || '?'}, ${fiche.city || '?'}) — ${fiche.nb_proposals} avis ===`);
    if (fiche.specific_instructions) {
        console.log(`  Instructions : ${String(fiche.specific_instructions).substring(0, 100)}...`);
    }

    const proposals: any[] = await query(force ? `
        SELECT DISTINCT p.id FROM review_proposals p
        LEFT JOIN reviews_submissions s ON s.proposal_id = p.id AND s.status = 'validated'
        WHERE p.order_id = ? AND p.deleted_at IS NULL AND s.id IS NULL
          AND p.modified_by_artisan_at IS NULL
        ORDER BY p.created_at ASC
    ` : `
        SELECT p.id FROM review_proposals p
        LEFT JOIN reviews_submissions s ON s.proposal_id = p.id
        WHERE p.order_id = ? AND s.id IS NULL AND p.deleted_at IS NULL
          AND p.modified_by_artisan_at IS NULL
        ORDER BY p.created_at ASC
    `, [fiche.id]);

    if (proposals.length === 0) {
        console.log('  -> 0 avis à régénérer, ignorée.');
        return true;
    }

    console.log(`  -> ${proposals.length} avis`);
    const reviews = await generateForFiche(fiche, proposals, chunkSize);

    if (!reviews || reviews.length === 0) {
        console.error('  ERREUR : aucun avis généré.');
        return false;
    }

    if (preview) {
        console.log(`  PREVIEW : ${reviews.length} avis générés (pas écrits)`);
        return true;
    }

    let updated = 0;
    for (let i = 0; i < proposals.length; i++) {
        const review = reviews[i];
        if (!review) continue;
        await query(
            `UPDATE review_proposals SET content=?, author_name=?, experience_type=?, updated_at=NOW() WHERE id=?`,
            [review.content?.trim(), review.author_name?.trim(), review.experience_type || 'tested', proposals[i].id]
        );
        updated++;
    }

    console.log(`  OK : ${updated}/${proposals.length} avis écrits`);
    return true;
}

async function main() {
    const args = process.argv.slice(2);
    const skipArg   = args.find(a => a.startsWith('--skip='));
    const ficheArg  = args.find(a => a.startsWith('--fiche='));
    const chunkArg  = args.find(a => a.startsWith('--chunk='));
    const skipId    = skipArg  ? skipArg.split('=')[1]  : null;
    const ficheId   = ficheArg ? ficheArg.split('=')[1] : null;
    const chunkSize = chunkArg ? parseInt(chunkArg.split('=')[1], 10) : DEFAULT_CHUNK_SIZE;
    const force     = args.includes('--force');
    const preview   = args.includes('--preview');
    const all       = args.includes('--all');

    const BASE_SELECT = `SELECT o.id, o.fiche_name,
                  COALESCE(a.company_name, o.company_name) as company_name,
                  o.sector, o.services, o.staff_names, o.specific_instructions,
                  COALESCE(a.city, o.city) as city,
                  o.zones, o.created_at,
                  sd.sector_name, sd.sector_slug,
                  COUNT(p.id) as nb_proposals
           FROM reviews_orders o
           LEFT JOIN artisans_profiles a ON a.user_id = o.artisan_id
           LEFT JOIN sector_difficulty sd ON sd.id = o.sector_id
           JOIN review_proposals p ON p.order_id = o.id
           LEFT JOIN reviews_submissions s ON s.proposal_id = p.id`;

    if (all) {
        // Récupère TOUS les IDs upfront pour éviter une boucle infinie
        let allQuery = `${BASE_SELECT} WHERE s.id IS NULL AND o.deleted_at IS NULL`;
        const allParams: any[] = [];
        if (skipId) {
            allQuery += ` AND o.id != ?`;
            allParams.push(skipId);
        }
        allQuery += ` GROUP BY o.id ORDER BY o.created_at ASC`;

        const allFiches: any[] = await query(allQuery, allParams);

        if (!allFiches || allFiches.length === 0) {
            console.log('Aucune fiche à traiter.');
            process.exit(0);
        }

        console.log(`\n=== MODE --all : ${allFiches.length} fiche(s) à traiter ===\n`);
        let ok = 0, ko = 0;

        for (const fiche of allFiches) {
            try {
                const success = await processOneFiche(fiche, force, preview, chunkSize);
                if (success) ok++; else ko++;
            } catch (err: any) {
                console.error(`  ERREUR fiche "${fiche.fiche_name || fiche.company_name}": ${err.message}`);
                ko++;
            }
        }

        console.log(`\n=== Terminé : ${ok} OK / ${ko} erreur(s) ===\n`);

    } else {
        // Mode fiche unique
        let ficheQuery: string;
        let ficheParams: any[];

        if (ficheId) {
            ficheQuery = `${BASE_SELECT} WHERE s.id IS NULL AND o.deleted_at IS NULL AND o.id = ? GROUP BY o.id LIMIT 1`;
            ficheParams = [ficheId];
        } else if (skipId) {
            ficheQuery = `${BASE_SELECT} WHERE s.id IS NULL AND o.deleted_at IS NULL AND o.id != ? GROUP BY o.id ORDER BY o.created_at ASC LIMIT 1`;
            ficheParams = [skipId];
        } else {
            ficheQuery = `${BASE_SELECT} WHERE s.id IS NULL AND o.deleted_at IS NULL GROUP BY o.id ORDER BY o.created_at ASC LIMIT 1`;
            ficheParams = [];
        }

        const fiches: any[] = await query(ficheQuery, ficheParams);
        if (!fiches || fiches.length === 0) {
            console.log('\nAucune fiche avec des avis non publiés.');
            process.exit(0);
        }

        await processOneFiche(fiches[0], force, preview, chunkSize);

        if (preview) {
            console.log(`\n[ Commit ] npx tsx src/scripts/regenerate_reviews.ts --fiche=${fiches[0].id}`);
            console.log(`[ Suivante ] npx tsx src/scripts/regenerate_reviews.ts --preview --skip=${fiches[0].id}`);
        } else {
            console.log(`\nFiche suivante : npx tsx src/scripts/regenerate_reviews.ts --skip=${fiches[0].id}`);
        }
    }

    process.exit(0);
}

main().catch(err => { console.error('\nErreur :', err.message); process.exit(1); });
