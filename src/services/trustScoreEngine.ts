import { EmailValidator } from './emailValidator';
import { GoogleMapsProfileScraper } from './googleMapsProfileScraper';

/**
 * 🎯 TRUST SCORE ENGINE - AchatAvis
 * Système de scoring hybride Email + Profil Google Maps
 * Score final: 0-100%
 */

export enum TrustLevel {
    BLOCKED = 'BLOCKED',    // 0-20%
    BRONZE = 'BRONZE',      // 21-40%
    SILVER = 'SILVER',      // 41-65%
    GOLD = 'GOLD',          // 66-85%
    PLATINUM = 'PLATINUM'   // 86-100%
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
        const emailValidation = await EmailValidator.validate(email);
        const emailScore = Math.max(0, emailValidation.score);

        // 2️⃣ Profil Google Maps (60 points max)
        let mapsProfile: any = null;
        let mapsScore = 0;

        if (googleMapsProfileUrl) {
            try {
                mapsProfile = await GoogleMapsProfileScraper.extractProfile(googleMapsProfileUrl);
                mapsScore = Math.max(0, mapsProfile.score);
            } catch (error) {
                console.error('Erreur lors du scraping Google Maps:', error);
                // Si erreur, on continue sans le profil Maps
                mapsScore = 0;
            }
        } else {
            // Pas de pénalité si pas de profil - score de 0
            mapsScore = 0;
        }

        // 3️⃣ Bonus Vérification (10 points max)
        let verificationBonus = 0;
        if (phoneVerified) verificationBonus += 5;
        if (googleMapsProfileUrl && mapsProfile?.isValid) verificationBonus += 5;

        // 4️⃣ Calcul pénalités cumulées (Désactivées pour le modèle additif)
        let penalties = 0;

        /*
        if (emailValidation.details.isDisposable) penalties += 50;
        if (emailValidation.details.suspiciousPattern) penalties += 10;
        if (mapsProfile?.suspiciousPatterns.allFiveStars) penalties += 20;
        if (mapsProfile?.suspiciousPatterns.noPublicReviews) penalties += 30;
        if (mapsProfile?.suspiciousPatterns.recentBurst) penalties += 10;
        */

        // 5️⃣ Score Final (sur 100)
        // Modèle Additif: Le score Maps peut seulement ajouter des points, jamais en enlever.
        // On s'assure que le score est au moins égal au score de l'email de base.
        const rawScore = emailScore + mapsScore + verificationBonus;
        const finalScore = Math.max(emailScore, Math.min(100, rawScore));

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
        if (score >= 86) return TrustLevel.PLATINUM;
        if (score >= 66) return TrustLevel.GOLD;
        if (score >= 41) return TrustLevel.SILVER;
        if (score >= 5) return TrustLevel.BRONZE; // Très bas pour ne bloquer personne avec un email valide
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
                'Maximum 2 avis par mois',
                'Uniquement entreprises vérifiées',
                'Paiement après validation admin'
            ],
            [TrustLevel.SILVER]: [
                'Maximum 5 avis par mois',
                'Accès fiches standard',
                'Paiement sous 48h'
            ],
            [TrustLevel.GOLD]: [
                'Maximum 10 avis par mois',
                'Accès fiches premium',
                'Paiement immédiat',
                'Bonus fiches récurrentes'
            ],
            [TrustLevel.PLATINUM]: [
                'Aucune limite mensuelle',
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
    private static getMaxReviewsPerMonth(level: TrustLevel): number {
        const limits = {
            [TrustLevel.BLOCKED]: 0,
            [TrustLevel.BRONZE]: 2,
            [TrustLevel.SILVER]: 5,
            [TrustLevel.GOLD]: 10,
            [TrustLevel.PLATINUM]: 999
        };
        return limits[level];
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
            tips.push('🎯 OBJECTIF: Atteignez 21 points pour débloquer BRONZE');
        } else if (currentLevel === TrustLevel.BRONZE) {
            tips.push('🎯 OBJECTIF: Atteignez 41 points pour ARGENT (x2.5 avis/mois)');
        } else if (currentLevel === TrustLevel.SILVER) {
            tips.push('🎯 OBJECTIF: Atteignez 66 points pour OR (paiement immédiat)');
        } else if (currentLevel === TrustLevel.GOLD) {
            tips.push('🎯 OBJECTIF: Atteignez 86 points pour PLATINE (illimité)');
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
