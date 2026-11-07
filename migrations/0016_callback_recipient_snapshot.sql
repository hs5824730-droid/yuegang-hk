-- Future callback leads only. No updates or replay for existing enquiries.
DROP TRIGGER IF EXISTS callback_recipient_saved;
CREATE TRIGGER IF NOT EXISTS callback_recipient_saved AFTER INSERT ON leads
WHEN json_valid(NEW.data) AND json_extract(NEW.data,'$.contactMethod')='phone'
BEGIN
 INSERT INTO notification_recipients(source,source_id) VALUES('lead',NEW.id)
 ON CONFLICT(source,source_id) DO NOTHING;
END;
