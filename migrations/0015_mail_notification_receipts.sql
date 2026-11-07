-- Add delivery evidence only. No historical messages or notifications are queued.
ALTER TABLE mail_notifications ADD COLUMN receipt TEXT NOT NULL DEFAULT '';
ALTER TABLE mail_notifications ADD COLUMN sent_at TEXT;
