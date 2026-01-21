-- Fix existing payments that have fiches_quota set to review quantity (e.g. 10) instead of fiche count (1)
UPDATE payments 
SET fiches_quota = 1 
WHERE type = 'subscription' 
AND fiches_quota > 5; -- Safe threshold to target review counts (usually 10, 20 etc) vs fiche counts
