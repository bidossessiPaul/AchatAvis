import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { getExamplesForSector } from '../data/reviewExamples';

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

// Distribution : 25% chacun pour les 4 types d'expérience.
const SECTOR_DISTRIBUTIONS: Record<string, Record<ExperienceType, number>> = {
    depannage:        { tested: 0.25, online: 0.25, hearsay: 0.25, visited: 0.25 },
    commerce:         { tested: 0.25, online: 0.25, hearsay: 0.25, visited: 0.25 },
    artisan_chantier: { tested: 0.25, online: 0.25, hearsay: 0.25, visited: 0.25 },
    service_pro:      { tested: 0.25, online: 0.25, hearsay: 0.25, visited: 0.25 },
    default:          { tested: 0.25, online: 0.25, hearsay: 0.25, visited: 0.25 },
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
    online:  "Le client a UNIQUEMENT consulte leur presence en ligne (fiche Google, photos, site web, reseaux sociaux). PAS d'intervention physique. Mentionne precisement ce qu'il a vu sur Internet. N'invente pas de visite ou d'utilisation.",
    hearsay: "Le client connait l'entreprise par bouche-a-oreille (ami, voisin, collegue, reputation locale). Il n'a PAS utilise le service et n'a PAS vu les locaux. Mentionne la source de la recommandation.",
    visited: "Le client est PASSE DEVANT l'etablissement (sans y entrer). Decrit uniquement ce qu'il a vu de l'exterieur : facade, vitrine, proprete, emplacement, accessibilite. N'invente pas d'utilisation du service.",
};

// Pré-calcule la distribution des types via la méthode des plus grands restes.
// Garantit un total exact sans compteur négatif (cas 1% sur petits batches).
function assignExperienceTypes(quantity: number, sectorSlug?: string): ExperienceType[] {
    const category = (sectorSlug && SECTOR_SLUG_MAP[sectorSlug]) || 'default';
    const dist = SECTOR_DISTRIBUTIONS[category];

    const keys: ExperienceType[] = ['tested', 'online', 'hearsay', 'visited'];
    const floats = keys.map(k => ({ k, floor: Math.floor(quantity * dist[k]), rem: (quantity * dist[k]) % 1 }));
    let remaining = quantity - floats.reduce((s, f) => s + f.floor, 0);
    floats.sort((a, b) => b.rem - a.rem);
    for (let i = 0; i < remaining; i++) floats[i].floor++;

    const counts = Object.fromEntries(floats.map(f => [f.k, f.floor])) as Record<ExperienceType, number>;

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

        const systemPrompt = `Tu es une IA qui genere des avis clients authentiques et VARIES pour des artisans et professionnels.

DIVERSITE OBLIGATOIRE — REGLE N°1 :
Aucun avis ne peut partager les memes 5 premiers mots qu'un autre avis du batch.
Aucun avis ne peut avoir la meme structure de phrase qu'un autre.
Varier ABSOLUMENT : le mot d'ouverture, la structure, la longueur, le ton, le sujet aborde, le style.

LONGUEURS IMPOSEES (distribuer dans le batch) :
- ULTRA-COURT (3-8 mots) : "super accueil merci" / "nickel comme d'hab" / "site tres clair"
- COURT (15-30 mots) : une phrase simple, directe
- MOYEN (40-70 mots) : 2-3 phrases, un detail concret
- LONG (80-150 mots) : histoire avec contexte, detail vecu, emotion

SUJETS POSSIBLES (varier dans le batch) :
- Le resultat du service / de la prestation
- L'accueil, la sympathie du personnel ou de l'agent d'accueil
- La qualite du service client (reactivite, suivi, rappel)
- Le site web : design, clarté, couleurs, facilite de navigation
- La communication (emails, appels, messages)
- Le rapport qualite/prix
- La rapidite / les delais respectes
- Une recommandation d'un proche qui s'est averee juste
- L'ambiance des locaux / la vitrine / l'emplacement

STYLES DE REDACTION (alterner) :
- LE FLEMMARD : tout en minuscules, pas de ponctuation, familier ("pas decu du tout vraiment")
- LE CONCIS : majuscule debut, point final, rien de plus ("Site tres bien fait, navigation claire.")
- LE BAVARD : raconte une anecdote avec contexte ("j'avais contacte pour... au final...")
- LE SCEPTIQUE CONVERTI : "j'avais des doutes... mais franchement")
- L'ANCIEN : vouvoiement, tournures polies, phrases construites
- LE DIRECT : commence par le resultat ("Tres bon accueil,")
- LE SPONTANE : commence par une interjection ou exclamation ("Honnêtement", "Franchement", "Bon alors")

NOM D'ENTREPRISE : tu peux abréger le nom en minuscules si c'est naturel (ex: "achat avis" → "achat avis", "AA", ou juste "eux"). Jamais "Monsieur" devant un nom d'entreprise.

INTERDICTIONS FORMELLES (jamais utiliser) :
- "Intervention rapide et efficace"
- "Je recommande vivement cette entreprise"
- "Travail soigne et professionnel"
- "Je suis pleinement satisfait(e)"
- "Un grand merci a toute l'equipe"
- "N'hesitez pas a faire appel"
- "Tres serieux" en debut d'avis
- "Excellent(e) prestation"

REGLE ABSOLUE SUR LE TYPE D'EXPERIENCE : respecter strictement le type assigne. Un avis "online" = uniquement ce vu sur internet (site, photos, fiche Google). Un avis "hearsay" = bouche-a-oreille uniquement, pas d'utilisation du service. Un avis "visited" = passe devant, vu de l'exterieur uniquement. Un avis "tested" = prestation reelle vecue. PAS DE MELANGE.

FORMAT : JSON valide uniquement.`;

        // Longueurs distribuées de façon déterministe sur le batch
        const LENGTH_POOL = ['ultra-court', 'court', 'moyen', 'long'] as const;
        const assignedLengths = assignedTypes.map((_, i) => LENGTH_POOL[i % LENGTH_POOL.length]);

        // Sujets possibles à varier (injectés par slot pour forcer la diversité)
        const SUBJECT_POOL = [
            "le resultat de la prestation",
            "l'accueil et la sympathie du personnel",
            "le service client (reactivite, suivi)",
            "le site web (design, couleurs, navigation)",
            "la communication (appels, messages, emails)",
            "le rapport qualite/prix",
            "la rapidite et les delais",
            "une recommandation entendue qui s'est averee juste",
            "l'ambiance ou l'aspect des locaux / vitrine",
        ];
        const assignedSubjects = assignedTypes.map((_, i) => SUBJECT_POOL[i % SUBJECT_POOL.length]);

        const typesList = assignedTypes
            .map((t, i) => `Avis ${i + 1} -> type="${t}" | longueur="${assignedLengths[i]}" | sujet prefere="${assignedSubjects[i]}" | description: ${EXPERIENCE_TYPE_DESCRIPTIONS[t]}`)
            .join('\n');

        // Exemples sectoriels — on injecte quantity × 1.5 exemples (plafonné à 150)
        // pour que chaque avis du batch ait un ancrage différent
        const sectorExamples = getExamplesForSector(sectorSlug, quantity);
        const examplesBlock = sectorExamples.length > 0
            ? `\nEXEMPLES D'AVIS DU MEME SECTEUR — ${sectorExamples.length} exemples (vocabulaire, ton, sujets a respecter — NE PAS copier, NE PAS paraphraser) :\n${sectorExamples.map((e, i) => `${i + 1}. "${e}"`).join('\n')}\n`
            : '';
        if (sectorExamples.length > 0) {
            console.log(`${sectorExamples.length} exemples sectoriels injectes pour le secteur: ${sectorSlug || 'inconnu'}`);
        }

        const userPrompt = `Genere exactement ${quantity} avis positifs (5 etoiles OBLIGATOIRE) pour "${companyName}" (${trade}).
Contexte : ${context || 'Artisan local'}
Secteur : ${sector || trade}
Services : ${services || 'Tous services'}
Zones : ${zones || 'Locale'}
Collaborateurs : ${staffNames || 'non precise'}
Instructions specifiques : ${specificInstructions || 'aucune'}
${examplesBlock}
TYPES, LONGUEURS ET SUJETS ASSIGNES (ordre strict) :
${typesList}

RAPPEL DIVERSITE ABSOLUE : aucun avis ne partage les 5 premiers mots d'un autre. Longueur, ton, sujet aborde, style de redaction = tous differents entre chaque avis.
Integre la ville naturellement si pertinent (pas juste en fin de phrase).
Inspire-toi des exemples ci-dessus pour le vocabulaire metier et le registre de langue — sans jamais les reproduire.

Format JSON :
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
