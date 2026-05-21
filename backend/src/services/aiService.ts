import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { getExamplesForSector } from '../data/reviewExamples';

dotenv.config();

let anthropicClient: Anthropic | null = null;

const getAnthropicClient = (): Anthropic => {
    if (anthropicClient) return anthropicClient;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('Anthropic is not configured: missing ANTHROPIC_API_KEY');
    anthropicClient = new Anthropic({ apiKey, timeout: 120 * 1000, maxRetries: 2 });
    return anthropicClient;
};

type ExperienceType = 'tested' | 'visited' | 'online' | 'hearsay';

// Méthode d'opinion : 90% avis d'observation, 10% max expérience testée
const DISTRIBUTION: Record<ExperienceType, number> = {
    online:  0.35,
    hearsay: 0.30,
    visited: 0.20,
    tested:  0.10,
};

const EXPERIENCE_TYPE_DESCRIPTIONS: Record<ExperienceType, string> = {
    online:  "A consulté la présence en ligne uniquement : site web, fiche Google, photos de réalisations, réseaux sociaux, réponses aux avis. Mentionne précisément ce qu'il a vu. INTERDIT : vocabulaire e-commerce (catalogue, commande, livraison). Pour un artisan : dire 'photos de chantier', 'réalisations', jamais 'catalogue produit'.",
    hearsay: "A entendu parler par bouche-à-oreille : ami, voisin, collègue, réputation locale. N'a PAS utilisé le service. Relaie une recommandation entendue.",
    visited: "Est passé devant l'établissement ou le chantier sans entrer. Décrit uniquement ce vu de l'extérieur : façade, véhicule siglé, vitrine, enseigne, propreté, emplacement.",
    tested:  "A RÉELLEMENT utilisé le service — mais formulation FLOUE obligatoire. Interdit : dates précises, montants, noms de chantier, adresses, durées chiffrées. 'Fait appel à eux récemment' est OK. 'Intervenus le 15 janvier pour 2500€' est INTERDIT.",
};

const LENGTH_POOL = ['ultra-court', 'court', 'moyen', 'long'] as const;

const SUBJECT_POOL = [
    "le site web (design, clarté des infos, navigation)",
    "les photos de réalisations ou de l'équipe",
    "la fiche Google et les réponses aux autres avis",
    "un échange téléphonique ou par message",
    "la réputation locale entendue par un proche",
    "l'aspect extérieur, la façade ou le véhicule siglé",
    "le rapport qualité/prix ou la transparence des tarifs",
    "la réactivité et les délais de réponse",
    "la présence sur les réseaux sociaux",
] as const;

// Méthode des plus grands restes — garantit un total exact
function assignExperienceTypes(quantity: number): ExperienceType[] {
    const keys: ExperienceType[] = ['online', 'hearsay', 'visited', 'tested'];
    const floats = keys.map(k => ({
        k,
        floor: Math.floor(quantity * DISTRIBUTION[k]),
        rem: (quantity * DISTRIBUTION[k]) % 1,
    }));
    let remaining = quantity - floats.reduce((s, f) => s + f.floor, 0);
    floats.sort((a, b) => b.rem - a.rem);
    for (let i = 0; i < remaining; i++) floats[i].floor++;

    const types: ExperienceType[] = [];
    for (const { k, floor } of floats) {
        for (let i = 0; i < floor; i++) types.push(k);
    }
    // Fisher-Yates shuffle
    for (let i = types.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [types[i], types[j]] = [types[j], types[i]];
    }
    return types;
}

// Sujets mélangés pour éviter toute répétition cyclique dans les grands batches
function assignSubjects(quantity: number): string[] {
    const pool = [...SUBJECT_POOL];
    const result: string[] = [];
    while (result.length < quantity) {
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        result.push(...pool);
    }
    return result.slice(0, quantity);
}

const SYSTEM_PROMPT = `Tu es une IA qui génère des avis clients authentiques pour des professionnels locaux.

PHILOSOPHIE FONDAMENTALE — MÉTHODE D'OPINION :
Ces avis sont rédigés par de vrais Local Guides Google qui donnent leur OPINION authentique.
Ils n'inventent JAMAIS une expérience vécue. Ils observent et commentent ce qu'ils ont
réellement vu ou entendu : site web, présence en ligne, réputation entendue, passage devant
l'établissement, échange téléphonique.

═══════════════════════════════════════════
TYPES D'AVIS
═══════════════════════════════════════════

online  → Opinion basée sur la présence en ligne : site web, fiche Google, photos de réalisations,
          réseaux sociaux, réponses aux avis. Pour un artisan : "photos de chantier", "réalisations",
          "site bien fait". JAMAIS "catalogue", "catalogue produit", "photos catalogue".

hearsay → Opinion basée sur bouche-à-oreille : ami, voisin, collègue, réputation locale.
          Le guide n'a PAS utilisé le service. Il relaie une recommandation entendue.

visited → Opinion basée sur ce vu de l'extérieur : façade, véhicule siglé, vitrine, enseigne,
          emplacement, propreté. Pas d'entrée dans l'établissement, pas de prestation.

tested  → Expérience réelle mais formulation FLOUE. Interdit : dates précises, montants,
          noms de chantier, adresses, durées chiffrées.
          "Fait appel à eux récemment" ✓ — "Intervenus le 15 janvier pour 2500€" ✗

═══════════════════════════════════════════
INTERDICTIONS ABSOLUES
═══════════════════════════════════════════

Expériences inventées trop précises :
✗ "Ils sont intervenus le [date] pour..."
✗ "J'ai payé [montant]€ pour..."
✗ "Le technicien a mis [durée] pour..."
✗ "Après signature du contrat le [date]..."
✗ "Ils sont intervenus sur notre site à [ville précise]..."

Vocabulaire e-commerce (interdit pour artisans/services) :
✗ "catalogue", "catalogue produit", "photos catalogue"
✗ "commande", "livraison", "retour produit", "stock"
✗ "boutique en ligne", "panier", "checkout"

Phrases clichés (jamais) :
✗ "Intervention rapide et efficace"
✗ "Je recommande vivement cette entreprise"
✗ "Travail soigné et professionnel"
✗ "Je suis pleinement satisfait(e)"
✗ "Un grand merci à toute l'équipe"
✗ "N'hésitez pas à faire appel"
✗ "Excellente prestation"
✗ "Très sérieux" en début d'avis

═══════════════════════════════════════════
DIMENSIONS SEO — INTÉGRER NATURELLEMENT
═══════════════════════════════════════════

Chaque avis doit contenir naturellement :
• 1-2 mots-clés SERVICE : service, prestation, professionnel, artisan, entreprise, spécialiste, expert
• 1-2 mots de SATISFACTION : très satisfait, ravi, excellent, impeccable, au top, je recommande,
  parfait, sérieux, fiable, de confiance, qualité, soigné, bluffant
• Optionnel (1 avis sur 3) : 1 mot GÉO : secteur, proche, à proximité, localement, du coin

Ces mots s'intègrent dans le texte naturellement — jamais en liste, jamais forcés.

═══════════════════════════════════════════
LONGUEURS
═══════════════════════════════════════════

ultra-court : 3-8 mots. Ex: "site très clair, je recommande"
court       : 15-30 mots. Une phrase directe avec un détail concret.
moyen       : 40-70 mots. 2-3 phrases avec un élément observé.
long        : 80-120 mots. Contexte + observation + conclusion.

═══════════════════════════════════════════
STYLES DE RÉDACTION
═══════════════════════════════════════════

Alterner ces styles :
• FLEMMARD : tout en minuscules, sans ponctuation ("pas déçu du tout vraiment")
• CONCIS : majuscule début + point final, rien de plus
• BAVARD : "j'avais cherché sur internet... au final..."
• SCEPTIQUE CONVERTI : "j'avais des doutes... mais franchement"
• SPONTANÉ : commence par "Honnêtement", "Franchement", "Bon alors"
• L'ANCIEN : vouvoiement, tournures polies

FORMAT : un seul objet JSON valide.
{ "author_name": "Prénom Nom", "content": "...", "rating": 5, "experience_type": "..." }`;

interface GenerateReviewsParams {
    companyName: string;
    ficheName?: string;
    trade: string;
    quantity: number;
    context?: string;
    sector?: string;
    sectorSlug?: string;
    zones?: string;
    services?: string;
    staffNames?: string;
    specificInstructions?: string;
}

interface GeneratedReview {
    author_name: string;
    content: string;
    rating: 5;
    experience_type: ExperienceType;
}

async function generateSingleReview(
    params: GenerateReviewsParams,
    slot: { type: ExperienceType; length: string; subject: string },
    previousReviews: GeneratedReview[],
    index: number,
    sectorExamples: string[]
): Promise<GeneratedReview> {
    const { companyName, trade, sector, zones, services, staffNames, specificInstructions } = params;

    // Exemples sectoriels seulement pour les 3 premiers avis du batch
    const examplesBlock = index < 3 && sectorExamples.length > 0
        ? `\nEXEMPLES DU MÊME SECTEUR (vocabulaire de référence — NE PAS copier, NE PAS paraphraser) :\n${sectorExamples.slice(0, 5).map((e, i) => `${i + 1}. "${e}"`).join('\n')}\n`
        : '';

    // Contexte des avis déjà générés — l'IA ne peut plus répéter
    const previousBlock = previousReviews.length > 0
        ? `\nAVIS DÉJÀ GÉNÉRÉS (sujets et débuts de phrase à ne PAS répéter) :\n${previousReviews.map((r, i) => `${i + 1}. [${r.experience_type}] "${r.content}"`).join('\n')}\n`
        : '';

    const userPrompt = `Génère UN SEUL avis (5 étoiles) pour "${companyName}" (${trade}).
Secteur : ${sector || trade}
Services : ${services || 'Tous services'}
Zones : ${zones || 'Locale'}
Collaborateurs : ${staffNames || 'non précisé'}
Instructions : ${specificInstructions || 'aucune'}
${examplesBlock}${previousBlock}
SLOT À GÉNÉRER :
type="${slot.type}" | longueur="${slot.length}" | sujet préféré="${slot.subject}"
Description : ${EXPERIENCE_TYPE_DESCRIPTIONS[slot.type]}

Réponds UNIQUEMENT avec l'objet JSON :
{"author_name": "Prénom Nom", "content": "...", "rating": 5, "experience_type": "${slot.type}"}`;

    const response = await getAnthropicClient().messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [
            { role: 'user', content: userPrompt },
            { role: 'assistant', content: '{' },
        ],
    });

    const textBlock = response.content[0];
    if (textBlock.type !== 'text') throw new Error('Réponse vide de Claude');

    const raw = '{' + textBlock.text.trim();

    // Extraire le premier objet JSON complet
    let depth = 0;
    const start = raw.indexOf('{');
    for (let i = start; i < raw.length; i++) {
        if (raw[i] === '{') depth++;
        else if (raw[i] === '}') {
            depth--;
            if (depth === 0) {
                const parsed = JSON.parse(raw.substring(start, i + 1));
                return { ...parsed, rating: 5, experience_type: slot.type };
            }
        }
    }
    throw new Error(`JSON invalide pour l'avis ${index + 1}`);
}

export const aiService = {
    async generateReviews(params: GenerateReviewsParams) {
        const { quantity, sectorSlug } = params;

        const assignedTypes   = assignExperienceTypes(quantity);
        const assignedLengths = assignedTypes.map((_, i) => LENGTH_POOL[i % LENGTH_POOL.length]);
        const assignedSubjects = assignSubjects(quantity);

        const sectorExamples = getExamplesForSector(sectorSlug, Math.min(quantity, 10));

        console.log(`Génération séquentielle de ${quantity} avis — distribution:`,
            assignedTypes.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {} as Record<string, number>)
        );

        const generatedReviews: GeneratedReview[] = [];

        for (let i = 0; i < quantity; i++) {
            console.log(`Génération avis ${i + 1}/${quantity} (${assignedTypes[i]}, ${assignedLengths[i]})...`);
            try {
                const review = await generateSingleReview(
                    params,
                    { type: assignedTypes[i], length: assignedLengths[i], subject: assignedSubjects[i] },
                    generatedReviews,
                    i,
                    sectorExamples
                );
                generatedReviews.push(review);
            } catch (err: any) {
                console.error(`Erreur avis ${i + 1}, tentative de relance...`, err.message);
                // 1 retry automatique
                try {
                    const review = await generateSingleReview(
                        params,
                        { type: assignedTypes[i], length: assignedLengths[i], subject: assignedSubjects[i] },
                        generatedReviews,
                        i,
                        sectorExamples
                    );
                    generatedReviews.push(review);
                } catch (retryErr: any) {
                    console.error(`Avis ${i + 1} abandonné après retry:`, retryErr.message);
                }
            }
        }

        console.log(`Génération terminée : ${generatedReviews.length}/${quantity} avis générés`);
        return generatedReviews;
    },

    async generateNearbyCities(baseCity: string, count: number) {
        const systemPrompt = 'Tu es un expert en géographie mondiale et zones de chalandise. Réponds uniquement en JSON.';
        const userPrompt = `
            Basé sur l'emplacement de "${baseCity}".
            Génère une liste de ${count} villes/communes proches (max 20-30km) dans le MÊME PAYS.

            Règles :
            1. Réalisme géographique.
            2. Diversité (résidentiel/activité).
            3. Format : JSON avec clé "cities" (tableau de strings).
            4. Pas de ville inventée.

            Exemple : { "cities": ["Ville A", "Ville B"] }
        `;

        try {
            console.log('Appel Claude pour génération de villes pour:', baseCity);
            const response = await getAnthropicClient().messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 1024,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: userPrompt },
                    { role: 'assistant', content: '{' },
                ],
            });

            const textBlock = response.content[0];
            if (textBlock.type !== 'text') throw new Error('Réponse vide de Claude');

            const content = '{' + textBlock.text;
            const parsed = JSON.parse(content);

            if (Array.isArray(parsed.cities)) return parsed.cities;
            return [];
        } catch (error: any) {
            console.error('Erreur AI City Gen:', error.message);
            throw error;
        }
    },

    async generateReviewResponse(reviewContent: string, authorName: string) {
        const systemPrompt = "Tu es un assistant de gestion de réputation pour artisans.";
        const userPrompt = `
            Tu es un artisan professionnel. Réponds à cet avis client :
            Client : ${authorName}
            Avis : "${reviewContent}"

            Consignes :
            1. Remercie chaleureusement.
            2. Personnalise si possible.
            3. Concis (2-3 phrases).
            4. Poli mais pas trop formel.
            5. Touche positive.
            6. Réponds UNIQUEMENT avec le texte de la réponse.
        `;

        try {
            console.log("Génération de réponse IA pour l'avis de:", authorName);
            const response = await getAnthropicClient().messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 1024,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }],
            });

            const textBlock = response.content[0];
            if (textBlock.type !== 'text') throw new Error('Réponse vide de Claude');

            return textBlock.text.trim();
        } catch (error: any) {
            console.error('Erreur AI Response Gen:', error.message);
            throw error;
        }
    },
};
