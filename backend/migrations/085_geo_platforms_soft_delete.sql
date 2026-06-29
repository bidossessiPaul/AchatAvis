-- 085 — Ajoute le soft-delete sur geo_platforms
-- Pourquoi : la suppression d'une plateforme renvoyait 404 (route DELETE inexistante).
-- On ne hard-delete pas car des geo_submissions historiques pointent vers la plateforme
-- et doivent conserver son nom. Soft-delete via deleted_at + filtrage des listes.

ALTER TABLE geo_platforms ADD COLUMN deleted_at DATETIME DEFAULT NULL;
ALTER TABLE geo_platforms ADD INDEX idx_geo_platforms_deleted_at (deleted_at);
