-- Traçabilité du recyclage : on garde la soumission du guide d'origine
-- avec un marqueur clair au lieu de la supprimer, pour que le guide voie
-- son historique et comprenne pourquoi l'avis a disparu de sa queue.
ALTER TABLE reviews_submissions
ADD COLUMN recycled_at DATETIME DEFAULT NULL
COMMENT 'Timestamp du recyclage: admin a redistribué cet avis rejeté à un autre guide';

CREATE INDEX idx_submissions_recycled_at ON reviews_submissions (recycled_at);
