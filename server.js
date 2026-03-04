import 'dotenv/config';
import express from 'express';
import { neon } from '@neondatabase/serverless';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const goog = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(express.json());

// ─── DB Init ──────────────────────────────────────────────────────────────
let sql = null;
let _dbError = null;

async function initDB() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const db = neon(process.env.DATABASE_URL);
  await db`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      google_id     VARCHAR(255) UNIQUE,
      email         VARCHAR(255) UNIQUE NOT NULL,
      name          VARCHAR(255),
      avatar        VARCHAR(1000),
      password_hash VARCHAR(255),
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      last_login    TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  sql = db;
  console.log('[db] schema ready');
}

// ─── DB Readiness (safe for serverless cold starts) ───────────────────────
const _dbReady = initDB().catch(err => {
  _dbError = err;
  console.error('[db] init error:', err.message);
});

// ─── Public config — no DB needed, must come before DB middleware ─────────
app.get('/api/config', (_req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null });
});

// Block API requests until DB is initialised
app.use('/api', async (_req, res, next) => {
  await _dbReady;
  if (_dbError) return res.status(503).json({ error: 'Database temporarily unavailable' });
  next();
});

// ─── Helpers ──────────────────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalid or expired' });
  }
}

function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, avatar: u.avatar };
}

// ─── Google OAuth ─────────────────────────────────────────────────────────
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    const ticket = await goog.verifyIdToken({
      idToken:  credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub: googleId, email, name, picture } = ticket.getPayload();

    const [user] = await sql`
      INSERT INTO users (google_id, email, name, avatar, last_login)
      VALUES (${googleId}, ${email}, ${name}, ${picture}, NOW())
      ON CONFLICT (google_id) DO UPDATE
        SET name = EXCLUDED.name, avatar = EXCLUDED.avatar, last_login = NOW()
      RETURNING id, email, name, avatar
    `;

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error('[auth/google]', err.message);
    res.status(400).json({ error: 'Google authentication failed' });
  }
});

// ─── Email / Password Login ───────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const [user] = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (!user || !user.password_hash)
      return res.status(400).json({ error: 'Invalid email or password' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok)
      return res.status(400).json({ error: 'Invalid email or password' });

    await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`;
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error('[auth/login]', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ─── Register ────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'All fields are required' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const hash = await bcrypt.hash(password, 10);
    const [user] = await sql`
      INSERT INTO users (name, email, password_hash)
      VALUES (${name}, ${email}, ${hash})
      RETURNING id, email, name, avatar
    `;
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    if (err.message?.includes('unique') || err.code === '23505')
      return res.status(400).json({ error: 'An account with this email already exists' });
    console.error('[auth/register]', err.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ─── Get current user ────────────────────────────────────────────────────
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const [user] = await sql`
      SELECT id, email, name, avatar FROM users WHERE id = ${req.user.id}
    `;
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ─── Static files + SPA fallback ─────────────────────────────────────────
app.use(express.static(__dirname));
app.get('*', (_req, res) => res.sendFile(join(__dirname, 'index.html')));

// ─── Export for Vercel serverless ─────────────────────────────────────────
export default app;

// ─── Local dev: start Express server ──────────────────────────────────────
if (!process.env.VERCEL) {
  _dbReady.then(() => app.listen(process.env.PORT || 3000, () =>
    console.log(`eSpark running → http://localhost:${process.env.PORT || 3000}`)
  )).catch(err => { console.error('DB init failed:', err); process.exit(1); });
}
