-- 087_create_repost_system.sql
-- Crée le système "Repost Social" : les guides repostent des vidéos fournies
-- par l'admin sur leurs réseaux sociaux et sont payés par palier d'abonnés.
-- Service totalement séparé des avis/signalement (tables dédiées).
--
-- Flux :
--   1. Admin configure les paliers (repost_tiers) : seuils d'abonnés + montant/repost.
--   2. Guide envoie une candidature (repost_eligibility_requests) : plateforme,
--      lien profil, screenshot, nb abonnés déclaré.
--   3. Admin valide la candidature → assigne un palier au guide.
--   4. Seuls les guides avec une candidature approuvée voient la vidéothèque
--      (repost_videos, gérée par l'admin).
--   5. Guide reposte une vidéo, soumet une preuve (repost_submissions).
--   6. Admin valide la preuve → earnings_cents crédité (snapshot du palier au submit).
--
-- Idempotente : tous les CREATE utilisent IF NOT EXISTS.

-- ========================================================================
-- 1. repost_tiers : paliers d'abonnés configurables par l'admin
-- ========================================================================
CREATE TABLE IF NOT EXISTS repost_tiers (
    id VARCHAR(36) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    min_followers INT NOT NULL,
    max_followers INT NULL,
    amount_cents INT NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_repost_tiers_active (is_active, deleted_at),
    CONSTRAINT chk_rt_min CHECK (min_followers >= 0),
    CONSTRAINT chk_rt_max CHECK (max_followers IS NULL OR max_followers >= min_followers),
    CONSTRAINT chk_rt_amount CHECK (amount_cents >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- 2. repost_eligibility_requests : candidature du guide (formulaire)
--    tier_id = palier assigné par l'admin à la validation (peut différer du
--    palier déduit de claimed_followers_count si l'admin corrige).
-- ========================================================================
CREATE TABLE IF NOT EXISTS repost_eligibility_requests (
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
    INDEX idx_rer_guide (guide_id, status, deleted_at),
    INDEX idx_rer_status (status, deleted_at),
    CONSTRAINT fk_rer_guide FOREIGN KEY (guide_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_rer_tier FOREIGN KEY (tier_id) REFERENCES repost_tiers(id) ON DELETE SET NULL,
    CONSTRAINT fk_rer_admin FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_rer_status CHECK (status IN ('pending', 'approved', 'rejected')),
    CONSTRAINT chk_rer_followers CHECK (claimed_followers_count >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- 3. repost_videos : vidéothèque gérée par l'admin. Visible seulement aux
--    guides ayant au moins une candidature approuvée.
--    min_tier_id NULL = visible à tous les guides éligibles, peu importe le palier.
-- ========================================================================
CREATE TABLE IF NOT EXISTS repost_videos (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT NULL,
    platforms VARCHAR(255) NULL,
    min_tier_id VARCHAR(36) NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_by VARCHAR(36) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_repost_videos_active (is_active, deleted_at),
    CONSTRAINT fk_rv_tier FOREIGN KEY (min_tier_id) REFERENCES repost_tiers(id) ON DELETE SET NULL,
    CONSTRAINT fk_rv_admin FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- 4. repost_submissions : preuve du repost effectif sur une vidéo précise.
--    earnings_cents = snapshot du montant du palier au moment du submit (immuable).
-- ========================================================================
CREATE TABLE IF NOT EXISTS repost_submissions (
    id VARCHAR(36) PRIMARY KEY,
    guide_id VARCHAR(36) NOT NULL,
    video_id VARCHAR(36) NOT NULL,
    tier_id VARCHAR(36) NOT NULL,
    platform VARCHAR(30) NOT NULL,
    post_link VARCHAR(500) NOT NULL,
    screenshot_url TEXT NOT NULL,
    earnings_cents INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    rejection_reason TEXT NULL,
    reviewed_by VARCHAR(36) NULL,
    reviewed_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_rs_guide (guide_id, status, deleted_at),
    INDEX idx_rs_status (status, deleted_at),
    INDEX idx_rs_video (video_id),
    CONSTRAINT fk_rs_guide FOREIGN KEY (guide_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_rs_video FOREIGN KEY (video_id) REFERENCES repost_videos(id) ON DELETE CASCADE,
    CONSTRAINT fk_rs_tier FOREIGN KEY (tier_id) REFERENCES repost_tiers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_rs_admin FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_rs_status CHECK (status IN ('pending', 'approved', 'rejected')),
    CONSTRAINT chk_rs_earnings CHECK (earnings_cents >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- Note : les 2 nouvelles permissions (can_manage_repost, can_validate_reposts)
-- sont stockées dans le blob JSON `admins_profiles.permissions` existant.
-- Aucune ALTER TABLE nécessaire. L'UI admin (AdminTeam.tsx) doit ajouter les
-- 2 checkboxes correspondantes.
-- ========================================================================
