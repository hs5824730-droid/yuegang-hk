
CREATE TABLE IF NOT EXISTS reception_targets(id TEXT PRIMARY KEY,channel TEXT NOT NULL CHECK(channel IN ('whatsapp','wechat')),position INTEGER NOT NULL,enabled INTEGER NOT NULL,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reception_channel_cursor(channel TEXT PRIMARY KEY CHECK(channel IN ('whatsapp','wechat')),ordinal INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO reception_channel_cursor(channel,ordinal) VALUES('whatsapp',0),('wechat',0);
CREATE TABLE IF NOT EXISTS reception_channel_assignments(id TEXT PRIMARY KEY,channel TEXT NOT NULL CHECK(channel IN ('whatsapp','wechat')),request_id TEXT NOT NULL,lead_id TEXT REFERENCES leads(id),target_data TEXT,created_at TEXT NOT NULL,UNIQUE(channel,request_id));
CREATE TABLE IF NOT EXISTS reception_channel_events(request_id TEXT NOT NULL,channel TEXT NOT NULL CHECK(channel IN ('whatsapp','wechat')),assignment_id TEXT NOT NULL REFERENCES reception_channel_assignments(id),type TEXT NOT NULL CHECK(type IN ('whatsapp_click','wechat_qr_view')),created_at TEXT NOT NULL,PRIMARY KEY(channel,request_id));
CREATE INDEX IF NOT EXISTS reception_channel_event_assignment ON reception_channel_events(assignment_id);
CREATE INDEX IF NOT EXISTS reception_channel_assignment_created ON reception_channel_assignments(created_at);
CREATE TRIGGER IF NOT EXISTS reception_channel_allocate AFTER INSERT ON reception_channel_assignments
WHEN EXISTS(SELECT 1 FROM reception_targets WHERE enabled=1 AND channel=NEW.channel)
BEGIN
 UPDATE reception_channel_assignments SET target_data=(SELECT data FROM reception_targets WHERE enabled=1 AND channel=NEW.channel ORDER BY position,id LIMIT 1 OFFSET (SELECT ordinal % (SELECT COUNT(*) FROM reception_targets WHERE enabled=1 AND channel=NEW.channel) FROM reception_channel_cursor WHERE channel=NEW.channel)) WHERE id=NEW.id;
 UPDATE reception_channel_cursor SET ordinal=ordinal+1 WHERE channel=NEW.channel;
END;
