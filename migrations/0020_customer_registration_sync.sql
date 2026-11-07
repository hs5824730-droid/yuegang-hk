-- Durable per-record outbox. Backfill only the three new registration types, never rental/short enquiries.
CREATE TABLE IF NOT EXISTS customer_registration_sync (
 seq INTEGER PRIMARY KEY AUTOINCREMENT,
 registration_id TEXT NOT NULL UNIQUE REFERENCES customer_registrations(id),
 status TEXT NOT NULL DEFAULT 'pending', revision INTEGER NOT NULL DEFAULT 1,
 delivered_revision INTEGER NOT NULL DEFAULT 0, attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt INTEGER NOT NULL DEFAULT 0, claim_token TEXT NOT NULL DEFAULT '',
 claimed_until INTEGER NOT NULL DEFAULT 0, last_error TEXT NOT NULL DEFAULT '', sent_at TEXT
);
INSERT INTO customer_registration_sync(registration_id)
 SELECT r.id FROM customer_registrations r
 WHERE NOT EXISTS(SELECT 1 FROM customer_registration_sync s WHERE s.registration_id=r.id)
 ORDER BY r.created_at,r.id;
CREATE TRIGGER IF NOT EXISTS customer_registration_queued AFTER INSERT ON customer_registrations
BEGIN
 INSERT INTO customer_registration_sync(registration_id) VALUES(NEW.id);
END;
CREATE TRIGGER IF NOT EXISTS customer_registration_sheet_updated AFTER UPDATE OF status,category ON customer_registrations
WHEN OLD.status<>NEW.status OR OLD.category<>NEW.category
BEGIN
 UPDATE customer_registration_sync SET status='pending',revision=revision+1,attempts=0,
 next_attempt=CASE WHEN last_error='sheets_network_unknown' OR last_error LIKE 'sheets_http_5%' THEN next_attempt ELSE 0 END
 WHERE registration_id=NEW.id;
END;
