-- Future website registrations only; Google Sheets remains their read-only mirror.
CREATE TABLE IF NOT EXISTS registration_notification_settings (
 id INTEGER PRIMARY KEY CHECK(id=1), enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1))
);
INSERT OR IGNORE INTO registration_notification_settings(id,enabled) VALUES(1,0);
CREATE TABLE IF NOT EXISTS registration_notifications (
 id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
 source TEXT NOT NULL DEFAULT 'registration' CHECK(source='registration'), source_id TEXT NOT NULL,
 source_type TEXT NOT NULL CHECK(source_type IN ('rental','customer')),
 data TEXT NOT NULL, city TEXT, created_at TEXT NOT NULL,
 recipient TEXT NOT NULL DEFAULT '' CHECK(recipient IN ('','江承裕','江牧','江鹏')),
 selected_at TEXT, selected_by TEXT NOT NULL DEFAULT '',
 telegram_message_id INTEGER, telegram_text TEXT NOT NULL DEFAULT '',
 telegram_dirty INTEGER NOT NULL DEFAULT 0, telegram_next_attempt INTEGER NOT NULL DEFAULT 0,
 tg_status TEXT NOT NULL DEFAULT 'pending',tg_attempts INTEGER NOT NULL DEFAULT 0,
 tg_next_attempt INTEGER NOT NULL DEFAULT 0,tg_claim TEXT NOT NULL DEFAULT '',tg_claimed_until INTEGER NOT NULL DEFAULT 0,
 tg_error TEXT NOT NULL DEFAULT '',tg_sent_at TEXT,
 signal_status TEXT NOT NULL DEFAULT 'pending',signal_attempts INTEGER NOT NULL DEFAULT 0,
 signal_next_attempt INTEGER NOT NULL DEFAULT 0,signal_claim TEXT NOT NULL DEFAULT '',signal_claimed_until INTEGER NOT NULL DEFAULT 0,
 signal_error TEXT NOT NULL DEFAULT '',signal_receipt INTEGER,signal_sent_at TEXT,
 UNIQUE(source,source_id)
);
CREATE TRIGGER IF NOT EXISTS rental_registration_notification AFTER INSERT ON rental_registrations
WHEN (SELECT enabled FROM registration_notification_settings WHERE id=1)=1
BEGIN
 INSERT INTO registration_notifications(source_id,source_type,data,city,created_at) VALUES(NEW.id,'rental',NEW.data,NEW.city,NEW.created_at);
END;
CREATE TRIGGER IF NOT EXISTS customer_registration_notification AFTER INSERT ON customer_registrations
WHEN (SELECT enabled FROM registration_notification_settings WHERE id=1)=1
BEGIN
 INSERT INTO registration_notifications(source_id,source_type,data,city,created_at) VALUES(NEW.id,'customer',NEW.data,NEW.city,NEW.created_at);
END;
