-- Add stripe_link column to subscription_packs
ALTER TABLE subscription_packs ADD COLUMN IF NOT EXISTS stripe_link VARCHAR(500) DEFAULT NULL;

-- Set initial Stripe links for existing packs
UPDATE subscription_packs SET stripe_link = 'https://buy.stripe.com/aFabJ270L4Zw3kq4vW7Re12' WHERE price_cents = 23500;
UPDATE subscription_packs SET stripe_link = 'https://buy.stripe.com/4gM14o3OzgIe9IOd2s7Re13' WHERE price_cents = 29900;
UPDATE subscription_packs SET stripe_link = 'https://buy.stripe.com/14A3cw5WHbnU1cifaA7Re14' WHERE price_cents = 49900;
