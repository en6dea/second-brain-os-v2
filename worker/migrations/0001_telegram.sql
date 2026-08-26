PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS telegram_links (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL UNIQUE,
  chat_id TEXT UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  linked_at TEXT
);

CREATE TABLE IF NOT EXISTS telegram_captures (
  id TEXT PRIMARY KEY,
  link_id TEXT NOT NULL,
  source_update_id TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('task', 'note')),
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (link_id) REFERENCES telegram_links(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_telegram_captures_link
  ON telegram_captures(link_id, created_at);
