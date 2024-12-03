ALTER TABLE customer_checklist 
  ADD COLUMN IF NOT EXISTS target_group_location text NOT NULL DEFAULT '';
