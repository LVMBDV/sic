CREATE TABLE users (
    id              TEXT PRIMARY KEY,
    provider        TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    display_name    TEXT NOT NULL,
    avatar_url      TEXT,
    created_at      INTEGER NOT NULL,
    UNIQUE (provider, provider_user_id)
);

CREATE TABLE threads (
    id         TEXT PRIMARY KEY,
    slug       TEXT NOT NULL UNIQUE,
    title      TEXT,
    url        TEXT,
    created_at INTEGER NOT NULL
);

CREATE TABLE comments (
    id         TEXT PRIMARY KEY,
    thread_id  TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body       TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted    INTEGER NOT NULL DEFAULT 0,
    hidden     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_comments_thread ON comments(thread_id, created_at);
CREATE INDEX idx_comments_user ON comments(user_id);

CREATE TABLE reactions (
    comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (comment_id, user_id, kind)
);

CREATE INDEX idx_reactions_comment ON reactions(comment_id, kind);

CREATE TABLE oauth_state (
    state          TEXT PRIMARY KEY,
    provider       TEXT NOT NULL,
    pkce_verifier  TEXT NOT NULL,
    return_to      TEXT,
    created_at     INTEGER NOT NULL
);
