-- =========================================================================
-- Migration 060: Fix 460+ bulk-revalidated submissions incorrectly set to 'validated'
-- =========================================================================
-- Bug: bulkRevalidateSubmissions() called updateSubmissionStatus(id, 'validated')
-- instead of resetting to 'pending'. This incorrectly validated rejected reviews,
-- inflated artisan stats, and credited guide balances.
--
-- How to identify affected submissions:
-- - status = 'validated'
-- - validated_by IS NULL (bulk function didn't pass adminId)
-- - validated_at is recent (today or yesterday)
--
-- This migration:
-- 1. Resets ALL affected submissions back to 'pending'
-- 2. Recalculates artisan profile stats for ALL affected artisans
-- 3. Resets order statuses back to 'in_progress' where needed
-- =========================================================================

-- Step 1: Reset ALL incorrectly bulk-validated submissions back to 'pending'
-- These have validated_by IS NULL and validated_at is recent (within last 3 days to be safe)
UPDATE reviews_submissions
SET status = 'pending',
    validated_at = NULL,
    validated_by = NULL,
    rejection_reason = NULL,
    allow_resubmit = 0,
    allow_appeal = 0,
    rejected_at = NULL,
    slot_released_at = NULL
WHERE status = 'validated'
  AND validated_by IS NULL
  AND validated_at >= DATE_SUB(CURDATE(), INTERVAL 3 DAY);

-- Step 2: Recalculate artisan stats for ALL artisans (safe full recalc)
UPDATE artisans_profiles ap
SET ap.total_reviews_received = (
      SELECT COUNT(*)
      FROM reviews_submissions rs
      JOIN review_proposals rp ON rs.proposal_id = rp.id
      JOIN reviews_orders ro ON rp.order_id = ro.id
      WHERE ro.artisan_id = ap.user_id AND rs.status = 'validated'
    ),
    ap.current_month_reviews = (
      SELECT COUNT(*)
      FROM reviews_submissions rs
      JOIN review_proposals rp ON rs.proposal_id = rp.id
      JOIN reviews_orders ro ON rp.order_id = ro.id
      WHERE ro.artisan_id = ap.user_id
        AND rs.status = 'validated'
        AND rs.validated_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
    );

-- Step 3: Fix order statuses - reset 'completed' orders that don't actually have enough validated reviews
UPDATE reviews_orders ro
SET ro.status = 'in_progress'
WHERE ro.status = 'completed'
  AND (
    SELECT COUNT(*)
    FROM reviews_submissions s
    JOIN review_proposals p ON s.proposal_id = p.id
    WHERE p.order_id = ro.id AND s.status = 'validated'
  ) < ro.quantity;
