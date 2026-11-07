-- Future explicit website_direct assignments only. No lead creation or history backfill.
ALTER TABLE reception_channel_assignments ADD COLUMN direct_context TEXT;
CREATE TABLE direct_contact_notifications (
 id TEXT PRIMARY KEY, assignment_id TEXT NOT NULL REFERENCES reception_channel_assignments(id),
 transport TEXT NOT NULL CHECK(transport IN ('telegram','signal')),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','failed','uncertain')),
 attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0,
 claimed_until INTEGER NOT NULL DEFAULT 0, claim_token TEXT NOT NULL DEFAULT '',
 revision INTEGER NOT NULL DEFAULT 0, delivered_revision INTEGER NOT NULL DEFAULT -1,
 edit_attempts INTEGER NOT NULL DEFAULT 0, edit_next_attempt INTEGER NOT NULL DEFAULT 0,
 receipt INTEGER, sent_at TEXT, last_error TEXT NOT NULL DEFAULT '',
 UNIQUE(transport,assignment_id)
);
CREATE INDEX direct_contact_pending ON direct_contact_notifications(transport,status,next_attempt);
CREATE TRIGGER direct_contact_insert AFTER INSERT ON reception_channel_assignments
WHEN NEW.lead_id IS NULL AND json_extract(NEW.direct_context,'$.source')='website_direct'
BEGIN
 INSERT INTO direct_contact_notifications(id,assignment_id,transport,next_attempt)
 VALUES(NEW.id||':telegram',NEW.id,'telegram',CAST(strftime('%s','now') AS INTEGER)*1000+2000);
 INSERT INTO direct_contact_notifications(id,assignment_id,transport,next_attempt)
 SELECT NEW.id,NEW.id,'signal',CAST(strftime('%s','now') AS INTEGER)*1000+2000
 FROM notification_channels WHERE channel='signal' AND enabled=1 AND NEW.created_at>=enabled_at;
END;
-- Only the first factual action changes the message revision. Replayed clicks never add messages.
CREATE TRIGGER direct_contact_action AFTER INSERT ON reception_channel_events
WHEN (SELECT COUNT(*) FROM reception_channel_events WHERE assignment_id=NEW.assignment_id AND type=NEW.type)=1
BEGIN
 UPDATE direct_contact_notifications SET revision=revision+1,edit_attempts=0,edit_next_attempt=0
 WHERE assignment_id=NEW.assignment_id;
END;
