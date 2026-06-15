-- Corrige le mismatch entre l'ENUM DB ('online') et le code ('contact').
-- Le code partout utilise 'contact', la migration 069 avait défini 'online' par erreur.

ALTER TABLE review_proposals
    MODIFY COLUMN experience_type ENUM('tested','visited','contact','hearsay') NOT NULL DEFAULT 'tested';
