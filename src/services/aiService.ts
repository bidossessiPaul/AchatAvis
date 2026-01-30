import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { TextBlock } from '@anthropic-ai/sdk/resources/messages.mjs';

dotenv.config();

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
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
            ficheName,
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
TON OBJECTIF : CRÉER DE LA DIVERSITÉ EXTRÊME ET DU RÉALISME BRUT.

⛔️ INTERDICTIONS FORMELLES (Si tu utilises ces phrases, tu échoues) :
- "Intervention rapide et efficace"
- "Je recommande vivement cette entreprise"
- "Travail soigné et professionnel"
- "Je suis pleinement satisfait"
- "Un grand merci à toute l'équipe"
- Pas de structure répétitive "Problème X à Ville Y résolu".

✅ TES DIRECTIVES CRÉATIVES :
1. **RACONTE DES HISTOIRES** : Invente des détails (le chien qui aboyait, l'odeur du brûlé, la belle-mère qui stressait, le bruit dans le grenier).
2. **BRISURE DE STYLE** :
   - Fais des avis SANS ponctuation.
   - Fais des avis avec des fautes (sa va, merçi, désolé).
   - Fais des avis qui ne parlent PAS de la prestation technique mais du ressenti ("Le gars était super sympa, il a même caressé mon chat").
3. **ÉMOTIONS FORTES** : Utilise la peur ("je paniquais"), la colère passée ("j'en avais marre"), le soulagement ("enfin je dors").

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
   - "Monsieur [Nom] a été d'une politesse rare..."

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
                model: "claude-3-5-haiku-20241022",
                max_tokens: 4096,
                system: systemPrompt,
                messages: [
                    { role: "user", content: userPrompt },
                    { role: "assistant", content: "{" }
                ]
            });

            // Handle the content block safely
            const textBlock = response.content[0];
            if (textBlock.type !== 'text') {
                throw new Error("Réponse inattendue de Claude (pas de texte)");
            }

            let rawContent = "{" + textBlock.text;

            // Robust extraction: find the last '}' to ignore any trailing chat text
            const lastBraceIndex = rawContent.lastIndexOf('}');
            if (lastBraceIndex !== -1) {
                rawContent = rawContent.substring(0, lastBraceIndex + 1);
            }

            try {
                const parsed = JSON.parse(rawContent);
                console.log("✅ Réponse Claude reçue et parsée");

                if (Array.isArray(parsed.reviews)) return parsed.reviews;
                if (Array.isArray(parsed)) return parsed;
                throw new Error("Format invalide (pas un tableau)");
            } catch (e) {
                console.error("Erreur parsing JSON Claude:", content);
                throw e;
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
                model: "claude-3-5-haiku-20241022",
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
                model: "claude-3-5-haiku-20241022",
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
