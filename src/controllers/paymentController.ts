import { Request, Response } from 'express';
import { stripeService } from '../services/stripeService';
import { query, pool } from '../config/database';
import { generateAccessToken } from '../utils/token';
import { v4 as uuidv4 } from 'uuid';
import { sendPackActivationEmail } from '../services/emailService';
import { notificationService } from '../services/notificationService';

export const paymentController = {
    async createCheckoutSession(req: Request, res: Response): Promise<any> {
        try {
            const user = (req as any).user;
            console.log('Payment request from user:', user);
            const { planId } = req.body;

            if (!planId) {
                return res.status(400).json({ error: 'Plan ID is required' });
            }

            const session = await stripeService.createCheckoutSession(
                user.userId || user.id,
                user.email,
                planId
            );

            return res.json({ url: session.url });
        } catch (error: any) {
            console.error("Checkout session error:", error);
            return res.status(500).json({ error: 'Failed to create checkout session', message: error.message });
        }
    },

    async manualActivate(req: Request, res: Response): Promise<any> {
        const userId = (req as any).user?.userId || (req as any).user?.id;
        const { planId } = req.body;

        console.log('🔓 ACTIVATION MANUELLE');
        console.log('User ID:', userId);
        console.log('Plan ID:', planId);

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [packs]: any = await connection.execute(
                'SELECT * FROM subscription_packs WHERE id = ?',
                [planId]
            );

            if (packs.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({ error: 'Plan invalide' });
            }
            const plan = packs[0];
            const quota = plan.quantity;
            const price = plan.price_cents / 100; // Convert cents to euros

            // IDEMPOTENCY CHECK: Prevent duplicate payments within last 5 minutes
            const [recentPayments]: any = await connection.execute(
                `SELECT id FROM payments 
                 WHERE user_id = ? 
                 AND type = 'subscription' 
                 AND amount = ? 
                 AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
                 LIMIT 1`,
                [userId, price]
            );

            if (recentPayments.length > 0) {
                console.log('⚠️ Paiement récent détecté, skip duplication');
                await connection.commit();
                return res.json({
                    success: true,
                    message: 'Abonnement déjà activé'
                });
            }

            // Vérifier si profil existe
            const [checkProfile]: any = await connection.execute(
                'SELECT id FROM artisans_profiles WHERE user_id = ?',
                [userId]
            );

            if (checkProfile.length === 0) {
                console.log('⚠️ Profil manquant, création...');
                const profileId = uuidv4();
                await connection.execute(`
                    INSERT INTO artisans_profiles (id, user_id, company_name, trade, phone, address, city, postal_code)
                    VALUES (?, ?, 'À compléter', 'plombier', '0000000000', 'À compléter', 'À compléter', '00000')
                `, [profileId, userId]);
            }

            // Mettre à jour abonnement
            await connection.execute(`
                UPDATE artisans_profiles 
                SET 
                    subscription_tier = ?,
                    subscription_status = 'active',
                    monthly_reviews_quota = ?,
                    current_month_reviews = 0,
                    fiches_allowed = COALESCE(fiches_allowed, 0) + ?,
                    subscription_start_date = NOW(),
                    subscription_end_date = DATE_ADD(NOW(), INTERVAL 30 DAY)
                WHERE user_id = ?
            `, [planId, quota, plan.fiches_quota || 1, userId]);

            // Activer user
            await connection.execute('UPDATE users SET status = ? WHERE id = ?', ['active', userId]);
            console.log('✅ User activé');

            // Logger paiement
            const paymentId = uuidv4();
            await connection.execute(`
                INSERT INTO payments (id, user_id, type, amount, status, description, fiches_quota, review_credits, processed_at)
                VALUES (?, ?, 'subscription', ?, 'completed', ?, ?, ?, NOW())
            `, [paymentId, userId, price, `Abonnement ${plan.name}`, plan.fiches_quota || 1, quota]);

            console.log('✅ Paiement enregistré');

            await connection.commit();
            console.log('✅ TRANSACTION VALIDÉE');

            // 4. Send confirmation email
            try {
                const [userRows]: any = await connection.execute(
                    'SELECT full_name, email FROM users WHERE id = ?',
                    [userId]
                );
                if (userRows.length > 0) {
                    const userObj = userRows[0];
                    await sendPackActivationEmail(userObj.email, userObj.full_name, plan.name, quota);
                }
            } catch (emailError) {
                console.error('⚠️ Erreur envoi email activation:', emailError);
            }

            // 5. Send Real-time notification
            notificationService.sendToUser(userId, {
                type: 'payment_success',
                title: 'Pack Activé ! 🚀',
                message: `Votre pack ${plan.name} (${quota} avis) est maintenant actif.`,
                link: '/artisan/dashboard'
            });

            // Refresh token logic if needed? For now just success result
            res.json({
                success: true,
                message: 'Abonnement activé'
            });

        } catch (error) {
            await connection.rollback();
            console.error('❌ Erreur activation:', error);
            res.status(500).json({ error: 'Erreur activation' });
        } finally {
            connection.release();
        }
    },

    async webhook(req: Request, res: Response) {
        const sig = req.headers['stripe-signature'];

        try {
            await stripeService.handleWebhook(sig as string, req.body);
            return res.json({ received: true });
        } catch (error: any) {
            console.error("Webhook error:", error);
            return res.status(400).send(`Webhook Error: ${error.message}`);
        }
    },

    async verifySession(req: Request, res: Response) {
        try {
            const { sessionId } = req.params;
            const session = await stripeService.retrieveSession(sessionId);

            if (session.payment_status === 'paid') {
                const userId = session.metadata?.userId;
                const planId = session.metadata?.planId;
                const quantity = parseInt(session.metadata?.quantity || '0');

                if (userId) {
                    const subscriptionId = session.subscription as string;
                    const customerId = session.customer as string;

                    // Fetch pack definition to get correct fiches_quota
                    const [packs]: any = await query('SELECT fiches_quota FROM subscription_packs WHERE id = ?', [planId]);
                    const fichesQuota = packs.length > 0 ? packs[0].fiches_quota : 1;

                    // Update artisan profile in DB with FULL details
                    const startDate = new Date();
                    const endDate = new Date();
                    endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

                    await query(
                        `UPDATE artisans_profiles 
                         SET subscription_status = 'active', 
                             stripe_customer_id = ?,
                             stripe_subscription_id = ?,
                             subscription_product_id = ?,
                             subscription_start_date = ?,
                             subscription_end_date = ?,
                             last_payment_date = ?,
                             fiches_allowed = fiches_allowed + ?
                         WHERE user_id = ?`,
                        [customerId, subscriptionId, planId, startDate, endDate, startDate, fichesQuota, userId]
                    );

                    // Also update user status
                    await query(
                        `UPDATE users SET status = 'active' WHERE id = ?`,
                        [userId]
                    );

                    // LOG PAYMENT AND QUOTA (Consistent with stripeService)
                    const paymentId = uuidv4();
                    const amount = (session.amount_total || 0) / 100;

                    await query(`
                        INSERT INTO payments (id, user_id, type, amount, status, stripe_payment_id, description, fiches_quota, review_credits, processed_at)
                        VALUES (?, ?, 'subscription', ?, 'completed', ?, ?, ?, ?, NOW())
                    `, [
                        paymentId,
                        userId,
                        amount,
                        session.payment_intent as string || session.id,
                        `Abonnement ${planId}`,
                        fichesQuota,
                        quantity
                    ]);

                    // LOG NOTIFICATION
                    notificationService.sendToUser(userId, {
                        type: 'payment_success',
                        title: 'Paiement Confirmé ! ✅',
                        message: `Merci pour votre achat. Votre pack ${planId} est prêt.`,
                        link: '/artisan/dashboard'
                    });

                    // Generate a NEW token with the updated 'active' status
                    // to avoid stale token issues on the frontend
                    const userResult: any = await query('SELECT email, role FROM users WHERE id = ?', [userId]);
                    const user = userResult[0];

                    if (user) {
                        const newToken = generateAccessToken({
                            userId: userId,
                            email: user.email,
                            role: user.role,
                            status: 'active'
                        });

                        return res.json({
                            success: true,
                            status: 'active',
                            accessToken: newToken
                        });
                    }

                    return res.json({ success: true, status: 'active' });
                }
            }

            return res.json({ success: false, status: 'pending' });
        } catch (error: any) {
            console.error("Verification error:", error);
            return res.status(500).json({ error: error.message });
        }
    },

    async getMyPayments(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.userId || (req as any).user?.id;
            const payments = await query(
                'SELECT * FROM payments WHERE user_id = ? AND type = "subscription" ORDER BY created_at DESC',
                [userId]
            );
            return res.json(payments);
        } catch (error: any) {
            console.error("Fetch payments error:", error);
            return res.status(500).json({ error: 'Failed to fetch payment history' });
        }
    }
};
