-- 089 — Ajoute le blocage d'un compte réseau social approuvé (repost social).
-- Pourquoi : l'admin doit pouvoir suspendre temporairement un compte approuvé
-- (fraude suspectée, abus…) sans le rejeter ni le supprimer. Un compte bloqué
-- garde son statut 'approved' mais perd l'accès à la vidéothèque tant que
-- blocked_at IS NOT NULL. Débloquer = remettre blocked_at à NULL.
-- Colonne additive et nullable : non destructive, re-jouable (le runner ignore
-- l'erreur "Duplicate column").

ALTER TABLE repost_accounts ADD COLUMN blocked_at DATETIME DEFAULT NULL;
ALTER TABLE repost_accounts ADD INDEX idx_ra_blocked (blocked_at);
