-- DLI Brand Hub — D1 schema
-- One table, one row: the entire site state is stored as a JSON blob
-- under key = 'state'. Simple, and matches exactly what index.html
-- already exports/imports as a JSON file.

CREATE TABLE IF NOT EXISTS kv (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
