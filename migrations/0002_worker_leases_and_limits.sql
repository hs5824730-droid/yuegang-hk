-- Fence notification acknowledgements from a previous expired lease.
ALTER TABLE notifications ADD COLUMN claim_token TEXT NOT NULL DEFAULT '';
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX rate_limit_expiry ON rate_limits(expires_at);
