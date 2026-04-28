// Controller : configuration globale signalement (singleton id='global').

import { Request, Response } from 'express';
import { query } from '../../config/database';

export const get = async (_req: Request, res: Response): Promise<void> => {
    try {
        const rows: any = await query(
            `SELECT * FROM signalement_config WHERE id = 'global'`
        );
        res.json({ config: rows[0] || null });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

export const update = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = req.user?.userId;
        if (!adminId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        const {
            cooldown_hours_between_signalements,
            default_payout_cents,
            reservation_timer_minutes,
            min_validated_reviews_for_eligibility,
        } = req.body;

        const fields: string[] = [];
        const values: any[] = [];

        if (cooldown_hours_between_signalements !== undefined) {
            if (!Number.isInteger(cooldown_hours_between_signalements) || cooldown_hours_between_signalements < 0) {
                res.status(400).json({ error: 'cooldown_hours_between_signalements doit être un entier >= 0' });
                return;
            }
            fields.push('cooldown_hours_between_signalements = ?');
            values.push(cooldown_hours_between_signalements);
        }
        if (default_payout_cents !== undefined) {
            if (!Number.isInteger(default_payout_cents) || default_payout_cents < 0) {
                res.status(400).json({ error: 'default_payout_cents doit être un entier >= 0' });
                return;
            }
            fields.push('default_payout_cents = ?');
            values.push(default_payout_cents);
        }
        if (reservation_timer_minutes !== undefined) {
            if (!Number.isInteger(reservation_timer_minutes) || reservation_timer_minutes <= 0) {
                res.status(400).json({ error: 'reservation_timer_minutes doit être un entier > 0' });
                return;
            }
            fields.push('reservation_timer_minutes = ?');
            values.push(reservation_timer_minutes);
        }
        if (min_validated_reviews_for_eligibility !== undefined) {
            if (!Number.isInteger(min_validated_reviews_for_eligibility) || min_validated_reviews_for_eligibility < 0) {
                res.status(400).json({ error: 'min_validated_reviews_for_eligibility doit être un entier >= 0' });
                return;
            }
            fields.push('min_validated_reviews_for_eligibility = ?');
            values.push(min_validated_reviews_for_eligibility);
        }

        if (fields.length === 0) {
            res.status(400).json({ error: 'Aucun champ à mettre à jour' });
            return;
        }

        fields.push('updated_by = ?');
        values.push(adminId);

        await query(
            `UPDATE signalement_config SET ${fields.join(', ')} WHERE id = 'global'`,
            values
        );

        const rows: any = await query(`SELECT * FROM signalement_config WHERE id = 'global'`);
        res.json({ config: rows[0] });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Erreur serveur' });
    }
};
