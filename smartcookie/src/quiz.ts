import { tryCatch } from './try-catch.ts';

export interface Answer {
	question_id: number;
	choice: number;
}

export async function queryQuiz(db: D1Database, quiz_id: number, user_id: number) {
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

export async function saveQuiz(db: D1Database, user_id: number, answers: Answer[]): Promise<number> {
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
