-- Migration number: 0002 	 2025-04-19T03:12:14.567Z
CREATE TABLE IF NOT EXISTS "user_topics" (
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON UPDATE CASCADE,
    topic TEXT NOT NULL,
    count INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS topics_user_idx ON user_topics(user_id);
