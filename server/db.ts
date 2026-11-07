import { readFileSync } from 'node:fs';
import { receptionMigration } from './reception.js';
import { receptionDefaultsMigration } from './reception-defaults.js';
import { receptionCityMigration } from './reception-city.js';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

if (config.dbPath !== ':memory:') mkdirSync(path.dirname(config.dbPath), { recursive: true });
export const db = new DatabaseSync(config.dbPath);
db.exec(`
  PRAGMA journal_mode=WAL;
  PRAGMA foreign_keys=ON;
  PRAGMA busy_timeout=5000;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL, role TEXT NOT NULL, city TEXT, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY, city TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS owners (
    id TEXT PRIMARY KEY, contact_key TEXT NOT NULL UNIQUE, contact TEXT NOT NULL, name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL,
    owner_id TEXT NOT NULL REFERENCES owners(id), city TEXT NOT NULL, service TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new', assigned_to TEXT REFERENCES users(id),
    data TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', next_follow_up TEXT NOT NULL DEFAULT '',
    commission_ordinal INTEGER, moving_status TEXT NOT NULL DEFAULT 'none', created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY, lead_id TEXT NOT NULL UNIQUE REFERENCES leads(id),
    status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt INTEGER NOT NULL DEFAULT 0, last_error TEXT NOT NULL DEFAULT '', sent_at TEXT
  );
  CREATE TABLE IF NOT EXISTS audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, action TEXT NOT NULL,
    resource_id TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS lead_city ON leads(city);
  CREATE INDEX IF NOT EXISTS lead_owner ON leads(owner_id);
  CREATE INDEX IF NOT EXISTS notification_pending ON notifications(status,next_attempt);
  CREATE INDEX IF NOT EXISTS session_expiry ON sessions(expires_at);
`);

db.exec(receptionMigration);

// Backwards-compatible migration for existing SQLite databases.
transaction(() => {
  if (!(db.prepare('PRAGMA table_info(reception_channel_assignments)').all() as { name: string }[]).some(column => column.name === 'routing_version')) db.exec(receptionCityMigration);
  if (!(db.prepare('PRAGMA table_info(notifications)').all() as { name: string }[]).some(column => column.name === 'claimed_until')) {
    db.exec('ALTER TABLE notifications ADD COLUMN claimed_until INTEGER NOT NULL DEFAULT 0');
  }
  if (!(db.prepare('PRAGMA table_info(notifications)').all() as { name:string }[]).some(c=>c.name==='claim_token')) db.exec("ALTER TABLE notifications ADD COLUMN claim_token TEXT NOT NULL DEFAULT ''");
  if (!(db.prepare('PRAGMA table_info(notifications)').all() as { name:string }[]).some(c=>c.name==='sync_enabled')) db.exec(readFileSync(new URL('../migrations/0005_notification_routing_sync.sql',import.meta.url),'utf8'));
  db.exec('CREATE INDEX IF NOT EXISTS reception_assignment_lead ON reception_channel_assignments(lead_id,channel,created_at DESC,id)');
  db.exec(readFileSync(new URL('../migrations/0007_signal_outbox.sql',import.meta.url),'utf8'));
  db.exec(receptionDefaultsMigration);
  const prefillMigration=readFileSync(new URL('../migrations/0009_whatsapp_prefill.sql',import.meta.url),'utf8');
  if (!(db.prepare('PRAGMA table_info(reception_channel_assignments)').all() as {name:string}[]).some(c=>c.name==='whatsapp_text')) db.exec(prefillMigration);
  else db.exec(prefillMigration.slice(prefillMigration.indexOf('DROP TRIGGER')));
  if (!(db.prepare('PRAGMA table_info(reception_channel_assignments)').all() as {name:string}[]).some(c=>c.name==='direct_context')) db.exec(readFileSync(new URL('../migrations/0010_direct_contact_notifications.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('../migrations/0011_direct_phone_events.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('../migrations/0012_notification_recipients.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('../migrations/0013_enterprise_mail.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('../migrations/0014_user_login_aliases.sql',import.meta.url),'utf8'));
  if (!(db.prepare('PRAGMA table_info(mail_notifications)').all() as {name:string}[]).some(c=>c.name==='receipt')) db.exec(readFileSync(new URL('../migrations/0015_mail_notification_receipts.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('../migrations/0016_callback_recipient_snapshot.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('../migrations/0017_rental_registration.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('../migrations/0018_registration_google_oauth.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('../migrations/0019_customer_registrations.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('../migrations/0020_customer_registration_sync.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('../migrations/0021_manual_lead_dispatch.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('../migrations/0022_registration_notifications.sql',import.meta.url),'utf8'));
  const dispatchOwnerMigration=readFileSync(new URL('../migrations/0023_dispatch_backend_owner.sql',import.meta.url),'utf8');
  db.exec((db.prepare('PRAGMA table_info(rental_registrations)').all() as {name:string}[]).some(c=>c.name==='assigned_to')?dispatchOwnerMigration.slice(dispatchOwnerMigration.indexOf('CREATE TRIGGER')):dispatchOwnerMigration);
});

export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try { const value = fn(); db.exec('COMMIT'); return value; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
export function audit(userId: string, action: string, resourceId: string) {
  db.prepare('INSERT INTO audit(user_id,action,resource_id,created_at) VALUES(?,?,?,?)')
    .run(userId, action, resourceId, new Date().toISOString());
}
