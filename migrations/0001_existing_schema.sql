-- Existing application schema; D1 migration runner applies each migration atomically.
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL, role TEXT NOT NULL, city TEXT, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY, city TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS owners (
    id TEXT PRIMARY KEY, contact_key TEXT NOT NULL UNIQUE, contact TEXT NOT NULL, name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL,
    owner_id TEXT NOT NULL REFERENCES owners(id), city TEXT NOT NULL, service TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new', assigned_to TEXT REFERENCES users(id),
    data TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', next_follow_up TEXT NOT NULL DEFAULT '',
    commission_ordinal INTEGER, moving_status TEXT NOT NULL DEFAULT 'none', created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY, lead_id TEXT NOT NULL UNIQUE REFERENCES leads(id),
    status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt INTEGER NOT NULL DEFAULT 0, last_error TEXT NOT NULL DEFAULT '', sent_at TEXT,
    claimed_until INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, action TEXT NOT NULL,
    resource_id TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS lead_city ON leads(city);
  CREATE INDEX IF NOT EXISTS lead_owner ON leads(owner_id);
  CREATE INDEX IF NOT EXISTS notification_pending ON notifications(status,next_attempt);
  CREATE INDEX IF NOT EXISTS session_expiry ON sessions(expires_at);
