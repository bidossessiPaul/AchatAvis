-- Fix: Recalculate missions_allowed to be the COUNT of packs properly purchased.
-- This aligns with the "1 Pack = 1 Mission" logic.

UPDATE artisans_profiles ap
SET missions_allowed = (
    SELECT COUNT(*) 
    FROM payments p 
    WHERE p.user_id = ap.user_id 
    AND p.type = 'subscription' 
    AND p.status = 'completed'
);
