-- Ajoute la réservation per-slot sur review_proposals.
-- Un guide reçoit UN seul slot verrouillé pour lui pendant 5 min.
-- Si le guide repart sans soumettre, le contenu est régénéré avant
-- d'être assigné à quelqu'un d'autre (anti-doublons Google).

ALTER TABLE review_proposals
    ADD COLUMN reserved_by VARCHAR(36) NULL DEFAULT NULL,
    ADD COLUMN reserved_until DATETIME NULL DEFAULT NULL;

CREATE INDEX idx_review_proposals_reserved_by    ON review_proposals(reserved_by);
CREATE INDEX idx_review_proposals_reserved_until ON review_proposals(reserved_until);
