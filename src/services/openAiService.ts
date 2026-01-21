import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
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

export const openAiService = {
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

        const prompt = `
            Tu es un système expert en rédaction d'avis clients. 
            Ton objectif est de générer des avis authentiques et crédibles adaptés à la localisation de l'entreprise.
            IMPORTANT : Utilise les "Zones d'intervention" fournies pour localiser certains avis de manière naturelle (ex: "Intervention rapide à [Ville]", "Très content du service sur [Ville]").
            Génère ${quantity} avis positifs (4 ou 5 étoiles) pour la fiche "${ficheName || 'Campagne d\'avis'}" pour l'entreprise suivante :
            Nom : ${companyName}
            Métier : ${trade}
            Secteur précis : ${sector || trade}
            Contexte métier : ${context || 'Artisan professionnel qualifié'}
            Services principaux à mettre en avant : ${services || 'Tous les services standards du métier'}
            Zones d'intervention : ${zones || 'Locale'}
            Noms des collaborateurs (si fournis) : ${staffNames || 'Aucun spécifique'}
            Instructions spécifiques : ${specificInstructions || 'Rédige des avis naturels, variés et crédibles.'}

            Consignes de rédaction :
            1. VARIÉTÉ DE TAILLE : Produis un mélange d'avis courts (1-2 phrases), moyens (3-4 phrases) et longs (paragraphe détaillé).
            2. VARIÉTÉ DE STYLE : Certains avis doivent être très factuels, d'autres plus émotionnels ou enthousiastes.
            3. PERSONNALISATION DES NOMS : Les noms des collaborateurs fournis (${staffNames}) sont des employés de l'entreprise. 
               - ILS DOIVENT apparaître EXCLUSIVEMENT dans le corps du texte (ex: "Merci à Paul", "Sarah a été top").
               - ILS NE DOIVENT JAMAIS être utilisés comme 'author_name' (l'auteur doit être un client fictif).
               - Utilise ces noms de manière naturelle dans environ 50% des avis seulement pour que cela reste crédible.
            4. EMOJIS : Ajoute des emojis de manière très parcimonieuse (maximum 1-2 par avis) et SEULEMENT dans environ 40% des avis.
            5. NATURALITÉ : Évite les répétitions. Chaque avis doit sembler écrit par une personne différente, avec ses propres fautes de frappe légères ou sa propre manière de s'exprimer.
            6. LANGUE : Uniquement en français.
            7. FORMAT : Tu DOIS retourner un objet JSON avec une seule clé "reviews" contenant le tableau des avis.

            Exemple de format attendu :
            {
                "reviews": [
                    {"author_name": "Jean Dupont", "content": "Très bon travail, je recommande ! 👍", "rating": 5},
                    {"author_name": "Marie L.", "content": "Un immense merci à Julie pour son accueil téléphonique et à Marc qui a réparé ma fuite en un temps record. Travail soigné et équipe très pro. Je n'hésiterai pas à les rappeler !", "rating": 5},
                    ...
                ]
            }
        `;

        try {
            console.log("🤖 Appel OpenAI pour generation d'avis...");
            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo-0125",
                messages: [
                    { role: "system", content: "Tu es un rédacteur d'avis clients experts. Tu réponds UNIQUEMENT avec un objet JSON valide." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" },
                temperature: 0.8,
            });

            const content = response.choices[0].message.content;
            if (!content) throw new Error("Aucun contenu renvoyé par OpenAI");

            const parsed = JSON.parse(content);
            console.log("✅ Réponse OpenAI reçue et parsée");

            // On s'assure de renvoyer un tableau
            if (Array.isArray(parsed.reviews)) return parsed.reviews;
            if (Array.isArray(parsed)) return parsed;

            throw new Error("Le format de réponse de l'IA est invalide (pas un tableau)");
        } catch (error: any) {
            console.error("❌ Erreur OpenAI Service:", error.message);
            throw error;
        }
    },

    async generateNearbyCities(baseCity: string, count: number) {
        const prompt = `
            Basé sur l'emplacement de "${baseCity}". 
            Identifie d'abord dans quel pays et région se trouve "${baseCity}".
            Génère ensuite une liste de ${count} villes, communes ou quartiers proches (banlieue ou périphérie directe) qui seraient logiques pour la clientèle d'un professionnel local basé à ${baseCity}.
            
            Règles :
            1. Réalisme géographique : Uniquement des villes réellement proches de ${baseCity} dans le MÊME PAYS (max 20-30km).
            2. Diversité : Mélange des communes résidentielles et des zones d'activité si pertinent.
            3. Format : Retourne UNIQUEMENT un objet JSON avec une clé "cities" contenant un tableau de chaînes de caractères.
            4. Pas de ville inventée.
            5. Si c'est une très grande ville, propose des arrondissements ou des villes de la petite couronne.
            
            Exemple de sortie attendue :
            {
                "cities": ["Mérignac", "Pessac", "Le Bouscat", "Talence", "Bègles"]
            }
        `;

        try {
            console.log("🤖 Appel OpenAI pour generation de villes pour:", baseCity);
            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo-0125",
                messages: [
                    { role: "system", content: "Tu es un expert en géographie mondiale et zones de chalandise. Réponds uniquement en JSON." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" },
                temperature: 0.7,
            });

            const content = response.choices[0].message.content;
            if (!content) throw new Error("Aucun contenu renvoyé par OpenAI");

            const parsed = JSON.parse(content);
            if (Array.isArray(parsed.cities)) return parsed.cities;

            return [];
        } catch (error: any) {
            console.error("❌ Erreur OpenAI City Gen:", error.message);
            throw error;
        }
    },

    async generateReviewResponse(reviewContent: string, authorName: string) {
        const prompt = `
            Tu es un artisan professionnel qui répond à ses clients sur Google Maps avec courtoisie, professionnalisme et authenticité.
            
            Client : ${authorName}
            Avis : "${reviewContent}"
            
            Consignes :
            1. Remercie le client chaleureusement.
            2. Personnalise la réponse en utilisant son nom si possible.
            3. Reste concis (2-3 phrases maximum).
            4. Ne sois pas trop formel, mais reste pro (utilise le "vous").
            5. Ajoute une touche positive (ex: "Au plaisir de vous revoir").
            6. Réponds UNIQUEMENT avec le texte de la réponse, sans guillemets ni introduction.
        `;

        try {
            console.log("🤖 Génération de réponse IA pour l'avis de:", authorName);
            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo-0125",
                messages: [
                    { role: "system", content: "Tu es un assistant de gestion de réputation pour artisans." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
            });

            const content = response.choices[0].message.content;
            if (!content) throw new Error("Aucun contenu renvoyé par OpenAI");

            return content.trim();
        } catch (error: any) {
            console.error("❌ Erreur OpenAI Response Gen:", error.message);
            throw error;
        }
    }
};
