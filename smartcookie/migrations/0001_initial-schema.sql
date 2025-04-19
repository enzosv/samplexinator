-- Migration number: 0001 	 2025-04-19T03:11:47.735Z

CREATE TABLE IF NOT EXISTS "users" (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "quizzes" (
    quiz_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON UPDATE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL 
);
CREATE INDEX IF NOT EXISTS quizzes_user_idx ON quizzes(user_id);

CREATE TABLE IF NOT EXISTS "answers" (
    quiz_id INTEGER NOT NULL REFERENCES quizzes(quiz_id) ON UPDATE CASCADE,
    question_id INTEGER NOT NULL,
    choice INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS answer_quiz_idx ON answers(quiz_id);

CREATE TABLE IF NOT EXISTS "question_comments" (
    question_comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON UPDATE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS question_comment_idx ON question_comments(question_id);

CREATE TABLE IF NOT EXISTS migrations (
    id TEXT PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);