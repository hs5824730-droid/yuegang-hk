-- Disabled until the authenticated Telegram callback is connected. No historical backfill.
CREATE TABLE IF NOT EXISTS lead_dispatch_settings (
 id INTEGER PRIMARY KEY CHECK(id=1), enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1))
);
INSERT OR IGNORE INTO lead_dispatch_settings(id,enabled) VALUES(1,0);
CREATE TABLE IF NOT EXISTS manual_lead_dispatch (
 id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
 source TEXT NOT NULL CHECK(source IN ('lead','direct','mail')), source_id TEXT NOT NULL,
 recipient TEXT NOT NULL DEFAULT '' CHECK(recipient IN ('','江承裕','江牧','江鹏')),
 selected_at TEXT, selected_by TEXT NOT NULL DEFAULT '',
 telegram_message_id INTEGER, telegram_text TEXT NOT NULL DEFAULT '',
 telegram_dirty INTEGER NOT NULL DEFAULT 0, telegram_next_attempt INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 UNIQUE(source,source_id)
);
CREATE TRIGGER IF NOT EXISTS manual_lead_arrived AFTER INSERT ON leads
WHEN (SELECT enabled FROM lead_dispatch_settings WHERE id=1)=1
BEGIN
 INSERT INTO manual_lead_dispatch(source,source_id) VALUES('lead',NEW.id);
 INSERT INTO notification_recipients(source,source_id,recipient) VALUES('lead',NEW.id,'待选择')
 ON CONFLICT(source,source_id) DO UPDATE SET recipient='待选择';
END;
DROP TRIGGER IF EXISTS callback_recipient_saved;
CREATE TRIGGER callback_recipient_saved AFTER INSERT ON leads
WHEN json_valid(NEW.data) AND json_extract(NEW.data,'$.contactMethod')='phone'
 AND (SELECT enabled FROM lead_dispatch_settings WHERE id=1)=0
BEGIN
 INSERT INTO notification_recipients(source,source_id) VALUES('lead',NEW.id) ON CONFLICT(source,source_id) DO NOTHING;
END;
DROP TRIGGER IF EXISTS mail_thread_allocate;
CREATE TRIGGER mail_thread_allocate AFTER INSERT ON mail_threads
WHEN NEW.recipient='' AND (SELECT enabled FROM lead_dispatch_settings WHERE id=1)=0
BEGIN
 UPDATE mail_threads SET recipient=(SELECT CASE position%3 WHEN 0 THEN '江承裕' WHEN 1 THEN '江牧' ELSE '江鹏' END FROM notification_recipient_cursor WHERE id=1) WHERE id=NEW.id;
 UPDATE notification_recipient_cursor SET position=position+1 WHERE id=1;
END;
CREATE TRIGGER IF NOT EXISTS manual_mail_arrived AFTER INSERT ON mail_messages
WHEN (SELECT enabled FROM lead_dispatch_settings WHERE id=1)=1
BEGIN
 INSERT INTO manual_lead_dispatch(source,source_id) VALUES('mail',NEW.id);
END;
CREATE TRIGGER IF NOT EXISTS manual_direct_arrived AFTER INSERT ON direct_contact_notifications
WHEN NEW.transport='telegram' AND (SELECT enabled FROM lead_dispatch_settings WHERE id=1)=1
BEGIN
 INSERT INTO manual_lead_dispatch(source,source_id) VALUES('direct',NEW.assignment_id) ON CONFLICT(source,source_id) DO NOTHING;
 INSERT INTO notification_recipients(source,source_id,recipient) VALUES('direct',NEW.assignment_id,'待选择')
 ON CONFLICT(source,source_id) DO UPDATE SET recipient='待选择';
END;
CREATE TRIGGER IF NOT EXISTS manual_dispatch_selected AFTER UPDATE OF selected_at ON manual_lead_dispatch
WHEN OLD.selected_at IS NULL AND NEW.selected_at IS NOT NULL
BEGIN
 UPDATE notification_recipients SET recipient=NEW.recipient WHERE source=NEW.source AND source_id=NEW.source_id;
 UPDATE mail_threads SET recipient=NEW.recipient,version=version+1 WHERE NEW.source='mail' AND id=(SELECT thread_id FROM mail_messages WHERE id=NEW.source_id);
END;
