-- 072_add_nb_signalements_par_avis_default.sql
-- Ajoute la colonne manquante nb_signalements_par_avis_default dans signalement_config.
-- Corrige l'erreur "Unknown column 'nb_signalements_par_avis_default' in 'field list'"
-- lors de la création d'un avis signalement côté artisan.

ALTER TABLE signalement_config
    ADD COLUMN nb_signalements_par_avis_default INT NOT NULL DEFAULT 3
        COMMENT 'Nombre de guides mobilisés par défaut pour signaler un avis';
