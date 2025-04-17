import { tryCatch } from './try-catch.ts';

export interface Env {
	// If you set another name in the Wrangler config file for the value for 'binding',
	// replace "DB" with the variable name you defined.
	DB: D1Database;
	API_KEY: string;
	ASSETS: string;
}

interface Answer {
	question_id: number;
	choice: number;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const cache = caches.default;
		const cached = await cache.match(url);
		if (cached) {
			return cached;
		}

		if (!url.pathname.startsWith('/api/')) {
			return new Response('{"error":"404"}');
		}

		const data = await handleJSONRequest(url, env);

		const response = new Response(JSON.stringify(data));
		response.headers.set('Content-Type', 'application/json');
		response.headers.set('Cache-Control', 'max-age=300');
		if (url.pathname == '/api/places') {
			response.headers.set('Cache-Control', 'max-age=86400');
		}
		ctx.waitUntil(cache.put(url, response.clone()));
		return response;
	},
} satisfies ExportedHandler<Env>;

async function handleJSONRequest(url: URL, env: Env) {
	if (url.pathname == '/api/init_db') {
		const { error: err } = await tryCatch(initDB(env.DB));
		if (err) {
			throw err;
		}
		return { success: true };
	}
	if (url.pathname == '/api/quiz') {
		const { data: quiz_id, error: err } = await tryCatch(saveQuiz(env.DB, 1, []));
		if (err) {
			throw err;
		}
		return { quiz_id: quiz_id };
	}

	return { error: 404 };
}

async function initDB(db: D1Database): Promise<D1Result<unknown>[]> {
	const users = db.prepare(`CREATE TABLE IF NOT EXISTS "users" (
		user_id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT NOT NULL UNIQUE,
		email TEXT UNIQUE,
		password_hash TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`);
	const quizzes = db.prepare(`CREATE TABLE IF NOT EXISTS "quizzes" (
            quiz_id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL REFERENCES users(user_id) ON UPDATE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, 
        );`);
	const quizzes_index = db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS quizzes_user_idx ON quizzes(user_id);`);

	const answers = db.prepare(`CREATE TABLE IF NOT EXISTS "answers" (
			quiz_id INTEGER NOT NULL REFERENCES quizzes(quiz_id) ON UPDATE CASCADE,
            question_id INTEGER NOT NULL,
			choice INTEGER NOT NULL
        );`);
	const answers_index = db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS answer_quiz_idx ON answers(quiz_id);`);

	const question_comment = db.prepare(`CREATE TABLE IF NOT EXISTS "question_comments" (
			question_comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id INTEGER NOT NULL,
			user_id INTEGER NOT NULL REFERENCES users(user_id) ON UPDATE CASCADE,
			comment TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        );`);
	const question_comment_index = db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS question_comment_idx ON rationales(question_id);`);

	return db.batch([
		db.prepare(`PRAGMA foreign_keys = 1;`),
		users,
		quizzes,
		quizzes_index,
		answers,
		answers_index,
		question_comment,
		question_comment_index,
	]);
}

async function saveQuiz(db: D1Database, user_id: number, answers: Answer[]): Promise<number> {
	const { data: quiz_id, error: err } = await tryCatch(saveQuizOnly(db, user_id));
	if (err) {
		throw err;
	}
	const { data: _, error: answers_err } = await tryCatch(saveAnswers(db, quiz_id, answers));
	if (answers_err) {
		throw answers_err;
	}
	return quiz_id;
}

function saveAnswers(db: D1Database, quiz_id: number, answers: Answer[]) {
	let query = 'INSERT INTO answers (quiz_id, question_id, choice) VALUES';
	const params = [];
	for (const answer of answers) {
		query += '(?, ?, ?)';
		params.push(quiz_id, answer.question_id, answer.choice);
	}
	return db
		.prepare(query)
		.bind(...params)
		.run();
}

async function saveQuizOnly(db: D1Database, user_id: number): Promise<number> {
	const result = await db
		.prepare(
			`INSERT INTO quizzes (user_id)
      VALUES (?)
      RETURNING quiz_id;`
		)
		.bind(user_id)
		.first<number>();
	if (!result) {
		throw 'invalid result';
	}
	return result;
}
