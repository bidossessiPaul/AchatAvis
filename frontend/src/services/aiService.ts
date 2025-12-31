// aiService.ts (axios removed as it was unused)

interface GenerateReviewsParams {
    companyName: string;
    trade: string;
    clientNames?: string[];
    quantity?: number;
}

export interface GeneratedReview {
    id: string;
    content: string;
    rating: number;
    authorName: string;
}

// Mock AI Service - In production this would call your backend which calls OpenAI
export const generateReviews = async (params: GenerateReviewsParams): Promise<GeneratedReview[]> => {
    console.log("Generating reviews with params:", params);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const reviews: GeneratedReview[] = [];
    const count = params.quantity || (params.clientNames?.length || 3);

    const adjectives = ['Excellent', 'Professionnel', 'Rapide', 'Efficace', 'Sympathique', 'Compétent'];
    const actions = ['réparation', 'installation', 'dépannage', 'rénovation', 'intervention'];

    for (let i = 0; i < count; i++) {
        const clientName = params.clientNames?.[i] || `Client ${i + 1}`;
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const action = actions[Math.floor(Math.random() * actions.length)];

        reviews.push({
            id: Math.random().toString(36).substr(2, 9),
            authorName: clientName,
            rating: 5,
            content: `${adj} travail pour une ${action}. Je recommande vivement ${params.companyName} !`
        });
    }

    return reviews;
};
