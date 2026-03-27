-- Add stripe_link column to subscription_packs
ALTER TABLE subscription_packs ADD COLUMN IF NOT EXISTS stripe_link VARCHAR(500) DEFAULT NULL;

-- Set Stripe payment links by pack ID
UPDATE subscription_packs SET stripe_link = 'https://buy.stripe.com/aFabJ270L4Zw3kq4vW7Re12' WHERE id = 'discovery';
UPDATE subscription_packs SET stripe_link = 'https://buy.stripe.com/4gM14o3OzgIe9IOd2s7Re13' WHERE id = 'growth';
UPDATE subscription_packs SET stripe_link = 'https://buy.stripe.com/14A3cw5WHbnU1cifaA7Re14' WHERE id = 'expert';
