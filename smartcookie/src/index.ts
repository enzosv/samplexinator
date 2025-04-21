import { tryCatch } from './try-catch.ts';
import { signup, login, verifyAuth } from './auth.ts';
import { Answer, queryQuiz, saveQuiz } from './quiz.ts';

export interface Env {
	// If you set another name in the Wrangler config file for the value for 'binding',
	// replace "DB" with the variable name you defined.
	DB: D1Database;
	JWT_SECRET: string;
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
