-- Disabled by default: only post-activation new enquiries opt in; no historical backfill.
CREATE TABLE IF NOT EXISTS notification_channels (
 channel TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 0, enabled_at TEXT NOT NULL DEFAULT ''
);
INSERT INTO notification_channels(channel) VALUES('signal') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS signal_notifications (
 id TEXT PRIMARY KEY,lead_id TEXT NOT NULL UNIQUE REFERENCES leads(id),
 status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,next_attempt INTEGER NOT NULL DEFAULT 0,
 claimed_until INTEGER NOT NULL DEFAULT 0,claim_token TEXT NOT NULL DEFAULT '',
 revision INTEGER NOT NULL DEFAULT 0,delivered_revision INTEGER NOT NULL DEFAULT -1,
 edit_attempts INTEGER NOT NULL DEFAULT 0,edit_next_attempt INTEGER NOT NULL DEFAULT 0,
 receipt INTEGER,last_error TEXT NOT NULL DEFAULT '',sent_at TEXT
);
CREATE INDEX IF NOT EXISTS signal_notification_pending ON signal_notifications(status,next_attempt);
CREATE TRIGGER IF NOT EXISTS signal_assignment_insert AFTER INSERT ON reception_channel_assignments
BEGIN
 UPDATE signal_notifications SET revision=revision+1,edit_attempts=0,edit_next_attempt=0 WHERE lead_id=NEW.lead_id;
END;
CREATE TRIGGER IF NOT EXISTS signal_assignment_snapshot AFTER UPDATE OF target_data ON reception_channel_assignments
WHEN NEW.target_data IS NOT OLD.target_data
BEGIN
 UPDATE signal_notifications SET revision=revision+1,edit_attempts=0,edit_next_attempt=0 WHERE lead_id=NEW.lead_id;
END;
CREATE TRIGGER IF NOT EXISTS signal_assignment_event AFTER INSERT ON reception_channel_events
BEGIN
 UPDATE signal_notifications SET revision=revision+1,edit_attempts=0,edit_next_attempt=0 WHERE lead_id=(SELECT lead_id FROM reception_channel_assignments WHERE id=NEW.assignment_id);
END;
