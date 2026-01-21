-- Fix: Recalculate fiches_allowed to be the COUNT of packs properly purchased.
-- This aligns with the "1 Pack = 1 fiche" logic.

UPDATE artisans_profiles ap
SET fiches_allowed = (
    SELECT COUNT(*) 
    FROM payments p 
    WHERE p.user_id = ap.user_id 
    AND p.type = 'subscription' 
    AND p.status = 'completed'
);
