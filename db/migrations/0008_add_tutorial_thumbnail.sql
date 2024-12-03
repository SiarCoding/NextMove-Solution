-- Add thumbnail_url column to tutorials table
ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
