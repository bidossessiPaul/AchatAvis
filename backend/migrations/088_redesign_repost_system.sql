-- 088_redesign_repost_system.sql
-- Refonte du repost social après clarification du besoin réel :
--   - Un guide peut déclarer PLUSIEURS comptes RS (pas une candidature unique),
--     comme le système de comptes Gmail existant.
--   - Le paiement se fait en 2 temps : un montant de BASE crédité quand le
--     repost est posté/validé (montant = celui du palier d'abonnés du compte),
--     puis un BONUS supplémentaire selon un palier de vues, propre à chaque
--     palier d'abonnés (donc plus d'abonnés = montants de vues plus élevés aussi).
--   - Le guide déclare lui-même le nombre de vues au fil du temps (preuve +
--     validation admin, comme le reste du système). Chaque déclaration validée
--     crédite le delta vers le palier de vues atteint (pas de double comptage).
--
-- Remplace la v1 (migration 087) : DROP + recreate. Seule une candidature de
-- test existait, aucune donnée réelle perdue. repost_tiers et repost_videos
-- sont conservées telles quelles (structure inchangée).

DROP TABLE IF EXISTS repost_submissions;
DROP TABLE IF EXISTS repost_eligibility_requests;

-- ========================================================================
-- 1. repost_accounts : comptes RS d'un guide (remplace repost_eligibility_requests)
--    Un guide peut en avoir plusieurs, chacun avec son propre statut/palier.
-- ========================================================================
CREATE TABLE IF NOT EXISTS repost_accounts (
    id VARCHAR(36) PRIMARY KEY,
    guide_id VARCHAR(36) NOT NULL,
    platform VARCHAR(30) NOT NULL,
    profile_link VARCHAR(500) NOT NULL,
    screenshot_url TEXT NOT NULL,
    claimed_followers_count INT NOT NULL,
    tier_id VARCHAR(36) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    admin_notes TEXT NULL,
    reviewed_by VARCHAR(36) NULL,
    reviewed_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_ra_guide (guide_id, status, deleted_at),
    INDEX idx_ra_status (status, deleted_at),
    CONSTRAINT fk_ra_guide FOREIGN KEY (guide_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ra_tier FOREIGN KEY (tier_id) REFERENCES repost_tiers(id) ON DELETE SET NULL,
    CONSTRAINT fk_ra_admin FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_ra_status CHECK (status IN ('pending', 'approved', 'rejected')),
    CONSTRAINT chk_ra_followers CHECK (claimed_followers_count >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- 2. repost_view_tiers : tranches de vues, rattachées à un palier d'abonnés.
--    Chaque palier d'abonnés a son propre barème de vues (configurable admin).
-- ========================================================================
CREATE TABLE IF NOT EXISTS repost_view_tiers (
    id VARCHAR(36) PRIMARY KEY,
    subscriber_tier_id VARCHAR(36) NOT NULL,
    label VARCHAR(100) NOT NULL,
    min_views INT NOT NULL,
    max_views INT NULL,
    amount_cents INT NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_rvt_tier (subscriber_tier_id, deleted_at),
    CONSTRAINT fk_rvt_tier FOREIGN KEY (subscriber_tier_id) REFERENCES repost_tiers(id) ON DELETE CASCADE,
    CONSTRAINT chk_rvt_min CHECK (min_views >= 0),
    CONSTRAINT chk_rvt_max CHECK (max_views IS NULL OR max_views >= min_views),
    CONSTRAINT chk_rvt_amount CHECK (amount_cents >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- 3. repost_submissions : un repost = un COMPTE qui poste une vidéo précise.
--    base_earnings_cents = snapshot du montant du palier d'abonnés du compte
--    au moment du post. view_earnings_cents = cumul des bonus vues crédités
--    (mis à jour à chaque repost_view_updates approuvée).
-- ========================================================================
CREATE TABLE IF NOT EXISTS repost_submissions (
    id VARCHAR(36) PRIMARY KEY,
    account_id VARCHAR(36) NOT NULL,
    video_id VARCHAR(36) NOT NULL,
    post_link VARCHAR(500) NOT NULL,
    screenshot_url TEXT NOT NULL,
    base_earnings_cents INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    rejection_reason TEXT NULL,
    reviewed_by VARCHAR(36) NULL,
    reviewed_at DATETIME NULL,
    latest_declared_views INT NOT NULL DEFAULT 0,
    view_earnings_cents INT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_rs_account (account_id, status, deleted_at),
    INDEX idx_rs_status (status, deleted_at),
    INDEX idx_rs_video (video_id),
    CONSTRAINT fk_rs_account FOREIGN KEY (account_id) REFERENCES repost_accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_rs_video FOREIGN KEY (video_id) REFERENCES repost_videos(id) ON DELETE CASCADE,
    CONSTRAINT fk_rs_admin FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_rs_status CHECK (status IN ('pending', 'approved', 'rejected')),
    CONSTRAINT chk_rs_base_earnings CHECK (base_earnings_cents >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- 4. repost_view_updates : déclarations de vues successives par le guide.
--    credited_amount_cents = delta crédité à l'approbation (peut être 0 si le
--    palier de vues n'a pas changé depuis la dernière déclaration approuvée).
-- ========================================================================
CREATE TABLE IF NOT EXISTS repost_view_updates (
    id VARCHAR(36) PRIMARY KEY,
    submission_id VARCHAR(36) NOT NULL,
    declared_views INT NOT NULL,
    screenshot_url TEXT NOT NULL,
    matched_view_tier_id VARCHAR(36) NULL,
    credited_amount_cents INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    rejection_reason TEXT NULL,
    reviewed_by VARCHAR(36) NULL,
    reviewed_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_rvu_submission (submission_id, status, deleted_at),
    INDEX idx_rvu_status (status, deleted_at),
    CONSTRAINT fk_rvu_submission FOREIGN KEY (submission_id) REFERENCES repost_submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_rvu_tier FOREIGN KEY (matched_view_tier_id) REFERENCES repost_view_tiers(id) ON DELETE SET NULL,
    CONSTRAINT fk_rvu_admin FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_rvu_status CHECK (status IN ('pending', 'approved', 'rejected')),
    CONSTRAINT chk_rvu_views CHECK (declared_views >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
