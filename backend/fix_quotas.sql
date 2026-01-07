-- Fix existing payments that have missions_quota set to review quantity instead of 1
UPDATE payments 
SET missions_quota = 1 
WHERE type = 'subscription' 
AND missions_quota > 1;
