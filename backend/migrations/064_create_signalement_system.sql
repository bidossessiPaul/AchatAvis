-- 064_create_signalement_system.sql
-- Crée le système de signalement d'avis Google : un service totalement séparé
-- du système d'avis classique (rien en commun, tables dédiées).
--
-- Acteurs :
--   - Admin : crée les packs signalement, attribue à un artisan, valide les preuves,
--     règle le payout par avis, marque "cible supprimée", gère le cooldown global.
--   - Artisan : reçoit un pack attribué, soumet des URLs Google à signaler,
--     suit l'avancement, peut "Relancer" un avis non concluant.
--   - Guide : éligible si KYC validé + au moins 1 avis classique validé.
--     Voit la file d'avis dispo, prend un slot avec timer, signale sur Google,
--     upload sa preuve (capture). Une preuve validée par admin → guide payé.
--
-- Spec : docs/superpowers/specs/2026-04-28-signalement-avis-google-design.md
--
-- Idempotente : tous les CREATE utilisent IF NOT EXISTS.

-- ========================================================================
-- 1. signalement_packs : templates de packs créés par l'admin
-- ========================================================================
CREATE TABLE IF NOT EXISTS signalement_packs (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    nb_avis INT NOT NULL,
    nb_signalements_par_avis INT NOT NULL,
    price_cents INT NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_signalement_packs_deleted (deleted_at),
    CONSTRAINT chk_sp_nb_avis CHECK (nb_avis > 0),
    CONSTRAINT chk_sp_nb_sig CHECK (nb_signalements_par_avis > 0),
    CONSTRAINT chk_sp_price CHECK (price_cents >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- 2. signalement_attributions : pack attribué à un artisan (cumul possible)
--    Chaque ligne = un crédit de "nb_avis_total" slots dont "nb_avis_consumed" déjà
--    utilisés. Le compteur global d'un artisan = SUM(nb_avis_total - nb_avis_consumed).
-- ========================================================================
CREATE TABLE IF NOT EXISTS signalement_attributions (
    id VARCHAR(36) PRIMARY KEY,
    artisan_id VARCHAR(36) NOT NULL,
    pack_id VARCHAR(36) NOT NULL,
    nb_avis_total INT NOT NULL,
    nb_signalements_par_avis INT NOT NULL,
    nb_avis_consumed INT DEFAULT 0,
    attributed_by VARCHAR(36) NOT NULL,
    attributed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    note TEXT,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_sa_artisan (artisan_id, deleted_at),
    INDEX idx_sa_deleted (deleted_at),
    CONSTRAINT fk_sa_artisan FOREIGN KEY (artisan_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sa_pack FOREIGN KEY (pack_id) REFERENCES signalement_packs(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sa_admin FOREIGN KEY (attributed_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_sa_consumed CHECK (nb_avis_consumed >= 0 AND nb_avis_consumed <= nb_avis_total)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- 3. signalement_avis : URL Google soumise par un artisan, à signaler N fois
--    relaunched_from_avis_id pointe sur l'avis source si c'est une relance.
-- ========================================================================
CREATE TABLE IF NOT EXISTS signalement_avis (
    id VARCHAR(36) PRIMARY KEY,
    artisan_id VARCHAR(36) NOT NULL,
    attribution_id VARCHAR(36) NOT NULL,
    google_review_url TEXT NOT NULL,
    raison VARCHAR(50) NOT NULL,
    raison_details TEXT,
    nb_signalements_target INT NOT NULL,
    nb_signalements_validated INT DEFAULT 0,
    payout_per_signalement_cents INT NOT NULL DEFAULT 35,
    status VARCHAR(30) DEFAULT 'active',
    closed_at DATETIME,
    closed_by_admin_id VARCHAR(36),
    relaunched_from_avis_id VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_sav_artisan (artisan_id, status, deleted_at),
    INDEX idx_sav_status (status, deleted_at),
    INDEX idx_sav_attribution (attribution_id),
    CONSTRAINT fk_sav_artisan FOREIGN KEY (artisan_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sav_attribution FOREIGN KEY (attribution_id) REFERENCES signalement_attributions(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sav_closed_by FOREIGN KEY (closed_by_admin_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_sav_relaunched FOREIGN KEY (relaunched_from_avis_id) REFERENCES signalement_avis(id) ON DELETE SET NULL,
    CONSTRAINT chk_sav_status CHECK (status IN ('active', 'terminated_success', 'terminated_inconclusive', 'cancelled_by_admin'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- 4. signalement_slots : N slots par avis (1 slot = 1 signalement à faire)
--    Cycle : available → reserved (guide réserve, timer 30 min) → submitted
--    (preuve uploadée) → validated (admin OK). Si admin reject → slot redevient
--    available. Si timer expire en reserved sans submit → reset available
--    (lazy-check à la lecture, pas de cron en v1).
-- ========================================================================
CREATE TABLE IF NOT EXISTS signalement_slots (
    id VARCHAR(36) PRIMARY KEY,
    avis_id VARCHAR(36) NOT NULL,
    slot_index INT NOT NULL,
    status VARCHAR(20) DEFAULT 'available',
    reserved_by_guide_id VARCHAR(36),
    reserved_at DATETIME,
    reservation_expires_at DATETIME,
    submitted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_avis_slot (avis_id, slot_index),
    INDEX idx_slot_status (status, avis_id),
    INDEX idx_slot_reserved_guide (reserved_by_guide_id, status),
    INDEX idx_slot_expires (status, reservation_expires_at),
    CONSTRAINT fk_slot_avis FOREIGN KEY (avis_id) REFERENCES signalement_avis(id) ON DELETE CASCADE,
    CONSTRAINT fk_slot_guide FOREIGN KEY (reserved_by_guide_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_slot_status CHECK (status IN ('available', 'reserved', 'submitted', 'validated'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- 5. signalement_proofs : preuves uploadées par les guides (1 proof par submit)
--    earnings_cents = snapshot du payout au moment du submit (immutable).
-- ========================================================================
CREATE TABLE IF NOT EXISTS signalement_proofs (
    id VARCHAR(36) PRIMARY KEY,
    slot_id VARCHAR(36) NOT NULL,
    avis_id VARCHAR(36) NOT NULL,
    guide_id VARCHAR(36) NOT NULL,
    screenshot_url TEXT NOT NULL,
    report_link TEXT,
    note_guide TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    rejection_reason TEXT,
    earnings_cents INT NOT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    validated_at DATETIME,
    validated_by VARCHAR(36),
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_proof_status (status, deleted_at),
    INDEX idx_proof_guide (guide_id, status, deleted_at),
    INDEX idx_proof_avis (avis_id),
    INDEX idx_proof_slot (slot_id),
    CONSTRAINT fk_proof_slot FOREIGN KEY (slot_id) REFERENCES signalement_slots(id) ON DELETE CASCADE,
    CONSTRAINT fk_proof_avis FOREIGN KEY (avis_id) REFERENCES signalement_avis(id) ON DELETE CASCADE,
    CONSTRAINT fk_proof_guide FOREIGN KEY (guide_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_proof_validator FOREIGN KEY (validated_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_proof_status CHECK (status IN ('pending', 'validated', 'rejected'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- 6. signalement_config : singleton de configuration globale (id='global')
--    Permet de régler cooldown, payout par défaut, timer réservation, seuil
--    éligibilité guide depuis l'UI admin sans déploiement.
-- ========================================================================
CREATE TABLE IF NOT EXISTS signalement_config (
    id VARCHAR(20) PRIMARY KEY DEFAULT 'global',
    cooldown_hours_between_signalements INT NOT NULL DEFAULT 2,
    default_payout_cents INT NOT NULL DEFAULT 35,
    reservation_timer_minutes INT NOT NULL DEFAULT 30,
    min_validated_reviews_for_eligibility INT NOT NULL DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(36),
    CONSTRAINT fk_sigconfig_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO signalement_config (id) VALUES ('global')
ON DUPLICATE KEY UPDATE id = id;

-- ========================================================================
-- Note : les 3 nouvelles permissions (can_manage_signalement_packs,
-- can_manage_signalements, can_validate_signalements) sont stockées dans le
-- blob JSON `users.permissions` existant. Aucune ALTER TABLE nécessaire.
-- L'UI admin (AdminTeam.tsx) doit ajouter les 3 checkboxes correspondantes.
-- ========================================================================
