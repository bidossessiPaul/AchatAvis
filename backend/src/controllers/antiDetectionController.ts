import { Request, Response } from 'express';
import { antiDetectionService } from '../services/antiDetectionService';
import { query } from '../config/database';

export const antiDetectionController = {
    async getAllRules(_req: Request, res: Response) {
        try {
            const rules = await query(`
SELECT * FROM anti_detection_rules 
                WHERE is_active = TRUE 
                ORDER BY order_index ASC
    `);
            return res.json({ success: true, data: { rules, total_rules: (rules as any).length } });
        } catch (error: any) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    async getAllSectors(_req: Request, res: Response) {
        try {
            const sectors: any = await query(`
SELECT * FROM sector_difficulty 
                WHERE is_active = TRUE
    `);

            const grouped = {
                easy: sectors.filter((s: any) => s.difficulty === 'easy'),
                medium: sectors.filter((s: any) => s.difficulty === 'medium'),
                hard: sectors.filter((s: any) => s.difficulty === 'hard')
            };

            return res.json({ success: true, data: grouped });
        } catch (error: any) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    async getComplianceScore(req: Request, res: Response) {
        try {
            const { userId } = req.params;

            // Check if exists, if not initialize
            const existing: any = await query(`
                SELECT id FROM guide_compliance_scores WHERE user_id = ?
    `, [userId]);

            if (!existing || existing.length === 0) {
                await query('INSERT IGNORE INTO guide_compliance_scores (user_id) VALUES (?)', [userId]);
            }

            const data = await antiDetectionService.getExtendedComplianceData(userId);

            // Add visual meta
            let scoreColor = 'green';
            let scoreLabel = 'Excellent';
            if (data.compliance_score < 50) { scoreColor = 'red'; scoreLabel = 'Critique'; }
            else if (data.compliance_score < 70) { scoreColor = 'orange'; scoreLabel = 'À améliorer'; }
            else if (data.compliance_score < 90) { scoreColor = 'blue'; scoreLabel = 'Bon'; }

            return res.json({
                success: true,
                data: {
                    ...data,
                    score_color: scoreColor,
                    score_label: scoreLabel
                }
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    async checkficheCompatibility(req: Request, res: Response) {
        try {
            const { campaign_id, gmail_account_id } = req.body;
            const user_id = req.user?.userId;

            if (!user_id || !campaign_id || !gmail_account_id) {
                return res.status(400).json({ success: false, error: 'Missing parameters' });
            }

            const result = await antiDetectionService.canTakefiche(user_id, campaign_id, gmail_account_id);
            return res.json({ success: true, data: result });
        } catch (error: any) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    async getUserGmailAccounts(req: Request, res: Response) {
        try {
            const { userId } = req.params;

            const accounts = await query(`
SELECT * FROM guide_gmail_accounts WHERE user_id = ? AND is_active = 1
    `, [userId]);

            return res.json({ success: true, data: accounts });
        } catch (error: any) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    async getGuideRecap(req: Request, res: Response) {
        try {
            const user_id = req.user?.userId;
            if (!user_id) return res.status(401).json({ success: false, error: 'Unauthorized' });

            const recap = await antiDetectionService.getGuideActivityRecap(user_id);
            return res.json({ success: true, data: recap });
        } catch (error: any) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    async getGmailHistory(req: Request, res: Response) {
        try {
            const user_id = req.user?.userId;
            const role = req.user?.role;
            const { accountId } = req.params;
            const { sectorId } = req.query;

            if (!user_id) return res.status(401).json({ success: false, error: 'Unauthorized' });

            // If admin, we don't filter by guide_id. If guide, we only allow seeing their own accounts.
            let sql = `
                SELECT 
                    s.id, 
                    s.submitted_at, 
                    s.status, 
                    s.earnings,
                    o.company_name as artisan_company,
                    sd.id as sector_id,
                    sd.sector_name,
                    sd.icon_emoji as sector_icon
                FROM reviews_submissions s
                JOIN reviews_orders o ON s.order_id = o.id
                LEFT JOIN sector_difficulty sd ON o.sector_id = sd.id
                WHERE s.gmail_account_id = ?
            `;
            const params: any[] = [accountId];

            if (role !== 'admin') {
                sql += ` AND s.guide_id = ? `;
                params.push(user_id);
            }

            if (sectorId) {
                sql += ` AND o.sector_id = ? `;
                params.push(sectorId);
            }

            sql += ` ORDER BY s.submitted_at DESC`;

            const history = await query(sql, params);
            return res.json({ success: true, data: history });
        } catch (error: any) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    async submitQuiz(req: Request, res: Response) {
        try {
            const { score } = req.body; // In a real app we'd verify the answers
            const user_id = req.user?.userId;

            if (!user_id) return res.status(401).json({ error: 'User not found' });

            const passed = score >= 80;

            if (passed) {
                await query(`
                    UPDATE guide_compliance_scores 
                    SET certification_passed = TRUE,
    certification_passed_at = NOW(),
    certification_score = ?,
    compliance_score = LEAST(100, compliance_score + 10)
                    WHERE user_id = ?
    `, [score, user_id]);
            }

            return res.json({
                success: true,
                data: {
                    passed,
                    score,
                    rewards: passed ? {
                        badge_earned: "Guide Certifié Anti-Détection",
                        compliance_bonus: 10,
                        unlocked_features: ["Secteurs difficiles", "fiches premium"]
                    } : null
                }
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    async verifyGmailAccountPreview(req: Request, res: Response) {
        try {
            const { email, mapsProfileUrl } = req.body;
            if (!email) return res.status(400).json({ success: false, error: 'Email requis' });

            const { TrustScoreEngine } = require('../services/trustScoreEngine');

            // Utiliser le vrai moteur de calcul, même pour la preview
            const result = await TrustScoreEngine.calculateTrustScore(
                email,
                mapsProfileUrl,
                false // Phone not verified for preview
            );

            // Mapper les résultats pour la compatibilité frontend
            return res.json({
                success: true,
                data: {
                    avatarUrl: result.details.mapsProfile?.data?.avatarUrl || null,
                    localGuideLevel: result.details.mapsProfile?.data?.localGuideLevel || 1,
                    reviewCount: result.details.mapsProfile?.data?.totalReviews || 0,
                    trustScore: result.finalScore,
                    trustLevel: result.trustLevel,
                    isBlocked: result.isBlocked,
                    maxReviewsPerMonth: result.maxReviewsPerMonth,
                    recommendations: result.recommendations
                }
            });
        } catch (error: any) {
            console.error('Preview verification error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    async addGmailAccount(req: Request, res: Response) {
        try {
            const { email, maps_profile_url, local_guide_level, total_reviews_google, avatar_url } = req.body;
            const user_id = req.user?.userId;

            if (!user_id) {
                return res.status(401).json({ success: false, error: 'Utilisateur non identifié.' });
            }

            if (!email) {
                return res.status(400).json({ success: false, error: 'Données manquantes' });
            }

            // ✅ Check global email uniqueness (across all users)
            const existingEmail: any = await query(
                'SELECT user_id FROM guide_gmail_accounts WHERE email = ? AND user_id != ?',
                [email, user_id]
            );
            if (existingEmail && existingEmail.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Cet email est déjà utilisé par un autre guide.'
                });
            }

            // Check if maps_profile_url is already used by another user (if provided)
            if (maps_profile_url) {
                const existing: any = await query(
                    'SELECT user_id FROM guide_gmail_accounts WHERE maps_profile_url = ? AND user_id != ?',
                    [maps_profile_url, user_id]
                );
                if (existing && existing.length > 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Ce lien Google Maps est déjà utilisé par un autre compte.'
                    });
                }
            }

            // Utiliser le vrai moteur de calcul pour la sauvegarde finale
            const { TrustScoreEngine } = require('../services/trustScoreEngine');
            const result = await TrustScoreEngine.calculateTrustScore(
                email,
                maps_profile_url,
                false // Phone not verified yet
            );

            const trustScoreValue = result.finalScore;
            const trustLevel = result.trustLevel;

            await query(`
                INSERT INTO guide_gmail_accounts
                (user_id, email, maps_profile_url, local_guide_level, total_reviews_google, trust_score, account_level, trust_score_value, trust_level, avatar_url, has_profile_picture, is_verified, verification_date)
                VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW())
                ON DUPLICATE KEY UPDATE
                maps_profile_url = VALUES(maps_profile_url),
                local_guide_level = VALUES(local_guide_level),
                total_reviews_google = VALUES(total_reviews_google),
                trust_score = VALUES(trust_score),
                account_level = VALUES(account_level),
                trust_score_value = VALUES(trust_score_value),
                trust_level = VALUES(trust_level),
                avatar_url = VALUES(avatar_url),
                has_profile_picture = VALUES(has_profile_picture),
                is_verified = TRUE,
                verification_date = NOW()
            `, [
                user_id, email, maps_profile_url, local_guide_level || 1,
                total_reviews_google || 0, trustScoreValue, trustLevel.toLowerCase(),
                trustScoreValue, trustLevel.toUpperCase(),
                avatar_url || null, avatar_url ? true : false
            ]);

            return res.json({ success: true, message: 'Compte Gmail ajouté avec succès' });
        } catch (error: any) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, error: 'Cet email est déjà enregistré pour votre compte.' });
            }
            console.error('Error adding Gmail account:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    async deleteGmailAccount(req: Request, res: Response) {
        try {
            const { accountId } = req.params;
            const user_id = req.user?.userId;

            if (!user_id) return res.status(401).json({ error: 'User not found' });

            await query(`
                DELETE FROM guide_gmail_accounts 
                WHERE id = ? AND user_id = ?
    `, [accountId, user_id]);

            return res.json({ success: true, message: 'Compte supprimé' });
        } catch (error: any) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    async generateCities(req: Request, res: Response) {
        try {
            const { base_city, count } = req.body;
            console.log('🌍 Generating cities for:', base_city);

            if (!base_city) {
                return res.status(400).json({ success: false, error: 'Ville requise' });
            }

            // Import dynamically since openAiService might not be imported at top
            const { openAiService } = require('../services/openAiService');

            const cities = await openAiService.generateNearbyCities(base_city, count || 5);

            // Toujours inclure la ville de base si elle n'est pas dans la liste
            // Mais de manière intelligente (la mettre en premier)
            const uniqueCities = Array.from(new Set([base_city, ...cities]));

            return res.json({ success: true, cities: uniqueCities });
        } catch (error: any) {
            console.error('City generation error:', error);
            // Fallback à un tableau vide ou erreur explicite
            return res.status(500).json({ success: false, error: error.message });
        }
    }
};

