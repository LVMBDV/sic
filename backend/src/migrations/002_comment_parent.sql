ALTER TABLE comments ADD COLUMN parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE;
CREATE INDEX idx_comments_parent ON comments(parent_id);
