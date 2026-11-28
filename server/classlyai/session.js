const { createHash, randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');
const { rateLimit } = require('express-rate-limit');

const sessionSeconds = 8 * 60 * 60;
// Used to perform the same bcrypt work when an account is absent.
const dummyPasswordHash = '$2b$12$QkpJq/Ux/x39GrZerOHCJeaAqZ/8UIk7VlELat0LpbASLN539quEy';

function hashToken(token) {
    return createHash('sha256').update(token).digest('hex');
}

function createSessions(pool, { secure }) {
    const cookieName = secure ? '__Host-classlyai-session' : 'classlyai-session';
    const cookieOptions = { httpOnly: true, secure, sameSite: 'lax', path: '/' };

    function readTokenHash(req) {
        const prefix = `${cookieName}=`;
        const cookie = (req.get('cookie') || '').split(';').map(value => value.trim()).find(value => value.startsWith(prefix));
        const token = cookie?.slice(prefix.length);
        return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? hashToken(token) : null;
    }

    const limitLogin = rateLimit({
        windowMs: 10 * 60 * 1000,
        limit: 12,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { message: 'Too many sign-in attempts. Try again later.' }
    });

    async function login(req, res) {
        if (!req.is('application/json')) {
            return res.status(415).json({ message: 'Send credentials as JSON.' });
        }

        const { email, password } = req.body ?? {};
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        const validEmail = normalizedEmail.length <= 254 && !normalizedEmail.includes('\0') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
        if (!validEmail || typeof password !== 'string' || !password || bcrypt.truncates(password)) {
            return res.status(400).json({ message: 'Enter a valid email and password.' });
        }

        const { rows: [account] } = await pool.query(`
            SELECT id, email, display_name AS "displayName", password_hash
            FROM classlyai.users
            WHERE email = $1
        `, [normalizedEmail]);

        const matches = await bcrypt.compare(password, account?.password_hash ?? dummyPasswordHash);
        if (!account || !matches) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        res.json({ user: await startSession(req, res, account) });
    }

    async function startSession(req, res, account) {
        const token = randomBytes(32).toString('base64url');
        await pool.query(`
            WITH previous_session AS (
                UPDATE classlyai.sessions
                SET revoked_at = now()
                WHERE token_hash = $4 AND revoked_at IS NULL
            )
            INSERT INTO classlyai.sessions (token_hash, user_id, expires_at)
            VALUES ($1, $2, now() + $3::integer * interval '1 second')
        `, [hashToken(token), account.id, sessionSeconds, readTokenHash(req)]);

        res.cookie(cookieName, token, { ...cookieOptions, maxAge: sessionSeconds * 1000 });
        return { id: account.id, email: account.email, displayName: account.displayName };
    }

    const limitRegister = rateLimit({
        windowMs: 60 * 60 * 1000,
        limit: 10,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { message: 'Too many accounts were created from this address. Try again later.' }
    });

    async function register(req, res) {
        if (!req.is('application/json')) {
            return res.status(415).json({ message: 'Send the account details as JSON.' });
        }

        const { email, password, displayName } = req.body ?? {};
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        const name = typeof displayName === 'string' ? displayName.trim().replace(/\s+/g, ' ') : '';
        if (normalizedEmail.length > 254 || normalizedEmail.includes('\0') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return res.status(400).json({ message: 'Enter a valid email address.' });
        }
        if (!name || name.length > 80 || name.includes('\0')) {
            return res.status(400).json({ message: 'Enter your name, up to 80 characters.' });
        }
        if (typeof password !== 'string' || Array.from(password).length < 12 || bcrypt.truncates(password)) {
            return res.status(400).json({ message: 'Use a password of at least 12 characters and at most 72 bytes.' });
        }

        const { rows: [account] } = await pool.query(`
            INSERT INTO classlyai.users (email, display_name, password_hash)
            VALUES ($1, $2, $3)
            ON CONFLICT (email) DO NOTHING
            RETURNING id, email, display_name AS "displayName"
        `, [normalizedEmail, name, await bcrypt.hash(password, 12)]);
        if (!account) return res.status(409).json({ message: 'An account with that email already exists. Sign in instead.' });

        res.status(201).json({ user: await startSession(req, res, account) });
    }

    async function logout(req, res) {
        const tokenHash = readTokenHash(req);
        if (tokenHash) {
            await pool.query(`
                UPDATE classlyai.sessions
                SET revoked_at = now()
                WHERE token_hash = $1 AND revoked_at IS NULL
            `, [tokenHash]);
        }
        res.clearCookie(cookieName, cookieOptions);
        res.status(204).end();
    }

    async function requireSession(req, res, next) {
        const tokenHash = readTokenHash(req);
        if (!tokenHash) {
            return res.status(401).json({ message: 'Sign in to continue.' });
        }

        const { rows: [user] } = await pool.query(`
            SELECT account.id, account.email, account.display_name AS "displayName"
            FROM classlyai.sessions AS session
            JOIN classlyai.users AS account ON account.id = session.user_id
            WHERE session.token_hash = $1
                AND session.revoked_at IS NULL
                AND session.expires_at > now()
        `, [tokenHash]);

        if (!user) {
            return res.status(401).json({ message: 'Sign in to continue.' });
        }
        req.user = user;
        next();
    }

    return { login, logout, register, requireSession, limitLogin, limitRegister };
}

module.exports = { createSessions };
