CREATE TABLE IF NOT EXISTS demo_runs (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL CHECK(version >= 0),
  payload TEXT NOT NULL
);

