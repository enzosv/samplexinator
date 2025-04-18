import { Hono } from 'hono';
import bcrypt from 'bcryptjs';

// Assuming this Worker is bound to D1 as DB

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

// app.post('/login', async (c) => {
// 	const { username, password } = await c.req.json();

// 	if (!USERS[username] || USERS[username] !== password) {
// 		return c.text('Invalid credentials', 401);
// 	}

// 	const token = await sign({ username }, JWT_SECRET, { expiresIn: '1h' });
// 	return c.json({ token });
// });

// Middleware to protect routes
const requireAuth = async (c: any, next: () => Promise<void>) => {
	const authHeader = c.req.header('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return c.text('Unauthorized', 401);
	}

	const token = authHeader.slice(7);
	try {
		const payload = await verify(token, JWT_SECRET);
		c.set('user', payload);
		await next();
	} catch (e) {
		return c.text('Invalid or expired token', 401);
	}
};
