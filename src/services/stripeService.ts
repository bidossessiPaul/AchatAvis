import Stripe from 'stripe';
import dotenv from 'dotenv';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { sendPackActivationEmail } from './emailService';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Price IDs from Stripe Dashboard should be here in production
// For dev, we might need to create them or use simulated ones if using Stripe CLI
// PLANS are now loaded from the database in createCheckoutSession

export const stripeService = {
    async createCheckoutSession(userId: string, userEmail: string, planId: string) {
        // Fetch plan from database
        const packs: any = await query('SELECT * FROM subscription_packs WHERE id = ?', [planId]);
        const plan = packs.length > 0 ? packs[0] : null;

        if (!plan) throw new Error("Invalid plan selected");

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: plan.name,
                            description: `Accès pour ${plan.quantity} avis par mois`,
                        },
                        unit_amount: plan.price_cents,
                        recurring: {
                            interval: 'month',
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success?session_id={CHECKOUT_SESSION_ID}&plan_id=${planId}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/artisan/plan`,
            customer_email: userEmail,
            metadata: {
                userId,
                planId,
                quantity: plan.quantity
            }
        });

        return session;
    },

    async handleWebhook(signature: string, payload: Buffer) {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        let event;

        try {
            event = stripe.webhooks.constructEvent(
                payload,
                signature,
                webhookSecret!
            );
        } catch (err: any) {
            throw new Error(`Webhook Error: ${err.message}`);
        }

        console.log(`Processing webhook event: ${event.type}`);

        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.metadata?.userId) {
                    const { userId, planId } = session.metadata;
                    const subscriptionId = session.subscription as string;
                    const customerId = session.customer as string;

                    // Calculate start/end dates
                    const startDate = new Date();
                    const endDate = new Date();
                    endDate.setMonth(endDate.getMonth() + 1); // Default to 1 month

                    await query(
                        `UPDATE artisans_profiles 
                         SET subscription_status = 'active',
                             stripe_customer_id = ?,
                             stripe_subscription_id = ?,
                             subscription_product_id = ?,
                             subscription_start_date = ?,
                             subscription_end_date = ?,
                             last_payment_date = ?,
                             missions_allowed = missions_allowed + 1
                         WHERE user_id = ?`,
                        [customerId, subscriptionId, planId, startDate, endDate, startDate, userId]
                    );

                    await query(
                        `UPDATE users SET status = 'active' WHERE id = ?`,
                        [userId]
                    );

                    // LOG PAYMENT AND QUOTA
                    const paymentId = uuidv4();
                    const quantity = parseInt(session.metadata?.quantity || '0');
                    const amount = (session.amount_total || 0) / 100;

                    await query(`
                        INSERT INTO payments (id, user_id, type, amount, status, stripe_payment_id, description, missions_quota, processed_at)
                        VALUES (?, ?, 'subscription', ?, 'completed', ?, ?, ?, NOW())
                    `, [
                        paymentId,
                        userId,
                        amount,
                        session.payment_intent as string || session.id,
                        `Abonnement ${planId}`,
                        quantity
                    ]);

                    // Send activation email
                    try {
                        const user: any = await query('SELECT full_name, email FROM users WHERE id = ?', [userId]);
                        if (user && user.length > 0) {
                            await sendPackActivationEmail(user[0].email, user[0].full_name, planId, quantity);
                        }
                    } catch (emailError) {
                        console.error('Failed to send pack activation email:', emailError);
                    }

                    console.log(`Activated subscription for user ${userId} with ${quantity} missions`);
                }
                break;

            case 'invoice.payment_succeeded':
                const invoice = event.data.object as any;
                if (invoice.subscription) {
                    const subscriptionId = invoice.subscription as string;
                    const currentPeriodEnd = new Date(invoice.lines.data[0].period.end * 1000); // Stripe timestamp is seconds

                    // Find user by subscription_id (or customer_id)
                    await query(
                        `UPDATE artisans_profiles 
                         SET subscription_end_date = ?,
                             last_payment_date = NOW(),
                             subscription_status = 'active'
                         WHERE stripe_subscription_id = ?`,
                        [currentPeriodEnd, subscriptionId]
                    );
                    console.log(`Extended subscription ${subscriptionId} to ${currentPeriodEnd}`);
                }
                break;

            case 'customer.subscription.deleted':
                const subscription = event.data.object as Stripe.Subscription;
                await query(
                    `UPDATE artisans_profiles
                     SET subscription_status = 'cancelled'
                     WHERE stripe_subscription_id = ?`,
                    [subscription.id]
                );
                console.log(`Cancelled subscription ${subscription.id}`);
                break;

            default:
                console.log(`Unhandled event type ${event.type}`);
        }
    },

    async retrieveSession(sessionId: string) {
        return await stripe.checkout.sessions.retrieve(sessionId);
    }
};
