PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'admin')),
  name TEXT NOT NULL,
  student_id TEXT,
  faculty TEXT,
  station_id TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  total_kg REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS stations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  capacity_kg REAL NOT NULL CHECK (capacity_kg > 0),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  station_id TEXT NOT NULL REFERENCES stations(id),
  admin_id TEXT NOT NULL REFERENCES users(id),
  student_id TEXT REFERENCES users(id),
  items_json TEXT NOT NULL,
  total_quantity INTEGER NOT NULL CHECK (total_quantity > 0),
  weight_kg REAL NOT NULL CHECK (weight_kg > 0),
  points INTEGER NOT NULL CHECK (points >= 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'expired', 'cancelled')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  confirmed_at INTEGER,
  cancelled_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_transactions_station_created
  ON transactions(station_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_student_confirmed
  ON transactions(student_id, confirmed_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_pending_expiry
  ON transactions(status, expires_at);

CREATE TABLE IF NOT EXISTS point_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  transaction_id TEXT NOT NULL UNIQUE REFERENCES transactions(id),
  points INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS station_transfers (
  id TEXT PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id),
  admin_id TEXT NOT NULL REFERENCES users(id),
  weight_kg REAL NOT NULL CHECK (weight_kg > 0),
  created_at INTEGER NOT NULL,
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_station_transfers_station_created
  ON station_transfers(station_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata_json TEXT,
  created_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO stations (
  id, name, address, latitude, longitude, capacity_kg, created_at
) VALUES (
  'innovation-center',
  'Trung tâm Đổi mới Sáng tạo - Đại học Bách khoa Hà Nội',
  'Tòa nhà C7, Đại học Bách khoa Hà Nội',
  21.0068,
  105.8431,
  25,
  unixepoch() * 1000
);
