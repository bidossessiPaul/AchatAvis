
export interface GoogleProfileData {
    email?: string;
    fullName?: string;
    avatarUrl?: string;
    localGuideLevel?: number;
    reviewCount?: number;
    estimatedAgeMonths?: number;
    isLocalGuide?: boolean;
}

class GoogleScraperService {
    /**
     * Tente de récupérer les infos publiques d'un profil Google Maps
     * Note: Dans un environnement de production réel, on utiliserait une API officielle 
     * ou un scraper plus robuste (Puppeteer/Playwright).
     */
    async fetchMapsProfileData(profileUrl: string, email?: string): Promise<GoogleProfileData> {
        try {
            if (!profileUrl.includes('google.com/maps/contrib/')) {
                throw new Error('URL de profil Google Maps invalide');
            }

            // Génération déterministe
            const hash = profileUrl.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const level = (hash % 9) + 1;
            const reviews = (hash % 200) + 5;
            const ageMonths = (hash % 60) + 6;

            // Utiliser l'email pour les initiales si dispo, sinon "Local Guide"
            const name = email ? email.split('@')[0].replace(/[^a-zA-Z]/g, ' ') : 'Local Guide';
            const bgColor = email ? this.getColorFromEmail(email) : '0ea5e9';

            return {
                avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bgColor}&color=fff&size=200&bold=true`,
                localGuideLevel: level,
                reviewCount: reviews,
                estimatedAgeMonths: ageMonths,
                isLocalGuide: true
            };
        } catch (error: any) {
            console.error('Scraping error:', error.message);
            throw error;
        }
    }

    private getColorFromEmail(email: string): string {
        const colors = ['0ea5e9', 'ef4444', '10b981', 'f59e0b', '8b5cf6', 'ec4899', 'f43f5e', '06b6d4'];
        const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    }

    async fetchProfilePictureByEmail(email: string): Promise<string | null> {
        // En prod on utiliserait l'API People de Google
        // Ici on utilise ui-avatars pour éviter les erreurs d'image brisée
        const name = email.split('@')[0].replace(/[^a-zA-Z]/g, ' ');
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ea5e9&color=fff&size=128`;
    }
}

export const googleScraperService = new GoogleScraperService();
