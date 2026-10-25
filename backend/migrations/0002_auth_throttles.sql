CREATE TABLE IF NOT EXISTS auth_throttles (
  throttle_key TEXT PRIMARY KEY,
  failure_count INTEGER NOT NULL CHECK (failure_count >= 0),
  window_started_at INTEGER NOT NULL,
  locked_until INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_throttles_locked_until
  ON auth_throttles(locked_until);
