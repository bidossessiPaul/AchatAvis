-- Add subscription fields to artisans_profiles
ALTER TABLE artisans_profiles
ADD COLUMN stripe_customer_id VARCHAR(255),
ADD COLUMN stripe_subscription_id VARCHAR(255),
ADD COLUMN subscription_product_id VARCHAR(255),
ADD COLUMN subscription_start_date DATETIME,
ADD COLUMN subscription_end_date DATETIME,
ADD COLUMN last_payment_date DATETIME;

-- Add indexes for performance
CREATE INDEX idx_artisans_stripe_cust ON artisans_profiles(stripe_customer_id);
CREATE INDEX idx_artisans_sub_status ON artisans_profiles(subscription_status);
