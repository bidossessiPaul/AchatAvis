-- 057_rejected_reviews_overhaul.sql
-- Refonte du système de rejet d'avis et de la barre de progression
-- - Le compteur reviews_received compte les "slots actifs" (pending + validated + rejets resubmit non expirés)
-- - Le passage en 'completed' se fait uniquement quand le nombre d'avis VALIDÉS atteint la quantité
-- - Les rejets allow_resubmit gardent le slot 24h, puis le libèrent automatiquement
-- - Les rejets allow_appeal et secs libèrent le slot immédiatement
--
-- Cette migration est idempotente : les WHERE excluent les lignes déjà traitées.

-- 1. Nouvelles colonnes sur reviews_submissions
ALTER TABLE reviews_submissions
  ADD COLUMN rejected_at DATETIME NULL DEFAULT NULL COMMENT 'Timestamp du rejet par admin';

ALTER TABLE reviews_submissions
  ADD COLUMN slot_released_at DATETIME NULL DEFAULT NULL COMMENT 'Timestamp de libération du slot (rejets allow_resubmit expirés)';

-- 2. Index pour accélérer la query de libération des slots expirés
CREATE INDEX idx_submissions_resubmit_expiry
  ON reviews_submissions(status, allow_resubmit, slot_released_at, rejected_at);

CREATE INDEX idx_submissions_order_status
  ON reviews_submissions(order_id, status);

-- 3. Backfill rejected_at pour les rejets existants (utilise validated_at si présent, sinon submitted_at)
UPDATE reviews_submissions
SET rejected_at = COALESCE(validated_at, submitted_at)
WHERE status = 'rejected' AND rejected_at IS NULL;

-- 4. Marquer comme "slot libéré" tous les anciens rejets (évite double-comptage à la migration)
UPDATE reviews_submissions
SET slot_released_at = NOW()
WHERE status = 'rejected' AND slot_released_at IS NULL;

-- 5. Recalculer reviews_received pour tous les orders : compte les slots actifs uniquement
UPDATE reviews_orders ro
SET reviews_received = (
  SELECT COUNT(*) FROM reviews_submissions s
  WHERE s.order_id = ro.id
    AND (
      s.status IN ('pending', 'validated')
      OR (s.status = 'rejected' AND s.allow_resubmit = 1 AND s.slot_released_at IS NULL)
    )
);

-- 6. Fiches 'completed' qui ne le sont plus (validated < quantity) : repasser en 'in_progress'
UPDATE reviews_orders ro
SET status = 'in_progress'
WHERE status = 'completed'
  AND (
    SELECT COUNT(*) FROM reviews_submissions s
    WHERE s.order_id = ro.id AND s.status = 'validated'
  ) < quantity;

-- 7. Inversement : fiches réellement complétées (validated >= quantity) marquées en 'completed'
UPDATE reviews_orders ro
SET status = 'completed'
WHERE status = 'in_progress'
  AND (
    SELECT COUNT(*) FROM reviews_submissions s
    WHERE s.order_id = ro.id AND s.status = 'validated'
  ) >= quantity;
