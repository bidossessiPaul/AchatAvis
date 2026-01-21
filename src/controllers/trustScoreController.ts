import { Request, Response } from 'express';
import { EmailValidator } from '../services/emailValidator';
import { GoogleMapsProfileScraper } from '../services/googleMapsProfileScraper';
import { TrustScoreEngine, TrustScoreResult } from '../services/trustScoreEngine';
import pool from '../config/database';

/**
 * 🎯 Trust Score Controller - AchatAvis
 * Gestion des endpoints Trust Score
 */

export class TrustScoreController {

    /**
     * POST /api/trust-score/calculate
     * Calcul complet du Trust Score pour un compte
     */
    static async calculateTrustScore(req: Request, res: Response) {
        try {
            const { email, googleMapsProfileUrl, phoneVerified } = req.body;

            if (!email) {
                return res.status(400).json({ error: 'Email requis' });
            }

            // Calcul du Trust Score
            const result = await TrustScoreEngine.calculateTrustScore(
                email,
                googleMapsProfileUrl,
                phoneVerified || false
            );

            // Mise à jour en base de données si le compte existe
            const accountResult: any = await pool.query(
                'SELECT id FROM guide_gmail_accounts WHERE email = ?',
                [email]
            );

            // MySQL retourne [rows, fields], on veut rows
            const rows = Array.isArray(accountResult) ? accountResult[0] : accountResult;

            if (rows && rows.length > 0) {
                await TrustScoreController.saveTrustScoreToDatabase(email, result);
            }

            return res.json({
                success: true,
                data: result
            });
        } catch (error: any) {
            console.error('Error calculating trust score:', error);
            return res.status(500).json({
                error: 'Erreur lors du calcul du Trust Score',
                details: error.message
            });
        }
    }

    /**
     * POST /api/trust-score/validate-email
     * Validation email uniquement
     */
    static async validateEmail(req: Request, res: Response) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ error: 'Email requis' });
            }

            const result = await EmailValidator.validate(email);

            return res.json({
                success: true,
                data: result
            });
        } catch (error: any) {
            console.error('Error validating email:', error);
            return res.status(500).json({
                error: 'Erreur lors de la validation de l\'email',
                details: error.message
            });
        }
    }

    /**
     * POST /api/trust-score/scrape-profile
     * Scraping profil Google Maps uniquement
     */
    static async scrapeProfile(req: Request, res: Response) {
        try {
            const { profileUrl } = req.body;

            if (!profileUrl) {
                return res.status(400).json({ error: 'URL de profil requise' });
            }

            const result = await GoogleMapsProfileScraper.extractProfile(profileUrl);

            return res.json({
                success: true,
                data: result
            });
        } catch (error: any) {
            console.error('Error scraping profile:', error);
            return res.status(500).json({
                error: 'Erreur lors du scraping du profil',
                details: error.message
            });
        }
    }

    /**
     * GET /api/trust-score/statistics
     * Statistiques globales du système Trust Score
     */
    static async getStatistics(_req: Request, res: Response) {
        try {
            const stats: any = await pool.query('SELECT * FROM trust_score_statistics');
            const statsRows = Array.isArray(stats) ? stats[0] : stats;

            const suspicious: any = await pool.query('SELECT COUNT(*) as count FROM suspicious_guide_accounts');
            const suspiciousRows = Array.isArray(suspicious) ? suspicious[0] : suspicious;

            const topPerformers: any = await pool.query('SELECT COUNT(*) as count FROM top_guide_performers');
            const topPerformersRows = Array.isArray(topPerformers) ? topPerformers[0] : topPerformers;

            return res.json({
                success: true,
                data: {
                    levelDistribution: statsRows,
                    suspiciousAccountsCount: parseInt(suspiciousRows[0]?.count || 0),
                    topPerformersCount: parseInt(topPerformersRows[0]?.count || 0)
                }
            });
        } catch (error: any) {
            console.error('Error fetching trust score statistics:', error);
            return res.status(500).json({
                error: 'Erreur lors de la récupération des statistiques',
                details: error.message
            });
        }
    }

    /**
     * POST /api/trust-score/recalculate/:accountId
     */
    static async recalculateAccount(req: Request, res: Response) {
        try {
            const { accountId } = req.params;

            const accountResult: any = await pool.query(
                'SELECT email, COALESCE(google_maps_profile_url, maps_profile_url) as google_maps_profile_url, phone_verified FROM guide_gmail_accounts WHERE id = ?',
                [accountId]
            );
            const rows = Array.isArray(accountResult) ? accountResult[0] : accountResult;

            if (!rows || rows.length === 0) {
                return res.status(404).json({ error: 'Compte non trouvé' });
            }

            const account = rows[0];

            const result = await TrustScoreEngine.calculateTrustScore(
                account.email,
                account.google_maps_profile_url,
                account.phone_verified
            );

            await TrustScoreController.saveTrustScoreToDatabase(account.email, result);

            return res.json({
                success: true,
                message: 'Trust Score recalculé avec succès',
                data: result
            });
        } catch (error: any) {
            console.error('Error recalculating trust score:', error);
            return res.status(500).json({
                error: 'Erreur lors du recalcul du Trust Score',
                details: error.message
            });
        }
    }

    /**
     * GET /api/trust-score/suspicious-accounts
     */
    static async getSuspiciousAccounts(_req: Request, res: Response) {
        try {
            const result: any = await pool.query('SELECT * FROM suspicious_guide_accounts LIMIT 100');
            const rows = Array.isArray(result) ? result[0] : result;

            return res.json({
                success: true,
                data: rows
            });
        } catch (error: any) {
            console.error('Error fetching suspicious accounts:', error);
            return res.status(500).json({
                error: 'Erreur lors de la récupération des comptes suspects',
                details: error.message
            });
        }
    }

    /**
     * GET /api/trust-score/top-performers
     */
    static async getTopPerformers(_req: Request, res: Response) {
        try {
            const result: any = await pool.query('SELECT * FROM top_guide_performers');
            const rows = Array.isArray(result) ? result[0] : result;

            return res.json({
                success: true,
                data: rows
            });
        } catch (error: any) {
            console.error('Error fetching top performers:', error);
            return res.status(500).json({
                error: 'Erreur lors de la récupération des top performers',
                details: error.message
            });
        }
    }

    /**
     * PUT /api/trust-score/override/:accountId
     */
    static async overrideTrustScore(req: Request, res: Response) {
        try {
            const { accountId } = req.params;
            const { trustScore, trustLevel, adminNotes, manualVerificationStatus } = req.body;

            const updates: string[] = [];
            const values: any[] = [];

            // Auto-update score if level matches
            if (trustLevel && trustScore === undefined) {
                let autoScore = 0;
                switch (trustLevel) {
                    case 'PLATINUM': autoScore = 90; break;
                    case 'GOLD': autoScore = 75; break;
                    case 'SILVER': autoScore = 50; break;
                    case 'BRONZE': autoScore = 30; break;
                    case 'BLOCKED': autoScore = 0; break;
                }
                updates.push('trust_score_value = ?');
                values.push(autoScore);
            } else if (trustScore !== undefined) {
                updates.push('trust_score_value = ?');
                values.push(trustScore);
            }

            if (trustLevel) {
                updates.push('trust_level = ?');
                values.push(trustLevel);
            }

            if (adminNotes) {
                updates.push('admin_notes = ?');
                values.push(adminNotes);
            }

            if (manualVerificationStatus) {
                updates.push('manual_verification_status = ?');
                values.push(manualVerificationStatus);
            }

            if (updates.length === 0) {
                return res.status(400).json({ error: 'Aucune modification fournie' });
            }

            updates.push('trust_last_calculated_at = NOW()');
            values.push(accountId);

            const sql = `UPDATE guide_gmail_accounts SET ${updates.join(', ')} WHERE id = ?`;
            await pool.query(sql, values);

            return res.json({
                success: true,
                message: 'Trust Score modifié avec succès'
            });
        } catch (error: any) {
            console.error('Error overriding trust score:', error);
            return res.status(500).json({
                error: 'Erreur lors de la modification du Trust Score',
                details: error.message
            });
        }
    }

    /**
     * GET /api/trust-score/accounts
     * Liste tous les comptes Gmail des guides pour l'admin
     */
    static async listAllAccounts(req: Request, res: Response) {
        try {
            // Optionnel: On pourrait ajouter du filtrage ici
            const { level, search } = req.query;
            let sql = `
                SELECT 
                    id, 
                    email, 
                    trust_score,
                    trust_score_value, 
                    trust_level, 
                    COALESCE(google_maps_profile_url, maps_profile_url) as google_maps_profile_url,
                    phone_verified, 
                    is_active,
                    trust_last_calculated_at
                FROM guide_gmail_accounts
            `;
            const params: any[] = [];

            if (level || search) {
                sql += ' WHERE 1=1';
                if (level) {
                    sql += ' AND trust_level = ?';
                    params.push(level);
                }
                if (search) {
                    sql += ' AND (email LIKE ? OR google_maps_profile_url LIKE ? OR maps_profile_url LIKE ?)';
                    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
                }
            }

            sql += ' ORDER BY trust_last_calculated_at DESC';

            const result: any = await pool.query(sql, params);
            const rows = Array.isArray(result) ? result[0] : result;

            return res.json({
                success: true,
                data: rows
            });
        } catch (error: any) {
            console.error('Error listing accounts:', error);
            return res.status(500).json({
                error: 'Erreur lors de la récupération des comptes',
                details: error.message
            });
        }
    }

    /**
     * PATCH /api/trust-score/accounts/:id/toggle-active
     * Active ou désactive un compte Gmail
     */
    static async toggleAccountActivation(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { is_active } = req.body;

            if (is_active === undefined) {
                return res.status(400).json({ error: 'Statut is_active requis' });
            }

            await pool.query(
                'UPDATE guide_gmail_accounts SET is_active = ? WHERE id = ?',
                [is_active, id]
            );

            return res.json({
                success: true,
                message: is_active ? 'Compte activé' : 'Compte désactivé'
            });
        } catch (error: any) {
            console.error('Error toggling account activation:', error);
            return res.status(500).json({
                error: 'Erreur lors de la modification du statut',
                details: error.message
            });
        }
    }

    /**
     * 💾 Helper: Sauvegarde du Trust Score en base de données
     */
    private static async saveTrustScoreToDatabase(
        email: string,
        result: TrustScoreResult
    ): Promise<void> {
        const emailValidation = result.details.emailValidation;
        const mapsProfile = result.details.mapsProfile;

        await pool.query(
            `UPDATE guide_gmail_accounts SET
                email_syntax_valid = ?,
                email_mx_valid = ?,
                email_is_disposable = ?,
                email_suspicious_pattern = ?,
                email_estimated_age_months = ?,
                email_validation_score = ?,
                email_last_validated_at = NOW(),
                
                google_maps_profile_url = ?,
                local_guide_level = ?,
                google_maps_points = ?,
                total_reviews = ?,
                total_photos = ?,
                first_review_date = ?,
                account_age_months = ?,
                maps_profile_score = ?,
                maps_last_scraped_at = NOW(),
                
                pattern_all_five_stars = ?,
                pattern_no_public_reviews = ?,
                pattern_recent_burst = ?,
                
                trust_score_value = ?,
                trust_level = ?,
                trust_badge = ?,
                is_blocked = ?,
                max_reviews_per_month = ?,
                trust_score_breakdown = ?,
                trust_last_calculated_at = NOW()
                
            WHERE email = ?`,
            [
                // Email validation (1-7)
                emailValidation.details.syntaxValid,
                emailValidation.details.mxRecordsValid,
                emailValidation.details.isDisposable,
                emailValidation.details.suspiciousPattern,
                emailValidation.details.estimatedAge,
                emailValidation.score,

                // Google Maps profile (8-15)
                mapsProfile?.data.profileUrl || null,
                mapsProfile?.data.localGuideLevel || 0,
                mapsProfile?.data.totalPoints || 0,
                mapsProfile?.data.totalReviews || 0,
                mapsProfile?.data.totalPhotos || 0,
                mapsProfile?.data.firstReviewDate || null,
                mapsProfile?.data.accountAge || 0,
                mapsProfile?.score || 0,

                // Pattern detection (16-18)
                mapsProfile?.suspiciousPatterns.allFiveStars || false,
                mapsProfile?.suspiciousPatterns.noPublicReviews || false,
                mapsProfile?.suspiciousPatterns.recentBurst || false,

                // Trust Score (19-24)
                result.finalScore,
                result.trustLevel,
                result.badge,
                result.isBlocked,
                result.maxReviewsPerMonth,
                JSON.stringify(result.breakdown),

                // Where clause (25)
                email
            ]
        );
    }
}

export default TrustScoreController;
