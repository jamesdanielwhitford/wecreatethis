CREATE TABLE IF NOT EXISTS items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         INTEGER UNIQUE NOT NULL,
  media_url    TEXT    NOT NULL,
  media_type   TEXT    NOT NULL CHECK(media_type IN ('image','video')),
  media_mime   TEXT,
  r2_key       TEXT,
  captured_at  TEXT    NOT NULL,
  lat          REAL,
  lng          REAL,
  caption      TEXT,
  lang         TEXT    NOT NULL DEFAULT 'en',
  alt          TEXT    NOT NULL DEFAULT '',
  width        INTEGER,
  height       INTEGER,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS items_slug ON items(slug);
CREATE INDEX IF NOT EXISTS items_captured_at ON items(captured_at);
