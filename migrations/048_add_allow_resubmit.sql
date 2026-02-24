-- Add allow_resubmit column to reviews_submissions
-- When admin rejects with this flag, the guide can correct the link and resubmit
ALTER TABLE reviews_submissions ADD COLUMN allow_resubmit TINYINT(1) DEFAULT 0;
