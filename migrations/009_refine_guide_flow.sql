-- Refine guide flow for Phase 2
ALTER TABLE reviews_orders 
ADD COLUMN IF NOT EXISTS publication_pace VARCHAR(50) DEFAULT '1 par jour';

-- Add proposal_id to link submission to specific AI generated content
ALTER TABLE reviews_submissions
ADD COLUMN IF NOT EXISTS proposal_id VARCHAR(36),
ADD CONSTRAINT fk_submission_proposal FOREIGN KEY (proposal_id) REFERENCES review_proposals(id) ON DELETE SET NULL;
