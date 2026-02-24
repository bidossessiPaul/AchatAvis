-- Add allow_appeal column to reviews_submissions
-- When admin rejects with this flag, the guide can appeal if the review comes back online
ALTER TABLE reviews_submissions ADD COLUMN allow_appeal TINYINT(1) DEFAULT 0;
