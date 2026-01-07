-- Fix existing payments that have missions_quota set to review quantity (e.g. 10) instead of mission count (1)
UPDATE payments 
SET missions_quota = 1 
WHERE type = 'subscription' 
AND missions_quota > 5; -- Safe threshold to target review counts (usually 10, 20 etc) vs mission counts
