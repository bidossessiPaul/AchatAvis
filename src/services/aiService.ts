import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 120 * 1000, // 2 minutes timeout for API calls
    maxRetries: 2, // Retry twice on failure
});

interface GenerateReviewsParams {
    companyName: string;
    ficheName?: string;
    trade: string;
    quantity: number;
    context?: string;
    sector?: string;
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
            zones,
            services,
            staffNames,
            specificInstructions
        } = params;

        const systemPrompt = `Tu es une IA experte qui simule des avis clients pour des artisans.
TON OBJECTIF : CRÉER DE LA DIVERSITÉ EXTRÊME, DU RÉALISME BRUT ET DE LA COHÉRENCE.

⚠️ RÈGLES DE QUALITÉ ABSOLUES :
1. **LANGAGE** : Interdiction formelle d'utiliser des mots grossiers, vulgaires ou insultants. Reste poli et respectueux, même dans les avis familiers.
2. **COHÉRENCE** : L'avis doit avoir un sens. Évite le "faux grave" (phrases qui ne veulent rien dire ou qui sont absurdes).
3. **ABRÉVIATIONS** : Tu peux utiliser des abréviations courantes de clients (ex: "rdv", "sup", "bcp", "tt"), mais l'avis doit rester compréhensible.
4. **DÉTAILS** : Mentionne des aspects concrets de l'intervention (ponctualité, propreté du chantier, amabilité).
5. **DISTINCTION NOM/ENTREPRISE** : Ne confonds JAMAIS le nom de l'entreprise avec une personne physique. Si l'entreprise s'appelle "Plomberie Dupont", n'écris pas "Monsieur Plomberie Dupont". Utilise le nom de l'entreprise pour l'entité, et les noms des collaborateurs (si fournis) pour les personnes. Ne mets pas "Mr" ou "Monsieur" devant un nom d'entreprise qui n'est pas manifestement un nom de famille seul.

⛔️ INTERDICTIONS FORMELLES (Si tu utilises ces phrases, tu échoues) :
- "Intervention rapide et efficace"
- "Je recommande vivement cette entreprise"
- "Travail soigné et professionnel"
- "Je suis pleinement satisfait"
- "Un grand merci à toute l'équipe"
- Pas de structure répétitive "Problème X à Ville Y résolu".

✅ TES DIRECTIVES CRÉATIVES :
1. **RACONTE DES HISTOIRES** : Invente des détails (un dégât des eaux évité de justesse, une chaudière qui lâche en plein hiver, un artisan qui explique bien les choses).
2. **BRISURE DE STYLE** :
   - Fais des avis SANS ponctuation.
   - Fais des avis avec des fautes légères de naturel (sa va, merçi, dsl).
   - Fais des avis centrés sur le ressenti humain ("Il a pris le temps de tout m'expliquer, c'est rare").
3. **ÉMOTIONS RÉELLES** : Soulagement, confiance retrouvée, satisfaction d'un travail bien fait.

FORMAT : JSON valide uniquement.`;

        const userPrompt = `Génère ${quantity} avis positifs (4 ou 5 étoiles) pour l'entreprise "${companyName}" (${trade}).
Contexte : ${context || 'Artisan local'}
Secteur : ${sector || trade}
Services : ${services || 'Tous services'}
Zones : ${zones || 'Locale'}
Collaborateurs : ${staffNames || ''}
Instructions : ${specificInstructions || ''}

GÉNÈRE UN MÉLANGE HÉTÉROGÈNE SELON CES PROFILS (Mélange l'ordre d'apparition) :

1. 😡➡️😍 **LE SCEPTIQUE CONVERTI (20%)**
   - "J'y croyais pas", "J'avais peur de l'arnaque", "On m'avait dit du mal des artisans".
   - Finition : "Finalement, top".

2. 📖 **LE ROMANCIER (30%)**
   - LONGUEUR OBLIGATOIRE : > 100 mots.
   - Doit raconter une histoire précise (ex: "C'était dimanche soir, l'eau coulait partout...").
   - Doit citer des détails sensoriels (bruit, froid, odeur).

3. ⚡️ **LE RUSH (25%)**
   - Max 10 mots.
   - Pas de majuscules, pas de points.
   - Ex: "super boulot merci", "top du top", "vrai pro rien a dire".

4. 👴 **L'ANCIEN (15%)**
   - Poli, vouvoie, phrases longues et bien construites.
   - Exemple: "L'artisan de [Entreprise] a été d'une politesse rare..." ou "Monsieur [Nom d'un Collaborateur] a été exemplaire."

5. 🧐 **LE POINTILLEUX (10%)**
   - Parle d'un détail technique précis (la marque du joint, la propreté du chantier après départ).

IMPORTANT : Pour les avis localisés, intègre la ville ("à [Ville]") de manière naturelle DANS la phrase, pas juste à la fin.
Exemple : "Même en habitant tout au fond de [Ville], ils sont venus vite."

Format de sortie attendu (JSON) :
{
    "reviews": [
        {"author_name": "...", "content": "...", "rating": 4 ou 5}
    ]
}`;

        try {
            console.log("🤖 Appel Claude pour generation d'avis...");
            const response = await anthropic.messages.create({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 8192,
                system: systemPrompt,
                messages: [
                    { role: "user", content: userPrompt },
                    { role: "assistant", content: "{" }
                ]
            });

            // Check for truncation
            if (response.stop_reason === 'max_tokens') {
                console.warn("⚠️ Réponse AI tronquée (max_tokens atteint). Tentative de parsing partiel...");
            }

            // Handle the content block safely
            const textBlock = response.content[0];
            if (textBlock.type !== 'text') {
                throw new Error("Réponse inattendue de Claude (pas de texte)");
            }

            let rawContent = textBlock.text.trim();

            // Handle the case where the AI might have repeated the pre-filled '{'
            if (!rawContent.startsWith('{') && !rawContent.startsWith('[')) {
                rawContent = '{' + rawContent;
            }

            // Try to extract the JSON object containing "reviews" array
            // Use a balanced brace approach to find the correct closing brace
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
                // Fallback: use lastIndexOf if balanced search fails
                const lastBrace = str.lastIndexOf('}');
                if (lastBrace === -1) throw new Error("Format AI invalide (pas de JSON)");
                return str.substring(start, lastBrace + 1);
            };

            try {
                const jsonStr = extractJSON(rawContent);
                const parsed = JSON.parse(jsonStr);
                console.log("✅ Réponse AI reçue et parsée");

                if (Array.isArray(parsed.reviews)) return parsed.reviews;
                if (Array.isArray(parsed)) return parsed;
                throw new Error("Format JSON invalide (pas un tableau)");
            } catch (e: any) {
                // If truncated, try to salvage complete review objects
                if (response.stop_reason === 'max_tokens') {
                    console.warn("⚠️ Tentative de récupération des avis complets depuis JSON tronqué...");
                    try {
                        // Find all complete review objects using regex
                        const reviewRegex = /\{\s*"author_name"\s*:\s*"[^"]*"\s*,\s*"content"\s*:\s*"[^"]*"\s*,\s*"rating"\s*:\s*\d+\s*\}/g;
                        const matches = rawContent.match(reviewRegex);
                        if (matches && matches.length > 0) {
                            const salvaged = matches.map(m => JSON.parse(m));
                            console.log(`✅ ${salvaged.length} avis récupérés depuis réponse tronquée`);
                            return salvaged;
                        }
                    } catch (salvageErr) {
                        console.error("❌ Récupération impossible:", salvageErr);
                    }
                }
                console.error("❌ Erreur parsing JSON AI. Contenu brut:", rawContent.substring(0, 500));
                throw new Error(`Erreur parsing réponse IA: ${e.message}`);
            }

        } catch (error: any) {
            console.error("❌ Erreur AI Service:", error.message);
            throw error;
        }
    },

    async generateNearbyCities(baseCity: string, count: number) {
        const systemPrompt = "Tu es un expert en géographie mondiale et zones de chalandise. Réponds uniquement en JSON.";
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
            console.log("🤖 Appel Claude pour generation de villes pour:", baseCity);
            const response = await anthropic.messages.create({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 1024,
                system: systemPrompt,
                messages: [
                    { role: "user", content: userPrompt },
                    { role: "assistant", content: "{" }
                ]
            });

            const textBlock = response.content[0];
            if (textBlock.type !== 'text') throw new Error("Réponse vide de Claude");

            const content = "{" + textBlock.text;
            const parsed = JSON.parse(content);

            if (Array.isArray(parsed.cities)) return parsed.cities;
            return [];
        } catch (error: any) {
            console.error("❌ Erreur AI City Gen:", error.message);
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
            console.log("🤖 Génération de réponse IA pour l'avis de:", authorName);
            const response = await anthropic.messages.create({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 1024,
                system: systemPrompt,
                messages: [
                    { role: "user", content: userPrompt }
                ]
            });

            const textBlock = response.content[0];
            if (textBlock.type !== 'text') throw new Error("Réponse vide de Claude");

            return textBlock.text.trim();
        } catch (error: any) {
            console.error("❌ Erreur AI Response Gen:", error.message);
            throw error;
        }
    }
};
