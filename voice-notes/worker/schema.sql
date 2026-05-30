CREATE TABLE IF NOT EXISTS notes (
  id           TEXT    PRIMARY KEY,
  created_at   TEXT    NOT NULL,
  transcript   TEXT,
  transcript_status TEXT NOT NULL DEFAULT 'done',
  transcript_error  TEXT,
  duration     INTEGER,
  audio_mime   TEXT
);
