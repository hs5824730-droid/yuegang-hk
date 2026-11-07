CREATE TABLE IF NOT EXISTS mail_threads (
 id TEXT PRIMARY KEY, account_id TEXT NOT NULL, provider_thread_id TEXT NOT NULL,
 subject TEXT NOT NULL, sender_email TEXT NOT NULL, sender_name TEXT NOT NULL,
 recipient TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'open',
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0,
 UNIQUE(account_id,provider_thread_id)
);
CREATE TRIGGER IF NOT EXISTS mail_thread_allocate AFTER INSERT ON mail_threads
WHEN NEW.recipient=''
BEGIN
 UPDATE mail_threads SET recipient=(SELECT CASE position%3 WHEN 0 THEN '江承裕' WHEN 1 THEN '江牧' ELSE '江鹏' END FROM notification_recipient_cursor WHERE id=1) WHERE id=NEW.id;
 UPDATE notification_recipient_cursor SET position=position+1 WHERE id=1;
END;
CREATE TABLE IF NOT EXISTS mail_messages (
 id TEXT PRIMARY KEY, thread_id TEXT NOT NULL REFERENCES mail_threads(id),
 account_id TEXT NOT NULL, provider_message_id TEXT NOT NULL, folder_id TEXT NOT NULL,
 sender_email TEXT NOT NULL, sender_name TEXT NOT NULL, subject TEXT NOT NULL,
 body TEXT NOT NULL, received_at TEXT NOT NULL, has_attachment INTEGER NOT NULL DEFAULT 0,
 UNIQUE(account_id,provider_message_id)
);
CREATE TRIGGER IF NOT EXISTS mail_message_arrived AFTER INSERT ON mail_messages
BEGIN
 UPDATE mail_threads SET updated_at=MAX(updated_at,NEW.received_at),version=version+1,status='open' WHERE id=NEW.thread_id;
END;
CREATE INDEX IF NOT EXISTS mail_message_thread ON mail_messages(thread_id,received_at);
CREATE TABLE IF NOT EXISTS mail_sync (
 account_id TEXT PRIMARY KEY, started_at TEXT NOT NULL, checked_at INTEGER NOT NULL DEFAULT 0,
 watermark INTEGER NOT NULL DEFAULT 0, lease_until INTEGER NOT NULL DEFAULT 0,
 claim_token TEXT NOT NULL DEFAULT '', last_error TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS mail_drafts (
 thread_id TEXT NOT NULL REFERENCES mail_threads(id), user_id TEXT NOT NULL REFERENCES users(id),
 content TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(thread_id,user_id)
);
CREATE TABLE IF NOT EXISTS mail_replies (
 id TEXT PRIMARY KEY, thread_id TEXT NOT NULL REFERENCES mail_threads(id), user_id TEXT NOT NULL REFERENCES users(id),
 actor_name TEXT NOT NULL, message_id TEXT NOT NULL, to_address TEXT NOT NULL,
 content TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'sending', created_at TEXT NOT NULL,
 provider_message_id TEXT NOT NULL DEFAULT ''
);
CREATE TRIGGER IF NOT EXISTS mail_reply_reserved AFTER INSERT ON mail_replies
BEGIN
 UPDATE mail_threads SET version=version+1 WHERE id=NEW.thread_id;
END;
CREATE TABLE IF NOT EXISTS mail_notifications (
 id TEXT PRIMARY KEY, message_id TEXT NOT NULL REFERENCES mail_messages(id),
 channel TEXT NOT NULL CHECK(channel IN ('telegram','signal')), text TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt INTEGER NOT NULL DEFAULT 0, claim_token TEXT NOT NULL DEFAULT '',
 claimed_until INTEGER NOT NULL DEFAULT 0, last_error TEXT NOT NULL DEFAULT '',
 UNIQUE(message_id,channel)
);
