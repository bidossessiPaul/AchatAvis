-- Migration: 086_create_warmup_system.sql
-- Système d'échauffement (warm-up) avant de poster un avis.
--
-- Pourquoi : un guide qui ouvre une fiche et y dépose un avis en un seul clic crée
-- un pattern très suspect aux yeux de Google (aucune visite préalable, aucun trafic).
-- Avant ses 3 premières fiches du jour, le guide doit d'abord visiter quelques AUTRES
-- fiches clients et y faire de vraies interactions (Itinéraire, Site web, Contact),
-- SANS y laisser d'avis. Cela génère du trafic réel vers les fiches clients et rend
-- le profil du guide crédible (des visites, puis un avis). Au-delà de 3 warm-ups
-- complétés dans la journée, l'accès aux fiches redevient direct.

-- Une session = un échauffement rattaché à UNE fiche cible (celle qui recevra l'avis).
CREATE TABLE IF NOT EXISTS fiche_warmup_sessions (
    id VARCHAR(36) PRIMARY KEY,
    guide_id VARCHAR(36) NOT NULL,
    target_order_id VARCHAR(36) NOT NULL,        -- la fiche cible qui recevra l'avis
    required_count INT NOT NULL,                 -- nb de fiches à visiter (aléatoire, max 5)
    completed_at DATETIME DEFAULT NULL,          -- rempli quand toutes les visites sont faites
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_warmup_sessions_guide_day (guide_id, completed_at),
    INDEX idx_warmup_sessions_target (guide_id, target_order_id),
    CONSTRAINT fk_warmup_session_guide FOREIGN KEY (guide_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_warmup_session_order FOREIGN KEY (target_order_id) REFERENCES reviews_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Une visite = une fiche client à réchauffer pendant la session (preuve de trafic détaillée).
CREATE TABLE IF NOT EXISTS fiche_warmup_visits (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    guide_id VARCHAR(36) NOT NULL,
    order_id VARCHAR(36) NOT NULL,               -- fiche visitée pendant l'échauffement
    did_itinerary TINYINT(1) DEFAULT 0,          -- a cliqué "Itinéraire"
    did_website TINYINT(1) DEFAULT 0,            -- a cliqué "Site web"
    did_contact TINYINT(1) DEFAULT 0,            -- a cliqué "Appeler / Contact"
    duration_sec INT DEFAULT 0,                  -- temps réel passé sur la fiche
    is_done TINYINT(1) DEFAULT 0,
    visited_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_warmup_visits_session (session_id),
    INDEX idx_warmup_visits_order_done (order_id, is_done),
    CONSTRAINT fk_warmup_visit_session FOREIGN KEY (session_id) REFERENCES fiche_warmup_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_warmup_visit_order FOREIGN KEY (order_id) REFERENCES reviews_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
