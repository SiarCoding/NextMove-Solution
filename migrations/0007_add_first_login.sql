-- Add is_first_login column to users table
ALTER TABLE users
ADD COLUMN is_first_login boolean NOT NULL DEFAULT true;

-- Set is_first_login to false for existing users who have completed onboarding
UPDATE users
SET is_first_login = false
WHERE onboarding_completed = true;
