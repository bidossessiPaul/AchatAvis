/**
 * Ajoute N avis longs (hearsay/online/visited) pour une fiche donnée.
 * Usage : npx tsx src/scripts/add_long_reviews.ts --fiche=<order_id> --count=9
 */

import dotenv from 'dotenv';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.join(__dirname, '../../.env') });
import { query } from '../config/database';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const LONG_SLOTS = [
    { opener: "Mon beau-frère avait eu",        angle: "hearsay", length: "4 phrases 70-90 mots, anecdote familiale détaillée" },
    { opener: "Vu leur site web,",               angle: "online",  length: "4 phrases 70-90 mots, détails sur le contenu du site" },
    { opener: "J'en avais entendu parler",       angle: "hearsay", length: "4 phrases 70-90 mots, contexte du quartier" },
    { opener: "Passé devant plusieurs fois,",    angle: "visited", length: "4 phrases 70-90 mots, description extérieur + impression" },
    { opener: "Ma voisine de palier",            angle: "hearsay", length: "4 phrases 80-100 mots, recommandation voisine détaillée" },
    { opener: "Leur fiche Google est",           angle: "online",  length: "4 phrases 70-90 mots, photos et avis lus en ligne" },
    { opener: "Dans notre copropriété",          angle: "hearsay", length: "4 phrases 80-100 mots, réputation dans la résidence" },
    { opener: "Le syndic de notre immeuble",     angle: "hearsay", length: "4 phrases 80-100 mots, recommandation professionnelle" },
    { opener: "Un ami de longue date",           angle: "hearsay", length: "4 phrases 90-110 mots, anecdote longue et détaillée" },
    { opener: "En cherchant sur Google,",        angle: "online",  length: "4 phrases 70-90 mots, recherche en ligne détaillée" },
    { opener: "Plusieurs collègues",             angle: "hearsay", length: "4 phrases 70-90 mots, retours convergents" },
    { opener: "Passé devant un matin,",          angle: "visited", length: "4 phrases 70-90 mots, matériel et camion visibles" },
    { opener: "On m'avait conseillé",            angle: "hearsay", length: "4 phrases 70-90 mots, contexte de la recommandation" },
    { opener: "Vu sur leur page,",               angle: "online",  length: "4 phrases 70-90 mots, réseaux sociaux ou site" },
    { opener: "Appelé pour me renseigner,",      angle: "hearsay", length: "4 phrases 70-90 mots, accueil téléphonique détaillé" },
];

const SYSTEM = `Tu generes des avis Google Maps longs et authentiques pour un artisan plombier local.

TYPES AUTORISES :
- hearsay : connu par bouche-a-oreille (ami, voisin, famille, collegue, syndic). Pas de prestation personnelle.
- online : vu leur site web, fiche Google, photos, reseaux. Pas d'intervention physique.
- visited : passe devant l'etablissement. Decrit ce vu de l'exterieur uniquement.

REGLES :
- Avis LONGS et DETAILLES : 4 phrases minimum, 70-110 mots.
- Debut EXACT respecte.
- Noms varies (marie c., Jean-Pierre, nathalie b...), 40% minuscules.
- Jamais "Excellent service", "Je recommande vivement", "Travail soigne et professionnel".
- Integre "Didier" ou "Villiers" naturellement dans 1 avis sur 3.
FORMAT : JSON uniquement.`;

async function main() {
    const args = process.argv.slice(2);
    const ficheArg = args.find(a => a.startsWith('--fiche='));
    const countArg = args.find(a => a.startsWith('--count='));
    const orderId  = ficheArg ? ficheArg.split('=')[1] : null;
    const count    = countArg ? parseInt(countArg.split('=')[1]) : 9;

    if (!orderId) { console.error('--fiche=<order_id> requis'); process.exit(1); }

    // Récupère le contexte de la fiche
    const rows: any[] = await query(`
        SELECT COALESCE(a.company_name, o.company_name) as company_name,
               COALESCE(a.city, o.city) as city,
               o.services, o.zones, o.staff_names
        FROM reviews_orders o
        LEFT JOIN artisans_profiles a ON a.user_id = o.artisan_id
        WHERE o.id = ? AND o.deleted_at IS NULL LIMIT 1
    `, [orderId]);

    if (!rows.length) { console.error('Fiche introuvable'); process.exit(1); }
    const f = rows[0];
    const slots = LONG_SLOTS.slice(0, count);

    console.log(`Fiche : "${f.company_name}" — ${f.city}`);
    console.log(`Génération de ${count} avis longs...\n`);

    const userPrompt = `Genere ${count} avis Google Maps LONGS pour "${f.company_name}" (plombier local).
Ville : ${f.city} | Zones : ${f.zones || f.city}
Services : ${f.services || 'plomberie générale'}
Staff : ${f.staff_names || 'non précisé'}

SLOTS (respecte debut EXACT et longueur) :
${slots.map((s, i) => `Avis ${i+1} : debut="${s.opener}" | longueur=${s.length} | type=${s.angle}`).join('\n')}

Format : {"reviews":[{"author_name":"...","content":"...","rating":5,"experience_type":"..."}]}`;

    const resp = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 6000,
        system: SYSTEM,
        messages: [
            { role: 'user', content: userPrompt },
            { role: 'assistant', content: '{' }
        ]
    });

    const raw = '{' + (resp.content[0] as any).text.trim();
    const extractJSON = (str: string) => {
        let depth = 0, start = str.indexOf('{');
        for (let i = start; i < str.length; i++) {
            if (str[i] === '{') depth++;
            else if (str[i] === '}') { depth--; if (depth === 0) return str.substring(start, i + 1); }
        }
        return str.substring(start, str.lastIndexOf('}') + 1);
    };

    const parsed = JSON.parse(extractJSON(raw));
    const reviews: any[] = parsed.reviews || parsed;
    console.log(`${reviews.length} avis reçus. Insertion...`);

    for (let i = 0; i < reviews.length; i++) {
        const r = reviews[i];
        const slot = slots[i];
        const expType = slot.angle === 'phone' ? 'hearsay' : slot.angle;
        await query(
            `INSERT INTO review_proposals (id, order_id, content, rating, author_name, experience_type, status, created_at, updated_at)
             VALUES (?, ?, ?, 5, ?, ?, 'approved', NOW(), NOW())`,
            [uuidv4(), orderId, r.content?.trim(), r.author_name?.trim(), expType]
        );
        process.stdout.write(`  ${i+1}/${reviews.length}\r`);
    }

    console.log(`\nOK : ${reviews.length} avis longs ajoutés.`);
    process.exit(0);
}

main().catch(e => { console.error('\nErreur :', e.message); process.exit(1); });
