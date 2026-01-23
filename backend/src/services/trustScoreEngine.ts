import { EmailValidator } from './emailValidator';
import { GoogleMapsProfileScraper } from './googleMapsProfileScraper';

/**
 * 🎯 TRUST SCORE ENGINE - AchatAvis
 * Système de scoring hybride Email + Profil Google Maps
 * Score final: 0-100%
 */

export enum TrustLevel {
    BLOCKED = 'BLOCKED',    // 0-20%
    BRONZE = 'BRONZE',      // 21-40% (30 default)
    SILVER = 'SILVER',      // 41-70% (60 default)
    GOLD = 'GOLD',          // 71-90% (80 default)
    PLATINUM = 'PLATINUM'   // 91-100% (95 default)
}

export interface TrustScoreResult {
    email: string;
    finalScore: number;
    trustLevel: TrustLevel;
    badge: string;
    restrictions: string[];
    breakdown: {
        emailScore: number;        // /30
        mapsProfileScore: number;  // /60
        verificationBonus: number; // /10
        penalties: number;
    };
    details: {
        emailValidation: any;
        mapsProfile: any;
    };
    isBlocked: boolean;
    maxReviewsPerMonth: number;
    recommendations: string[];
}

export class TrustScoreEngine {

    /**
     * 🎯 Calcul complet du Trust Score
     */
    static async calculateTrustScore(
        email: string,
        googleMapsProfileUrl?: string,
        phoneVerified: boolean = false
    ): Promise<TrustScoreResult> {

        // 1️⃣ Validation Email (30 points max)
        // Base: Un email valide = 30 points.
        const emailValidation = await EmailValidator.validate(email);
        const emailScore = emailValidation.isValid ? 30 : 0;

        // 2️⃣ Profil Google Maps (60 points max)
        let mapsProfile: any = null;
        let mapsScore = 0;

        if (googleMapsProfileUrl) {
            try {
                mapsProfile = await GoogleMapsProfileScraper.extractProfile(googleMapsProfileUrl);

                if (mapsProfile?.isValid) {
                    // 30 points pour la présence du profil
                    mapsScore += 30;

                    // 30 points pour l'activité réelle (Niveau Local Guide > 1)
                    if (mapsProfile.data.localGuideLevel > 1) {
                        mapsScore += 30;
                    }
                }
            } catch (error) {
                console.error('Erreur lors du scraping Google Maps:', error);
                mapsScore = 0;
            }
        }

        // 3️⃣ Bonus Vérification (10 points max)
        let verificationBonus = 0;
        if (phoneVerified) verificationBonus += 10;

        // 4️⃣ Score Final (sur 100)
        const penalties = 0;
        const finalScore = Math.min(100, emailScore + mapsScore + verificationBonus);

        // 6️⃣ Attribution Niveau de Confiance
        const trustLevel = this.getTrustLevel(finalScore);
        const badge = this.getBadge(trustLevel);

        // 7️⃣ Restrictions & Limites
        const restrictions = this.getRestrictions(trustLevel);
        const maxReviewsPerMonth = this.getMaxReviewsPerMonth(trustLevel);

        // 8️⃣ Recommandations d'amélioration
        const recommendations = this.getRecommendations(
            emailValidation,
            mapsProfile,
            phoneVerified,
            trustLevel
        );

        return {
            email,
            finalScore,
            trustLevel,
            badge,
            restrictions,
            breakdown: {
                emailScore,
                mapsProfileScore: mapsScore,
                verificationBonus,
                penalties
            },
            details: {
                emailValidation,
                mapsProfile
            },
            isBlocked: trustLevel === TrustLevel.BLOCKED,
            maxReviewsPerMonth,
            recommendations
        };
    }

    /**
     * 🏆 Attribution niveau de confiance
     */
    private static getTrustLevel(score: number): TrustLevel {
        if (score >= 91) return TrustLevel.PLATINUM;
        if (score >= 71) return TrustLevel.GOLD;
        if (score >= 41) return TrustLevel.SILVER;
        if (score >= 21) return TrustLevel.BRONZE;
        return TrustLevel.BLOCKED;
    }

    /**
     * 🎖️ Badge visuel
     */
    private static getBadge(level: TrustLevel): string {
        const badges = {
            [TrustLevel.BLOCKED]: '🔴 BLOQUÉ',
            [TrustLevel.BRONZE]: '🟡 BRONZE',
            [TrustLevel.SILVER]: '🟢 ARGENT',
            [TrustLevel.GOLD]: '🔵 OR',
            [TrustLevel.PLATINUM]: '🟣 PLATINE'
        };
        return badges[level];
    }

    /**
     * 🚫 Restrictions par niveau
     */
    private static getRestrictions(level: TrustLevel): string[] {
        const restrictions = {
            [TrustLevel.BLOCKED]: [
                'Compte suspect - Vérification manuelle requise',
                'Aucune fiche autorisée',
                'Contactez le support pour déblocage'
            ],
            [TrustLevel.BRONZE]: [
                'Maximum 20 avis par mois',
                'Uniquement entreprises vérifiées',
                'Paiement après validation admin'
            ],
            [TrustLevel.SILVER]: [
                'Maximum 20 avis par mois',
                'Accès fiches standard',
                'Paiement sous 48h'
            ],
            [TrustLevel.GOLD]: [
                'Maximum 20 avis par mois',
                'Accès fiches premium',
                'Paiement immédiat',
                'Bonus fiches récurrentes'
            ],
            [TrustLevel.PLATINUM]: [
                'Maximum 20 avis par mois',
                'Accès toutes fiches',
                'Paiement prioritaire',
                'Programme VIP exclusif'
            ]
        };
        return restrictions[level];
    }

    /**
     * 📊 Limite avis/mois
     */
    public static getMaxReviewsPerMonth(level: TrustLevel): number {
        if (level === TrustLevel.BLOCKED) return 0;
        return 20; // Default flat quota for all accounts as per user request
    }

    /**
     * ⚖️ Score par défaut selon le niveau
     */
    static getDefaultScoreForLevel(level: TrustLevel): number {
        const scores = {
            [TrustLevel.BLOCKED]: 0,
            [TrustLevel.BRONZE]: 30,
            [TrustLevel.SILVER]: 60,
            [TrustLevel.GOLD]: 80,
            [TrustLevel.PLATINUM]: 95
        };
        return scores[level] || 0;
    }

    /**
     * 💡 Recommandations personnalisées
     */
    private static getRecommendations(
        emailValidation: any,
        mapsProfile: any,
        phoneVerified: boolean,
        currentLevel: TrustLevel
    ): string[] {
        const tips: string[] = [];

        // Email
        if (!emailValidation.details.syntaxValid) {
            tips.push('📧 Utilisez une adresse email valide');
        }
        if (emailValidation.details.isDisposable) {
            tips.push('🚫 Remplacez l\'email jetable par un compte permanent');
        }
        if (emailValidation.details.suspiciousPattern) {
            tips.push('⚠️ Pattern email suspect - Utilisez nom.prenom@domain.com');
        }

        // Profil Maps
        if (!mapsProfile) {
            tips.push('🗺️ Liez votre profil Google Maps pour +30 points');
        } else {
            if (mapsProfile.data.localGuideLevel < 3) {
                tips.push('🏅 Atteignez Niveau 3 Local Guide (+15 points)');
            }
            if (mapsProfile.data.totalReviews < 10) {
                tips.push('📝 Publiez 10+ avis légitimes (+5 points)');
            }
            if (mapsProfile.data.totalPhotos < 20) {
                tips.push('📸 Ajoutez 20+ photos (+2 points)');
            }
            if (mapsProfile.suspiciousPatterns.allFiveStars) {
                tips.push('⚠️ Variez vos notes (tous 5★ = suspect)');
            }
        }

        // Vérifications
        if (!phoneVerified) {
            tips.push('📱 Vérifiez votre téléphone (+5 points)');
        }

        // Objectifs selon niveau
        if (currentLevel === TrustLevel.BLOCKED) {
            tips.push('🎯 OBJECTIF: Atteignez 21 points pour débloquer BRONZE (20 avis/mois)');
        } else if (currentLevel === TrustLevel.BRONZE) {
            tips.push('🎯 OBJECTIF: Atteignez 41 points pour ARGENT (Paiement plus rapide)');
        } else if (currentLevel === TrustLevel.SILVER) {
            tips.push('🎯 OBJECTIF: Atteignez 66 points pour OR (Paiement immédiat)');
        } else if (currentLevel === TrustLevel.GOLD) {
            tips.push('🎯 OBJECTIF: Atteignez 86 points pour PLATINE (Accès prioritaire)');
        }

        return tips;
    }

    /**
     * 📊 Rapport détaillé pour dashboard admin
     */
    static async generateDetailedReport(
        email: string,
        googleMapsProfileUrl?: string,
        phoneVerified: boolean = false
    ): Promise<string> {
        const result = await this.calculateTrustScore(email, googleMapsProfileUrl, phoneVerified);

        return `
╔════════════════════════════════════════════════════════════════╗
║           🎯 TRUST SCORE REPORT - ACHATAVIS                    ║
╚════════════════════════════════════════════════════════════════╝

📧 Email: ${result.email}
🏆 Score Final: ${result.finalScore}/100 (${result.badge})
🚦 Statut: ${result.isBlocked ? '🔴 BLOQUÉ' : '✅ ACTIF'}
📝 Limite: ${result.maxReviewsPerMonth} avis/mois

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 DÉCOMPOSITION DU SCORE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📧 Email Validation:        ${result.breakdown.emailScore.toString().padStart(3)}/30 points
  🗺️  Profil Google Maps:     ${result.breakdown.mapsProfileScore.toString().padStart(3)}/60 points
  ✅ Bonus Vérification:      ${result.breakdown.verificationBonus.toString().padStart(3)}/10 points
  ❌ Pénalités:               -${result.breakdown.penalties} points
                              ─────────────
  🎯 TOTAL:                   ${result.finalScore}/100 points

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 RESTRICTIONS ACTIVES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${result.restrictions.map((r, i) => `  ${i + 1}. ${r}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 RECOMMANDATIONS D'AMÉLIORATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${result.recommendations.map((r, i) => `  ${i + 1}. ${r}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 PROGRESSION VERS NIVEAU SUPÉRIEUR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${this.getProgressBar(result.finalScore, result.trustLevel)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
    }

    /**
     * 📊 Barre de progression visuelle
     */
    private static getProgressBar(score: number, level: TrustLevel): string {
        const thresholds = {
            [TrustLevel.BLOCKED]: { current: 0, next: 21, label: 'BRONZE' },
            [TrustLevel.BRONZE]: { current: 21, next: 41, label: 'ARGENT' },
            [TrustLevel.SILVER]: { current: 41, next: 66, label: 'OR' },
            [TrustLevel.GOLD]: { current: 66, next: 86, label: 'PLATINE' },
            [TrustLevel.PLATINUM]: { current: 86, next: 100, label: 'MAX' }
        };

        const { current, next, label } = thresholds[level];
        const progress = Math.min(100, ((score - current) / (next - current)) * 100);
        const filled = Math.floor(progress / 5);
        const empty = 20 - filled;

        const bar = '█'.repeat(filled) + '░'.repeat(empty);
        const remaining = Math.max(0, next - score);

        return `
  ${level} → ${label}
  [${bar}] ${progress.toFixed(0)}%
  
  Il vous manque ${remaining} points pour atteindre ${label}
    `.trim();
    }
}

export default TrustScoreEngine;
