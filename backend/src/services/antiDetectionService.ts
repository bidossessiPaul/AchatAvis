import { query } from '../config/database';
import { TrustScoreEngine } from './trustScoreEngine';

/**
 * Service centralisé pour toute la logique anti-détection
 */
class AntiDetectionService {

    /**
     * Calcul automatique du trust score d'un compte Gmail
     */
    async calculateGmailTrustScore(gmailAccountId: number): Promise<number> {
        const accountResult: any = await query(`
            SELECT email, COALESCE(google_maps_profile_url, maps_profile_url) as google_maps_profile_url, phone_verified 
            FROM guide_gmail_accounts 
            WHERE id = ?
        `, [gmailAccountId]);

        if (!accountResult || accountResult.length === 0) return 0;
        const account = accountResult[0];

        const result = await TrustScoreEngine.calculateTrustScore(
            account.email,
            account.google_maps_profile_url,
            account.phone_verified || false
        );

        return result.finalScore;
    }

    /**
     * Déterminer le niveau d'un compte Gmail
     */
    determineGmailLevel(trustScore: number): string {
        if (trustScore >= 91) return 'PLATINUM';
        if (trustScore >= 71) return 'GOLD';
        if (trustScore >= 41) return 'SILVER';
        if (trustScore >= 21) return 'BRONZE';
        return 'BLOCKED';
    }

    /**
     * Vérifier si un guide peut prendre une fiche
     */
    async canTakefiche(userId: string, campaignId: string, gmailAccountId: number): Promise<{
        can_take: boolean;
        reason?: string;
        message: string;
        details?: any;
        alternatives?: any;
    }> {
        // 1. Récupérer infos campagne et secteur
        const campaignResult: any = await query(`
            SELECT o.*, sd.sector_slug, sd.difficulty, sd.max_reviews_per_month_per_email, sd.min_days_between_reviews, sd.required_gmail_level
            FROM reviews_orders o
            LEFT JOIN sector_difficulty sd ON o.sector_id = sd.id
            WHERE o.id = ?
        `, [campaignId]);

        if (!campaignResult || campaignResult.length === 0) {
            return { can_take: false, message: 'Campagne non trouvée', reason: 'NOT_FOUND' };
        }
        const campaign = campaignResult[0];

        // 2. Récupérer infos compte Gmail
        const gmailResult: any = await query(`
            SELECT * FROM guide_gmail_accounts WHERE id = ? AND user_id = ?
        `, [gmailAccountId, userId]);

        if (!gmailResult || gmailResult.length === 0) {
            return { can_take: false, message: 'Compte Gmail non trouvé', reason: 'GMAIL_NOT_FOUND' };
        }
        const gmail = gmailResult[0];

        // 🎯 SECURITY: Check if account is active and not blocked
        if (gmail.is_active === 0 || gmail.is_blocked === 1 || gmail.is_blocked === true || gmail.trust_level === 'BLOCKED') {
            return {
                can_take: false,
                message: 'ce compte mail est bloqué ou désactivé par l\'administration.',
                reason: 'GMAIL_BLOCKED'
            };
        }
        const now = new Date();
        const resetDate = gmail.monthly_reset_date ? new Date(gmail.monthly_reset_date) : null;

        if (resetDate && (resetDate.getMonth() !== now.getMonth() || resetDate.getFullYear() !== now.getFullYear())) {
            // New month - reset global counter
            await query(`
                UPDATE guide_gmail_accounts 
                SET monthly_reviews_posted = 0, 
                    monthly_reset_date = ?
                WHERE id = ?
            `, [now.toISOString().split('T')[0], gmailAccountId]);
            gmail.monthly_reviews_posted = 0;
        }

        // Check global monthly quota (Min 20 as per user request)
        const monthlyLimit = Math.max(20, gmail.monthly_quota_limit || 0);
        const monthlyUsed = gmail.monthly_reviews_posted || 0;

        if (monthlyUsed >= monthlyLimit) {
            return {
                can_take: false,
                message: `Quota mensuel global atteint (${monthlyUsed}/${monthlyLimit} avis). Ce compte Gmail ne peut plus poster d'avis ce mois.`,
                reason: 'GLOBAL_QUOTA_EXCEEDED',
                details: {
                    used: monthlyUsed,
                    max: monthlyLimit,
                    next_reset: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0]
                }
            };
        }

        // 3. Récupérer score de conformité du guide
        let complianceResult: any = await query(`
            SELECT compliance_score FROM guide_compliance_scores WHERE user_id = ?
        `, [userId]);

        let complianceScore = 0;
        if (!complianceResult || complianceResult.length === 0) {
            // Initialiser à 100 pour les nouveaux
            await query(`
                INSERT INTO guide_compliance_scores (user_id, compliance_score) VALUES (?, 100)
            `, [userId]);
            complianceScore = 100;
        } else {
            complianceScore = complianceResult[0].compliance_score || 0;
        }

        if (complianceScore < 50) {
            return {
                can_take: false,
                message: 'Votre score de conformité est trop bas. Consultez le guide anti-détection.',
                reason: 'COMPLIANCE_LOW'
            };
        }

        // 4. VÉRIFICATIONS

        // a) Niveau Gmail requis - SUPPRIMÉ: tous les comptes peuvent accéder à tous les secteurs
        // Les niveaux sont gardés uniquement pour les badges/affichage et quotas mensuels globaux.

        // b) Quota mensuel secteur (CRITIQUE - limite par secteur par mois)
        const activityLog = typeof gmail.sector_activity_log === 'string'
            ? JSON.parse(gmail.sector_activity_log)
            : gmail.sector_activity_log || {};

        const sectorSlug = campaign.sector_slug;
        const sectorActivity = activityLog[sectorSlug] || { last_posted: null, count_this_month: 0 };

        if (campaign.max_reviews_per_month_per_email && sectorActivity.count_this_month >= campaign.max_reviews_per_month_per_email) {
            return {
                can_take: false,
                message: `Vous avez atteint le quota mensuel pour le secteur ${sectorSlug} avec cet email.`,
                reason: 'SECTOR_QUOTA_EXCEEDED'
            };
        }

        // c) Espacement (Cooldown)
        if (sectorActivity.last_posted) {
            const lastPosted = new Date(sectorActivity.last_posted);
            const now = new Date();

            // Check for monthly reset
            if (lastPosted.getMonth() !== now.getMonth() || lastPosted.getFullYear() !== now.getFullYear()) {
                sectorActivity.count_this_month = 0;
            }

            if (campaign.max_reviews_per_month_per_email && sectorActivity.count_this_month >= campaign.max_reviews_per_month_per_email) {
                return {
                    can_take: false,
                    message: `Quota mensuel atteint (${sectorActivity.count_this_month}/${campaign.max_reviews_per_month_per_email}) pour le secteur ${sectorSlug} avec cet email.`,
                    reason: 'SECTOR_QUOTA_EXCEEDED',
                    details: {
                        used: sectorActivity.count_this_month,
                        max: campaign.max_reviews_per_month_per_email,
                        next_month_reset: true
                    }
                };
            }

            const diffDays = Math.ceil((now.getTime() - lastPosted.getTime()) / (1000 * 3600 * 24));
            const minDays = campaign.min_days_between_reviews || 2;

            if (diffDays < minDays) {
                const nextDate = new Date(lastPosted.getTime() + minDays * 24 * 3600 * 1000);
                return {
                    can_take: false,
                    message: `Respectez un délai de ${minDays} jours entre deux avis sur ce secteur.`,
                    reason: 'SECTOR_COOLDOWN',
                    details: {
                        next_available_date: nextDate.toLocaleDateString(),
                        days_remaining: minDays - diffDays,
                        used: sectorActivity.count_this_month,
                        max: campaign.max_reviews_per_month_per_email
                    }
                };
            }
        }

        return {
            can_take: true,
            message: 'Vous pouvez prendre cette fiche',
            details: {
                used: sectorActivity.count_this_month,
                max: campaign.max_reviews_per_month_per_email || 5
            }
        };
    }

    /**
     * Logger une violation de règle
     */
    async logViolation(userId: string, ruleKey: string, severity: 'low' | 'medium' | 'high' | 'critical', details: string) {
        const pointsDeducted = { low: 5, medium: 10, high: 20, critical: 40 }[severity];

        await query(`
            UPDATE guide_compliance_scores 
            SET compliance_score = GREATEST(0, compliance_score - ?),
                rules_violated_count = rules_violated_count + 1,
                last_violation_date = NOW(),
                violations_log = JSON_ARRAY_APPEND(COALESCE(violations_log, JSON_ARRAY()), '$', JSON_OBJECT(
                    'rule_key', ?,
                    'severity', ?,
                    'violated_at', NOW(),
                    'details', ?,
                    'points_deducted', ?
                ))
            WHERE user_id = ?
        `, [pointsDeducted, ruleKey, severity, details, pointsDeducted, userId]);
    }

    /**
     * Mettre à jour l'activité d'un compte Gmail
     */
    async updateGmailActivity(gmailAccountId: number, sectorSlug: string) {
        const accountResult: any = await query(`
            SELECT sector_activity_log FROM guide_gmail_accounts WHERE id = ?
        `, [gmailAccountId]);

        if (!accountResult || accountResult.length === 0) return;

        let log = typeof accountResult[0].sector_activity_log === 'string'
            ? JSON.parse(accountResult[0].sector_activity_log)
            : accountResult[0].sector_activity_log || {};

        const now = new Date();
        const sectorLog = log[sectorSlug] || { count_this_month: 0, count_total: 0, last_posted: null };

        // Handle Monthly Reset
        if (sectorLog.last_posted) {
            const lastDate = new Date(sectorLog.last_posted);
            if (lastDate.getMonth() !== now.getMonth() || lastDate.getFullYear() !== now.getFullYear()) {
                sectorLog.count_this_month = 0;
            }
        }

        sectorLog.last_posted = now.toISOString();
        sectorLog.count_total += 1;
        sectorLog.count_this_month += 1;

        log[sectorSlug] = sectorLog;

        // Handle Monthly Reset for the main table column
        const checkAccount: any = await query('SELECT last_review_posted_at, monthly_reviews_posted FROM guide_gmail_accounts WHERE id = ?', [gmailAccountId]);
        let monthlyReviewsPosted = (checkAccount[0]?.monthly_reviews_posted || 0);

        if (checkAccount[0]?.last_review_posted_at) {
            const lastDate = new Date(checkAccount[0].last_review_posted_at);
            if (lastDate.getMonth() !== now.getMonth() || lastDate.getFullYear() !== now.getFullYear()) {
                monthlyReviewsPosted = 0;
            }
        }

        await query(`
            UPDATE guide_gmail_accounts 
            SET sector_activity_log = ?, 
                last_review_posted_at = NOW(),
                total_reviews_posted = total_reviews_posted + 1,
                monthly_reviews_posted = ? + 1
            WHERE id = ?
        `, [JSON.stringify(log), monthlyReviewsPosted, gmailAccountId]);
    }

    /**
     * Récupérer le récapitulatif d'activité pour un guide
     */
    async getGuideActivityRecap(userId: string) {
        // Fetch all Gmail accounts for this guide with global quota info
        const gmailAccounts: any = await query(`
            SELECT id, email, trust_level as account_level, sector_activity_log,
                   monthly_reviews_posted, monthly_quota_limit
            FROM guide_gmail_accounts 
            WHERE user_id = ?
        `, [userId]);

        // Fetch all sectors
        const sectors: any = await query(`
            SELECT * FROM sector_difficulty WHERE is_active = TRUE
        `, []);

        const now = new Date();
        const recap: any = {};

        for (const sector of sectors) {
            recap[sector.sector_slug] = {
                sector_id: sector.id,
                sector_name: sector.sector_name,
                icon: sector.icon_emoji,
                difficulty: sector.difficulty,
                max_per_month: sector.max_reviews_per_month_per_email || (sector.difficulty === 'easy' ? 5 : (sector.difficulty === 'medium' ? 3 : 2)),
                cooldown_days: sector.min_days_between_reviews || 2,
                accounts: gmailAccounts.map((acc: any) => {
                    let log = {};
                    try {
                        log = typeof acc.sector_activity_log === 'string'
                            ? JSON.parse(acc.sector_activity_log)
                            : acc.sector_activity_log || {};
                    } catch (e) { }

                    const activity = (log as any)[sector.sector_slug] || { count_this_month: 0, last_posted: null };

                    // Monthly reset check for recap display
                    if (activity.last_posted) {
                        const lastDate = new Date(activity.last_posted);
                        if (lastDate.getMonth() !== now.getMonth() || lastDate.getFullYear() !== now.getFullYear()) {
                            activity.count_this_month = 0;
                        }
                    }

                    // Cooldown check
                    let status = 'ready';
                    let next_available = null;
                    if (activity.last_posted) {
                        const lastDate = new Date(activity.last_posted);
                        const diffDays = Math.ceil((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
                        if (diffDays < sector.min_days_between_reviews) {
                            status = 'cooldown';
                            next_available = new Date(lastDate.getTime() + sector.min_days_between_reviews * 24 * 3600 * 1000).toISOString();
                        }
                    }

                    if (activity.count_this_month >= sector.max_reviews_per_month_per_email) {
                        status = 'limit_reached';
                    }

                    return {
                        id: acc.id,
                        email: acc.email,
                        used_this_month: activity.count_this_month,
                        last_posted: activity.last_posted,
                        status,
                        next_available,
                        global_quota: {
                            used: acc.monthly_reviews_posted || 0,
                            max: Math.max(20, acc.monthly_quota_limit || 0)
                        }
                    };
                })
            };
        }

        // Add a flattened list of accounts with global status and remaining quotas
        const global_accounts = gmailAccounts.map((acc: any) => {
            const used = acc.monthly_reviews_posted || 0;
            const max = Math.max(20, acc.monthly_quota_limit || 0);
            const remaining = Math.max(0, max - used);

            // Determine global status
            let status = 'ready';
            if (used >= max) {
                status = 'limit_reached';
            }

            return {
                id: acc.id,
                email: acc.email,
                account_level: acc.account_level,
                global_quota: {
                    used,
                    max,
                    remaining
                },
                status
            };
        });

        return {
            sectors: recap,
            global_accounts
        };
    }

    /**
     * Recalculer le score de conformité global et récupérer les statistiques étendues
     */
    async getExtendedComplianceData(userId: string): Promise<any> {
        // 1. Récupérer le score actuel
        const scoreResult: any = await query(`
            SELECT * FROM guide_compliance_scores WHERE user_id = ?
        `, [userId]);

        let data = scoreResult?.[0] || { compliance_score: 100, rules_followed_count: 0, rules_violated_count: 0 };

        // 2. Statistiques des 30 derniers jours
        const statsResult: any = await query(`
            SELECT 
                COUNT(CASE WHEN status = 'validated' THEN 1 END) as validated_count,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count
            FROM reviews_submissions
            WHERE guide_id = ? 
            AND submitted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `, [userId]);

        const stats = statsResult[0] || { validated_count: 0, rejected_count: 0 };

        // 3. Calculer le taux de réussite sur 30 jours
        const total = stats.validated_count + stats.rejected_count;
        const successRate = total > 0 ? Math.round((stats.validated_count / total) * 100) : 100;

        return {
            ...data,
            last_30_days: {
                validated: stats.validated_count,
                rejected: stats.rejected_count,
                success_rate: successRate,
                total
            }
        };
    }
}

export const antiDetectionService = new AntiDetectionService();
