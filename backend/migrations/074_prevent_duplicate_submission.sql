-- Migration 074 : Trigger anti-doublon sur reviews_submissions
-- Empêche au niveau DB qu'un même proposal soit soumis 2 fois en statut actif (pending/validated).
-- Bloque même en cas de race condition applicative.

DROP TRIGGER IF EXISTS prevent_duplicate_submission;

DELIMITER //
CREATE TRIGGER prevent_duplicate_submission
BEFORE INSERT ON reviews_submissions
FOR EACH ROW
BEGIN
    IF NEW.proposal_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM reviews_submissions
        WHERE proposal_id = NEW.proposal_id
          AND status != 'rejected'
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'DUPLICATE_SUBMISSION';
    END IF;
END //
DELIMITER ;
