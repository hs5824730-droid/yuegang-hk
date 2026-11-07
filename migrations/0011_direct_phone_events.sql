-- Phone reuses the WhatsApp allocation pool, but its factual action stays separate.
-- Additive: preserve all previous assignments/events/cursors; no historical backfill.
CREATE TABLE IF NOT EXISTS reception_phone_events (
 request_id TEXT PRIMARY KEY,
 assignment_id TEXT NOT NULL UNIQUE REFERENCES reception_channel_assignments(id),
 created_at TEXT NOT NULL
);
CREATE TRIGGER IF NOT EXISTS direct_phone_event_guard BEFORE INSERT ON reception_phone_events
WHEN NOT EXISTS(SELECT 1 FROM reception_channel_assignments a WHERE a.id=NEW.assignment_id
 AND a.channel='whatsapp' AND a.lead_id IS NULL AND a.target_data IS NOT NULL
 AND json_extract(a.direct_context,'$.source')='website_direct'
 AND json_extract(a.direct_context,'$.contactMethod')='phone')
BEGIN
 SELECT RAISE(ABORT,'Phone action requires a direct phone assignment');
END;
CREATE TRIGGER IF NOT EXISTS direct_phone_action AFTER INSERT ON reception_phone_events
BEGIN
 UPDATE direct_contact_notifications SET revision=revision+1,edit_attempts=0,edit_next_attempt=0
 WHERE assignment_id=NEW.assignment_id;
END;
