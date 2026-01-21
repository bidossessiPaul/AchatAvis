-- ╔════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION DATABASE - TRUST SCORE SYSTEM - ACHATAVIS (MySQL)   ║
-- ║  Ajout des colonnes pour le système de validation avancé       ║
-- ╚════════════════════════════════════════════════════════════════╝

-- 📋 Table: guide_gmail_accounts
-- Ajout des colonnes pour la validation email et profil Google Maps

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1️⃣ COLONNES VALIDATION EMAIL
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE guide_gmail_accounts 
ADD COLUMN IF NOT EXISTS email_syntax_valid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_mx_valid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_is_disposable BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_suspicious_pattern BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_estimated_age_months INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS email_validation_score INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS email_last_validated_at DATETIME;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2️⃣ COLONNES PROFIL GOOGLE MAPS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE guide_gmail_accounts
ADD COLUMN IF NOT EXISTS google_maps_profile_url TEXT,
ADD COLUMN IF NOT EXISTS local_guide_level INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS google_maps_points INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reviews INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_photos INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_review_date DATETIME,
ADD COLUMN IF NOT EXISTS account_age_months INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS maps_profile_score INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS maps_last_scraped_at DATETIME;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3️⃣ COLONNES DÉTECTION PATTERNS SUSPECTS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE guide_gmail_accounts
ADD COLUMN IF NOT EXISTS pattern_all_five_stars BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pattern_no_public_reviews BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pattern_recent_burst BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS flagged_reviews_count INT DEFAULT 0;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4️⃣ COLONNES TRUST SCORE & NIVEAU
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE guide_gmail_accounts
ADD COLUMN IF NOT EXISTS trust_score_value INT DEFAULT 0 CHECK (trust_score_value >= 0 AND trust_score_value <= 100),
ADD COLUMN IF NOT EXISTS trust_level VARCHAR(20) DEFAULT 'BLOCKED',
ADD COLUMN IF NOT EXISTS trust_badge VARCHAR(50),
ADD COLUMN IF NOT EXISTS max_reviews_per_month INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS trust_score_breakdown JSON,
ADD COLUMN IF NOT EXISTS trust_last_calculated_at DATETIME;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5️⃣ COLONNES VÉRIFICATIONS SUPPLÉMENTAIRES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE guide_gmail_accounts
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phone_verified_at DATETIME,
ADD COLUMN IF NOT EXISTS manual_verification_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6️⃣ INDEX POUR PERFORMANCES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE INDEX IF NOT EXISTS idx_trust_score_value ON guide_gmail_accounts(trust_score_value DESC);
CREATE INDEX IF NOT EXISTS idx_trust_level ON guide_gmail_accounts(trust_level);
CREATE INDEX IF NOT EXISTS idx_is_blocked ON guide_gmail_accounts(is_blocked);
CREATE INDEX IF NOT EXISTS idx_local_guide_level ON guide_gmail_accounts(local_guide_level DESC);
CREATE INDEX IF NOT EXISTS idx_email_disposable ON guide_gmail_accounts(email_is_disposable);
CREATE INDEX IF NOT EXISTS idx_phone_verified ON guide_gmail_accounts(phone_verified);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 7️⃣ VUES UTILES POUR DASHBOARD ADMIN
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Vue: Comptes suspects
CREATE OR REPLACE VIEW suspicious_guide_accounts AS
SELECT 
  email,
  trust_score_value,
  trust_level,
  local_guide_level,
  total_reviews,
  email_is_disposable,
  pattern_all_five_stars,
  pattern_no_public_reviews,
  pattern_recent_burst,
  created_at
FROM guide_gmail_accounts
WHERE 
  email_is_disposable = TRUE
  OR pattern_all_five_stars = TRUE
  OR pattern_no_public_reviews = TRUE
  OR (trust_score_value < 21 AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY))
ORDER BY trust_score_value ASC, created_at DESC;

-- Vue: Top performers (pour programme VIP)
CREATE OR REPLACE VIEW top_guide_performers AS
SELECT 
  email,
  trust_score_value,
  trust_level,
  local_guide_level,
  total_reviews,
  total_photos,
  account_age_months,
  max_reviews_per_month
FROM guide_gmail_accounts
WHERE 
  trust_level IN ('GOLD', 'PLATINUM')
  AND is_blocked = FALSE
ORDER BY trust_score_value DESC, local_guide_level DESC
LIMIT 50;

-- Vue: Statistiques générales
CREATE OR REPLACE VIEW trust_score_statistics AS
SELECT 
  trust_level,
  COUNT(*) as total_accounts,
  ROUND(AVG(trust_score_value), 2) as avg_score,
  MIN(trust_score_value) as min_score,
  MAX(trust_score_value) as max_score,
  SUM(CASE WHEN is_blocked THEN 1 ELSE 0 END) as blocked_count,
  SUM(CASE WHEN phone_verified THEN 1 ELSE 0 END) as verified_count
FROM guide_gmail_accounts
GROUP BY trust_level
ORDER BY 
  CASE trust_level
    WHEN 'PLATINUM' THEN 1
    WHEN 'GOLD' THEN 2
    WHEN 'SILVER' THEN 3
    WHEN 'BRONZE' THEN 4
    WHEN 'BLOCKED' THEN 5
  END;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ✅ FIN DE LA MIGRATION
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
