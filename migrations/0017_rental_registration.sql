-- Separate owner intake, not a short enquiry or reception assignment. No historical backfill.
CREATE TABLE IF NOT EXISTS rental_registrations (
 seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, request_id TEXT NOT NULL UNIQUE,
 request_hash TEXT NOT NULL, data TEXT NOT NULL, city TEXT, status TEXT NOT NULL DEFAULT 'new',
 follow_up TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rental_registration_sync (
 registration_id TEXT PRIMARY KEY REFERENCES rental_registrations(id), status TEXT NOT NULL DEFAULT 'pending',
 revision INTEGER NOT NULL DEFAULT 1, delivered_revision INTEGER NOT NULL DEFAULT 0,
 attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0,
 claim_token TEXT NOT NULL DEFAULT '', claimed_until INTEGER NOT NULL DEFAULT 0,
 last_error TEXT NOT NULL DEFAULT '', sent_at TEXT
);
CREATE TRIGGER IF NOT EXISTS rental_registration_queued AFTER INSERT ON rental_registrations
BEGIN
 INSERT INTO rental_registration_sync(registration_id) VALUES(NEW.id);
END;
DROP TRIGGER IF EXISTS rental_registration_updated;
CREATE TRIGGER IF NOT EXISTS rental_registration_updated AFTER UPDATE OF status,follow_up ON rental_registrations
WHEN OLD.status<>NEW.status OR OLD.follow_up<>NEW.follow_up
BEGIN
 UPDATE rental_registration_sync SET status='pending',revision=revision+1,attempts=0,next_attempt=CASE WHEN last_error='sheets_network_unknown' OR last_error LIKE 'sheets_http_5%' THEN next_attempt ELSE 0 END WHERE registration_id=NEW.id;
END;
CREATE INDEX IF NOT EXISTS registration_city_date ON rental_registrations(city,created_at);
