-- Fix: Recalculate missions_allowed as the sum of quotas from all purchased packs
-- This ensures the quota from premium packs (e.g. 5, 10, 20 missions) is correctly reflected.

UPDATE artisans_profiles ap
SET missions_allowed = (
    SELECT COALESCE(SUM(missions_quota), 0)
    FROM payments p 
    WHERE p.user_id = ap.user_id 
    AND p.type = 'subscription' 
    AND p.status = 'completed'
);
