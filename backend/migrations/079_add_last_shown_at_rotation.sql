-- Rotation des avis : remplace la régénération IA (supprimée).
-- Quand un guide voit un avis, last_shown_at = NOW() → l'avis part en bas
-- de la file et le prochain guide qui ouvre la fiche voit un autre avis.

ALTER TABLE review_proposals
    ADD COLUMN last_shown_at DATETIME NULL DEFAULT NULL;

CREATE INDEX idx_review_proposals_last_shown_at ON review_proposals(last_shown_at);
