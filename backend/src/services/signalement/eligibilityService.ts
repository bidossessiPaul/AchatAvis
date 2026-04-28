// Vérifie qu'un guide est éligible au service de signalement.
// Règle métier (locked) : KYC validé + au moins 1 avis classique validé.
// Le seuil min_validated_reviews est lu depuis signalement_config.

import { query } from '../../config/database';
import { GuideEligibilityResult } from '../../types/signalement';

export const checkGuideEligibility = async (
    guideId: string
): Promise<GuideEligibilityResult> => {
    // 1. Lit le seuil minimum depuis la config globale.
    const configRows: any = await query(
        `SELECT min_validated_reviews_for_eligibility
         FROM signalement_config WHERE id = 'global'`
    );
    const minRequired: number = configRows[0]?.min_validated_reviews_for_eligibility ?? 1;

    // 2. KYC validé : on cherche au moins une identity_verifications status='approved'
    //    (le système actuel utilise 'approved', pas 'validated').
    const kycRows: any = await query(
        `SELECT COUNT(*) AS n FROM identity_verifications
         WHERE user_id = ? AND status = 'approved' AND deleted_at IS NULL`,
        [guideId]
    );
    const kycValidated: boolean = (kycRows[0]?.n ?? 0) > 0;

    // 3. Compte les avis classiques validés du guide.
    const reviewsRows: any = await query(
        `SELECT COUNT(*) AS n FROM reviews_submissions
         WHERE guide_id = ? AND status = 'validated'`,
        [guideId]
    );
    const validatedReviewsCount: number = reviewsRows[0]?.n ?? 0;

    const reasons: string[] = [];
    if (!kycValidated) {
        reasons.push("Vérification d'identité (KYC) non validée");
    }
    if (validatedReviewsCount < minRequired) {
        reasons.push(
            `Vous devez avoir au moins ${minRequired} avis classique${minRequired > 1 ? 's' : ''} validé${minRequired > 1 ? 's' : ''} (actuel : ${validatedReviewsCount})`
        );
    }

    return {
        eligible: reasons.length === 0,
        reasons,
        kyc_validated: kycValidated,
        validated_reviews_count: validatedReviewsCount,
        min_required: minRequired,
    };
};
