import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

interface GenerateReviewsParams {
    companyName: string;
    trade: string;
    quantity: number;
    context?: string;
    sector?: string;
    zones?: string;
    tone?: string;
    clientTypes?: string;
    staffNames?: string;
    specificInstructions?: string;
}

export const openAiService = {
    async generateReviews(params: GenerateReviewsParams) {
        const {
            companyName,
            trade,
            quantity,
            context,
            sector,
            zones,
            tone,
            clientTypes,
            staffNames,
            specificInstructions
        } = params;

        const prompt = `
            Tu es un système expert en rédaction d'avis clients pour des artisans français.
            Génère ${quantity} avis positifs (4 ou 5 étoiles) pour l'entreprise suivante :
            Nom : ${companyName}
            Métier : ${trade}
            Secteur précis : ${sector || trade}
            Contexte métier : ${context || 'Artisan de qualité'}
            Zones d'intervention : ${zones || 'France'}
            Type de clients : ${clientTypes || 'Particuliers'}
            Ton souhaité : ${tone || 'professionnel'}
            Noms à citer (si fournis) : ${staffNames || 'Aucun spécifique'}
            Instructions spécifiques : ${specificInstructions || 'Aucune'}

            Consignes de rédaction :
            1. VARIÉTÉ DE TAILLE : Produis un mélange d'avis courts (1-2 phrases), moyens (3-4 phrases) et longs (paragraphe détaillé).
            2. VARIÉTÉ DE STYLE : Certains avis doivent être très factuels, d'autres plus émotionnels ou enthousiastes.
            3. PERSONNALISATION : Utilise les noms des collaborateurs fournis (${staffNames}) de manière naturelle dans environ 30% des avis.
            4. EMOJIS : Ajoute des emojis de manière très parcimonieuse (maximum 1-2 par avis) et SEULEMENT dans environ 40% des avis pour garder un aspect pro mais moderne.
            5. NATURALITÉ : Évite les répétitions de phrases types. Chaque avis doit sembler écrit par une personne différente.
            6. LANGUE : Uniquement en français.
            7. FORMAT : Tu DEVEZ retourner un objet JSON avec une seule clé "reviews" contenant le tableau des avis.

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
    }
};
