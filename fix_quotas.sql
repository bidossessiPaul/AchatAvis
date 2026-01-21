-- Fix existing payments that have fiches_quota set to review quantity instead of 1
UPDATE payments 
SET fiches_quota = 1 
WHERE type = 'subscription' 
AND fiches_quota > 1;
