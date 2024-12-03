-- Add Google Drive fields to users table
ALTER TABLE users
ADD COLUMN google_access_token TEXT,
ADD COLUMN google_refresh_token TEXT,
ADD COLUMN google_token_expiry TIMESTAMP,
ADD COLUMN google_drive_connected BOOLEAN DEFAULT FALSE NOT NULL;
