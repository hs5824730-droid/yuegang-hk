-- Buying, selling and property-service intake. Rental records and their sync stay unchanged.
CREATE TABLE IF NOT EXISTS customer_registrations (
 id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL,
 data TEXT NOT NULL, category TEXT NOT NULL CHECK(category IN ('buying','selling','advisory')),
 city TEXT, related_lead_id TEXT REFERENCES leads(id), assigned_to TEXT REFERENCES users(id),
 status TEXT NOT NULL DEFAULT 'new', follow_up TEXT NOT NULL DEFAULT '', next_follow_up TEXT NOT NULL DEFAULT '',
 version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS customer_registration_city_date ON customer_registrations(city,created_at);
CREATE INDEX IF NOT EXISTS customer_registration_lead ON customer_registrations(related_lead_id);
