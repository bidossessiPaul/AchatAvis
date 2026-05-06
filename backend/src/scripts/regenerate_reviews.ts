/**
 * Script : régénération des avis non publiés (sans soumission guide)
 * npx tsx src/scripts/regenerate_reviews.ts
 * Fiche suivante : npx tsx src/scripts/regenerate_reviews.ts --skip=<order_id>
 */

import dotenv from 'dotenv';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { query } from '../config/database';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// Types d'expérience autorisés — jamais "tested" (service utilisé)
// phone = appel pour renseig (pas une prestation)
// online = vu en ligne seulement
// hearsay = bouche-à-oreille
// visited = passé devant sans entrer
type SlotAngle = "phone" | "online" | "hearsay" | "visited";

const SLOT_TEMPLATES: Array<{ opener: string; length: string; angle: SlotAngle }> = [
    // ULTRA-COURTS (2-5 mots, minuscules)
    { opener: "super site",           length: "2-4 mots minuscules sans ponctuation",  angle: "online"  },
    { opener: "bonne réputation",     length: "2-4 mots minuscules sans ponctuation",  angle: "hearsay" },
    { opener: "accueil sympa",        length: "2-4 mots minuscules sans ponctuation",  angle: "phone"   },
    { opener: "equipe pro",           length: "2-4 mots minuscules sans ponctuation",  angle: "hearsay" },
    { opener: "commercial adorable",  length: "2-4 mots minuscules sans ponctuation",  angle: "phone"   },
    { opener: "vendeur top",          length: "2-4 mots minuscules sans ponctuation",  angle: "phone"   },
    { opener: "super support",        length: "2-4 mots minuscules sans ponctuation",  angle: "phone"   },
    { opener: "serieux",              length: "2-4 mots minuscules sans ponctuation",  angle: "hearsay" },
    { opener: "top",                  length: "2-4 mots minuscules sans ponctuation",  angle: "hearsay" },
    { opener: "pro",                  length: "2-4 mots minuscules sans ponctuation",  angle: "hearsay" },

    // COURTS (1 phrase simple, 8-20 mots)
    { opener: "Appele pour renseig,", length: "1 phrase simple 8-15 mots",             angle: "phone"   },
    { opener: "Support tres sympa,",  length: "1 phrase simple 8-15 mots",             angle: "phone"   },
    { opener: "Le commercial",        length: "1 phrase simple 8-15 mots",             angle: "phone"   },
    { opener: "La commerciale",       length: "1 phrase simple 8-15 mots",             angle: "phone"   },
    { opener: "Le vendeur",           length: "1 phrase simple 8-15 mots",             angle: "phone"   },
    { opener: "Le mecanicien",        length: "1 phrase simple 8-15 mots",             angle: "hearsay" },
    { opener: "Le garagiste",         length: "1 phrase simple 8-15 mots",             angle: "hearsay" },
    { opener: "Lu leurs avis,",       length: "1 phrase simple 8-15 mots",             angle: "online"  },
    { opener: "Vu sur Instagram,",    length: "1 phrase simple 8-15 mots",             angle: "online"  },
    { opener: "Vu sur TikTok,",       length: "1 phrase simple 8-15 mots",             angle: "online"  },
    { opener: "Franchement",          length: "1 phrase simple 8-15 mots",             angle: "hearsay" },
    { opener: "Passe devant,",        length: "1 phrase simple 8-15 mots",             angle: "visited" },
    { opener: "Belle vitrine,",       length: "1 phrase simple 8-15 mots",             angle: "visited" },
    { opener: "Entendu parler,",      length: "1 phrase simple 8-15 mots",             angle: "hearsay" },
    { opener: "On m'a dit",           length: "1 phrase simple 8-15 mots",             angle: "hearsay" },
    { opener: "Mon voisin",           length: "1 phrase simple 8-15 mots",             angle: "hearsay" },
    { opener: "Un ami",               length: "1 phrase simple 8-15 mots",             angle: "hearsay" },
    { opener: "Un collegue",          length: "1 phrase simple 8-15 mots",             angle: "hearsay" },
    { opener: "Bonne adresse,",       length: "1 phrase simple 8-15 mots",             angle: "hearsay" },
    { opener: "Votre",                length: "1 phrase simple 8-15 mots vouvoiement", angle: "online"  },

    // MOYENS (2 phrases max, 20-35 mots)
    { opener: "Appele pour avoir des infos,", length: "2 phrases max 20-30 mots",      angle: "phone"   },
    { opener: "Le commercial etait",          length: "2 phrases max 20-30 mots",      angle: "phone"   },
    { opener: "Super accueil par telephone,", length: "2 phrases max 20-30 mots",      angle: "phone"   },
    { opener: "Vu leur page,",                length: "2 phrases max 20-30 mots abrev bcp pr", angle: "online" },
    { opener: "Sympa cette boite,",           length: "2 phrases max 20-30 mots",      angle: "hearsay" },
    { opener: "Dans le coin",                 length: "2 phrases max 20-30 mots",      angle: "hearsay" },
    { opener: "Plusieurs personnes",          length: "2 phrases max 20-30 mots",      angle: "hearsay" },
    { opener: "Vu en passant,",               length: "2 phrases max 20-30 mots",      angle: "visited" },
    { opener: "Ma soeur",                     length: "2 phrases max 20-30 mots",      angle: "hearsay" },
    { opener: "Recommande par",               length: "2 phrases max 20-30 mots",      angle: "hearsay" },
];

function pickSlotTemplates(count: number): typeof SLOT_TEMPLATES {
    const pool = [...SLOT_TEMPLATES];
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const result: typeof SLOT_TEMPLATES = [];
    while (result.length < count) result.push(...pool.slice(0, count - result.length));
    return result.slice(0, count);
}

const SYSTEM_PROMPT = `Tu generes des avis Google Maps courts et realistes pour des professionnels.

TYPES D'AVIS AUTORISES (jamais "j'ai utilise le service") :
- phone : a appele pour avoir des renseignements, personne sympa au telephone. Pas une prestation.
- online : a vu leur site, fiche Google, photos, reseaux sociaux. Rien de plus.
- hearsay : a entendu parler par un ami, voisin, collegue, famille. Reputation locale.
- visited : est passe devant l'etablissement sans entrer. Decrit l'exterieur.

REGLES :
- Avis COURTS et SIMPLES. Pas besoin d'histoires longues.
- Debut IMPOSE : respecte exactement le debut donne pour chaque slot.
- JAMAIS "J'ai decouvert", "J'ai trouve", "J'ai achete", "J'ai commande", "Excellent service"
- Chaque avis du batch commence differemment.

NOMS : varier formats ("marc d.", "Sophie T.", "karim", "nadia b."), 40% minuscules, parfois prenom seul.

FORMAT : JSON uniquement.`;

async function main() {
    const args = process.argv.slice(2);
    const skipArg  = args.find(a => a.startsWith('--skip='));
    const ficheArg = args.find(a => a.startsWith('--fiche='));
    const skipId  = skipArg  ? skipArg.split('=')[1]  : null;
    const ficheId = ficheArg ? ficheArg.split('=')[1] : null;

    let ficheQuery: string;
    let ficheParams: any[];

    if (ficheId) {
        ficheQuery = `SELECT o.id, o.fiche_name, o.company_name, o.sector, o.services,
                  o.staff_names, o.zones, o.city, o.created_at, COUNT(p.id) as nb_proposals
           FROM reviews_orders o
           JOIN review_proposals p ON p.order_id = o.id
           LEFT JOIN reviews_submissions s ON s.proposal_id = p.id
           WHERE s.id IS NULL AND o.deleted_at IS NULL AND o.id = ?
           GROUP BY o.id LIMIT 1`;
        ficheParams = [ficheId];
    } else if (skipId) {
        ficheQuery = `SELECT o.id, o.fiche_name, o.company_name, o.sector, o.services,
                  o.staff_names, o.zones, o.city, o.created_at, COUNT(p.id) as nb_proposals
           FROM reviews_orders o
           JOIN review_proposals p ON p.order_id = o.id
           LEFT JOIN reviews_submissions s ON s.proposal_id = p.id
           WHERE s.id IS NULL AND o.deleted_at IS NULL AND o.id != ?
           GROUP BY o.id ORDER BY o.created_at ASC LIMIT 1`;
        ficheParams = [skipId];
    } else {
        ficheQuery = `SELECT o.id, o.fiche_name, o.company_name, o.sector, o.services,
                  o.staff_names, o.zones, o.city, o.created_at, COUNT(p.id) as nb_proposals
           FROM reviews_orders o
           JOIN review_proposals p ON p.order_id = o.id
           LEFT JOIN reviews_submissions s ON s.proposal_id = p.id
           WHERE s.id IS NULL AND o.deleted_at IS NULL
           GROUP BY o.id ORDER BY o.created_at ASC LIMIT 1`;
        ficheParams = [];
    }

    const fiches: any[] = await query(ficheQuery, ficheParams);

    if (!fiches || fiches.length === 0) {
        console.log('\nAucune fiche avec des avis non publies. Tout est a jour.');
        process.exit(0);
    }

    const fiche = fiches[0];
    console.log(`\nFiche : "${fiche.fiche_name || fiche.company_name}" (id: ${fiche.id})`);
    console.log(`Creee le : ${fiche.created_at} | Avis non publies : ${fiche.nb_proposals}`);

    const proposals: any[] = await query(`
        SELECT p.id, p.content, p.author_name, p.experience_type
        FROM review_proposals p
        LEFT JOIN reviews_submissions s ON s.proposal_id = p.id
        WHERE p.order_id = ? AND s.id IS NULL
        ORDER BY p.created_at ASC
    `, [fiche.id]);

    console.log(`\n-> ${proposals.length} avis a regenerer\n`);
    if (proposals.length === 0) { process.exit(0); }

    const slotTemplates = pickSlotTemplates(proposals.length);
    // phone mappe vers hearsay en DB (pas de valeur "phone" dans le ENUM)
    const reassignedTypes = slotTemplates.map(t => t.angle === "phone" ? "hearsay" : t.angle as 'online' | 'hearsay' | 'visited');

    const companyName = fiche.company_name || fiche.fiche_name || 'cette entreprise';
    const shortName = abbreviateCompanyName(companyName);

    const slotsList = slotTemplates.map((t, i) =>
        `Avis ${i + 1} : debut="${t.opener}" | longueur=${t.length} | type=${t.angle}`
    ).join('\n');

    const userPrompt = `Genere ${proposals.length} avis Google Maps pour "${shortName}" (${fiche.sector || 'professionnel local'}).
Ville : ${fiche.city || '?'} | Services : ${fiche.services || 'tous'} | Staff : ${fiche.staff_names || '?'}

SLOTS (respecte l'ordre et le debut EXACT) :
${slotsList}

Nom : "${shortName}". Rating = 5.
Format : {"reviews":[{"author_name":"...","content":"...","rating":5,"experience_type":"..."}]}`;

    console.log('Appel Claude...');
    const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
            { role: 'user', content: userPrompt },
            { role: 'assistant', content: '{' }
        ]
    });

    const textBlock = response.content[0];
    if (textBlock.type !== 'text') throw new Error('Reponse inattendue');

    const raw = '{' + textBlock.text.trim();
    const parsed = JSON.parse(extractJSON(raw));
    const reviews: any[] = Array.isArray(parsed.reviews) ? parsed.reviews : parsed;
    if (!Array.isArray(reviews) || reviews.length === 0) throw new Error('Format JSON invalide');

    console.log(`${reviews.length} avis recus.\n`);

    let updated = 0;
    for (let i = 0; i < proposals.length; i++) {
        const review = reviews[i];
        if (!review) { console.warn(`Slot ${i + 1} manquant.`); continue; }
        await query(
            `UPDATE review_proposals SET content=?, author_name=?, experience_type=?, updated_at=NOW() WHERE id=?`,
            [review.content?.trim(), review.author_name?.trim(), reassignedTypes[i], proposals[i].id]
        );
        updated++;
        process.stdout.write(`  ${i + 1}/${proposals.length}\r`);
    }

    console.log(`\nOK : ${updated} avis regeneres pour "${fiche.fiche_name || fiche.company_name}"`);
    console.log(`Fiche suivante : npx tsx src/scripts/regenerate_reviews.ts --skip=${fiche.id}\n`);
    process.exit(0);
}

function abbreviateCompanyName(name: string): string {
    if (name.length <= 30) return name;
    return name.split(/\s+/).slice(0, 3).join(' ');
}

function extractJSON(str: string): string {
    let depth = 0;
    const start = str.indexOf('{');
    if (start === -1) throw new Error('Pas de JSON');
    for (let i = start; i < str.length; i++) {
        if (str[i] === '{') depth++;
        else if (str[i] === '}') { depth--; if (depth === 0) return str.substring(start, i + 1); }
    }
    return str.substring(start, str.lastIndexOf('}') + 1);
}

main().catch(err => { console.error('\nErreur :', err.message); process.exit(1); });
