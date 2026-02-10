import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * 🗺️ GOOGLE MAPS PROFILE SCRAPER - AchatAvis
 * Extraction automatique des données publiques du profil Local Guide
 * GRATUIT - Aucune API requise
 */

interface GoogleMapsProfile {
    isValid: boolean;
    score: number; // 0-60 points
    data: {
        localGuideLevel: number;
        totalPoints: number;
        totalReviews: number;
        totalPhotos: number;
        accountAge: number; // En mois
        firstReviewDate: Date | null;
        profileUrl: string;
    };
    flags: string[];
    suspiciousPatterns: {
        allFiveStars: boolean;
        noPublicReviews: boolean;
        recentBurst: boolean; // Tous les avis en <1 mois
    };
}

export class GoogleMapsProfileScraper {

    /**
     * 🎯 Extraction complète du profil Google Maps
     * @param profileUrl - URL du profil: https://www.google.com/maps/contrib/{id}
     */
    static async extractProfile(profileUrl: string): Promise<GoogleMapsProfile> {
        const result: GoogleMapsProfile = {
            isValid: false,
            score: 0,
            data: {
                localGuideLevel: 0,
                totalPoints: 0,
                totalReviews: 0,
                totalPhotos: 0,
                accountAge: 0,
                firstReviewDate: null,
                profileUrl
            },
            flags: [],
            suspiciousPatterns: {
                allFiveStars: false,
                noPublicReviews: false,
                recentBurst: false
            }
        };

        try {
            // 1️⃣ Validation URL
            if (!this.isValidProfileUrl(profileUrl)) {
                result.flags.push('❌ URL profil invalide');
                return result;
            }

            // 2️⃣ Scraping de la page profil
            const html = await this.fetchProfilePage(profileUrl);
            const $ = cheerio.load(html);

            // 3️⃣ Extraction Niveau Local Guide
            const level = this.extractLocalGuideLevel($ as any);
            result.data.localGuideLevel = level;
            result.score += level * 5; // 5 points par niveau

            if (level > 0) {
                result.flags.push(`✅ Local Guide Niveau ${level}`);
            } else {
                result.flags.push('⚠️ Pas de niveau Local Guide détecté');
            }

            // 4️⃣ Extraction Points totaux
            const points = this.extractTotalPoints($ as any);
            result.data.totalPoints = points;

            if (points >= 500) result.score += 10;
            else if (points >= 100) result.score += 5;

            // 5️⃣ Comptage avis publics
            const reviews = this.extractReviewsData($ as any);
            result.data.totalReviews = reviews.count;
            result.score += Math.min(reviews.count * 0.5, 25); // Max 25 points

            // 6️⃣ Analyse dates des avis
            if (reviews.dates.length > 0) {
                const firstReview = new Date(Math.min(...reviews.dates.map(d => d.getTime())));
                result.data.firstReviewDate = firstReview;

                const ageMonths = this.calculateAccountAge(firstReview);
                result.data.accountAge = ageMonths;

                if (ageMonths >= 6) {
                    result.score += 15;
                    result.flags.push(`✅ Compte actif depuis ${ageMonths} mois`);
                } else {
                    result.flags.push(`⚠️ Compte récent (${ageMonths} mois)`);
                }
            } else {
                result.suspiciousPatterns.noPublicReviews = true;
                result.flags.push('🚫 Aucun avis public visible');
                // Removed penalty - devient neutre
            }

            // 7️⃣ Comptage photos
            const photos = this.extractPhotosCount($ as any);
            result.data.totalPhotos = photos;
            result.score += Math.min(photos * 0.1, 10); // Max 10 points

            // 8️⃣ Détection patterns suspects
            result.suspiciousPatterns.allFiveStars = this.detectAllFiveStars(reviews.ratings);
            if (result.suspiciousPatterns.allFiveStars && reviews.count >= 5) {
                result.flags.push('⚠️ Tous les avis sont 5★ (suspect)');
                // Removed penalty - devient neutre
            }

            result.suspiciousPatterns.recentBurst = this.detectRecentBurst(reviews.dates);
            if (result.suspiciousPatterns.recentBurst) {
                result.flags.push('⚠️ Burst d\'avis récent détecté');
                // Removed penalty - devient neutre
            }

            // ✅ Validation finale
            result.isValid = result.score >= 20 && !result.suspiciousPatterns.noPublicReviews;

        } catch (error: any) {
            result.flags.push(`❌ Erreur scraping: ${error.message}`);
        }

        return result;
    }

    /**
     * 🌐 Fetch de la page profil
     */
    private static async fetchProfilePage(url: string): Promise<string> {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
            },
            timeout: 10000
        });
        return response.data;
    }

    /**
     * 🏅 Extraction Niveau Local Guide
     */
    private static extractLocalGuideLevel($: cheerio.CheerioAPI): number {
        // Cherche "Local Guide Niveau X" ou "Niveau X"
        const text = $('body').text();
        const match = text.match(/(?:Local Guide )?Niveau?\s*(\d+)/i);
        return match ? parseInt(match[1]) : 0;
    }

    /**
     * ⭐ Extraction Points totaux
     */
    private static extractTotalPoints($: cheerio.CheerioAPI): number {
        const text = $('body').text();
        const match = text.match(/(\d+)\s*points?/i);
        return match ? parseInt(match[1]) : 0;
    }

    /**
     * 📝 Extraction données avis
     */
    private static extractReviewsData($: cheerio.CheerioAPI): {
        count: number;
        ratings: number[];
        dates: Date[]
    } {
        const reviews = {
            count: 0,
            ratings: [] as number[],
            dates: [] as Date[]
        };

        // Compte les étoiles visibles
        $('[role="img"][aria-label*="étoiles"]').each((_, el) => {
            const label = $(el).attr('aria-label') || '';
            const match = label.match(/(\d+)\s*étoiles?/i);
            if (match) {
                reviews.ratings.push(parseInt(match[1]));
            }
        });

        // Extraction dates (ex: "il y a 2 ans", "il y a 3 mois")
        $('span').each((_, el) => {
            const text = $(el).text();
            const date = this.parseRelativeDate(text);
            if (date) {
                reviews.dates.push(date);
            }
        });

        reviews.count = Math.max(reviews.ratings.length, reviews.dates.length);
        return reviews;
    }

    /**
     * 📸 Extraction nombre de photos
     */
    private static extractPhotosCount($: cheerio.CheerioAPI): number {
        const text = $('body').text();
        const match = text.match(/(\d+)\s*photos?/i);
        return match ? parseInt(match[1]) : 0;
    }

    /**
     * 🔍 Détection pattern "tous 5★"
     */
    private static detectAllFiveStars(ratings: number[]): boolean {
        if (ratings.length < 3) return false;
        return ratings.every(r => r === 5);
    }

    /**
     * ⚡ Détection burst d'avis récent
     */
    private static detectRecentBurst(dates: Date[]): boolean {
        if (dates.length < 5) return false;

        const now = new Date();
        const oneMonthAgo = new Date(now.setMonth(now.getMonth() - 1));

        const recentReviews = dates.filter(d => d > oneMonthAgo);
        return recentReviews.length >= 5;
    }

    /**
     * 📅 Parsing dates relatives ("il y a X mois/ans")
     */
    private static parseRelativeDate(text: string): Date | null {
        const match = text.match(/il y a (\d+)\s*(mois|ans?|jours?)/i);
        if (!match) return null;

        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        const date = new Date();

        if (unit.startsWith('an')) {
            date.setFullYear(date.getFullYear() - value);
        } else if (unit.startsWith('mois')) {
            date.setMonth(date.getMonth() - value);
        } else if (unit.startsWith('jour')) {
            date.setDate(date.getDate() - value);
        }

        return date;
    }

    /**
     * 📅 Calcul âge du compte en mois
     */
    private static calculateAccountAge(firstReviewDate: Date): number {
        const now = new Date();
        const diff = now.getTime() - firstReviewDate.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
    }

    /**
     * ✅ Validation URL profil Maps
     */
    private static isValidProfileUrl(url: string): boolean {
        // Accept ANY non-empty string as a "valid" URL for submission purposes
        // Verification will happen manually by admin
        return !!url && url.length > 0;
    }

    /**
     * 📊 Analyse détaillée pour dashboard admin
     */
    static async analyzeProfile(profileUrl: string): Promise<string> {
        const result = await this.extractProfile(profileUrl);

        return `
🗺️ ANALYSE PROFIL GOOGLE MAPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
URL: ${profileUrl}
Score: ${result.score}/60 points
Statut: ${result.isValid ? '✅ VALIDE' : '❌ INVALIDE'}

📊 Données extraites:
  • Local Guide: Niveau ${result.data.localGuideLevel}
  • Points totaux: ${result.data.totalPoints}
  • Avis publics: ${result.data.totalReviews}
  • Photos: ${result.data.totalPhotos}
  • Ancienneté: ${result.data.accountAge} mois
  • Premier avis: ${result.data.firstReviewDate?.toLocaleDateString('fr-FR') || 'N/A'}

🚨 Patterns suspects:
  • Tous 5★: ${result.suspiciousPatterns.allFiveStars ? '⚠️ OUI' : '✅ NON'}
  • Aucun avis: ${result.suspiciousPatterns.noPublicReviews ? '🚫 OUI' : '✅ NON'}
  • Burst récent: ${result.suspiciousPatterns.recentBurst ? '⚠️ OUI' : '✅ NON'}

⚠️ Alertes:
${result.flags.map(flag => `  ${flag}`).join('\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
    }
}

export default GoogleMapsProfileScraper;
