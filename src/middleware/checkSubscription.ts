import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';

export const requireActiveSubscription = async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.userId || (req as any).user?.id;

    console.log('🔍 VÉRIFICATION ABONNEMENT:', userId);

    if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const result: any = await query(`
            SELECT subscription_status, subscription_end_date
            FROM artisans_profiles
            WHERE user_id = ?
        `, [userId]);

        if (!result || result.length === 0) {
            console.log('❌ Pas de profil pour user:', userId);
            return res.status(403).json({ needsSubscription: true });
        }

        const profile = result[0];

        // Vérifier statut ET date
        const isActive =
            profile.subscription_status === 'active' &&
            profile.subscription_end_date &&
            new Date(profile.subscription_end_date) > new Date();

        if (!isActive) {
            console.log('❌ Abonnement inactif ou expiré pour user:', userId);
            return res.status(403).json({ needsSubscription: true });
        }

        console.log('✅ Abonnement valide');
        next();

    } catch (error) {
        console.error('❌ Erreur vérification:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
};
