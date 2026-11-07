-- A separate, durable callback rotation. Existing channel cursors and sent messages stay intact.
CREATE TABLE IF NOT EXISTS notification_recipient_cursor (
 id INTEGER PRIMARY KEY CHECK(id=1), position INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO notification_recipient_cursor(id,position) VALUES(1,0);
CREATE TABLE IF NOT EXISTS notification_recipients (
 source TEXT NOT NULL CHECK(source IN ('lead','direct')),
 source_id TEXT NOT NULL,
 recipient TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(source,source_id)
);
CREATE TRIGGER IF NOT EXISTS notification_recipient_assign AFTER INSERT ON notification_recipients
WHEN NEW.recipient=''
BEGIN
 UPDATE notification_recipients SET recipient=(
  SELECT CASE position%3 WHEN 0 THEN '江承裕' WHEN 1 THEN '江牧' ELSE '江鹏' END
  FROM notification_recipient_cursor WHERE id=1
 ) WHERE source=NEW.source AND source_id=NEW.source_id;
 UPDATE notification_recipient_cursor SET position=position+1 WHERE id=1;
END;
