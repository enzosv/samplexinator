import { tryCatch } from './try-catch.ts';
import { signup, login, verifyAuth } from './auth.ts';

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
		// const cache = caches.default;
		// const cached = await cache.match(url);
		// if (cached) {
		// 	return cached;
		// }

		if (!url.pathname.startsWith('/api/')) {
			return new Response('{"error":"404"}');
		}
		const data = await handleJSONRequest(request, env);

		const response = new Response(JSON.stringify(data));
		response.headers.set('Content-Type', 'application/json');
		response.headers.set('Cache-Control', 'max-age=300');
		if (url.pathname == '/api/places') {
			response.headers.set('Cache-Control', 'max-age=86400');
		}
		// ctx.waitUntil(cache.put(url, response.clone()));
		return response;
	},
} satisfies ExportedHandler<Env>;

async function handleJSONRequest(request: Request, env: Env) {
	const url = new URL(request.url);
	if (request.method == 'POST' && url.pathname == '/api/signup') {
		const { username, password } = await request.json();
		return signup(env.DB, username, password);
	}
	if (request.method == 'POST' && url.pathname == '/api/login') {
		const { username, password } = await request.json();
		return login(env.DB, username, password);
	}
	if (request.method == 'POST' && url.pathname == '/api/init_db') {
		const { data: _, error: err } = await tryCatch(initDB(env.DB));
		if (err) {
			throw err;
		}
		return { success: true };
	}
	if (request.method == 'POST' && url.pathname == '/api/quiz') {
		// save quiz

		// parse body
		const answers = (await request.json()) as Answer[];
		if (!Array.isArray(answers)) {
			return { error: 'Invalid request body - expected array of answers', status: 400 };
		}

		// auth
		const { data: auth, error: authError } = await tryCatch(verifyAuth(request));
		if (authError) {
			return authError;
		}

		const { data: quiz_id, error: err } = await tryCatch(saveQuiz(env.DB, auth.user_id, answers));
		if (err) {
			throw err;
		}
		return queryQuiz(env.DB, quiz_id, auth.user_id);
	}
	if (request.method == 'GET' && url.pathname.startsWith('/api/quiz/')) {
		const id = parseInt(url.pathname.split('/').pop() || '', 10);
		if (isNaN(id)) {
			return { error: 'Invalid quiz ID', status: 400 };
		}
		// auth
		const { data: auth, error: authError } = await tryCatch(verifyAuth(request));
		if (authError) {
			return authError;
		}
		return queryQuiz(env.DB, id, auth.user_id);
	}
	return { error: 404 };
}

function initDB(db: D1Database): Promise<D1Result<unknown>[]> {
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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL 
        );`);
	const quizzes_index = db.prepare(`CREATE INDEX IF NOT EXISTS quizzes_user_idx ON quizzes(user_id);`);

	const answers = db.prepare(`CREATE TABLE IF NOT EXISTS "answers" (
			quiz_id INTEGER NOT NULL REFERENCES quizzes(quiz_id) ON UPDATE CASCADE,
            question_id INTEGER NOT NULL,
			choice INTEGER NOT NULL
        );`);
	const answers_index = db.prepare(`CREATE INDEX IF NOT EXISTS answer_quiz_idx ON answers(quiz_id);`);

	const question_comment = db.prepare(`CREATE TABLE IF NOT EXISTS "question_comments" (
			question_comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id INTEGER NOT NULL,
			user_id INTEGER NOT NULL REFERENCES users(user_id) ON UPDATE CASCADE,
			comment TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        );`);
	const question_comment_index = db.prepare(`CREATE INDEX IF NOT EXISTS question_comment_idx ON question_comments(question_id);`);

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

async function queryQuiz(db: D1Database, quiz_id: number, user_id: number) {
	const quiz = await db.prepare(`SELECT quiz_id FROM quizzes WHERE user_id = ?`).bind(user_id).first();
	if (!quiz) {
		throw { error: 404 };
	}
	const answers = await db.prepare(`SELECT question_id, choice FROM answers WHERE quiz_id = ?;`).bind(quiz_id).all();
	if (answers.length < 1) {
		throw { error: 404 };
	}
	return answers.results;
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
	return result.quiz_id;
}
