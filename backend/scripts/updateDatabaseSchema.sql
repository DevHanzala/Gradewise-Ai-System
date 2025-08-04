-- Update users table to add provider and uid columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS uid VARCHAR(255);

-- Create index on uid for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);

-- Create index on provider for filtering
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);

-- Update existing users to have 'manual' provider if null
UPDATE users SET provider = 'manual' WHERE provider IS NULL;

-- Add constraint to ensure uid is unique when not null
ALTER TABLE users ADD CONSTRAINT unique_uid UNIQUE (uid);
