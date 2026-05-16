CREATE TABLE IF NOT EXISTS items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  media_url    TEXT    NOT NULL,
  media_type   TEXT    NOT NULL CHECK(media_type IN ('image','video')),
  media_mime   TEXT,
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
