ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(128);

CREATE UNIQUE INDEX IF NOT EXISTS ux_admin_users_firebase_uid
ON admin_users(firebase_uid)
WHERE firebase_uid IS NOT NULL;
