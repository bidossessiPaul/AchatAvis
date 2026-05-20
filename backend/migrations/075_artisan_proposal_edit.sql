-- Migration 075 : Modification d'avis par l'artisan
-- Ajoute les colonnes pour tracer les modifications artisan + protéger le contenu pré-généré

ALTER TABLE review_proposals
    ADD COLUMN modified_by_artisan_at DATETIME DEFAULT NULL COMMENT 'Date de modification par l artisan (déclenche validation d office)',
    ADD COLUMN is_pregenerated TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = généré par l artisan avant ouverture (contenu figé, jamais régénéré par refresh-slot)';

-- Index pour requêtes sur proposals modifiés par l'artisan
ALTER TABLE review_proposals
    ADD INDEX idx_proposals_modified_artisan (modified_by_artisan_at);
