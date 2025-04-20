import bcrypt from 'bcryptjs';
import { sign, verify } from 'hono/jwt';

export async function signup(db: D1Database, username: string, password: string) {
	if (!username || !password) {
		// return c.text('Username and password are required.', 400);
		return { error: 400 };
	}

	// Check if username exists
	const existing = await db.prepare(`SELECT user_id FROM users WHERE username = ?`).bind(username).first();
	if (existing) {
		return { error: 409 };
		// return c.text('Username already taken.', 409);
	}

	// Hash password
	const passwordHash = await bcrypt.hash(password, 10);

	// Insert user
	await db.prepare(`INSERT INTO users (username, password_hash) VALUES (?, ?)`).bind(username, passwordHash).run();
	return { success: true };

	// return c.text('Signup successful 🎉');
}

export async function login(db: D1Database, jwt_secret: string, username: string, password: string) {
	if (!username || !password) {
		return { error: 400, message: 'Username and password are required.' };
	}

	// Find user
	const user = await db
		.prepare(
			`
        SELECT user_id, username, password_hash 
        FROM users 
        WHERE username = ?
    `
		)
		.bind(username)
		.first();

	if (!user) {
		return { error: 401, message: 'Invalid credentials' };
	}

	// Verify password
	const validPassword = await bcrypt.compare(password, user.password_hash);
	if (!validPassword) {
		return { error: 401, message: 'Invalid credentials' };
	}

	// Generate JWT token
	const token = await sign(
		{
			user_id: user.user_id,
			username: user.username,
		},
		jwt_secret
	);

	return {
		success: true,
		token: token,
	};
}

// Middleware to protect routes
export async function verifyAuth(request: Request, jwt_secret: string) {
	const authHeader = request.headers.get('authorization');

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		throw { message: 'Unauthorized', code: 401 };
	}

	const token = authHeader.slice(7);
	try {
		return verify(token, jwt_secret);
	} catch {
		throw { message: 'Invalid', error: 401 };
	}
}
