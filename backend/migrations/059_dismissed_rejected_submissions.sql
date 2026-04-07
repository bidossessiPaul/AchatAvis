-- 058_dismissed_rejected_submissions.sql
-- Permet à l'admin de marquer une soumission rejetée comme "traitée" pour la masquer
-- de la liste des avis rejetés sans perdre l'historique. Notamment utilisé quand
-- l'admin force la remise en ligne d'une fiche depuis /admin/rejected-reviews.

ALTER TABLE reviews_submissions
  ADD COLUMN dismissed_at DATETIME NULL DEFAULT NULL
  COMMENT 'Admin a marqué cette soumission rejetée comme traitée — masquée de la liste des rejets';

CREATE INDEX idx_submissions_status_dismissed
  ON reviews_submissions(status, dismissed_at);
