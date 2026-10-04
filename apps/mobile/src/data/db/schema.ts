/** Append-only migration ladder keyed on PRAGMA user_version. Each entry runs once, in order, inside an
 *  exclusive transaction. New schema work = push another migration; never edit a shipped entry. */
export const MIGRATIONS: string[] = [
  `
  CREATE TABLE location_fix_queue (
    seq INTEGER PRIMARY KEY,
    ts TEXT NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    accuracy_m REAL,
    altitude_m REAL,
    heading_deg REAL,
    speed_mps REAL,
    activity TEXT NOT NULL DEFAULT 'Unknown',
    provider TEXT NOT NULL DEFAULT 'Unknown',
    battery_pct INTEGER,
    is_moving INTEGER NOT NULL DEFAULT 0,
    is_mock INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TEXT
  );
  CREATE INDEX idx_location_queue_due ON location_fix_queue (next_attempt_at, seq);
  `,
  `
  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `,
];
