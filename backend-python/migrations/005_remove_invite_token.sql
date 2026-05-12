-- Remove invite-token columns from users and drop the associated index.
-- Supervisors are now created directly with a hashed password; no invite flow exists.

DROP INDEX IF EXISTS idx_users_invite_token;

ALTER TABLE users
    DROP COLUMN IF EXISTS invite_token,
    DROP COLUMN IF EXISTS invite_expires_at;
