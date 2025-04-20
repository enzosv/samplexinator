import { tryCatch } from './try-catch.ts';
import { signup, login, verifyAuth } from './auth.ts';

export interface Env {
	// If you set another name in the Wrangler config file for the value for 'binding',
	// replace "DB" with the variable name you defined.
	DB: D1Database;
	JWT_SECRET: string;
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
		return login(env.DB, env.JWT_SECRET, username, password);
	}
	if (request.method == 'POST' && url.pathname == '/api/quiz') {
		// save quiz

		// parse body
		const answers = (await request.json()) as Answer[];
		if (!Array.isArray(answers)) {
			return { error: 'Invalid request body - expected array of answers', status: 400 };
		}

		// auth
		const { data: auth, error: authError } = await tryCatch(verifyAuth(request, env.JWT_SECRET));
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
