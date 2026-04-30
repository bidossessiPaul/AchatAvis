import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

let anthropicClient: Anthropic | null = null;

const getAnthropicClient = (): Anthropic => {
    if (anthropicClient) return anthropicClient;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('Anthropic is not configured: missing ANTHROPIC_API_KEY');
    }
    anthropicClient = new Anthropic({
        apiKey,
        timeout: 120 * 1000,
        maxRetries: 2,
    });
    return anthropicClient;
};

type ExperienceType = 'tested' | 'visited' | 'online' | 'hearsay';

// Distribution des types selon la catégorie de secteur.
// "visited" = 0 pour les métiers de dépannage (plombier, serrurier...) : ça n'a aucun sens qu'un client "passe devant".
const SECTOR_DISTRIBUTIONS: Record<string, Record<ExperienceType, number>> = {
    depannage:        { tested: 0.65, online: 0.25, hearsay: 0.10, visited: 0.00 },
    commerce:         { tested: 0.50, online: 0.20, hearsay: 0.15, visited: 0.15 },
    artisan_chantier: { tested: 0.60, online: 0.22, hearsay: 0.13, visited: 0.05 },
    service_pro:      { tested: 0.55, online: 0.30, hearsay: 0.15, visited: 0.00 },
    default:          { tested: 0.60, online: 0.22, hearsay: 0.13, visited: 0.05 },
};

const SECTOR_SLUG_MAP: Record<string, string> = {
    plumber: 'depannage', plomberie: 'depannage', electricite: 'depannage',
    'chauffage-climo': 'depannage', assainissement: 'depannage', 'anti-nuisible': 'depannage',
    restaurant: 'commerce', coiffure: 'commerce', fleuriste: 'commerce',
    boutique: 'commerce', automobile: 'commerce', 'marchand-de-voitures-doccasion': 'commerce',
    'toiture-couverture': 'artisan_chantier', couvreur: 'artisan_chantier',
    batiment: 'artisan_chantier', 'entrepreneur-general': 'artisan_chantier',
    paysagiste: 'artisan_chantier', 'jardinage-paysage': 'artisan_chantier',
    demenagement: 'artisan_chantier',
    immobilier: 'service_pro', juridique: 'service_pro', 'marketing-web': 'service_pro',
    'courtier-en-credit-et-assurance': 'service_pro', 'centre-de-formation': 'service_pro',
    medical: 'service_pro', orthodontiste: 'service_pro', voyage: 'service_pro',
    loisirs: 'service_pro', 'e-commerce': 'service_pro',
};

// Description détaillée de chaque type — injectée dans le prompt par slot pour forcer la cohérence.
const EXPERIENCE_TYPE_DESCRIPTIONS: Record<ExperienceType, string> = {
    tested:  "Le client a REELLEMENT utilise le service (intervention physique, chantier, achat, prestation). Mentionne un detail vecu : duree, tarif, resultat, comportement de l'artisan. PAS de mention de site web ou de bouche-a-oreille.",
    online:  "Le client a UNIQUEMENT observe en ligne (fiche Google, photos, site web, avis existants). PAS d'intervention physique. Mentionne ce qu'il a vu sur Internet : photos, note, descriptions. N'invente pas de visite ou d'utilisation.",
    hearsay: "Le client a ENTENDU PARLER par bouche-a-oreille (ami, voisin, collegue). Il n'a PAS utilise le service et n'a PAS vu les locaux. Mentionne la source de la recommandation.",
    visited: "Le client est PASSE DEVANT ou a rencontre l'artisan (devis sur place, vitrine, chantier visible) SANS consommer. Mentionne ce qu'il a constate en passant. N'invente pas d'utilisation du service.",
};

// Pré-calcule la distribution des types pour un batch et mélange aléatoirement.
// La répartition est faite ici, pas laissée au modèle.
function assignExperienceTypes(quantity: number, sectorSlug?: string): ExperienceType[] {
    const category = (sectorSlug && SECTOR_SLUG_MAP[sectorSlug]) || 'default';
    const dist = SECTOR_DISTRIBUTIONS[category];

    const counts: Record<ExperienceType, number> = {
        tested:  Math.round(quantity * dist.tested),
        online:  Math.round(quantity * dist.online),
        hearsay: Math.round(quantity * dist.hearsay),
        visited: Math.round(quantity * dist.visited),
    };
    // Ajustement pour que le total soit exactement quantity
    const total = counts.tested + counts.online + counts.hearsay + counts.visited;
    counts.tested += quantity - total;

    const types: ExperienceType[] = [];
    for (let i = 0; i < counts.tested;  i++) types.push('tested');
    for (let i = 0; i < counts.online;  i++) types.push('online');
    for (let i = 0; i < counts.hearsay; i++) types.push('hearsay');
    for (let i = 0; i < counts.visited; i++) types.push('visited');

    // Fisher-Yates shuffle
    for (let i = types.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [types[i], types[j]] = [types[j], types[i]];
    }
    return types;
}

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

export const aiService = {
    async generateReviews(params: GenerateReviewsParams) {
        const {
            companyName,
            trade,
            quantity,
            context,
            sector,
            sectorSlug,
            zones,
            services,
            staffNames,
            specificInstructions
        } = params;

        // Pré-assignation des types AVANT l'appel IA — la répartition est déterministe, pas laissée au modèle
        const assignedTypes = assignExperienceTypes(quantity, sectorSlug);
        console.log(`Distribution types (sector: ${sectorSlug || 'default'}):`, assignedTypes.reduce((acc, t) => {
            acc[t] = (acc[t] || 0) + 1; return acc;
        }, {} as Record<string, number>));

        const systemPrompt = `Tu es une IA experte qui simule des avis clients authentiques pour des artisans et professionnels.

REGLES DE QUALITE :
1. LANGAGE : Poli et respectueux, meme dans les avis familiers. Pas de grossieretes.
2. COHERENCE : L'avis doit avoir du sens. Pas de phrases absurdes.
3. ABREVIATIONS : OK (rdv, bcp, tt, dsl) mais l'avis reste lisible.
4. DISTINCTION NOM/ENTREPRISE : Ne mets jamais "Monsieur" devant un nom d'entreprise. Utilise les noms de collaborateurs fournis pour les personnes.

INTERDICTIONS FORMELLES :
- "Intervention rapide et efficace"
- "Je recommande vivement cette entreprise"
- "Travail soigne et professionnel"
- "Je suis pleinement satisfait"
- "Un grand merci a toute l'equipe"

STYLES DE REDACTION a varier dans le batch :
- LE SCEPTIQUE CONVERTI : "J'y croyais pas... finalement top"
- LE ROMANCIER (>100 mots) : histoire precise avec details sensoriels
- LE RUSH (<10 mots) : "super boulot merci", sans majuscule ni ponctuation
- L'ANCIEN : poli, vouvoie, phrases construites
- LE POINTILLEUX : mentionne un detail technique precis

REGLE ABSOLUE SUR LE TYPE D'EXPERIENCE : Chaque avis a un type assigne. Tu dois respecter STRICTEMENT ce type. Un avis "online" ne peut PAS mentionner une intervention physique. Un avis "hearsay" ne peut PAS decrire une utilisation du service. PAS DE MELANGE entre types dans un meme avis.

FORMAT : JSON valide uniquement.`;

        const typesList = assignedTypes
            .map((t, i) => `Avis ${i + 1} -> type="${t}" : ${EXPERIENCE_TYPE_DESCRIPTIONS[t]}`)
            .join('\n');

        const userPrompt = `Genere exactement ${quantity} avis positifs (5 etoiles OBLIGATOIRE pour CHAQUE avis) pour "${companyName}" (${trade}).
Contexte : ${context || 'Artisan local'}
Secteur : ${sector || trade}
Services : ${services || 'Tous services'}
Zones : ${zones || 'Locale'}
Collaborateurs : ${staffNames || 'non precise'}
Instructions specifiques : ${specificInstructions || 'aucune'}

TYPES D'EXPERIENCE ASSIGNES - respecte-les dans l'ordre exact :
${typesList}

REGLE ABSOLUE : Genere les avis dans l'ordre ci-dessus. L'avis N dans le JSON doit correspondre au type assigne a l'Avis N. Le champ "experience_type" dans le JSON doit etre identique au type assigne.
Pour les avis localises, integre la ville naturellement dans la phrase (pas juste a la fin).

Format de sortie (JSON) :
{
    "reviews": [
        {"author_name": "...", "content": "...", "rating": 5, "experience_type": "tested"}
    ]
}`;

        try {
            console.log("Appel Claude pour generation d'avis...");
            const response = await getAnthropicClient().messages.create({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 8192,
                system: systemPrompt,
                messages: [
                    { role: "user", content: userPrompt },
                    { role: "assistant", content: "{" }
                ]
            });

            if (response.stop_reason === 'max_tokens') {
                console.warn("Reponse AI tronquee (max_tokens atteint). Tentative de parsing partiel...");
            }

            const textBlock = response.content[0];
            if (textBlock.type !== 'text') {
                throw new Error("Reponse inattendue de Claude (pas de texte)");
            }

            let rawContent = textBlock.text.trim();

            if (!rawContent.startsWith('{') && !rawContent.startsWith('[')) {
                rawContent = '{' + rawContent;
            }

            const extractJSON = (str: string): string => {
                let depth = 0;
                let start = str.indexOf('{');
                if (start === -1) throw new Error("Format AI invalide (pas de JSON)");

                for (let i = start; i < str.length; i++) {
                    if (str[i] === '{') depth++;
                    else if (str[i] === '}') {
                        depth--;
                        if (depth === 0) return str.substring(start, i + 1);
                    }
                }
                const lastBrace = str.lastIndexOf('}');
                if (lastBrace === -1) throw new Error("Format AI invalide (pas de JSON)");
                return str.substring(start, lastBrace + 1);
            };

            try {
                const jsonStr = extractJSON(rawContent);
                const parsed = JSON.parse(jsonStr);
                console.log("Reponse AI recue et parsee");

                // Force rating 5 + fallback experience_type si l'IA l'a oublié
                const normalize = (reviews: any[]) => reviews.map((r, i) => ({
                    ...r,
                    rating: 5,
                    experience_type: r.experience_type || assignedTypes[i] || 'tested',
                }));

                if (Array.isArray(parsed.reviews)) return normalize(parsed.reviews);
                if (Array.isArray(parsed)) return normalize(parsed);
                throw new Error("Format JSON invalide (pas un tableau)");
            } catch (e: any) {
                if (response.stop_reason === 'max_tokens') {
                    console.warn("Tentative de recuperation des avis complets depuis JSON tronque...");
                    try {
                        const reviewRegex = /\{\s*"author_name"\s*:\s*"[^"]*"\s*,\s*"content"\s*:\s*"[^"]*"\s*,\s*"rating"\s*:\s*\d+(?:\s*,\s*"experience_type"\s*:\s*"[^"]*")?\s*\}/g;
                        const matches = rawContent.match(reviewRegex);
                        if (matches && matches.length > 0) {
                            const salvaged = matches.map((m, i) => {
                                const obj = JSON.parse(m);
                                return { ...obj, rating: 5, experience_type: obj.experience_type || assignedTypes[i] || 'tested' };
                            });
                            console.log(`${salvaged.length} avis recuperes depuis reponse tronquee`);
                            return salvaged;
                        }
                    } catch (salvageErr) {
                        console.error("Recuperation impossible:", salvageErr);
                    }
                }
                console.error("Erreur parsing JSON AI. Contenu brut:", rawContent.substring(0, 500));
                throw new Error(`Erreur parsing reponse IA: ${e.message}`);
            }

        } catch (error: any) {
            console.error("Erreur AI Service:", error.message);
            throw error;
        }
    },

    async generateNearbyCities(baseCity: string, count: number) {
        const systemPrompt = "Tu es un expert en geographie mondiale et zones de chalandise. Reponds uniquement en JSON.";
        const userPrompt = `
            Base sur l'emplacement de "${baseCity}".
            Genere une liste de ${count} villes/communes proches (max 20-30km) dans le MEME PAYS.

            Regles :
            1. Realisme geographique.
            2. Diversite (residentiel/activite).
            3. Format : JSON avec cle "cities" (tableau de strings).
            4. Pas de ville inventee.

            Exemple : { "cities": ["Ville A", "Ville B"] }
        `;

        try {
            console.log("Appel Claude pour generation de villes pour:", baseCity);
            const response = await getAnthropicClient().messages.create({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 1024,
                system: systemPrompt,
                messages: [
                    { role: "user", content: userPrompt },
                    { role: "assistant", content: "{" }
                ]
            });

            const textBlock = response.content[0];
            if (textBlock.type !== 'text') throw new Error("Reponse vide de Claude");

            const content = "{" + textBlock.text;
            const parsed = JSON.parse(content);

            if (Array.isArray(parsed.cities)) return parsed.cities;
            return [];
        } catch (error: any) {
            console.error("Erreur AI City Gen:", error.message);
            throw error;
        }
    },

    async generateReviewResponse(reviewContent: string, authorName: string) {
        const systemPrompt = "Tu es un assistant de gestion de reputation pour artisans.";
        const userPrompt = `
            Tu es un artisan professionnel. Reponds a cet avis client :
            Client : ${authorName}
            Avis : "${reviewContent}"

            Consignes :
            1. Remercie chaleureusement.
            2. Personnalise si possible.
            3. Concis (2-3 phrases).
            4. Poli mais pas trop formel.
            5. Touche positive.
            6. Reponds UNIQUEMENT avec le texte de la reponse.
        `;

        try {
            console.log("Generation de reponse IA pour l'avis de:", authorName);
            const response = await getAnthropicClient().messages.create({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 1024,
                system: systemPrompt,
                messages: [
                    { role: "user", content: userPrompt }
                ]
            });

            const textBlock = response.content[0];
            if (textBlock.type !== 'text') throw new Error("Reponse vide de Claude");

            return textBlock.text.trim();
        } catch (error: any) {
            console.error("Erreur AI Response Gen:", error.message);
            throw error;
        }
    }
};
