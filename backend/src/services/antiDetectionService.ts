import { query } from '../config/database';

/**
 * Service centralisé pour toute la logique anti-détection
 */
class AntiDetectionService {

    /**
     * Calcul automatique du trust score d'un compte Gmail
     */
    async calculateGmailTrustScore(gmailAccountId: number): Promise<number> {
        const accountResult: any = await query(`
            SELECT * FROM guide_gmail_accounts WHERE id = ?
        `, [gmailAccountId]);

        if (!accountResult || accountResult.length === 0) return 0;
        const account = accountResult[0];

        let score = 0;

        // 1. Ancienneté (40 points max)
        // Score = min(40, age_days * 0.5) -> 80 jours pour 40 points
        score += Math.min(40, (account.account_age_days || 0) * 0.5);

        // 2. Nombre avis validés (30 points max)
        score += Math.min(30, (account.successful_reviews || 0) * 3);

        // 3. Taux de réussite (20 points max)
        if (account.total_reviews_posted > 0) {
            const rate = (account.successful_reviews / account.total_reviews_posted) * 100;
            score += (rate / 100) * 20;
        }

        // 4. Diversité/Activité (10 points max)
        if (account.has_profile_picture) score += 5;
        try {
            const activityLog = typeof account.sector_activity_log === 'string'
                ? JSON.parse(account.sector_activity_log)
                : account.sector_activity_log || {};
            const sectorsCount = Object.keys(activityLog).length;
            score += Math.min(5, sectorsCount * 2);
        } catch (e) {
            // Log parse error
        }

        return Math.round(score);
    }

    /**
     * Déterminer le niveau d'un compte Gmail
     */
    determineGmailLevel(trustScore: number): 'nouveau' | 'bronze' | 'silver' | 'gold' {
        if (trustScore >= 85) return 'gold';
        if (trustScore >= 60) return 'silver';
        if (trustScore >= 31) return 'bronze';
        return 'nouveau';
    }

    /**
     * Vérifier si un guide peut prendre une mission
     */
    async canTakeMission(userId: string, campaignId: string, gmailAccountId: number): Promise<{
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

        // a) Niveau Gmail requis
        const levels = ['nouveau', 'bronze', 'silver', 'gold'];
        const currentLevelIdx = levels.indexOf(gmail.account_level);
        const requiredLevelIdx = levels.indexOf(campaign.required_gmail_level || 'nouveau');

        if (currentLevelIdx < requiredLevelIdx) {
            return {
                can_take: false,
                message: `Cette mission nécessite un compte Gmail de niveau ${campaign.required_gmail_level}.`,
                reason: 'LEVEL_INSUFFICIENT'
            };
        }

        // b) Quota mensuel secteur
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
            const minDays = campaign.min_days_between_reviews || 3;

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

        // d) Limite quotidienne globale (max 10 avis)
        const todaySubmissions: any = await query(`
            SELECT COUNT(*) as count FROM reviews_submissions 
            WHERE guide_id = ? AND DATE(submitted_at) = CURDATE()
        `, [userId]);

        if (todaySubmissions[0].count >= 10) {
            return {
                can_take: false,
                message: 'Limite de 10 avis par jour atteinte. Revenez demain !',
                reason: 'DAILY_LIMIT_REACHED'
            };
        }

        return {
            can_take: true,
            message: 'Vous pouvez prendre cette mission',
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

        await query(`
            UPDATE guide_gmail_accounts 
            SET sector_activity_log = ?, 
                last_review_posted_at = NOW(),
                total_reviews_posted = total_reviews_posted + 1
            WHERE id = ?
        `, [JSON.stringify(log), gmailAccountId]);
    }

    /**
<<<<<<< HEAD
     * Recalculer le score de conformité global et récupérer les statistiques
     */
    async getExtendedComplianceData(userId: string): Promise<any> {
        // 1. Récupérer le score actuel
        const scoreResult: any = await query(`
            SELECT * FROM guide_compliance_scores WHERE user_id = ?
=======
     * Récupérer le récapitulatif d'activité pour un guide
     */
    async getGuideActivityRecap(userId: string) {
        // Fetch all Gmail accounts for this guide
        const gmailAccounts: any = await query(`
            SELECT id, email, account_level, sector_activity_log 
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
                sector_name: sector.sector_name,
                icon: sector.icon_emoji,
                difficulty: sector.difficulty,
                max_per_month: sector.max_reviews_per_month_per_email,
                cooldown_days: sector.min_days_between_reviews,
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
                        next_available
                    };
                })
            };
        }

        return recap;
    }

    /**
     * Recalculer le score de conformité global
     */
    async calculateComplianceScore(userId: string): Promise<number> {
        const result: any = await query(`
            SELECT compliance_score FROM guide_compliance_scores WHERE user_id = ?
>>>>>>> origin/main
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
