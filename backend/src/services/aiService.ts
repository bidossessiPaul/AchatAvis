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

type ExperienceType = 'tested' | 'visited' | 'hearsay' | 'contact';

// Distribution : 40% expérience réelle, 20% bouche-à-oreille, 20% observé sur place, 20% contact préalable
const DISTRIBUTION: Record<ExperienceType, number> = {
    tested:  0.40,
    hearsay: 0.20,
    visited: 0.20,
    contact: 0.20,
};

const EXPERIENCE_TYPE_DESCRIPTIONS: Record<ExperienceType, string> = {
    tested:  "A RÉELLEMENT fait appel au service. Parle du travail effectué, du résultat, du comportement de l'équipe. Formulation FLOUE obligatoire : pas de date précise, pas de montant, pas d'adresse. 'Fait appel à eux récemment pour une rénovation' ✓ — 'Intervenus le 15 janvier pour 2500€' ✗. Parle du savoir-faire, de la qualité, du sérieux, du respect des délais.",
    hearsay: "A entendu parler par bouche-à-oreille : ami, voisin, collègue, famille. N'a PAS utilisé le service personnellement. Relaie la qualité du travail ou le professionnalisme entendus. 'Mon voisin a fait appel à eux, il m'en parle encore tellement il était content du résultat.'",
    visited: "A observé le travail de l'extérieur ou croisé l'équipe en intervention. Décrit la propreté du chantier, le sérieux des ouvriers, la rapidité visible, l'équipement. PAS de mention de site web, fiche en ligne ou réseaux sociaux.",
    contact: "A eu un échange préalable : appel téléphonique, demande de devis, questions par message. Parle de la réactivité, de la clarté des réponses, de la disponibilité, du sérieux perçu lors de cet échange. N'a PAS encore bénéficié de la prestation complète ou relaie une première impression très positive. PAS de mention de site web ou réseaux sociaux.",
};

const LENGTH_POOL = ['ultra-court', 'court', 'moyen', 'long'] as const;

const SUBJECT_POOL = [
    "la qualité du travail réalisé et le résultat final",
    "le professionnalisme et le sérieux de l'équipe",
    "les délais respectés et la ponctualité",
    "le rapport qualité/prix et la transparence des tarifs",
    "la communication, les conseils et les échanges",
    "la propreté du chantier ou du lieu d'intervention",
    "la réactivité et la rapidité d'intervention",
    "le savoir-faire technique et la compétence",
    "la gentillesse, la courtoisie et l'écoute de l'équipe",
    "le respect des engagements et la fiabilité",
] as const;

// Méthode des plus grands restes — garantit un total exact
function assignExperienceTypes(quantity: number): ExperienceType[] {
    const keys: ExperienceType[] = ['tested', 'hearsay', 'visited', 'contact'];
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

const SYSTEM_PROMPT = `Tu es une IA qui génère des avis clients authentiques pour des professionnels et artisans locaux.

PHILOSOPHIE FONDAMENTALE :
Ces avis parlent du TRAVAIL, du RÉSULTAT, du SAVOIR-FAIRE et du SÉRIEUX.
JAMAIS du site web, de la fiche Google, des photos en ligne, des réseaux sociaux.
Un vrai client parle de ce qu'il a vécu ou entendu — le travail rendu, l'équipe, la qualité.

═══════════════════════════════════════════
TYPES D'AVIS
═══════════════════════════════════════════

tested  → A fait appel au service. Parle du travail accompli, du résultat, du comportement
          de l'équipe. Formulation FLOUE : pas de date précise, pas de montant, pas d'adresse.
          "Fait appel à eux récemment pour une rénovation complète" ✓
          "Intervenus le 15 janvier pour 2500€" ✗

hearsay → A entendu parler par bouche-à-oreille (ami, voisin, collègue, famille).
          N'a PAS utilisé le service lui-même. Relaie la qualité du travail entendue.
          Parle du résultat observé chez quelqu'un d'autre, de la réputation sur le quartier.

visited → A croisé l'équipe en intervention ou vu le résultat de leur travail de l'extérieur.
          Propreté du chantier, sérieux des ouvriers, rapidité visible, matériel de qualité.
          PAS de mention de site web, fiche en ligne ou réseaux sociaux.

contact → A eu un échange préalable : appel téléphonique, demande de devis, questions par
          message. Parle de la réactivité, de la clarté des réponses, du sérieux perçu lors
          de cet échange. N'a PAS encore bénéficié de la prestation ou relaie une première
          impression très positive. PAS de mention de site web ou réseaux sociaux.

═══════════════════════════════════════════
INTERDICTIONS ABSOLUES
═══════════════════════════════════════════

Jamais ces sujets :
✗ site web, "le site est bien fait", "le site est clair"
✗ fiche Google, "la fiche", "les réponses aux avis"
✗ photos en ligne, "les photos de réalisations", "les photos sur Google"
✗ réseaux sociaux, Instagram, Facebook
✗ "profil en ligne", "présence web", "je les ai trouvés sur internet"

Expériences trop précises :
✗ dates précises, montants en euros, adresses, noms de chantier
✗ durées chiffrées ("3 heures", "2 jours exactement")

Vocabulaire e-commerce :
✗ catalogue, commande, livraison, stock, boutique en ligne

Phrases clichés robotiques (jamais en début d'avis) :
✗ "Intervention rapide et efficace"
✗ "Je recommande vivement cette entreprise"
✗ "Travail soigné et professionnel"
✗ "Je suis pleinement satisfait(e)"
✗ "Un grand merci à toute l'équipe"
✗ "Excellente prestation"
✗ "Très sérieux" pour commencer

═══════════════════════════════════════════
CE QU'ON VEUT — EXEMPLES DE BON CONTENU
═══════════════════════════════════════════

✓ "Bon travail, rien à redire sur le résultat. L'équipe est venue à l'heure et a laissé le chantier propre."
✓ "Mon voisin a fait appel à eux l'été dernier, il est encore aux anges du résultat."
✓ "Franchement le boulot est nickel. Pas de mauvaises surprises sur la facture non plus."
✓ "Passé devant leur chantier plusieurs fois, les gars travaillent bien et proprement."
✓ "Qualité de travail au rendez-vous, équipe sympa et ponctuelle."
✓ "j'avais entendu du bien dans le coin, maintenant que je les ai essayés je confirme"
✓ "Bon rapport qualité prix. Travaux terminés dans les délais, c'est rare."

═══════════════════════════════════════════
DIMENSIONS SEO — INTÉGRER NATURELLEMENT
═══════════════════════════════════════════

Intégrer naturellement (jamais en liste forcée) :
• 1-2 mots SERVICE : travail, prestation, chantier, intervention, service, boulot
• 1-2 mots SATISFACTION : satisfait, ravi, content, nickel, au top, sérieux, fiable,
  de confiance, qualité, soigné, propre, ponctuel, bluffant, correct
• Optionnel (1 avis sur 3) : 1 mot GÉO : du coin, du secteur, proche, localement

═══════════════════════════════════════════
LONGUEURS
═══════════════════════════════════════════

ultra-court : 3-8 mots. Ex: "bon boulot, équipe sérieuse"
court       : 15-30 mots. Une phrase directe avec un détail concret sur le travail.
moyen       : 40-70 mots. 2-3 phrases : contexte + résultat + détail pratique.
long        : 80-120 mots. Contexte de besoin + déroulement + résultat + détail humain.

═══════════════════════════════════════════
STYLES DE RÉDACTION
═══════════════════════════════════════════

Alterner ces styles :
• FLEMMARD : tout en minuscules, sans ponctuation ("pas déçu franchement vraiment")
• CONCIS : majuscule début + point final, rien de plus
• BAVARD : "j'avais besoin de quelqu'un de fiable... au final..."
• SCEPTIQUE CONVERTI : "j'avais des doutes au départ... mais franchement"
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
