-- 093 — Suivi de lecture des communiqués par guide.
-- Pourquoi : on ne notifie plus les communiqués par email. À la place, le guide
-- voit un modal à sa prochaine connexion tant qu'il n'a pas pris connaissance
-- des communiqués publiés. Cette table garantit que le modal n'apparaît
-- qu'une seule fois : dès que le guide ferme le modal ou ouvre la page
-- Communiqués, tous les communiqués publiés sont marqués comme vus pour lui.

-- La table communiques a historiquement été créée par scripts/add-communiques-schema.ts
-- et n'existe dans aucune migration : on la crée ici pour qu'une base vierge
-- puisse poser la clé étrangère ci-dessous.
CREATE TABLE IF NOT EXISTS communiques (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(500) NULL,
    date_label VARCHAR(100) NULL,
    icon VARCHAR(50) DEFAULT 'Megaphone',
    accent_color VARCHAR(20) DEFAULT '#0369a1',
    content MEDIUMTEXT NOT NULL,
    is_published TINYINT(1) DEFAULT 1,
    sort_order INT DEFAULT 0,
    created_by VARCHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_published_sort (is_published, sort_order, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS communique_reads (
    id VARCHAR(36) PRIMARY KEY,
    communique_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cr_communique_user (communique_id, user_id),
    INDEX idx_cr_user (user_id),
    CONSTRAINT fk_cr_communique FOREIGN KEY (communique_id) REFERENCES communiques(id) ON DELETE CASCADE,
    CONSTRAINT fk_cr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Le backfill des communiqués déjà en ligne (pour qu'ils ne déclenchent pas le
-- modal auprès des comptes existants) est fait par
-- scripts/seed-communique-paiement.ts, et non ici : les migrations sont
-- rejouées à chaque déploiement, ce qui marquerait aussi comme lus les
-- communiqués publiés entre-temps.
