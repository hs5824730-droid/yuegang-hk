-- Existing sent messages remain untouched. Only future queued leads opt in to same-message updates.
ALTER TABLE notifications ADD COLUMN sync_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE notifications ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE notifications ADD COLUMN delivered_revision INTEGER NOT NULL DEFAULT -1;
ALTER TABLE notifications ADD COLUMN message_id INTEGER;
ALTER TABLE notifications ADD COLUMN edit_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE notifications ADD COLUMN edit_next_attempt INTEGER NOT NULL DEFAULT 0;
ALTER TABLE notifications ADD COLUMN edit_error TEXT NOT NULL DEFAULT '';
CREATE TRIGGER notification_assignment_insert AFTER INSERT ON reception_channel_assignments
BEGIN
 UPDATE notifications SET revision=revision+1,edit_attempts=0,edit_next_attempt=0 WHERE lead_id=NEW.lead_id AND sync_enabled=1;
END;
CREATE TRIGGER notification_assignment_snapshot AFTER UPDATE OF target_data ON reception_channel_assignments
WHEN NEW.target_data IS NOT OLD.target_data
BEGIN
 UPDATE notifications SET revision=revision+1,edit_attempts=0,edit_next_attempt=0 WHERE lead_id=NEW.lead_id AND sync_enabled=1;
END;
CREATE TRIGGER notification_assignment_event AFTER INSERT ON reception_channel_events
BEGIN
 UPDATE notifications SET revision=revision+1,edit_attempts=0,edit_next_attempt=0 WHERE lead_id=(SELECT lead_id FROM reception_channel_assignments WHERE id=NEW.assignment_id) AND sync_enabled=1;
END;
