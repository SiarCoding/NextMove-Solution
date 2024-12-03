-- First, convert existing columns to JSONB
ALTER TABLE customer_checklist 
  ALTER COLUMN web_design TYPE jsonb USING web_design::jsonb,
  ALTER COLUMN market_research TYPE jsonb USING market_research::jsonb,
  ALTER COLUMN legal_info TYPE jsonb USING legal_info::jsonb;

-- Then add target group fields
ALTER TABLE customer_checklist 
  ADD COLUMN IF NOT EXISTS target_group_gender text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS target_group_age text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS target_group_location text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS target_group_interests jsonb NOT NULL DEFAULT '[]';
