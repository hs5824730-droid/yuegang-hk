-- Dedicated connection only; no customer backfill, queue reset or external action.
CREATE TABLE IF NOT EXISTS registration_google_connection (
 id INTEGER PRIMARY KEY CHECK(id=1), token_cipher TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 0,
 connected_at TEXT NOT NULL, connected_by TEXT NOT NULL REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS registration_google_oauth_states (
 state_hash TEXT PRIMARY KEY, cookie_hash TEXT NOT NULL, verifier_cipher TEXT NOT NULL,
 user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL, used_at INTEGER NOT NULL DEFAULT 0
);
