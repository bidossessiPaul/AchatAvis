-- 084 — Élargit artisans_profiles.trade de VARCHAR(50) à VARCHAR(100)
-- Pourquoi : le slug du secteur "bien-etre-spa-massage-esthetique-fitness-nutrition-" fait 51
-- caractères. Avec MySQL en mode STRICT_TRANS_TABLES, l'INSERT à l'inscription artisan levait
-- ER_DATA_TOO_LONG (1406), renvoyé comme un 500 opaque. On élargit la colonne pour couvrir
-- tous les slugs de secteurs présents et futurs.

ALTER TABLE artisans_profiles MODIFY COLUMN trade VARCHAR(100) NOT NULL;
