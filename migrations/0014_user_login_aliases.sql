-- Additive only: retain canonical users/email/roles and all ownership references.
CREATE TABLE IF NOT EXISTS user_login_aliases (
 login_name TEXT PRIMARY KEY COLLATE NOCASE,
 user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE
);
