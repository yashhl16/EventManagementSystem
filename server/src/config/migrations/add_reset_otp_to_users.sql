-- Migration: Add reset_otp and reset_otp_expires to users table for automated transactional email password recovery
-- Supports 6-digit OTP verification with 10-minute validity window

ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp VARCHAR(6) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_expires TIMESTAMP DEFAULT NULL;

-- Optional index for faster lookup on OTP cleanup/query
CREATE INDEX IF NOT EXISTS idx_users_reset_otp ON users(reset_otp) WHERE reset_otp IS NOT NULL;
