CREATE TABLE IF NOT EXISTS nodes (
  id         TEXT    PRIMARY KEY,
  parent_id  TEXT,
  type       TEXT    NOT NULL CHECK(type IN ('folder','note')),
  title      TEXT    NOT NULL DEFAULT '',
  body       TEXT,
  source     TEXT    CHECK(source IN ('typed','voice','ai-chat')),
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nodes_parent  ON nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_nodes_updated ON nodes(updated_at);
