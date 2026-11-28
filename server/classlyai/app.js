const express = require('express');
const { extname, join } = require('node:path');
const { createCoursesRouter } = require('./courses');
const { createLessonEditorRouter } = require('./lesson-editor');
const { createSessions } = require('./session');
const { createTutorRouter } = require('./tutor');

function createApp({ pool, origin, clientDirectory }) {
    const app = express();
    const sessions = createSessions(pool, { secure: origin.startsWith('https://') });

    app.disable('x-powered-by');
    app.use('/api', (req, res, next) => {
        res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('origin') !== origin) {
            return res.status(403).json({ message: 'Request origin is not allowed.' });
        }
        next();
    });
    app.use('/api', express.json({ limit: '32kb' }));

    app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
    app.post('/api/auth/login', sessions.limitLogin, sessions.login);
    app.post('/api/auth/logout', sessions.logout);
    app.get('/api/auth/me', sessions.requireSession, (req, res) => res.json({ user: req.user }));
    app.use('/api/courses', sessions.requireSession, createCoursesRouter(pool), createLessonEditorRouter(pool), createTutorRouter(pool));

    app.use('/api', (_req, res) => res.status(404).json({ message: 'Route not found.' }));
    if (clientDirectory) {
        app.use(express.static(clientDirectory, { index: false }));
        app.get('/{*path}', (req, res, next) => {
            if (extname(req.path) || !req.accepts('html')) return next();
            res.sendFile(join(clientDirectory, 'index.html'));
        });
    }

    app.use((_req, res) => res.status(404).json({ message: 'Route not found.' }));
    app.use((error, _req, res, next) => {
        if (res.headersSent) return next(error);
        const messages = { 400: 'Invalid request.', 413: 'Request body is too large.', 415: 'Unsupported request format.' };
        const message = messages[error.status];
        if (message) return res.status(error.status).json({ message });
        console.error('ClasslyAI request failed.', error.code ?? error.name);
        res.status(500).json({ message: 'The request could not be completed.' });
    });

    return app;
}

module.exports = { createApp };
