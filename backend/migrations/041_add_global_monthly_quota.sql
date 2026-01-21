-- Migration: Add Global Monthly Quota Tracking
-- Objectif: Ajouter un quota général mensuel par Gmail (ex: 20 avis/mois tous secteurs)

ALTER TABLE guide_gmail_accounts 
ADD COLUMN IF NOT EXISTS monthly_reviews_posted INT DEFAULT 0 COMMENT 'Nombre total d''avis postés ce mois (tous secteurs)',
ADD COLUMN IF NOT EXISTS monthly_quota_limit INT DEFAULT 20 COMMENT 'Limite mensuelle globale',
ADD COLUMN IF NOT EXISTS monthly_reset_date DATE COMMENT 'Date du dernier reset mensuel';

-- Initialiser monthly_reset_date pour les comptes existants
UPDATE guide_gmail_accounts 
SET monthly_reset_date = DATE_FORMAT(NOW(), '%Y-%m-01')
WHERE monthly_reset_date IS NULL;

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_monthly_quota ON guide_gmail_accounts(monthly_reviews_posted, monthly_quota_limit);

-- Vérification
SELECT 
    email,
    monthly_reviews_posted as 'Avis ce mois',
    monthly_quota_limit as 'Limite',
    monthly_reset_date as 'Dernier reset'
FROM guide_gmail_accounts
LIMIT 5;
