const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const Lecture = require('../models/Lecture');
const { parseTelegramLink, getDocument, streamDocument, isConfigured } = require('../services/telegramStream');

// @desc    Stream a lecture video stored in a private Telegram channel
// @route   GET /api/stream/:id?t=<stream token>
// @access  Stream token from /api/courses/lectures/:id/stream-token (a <video> tag cannot send headers)
const streamLecture = asyncHandler(async (req, res) => {
    let payload;
    try {
        payload = jwt.verify(req.query.t || '', process.env.JWT_SECRET);
    } catch {
        payload = null;
    }
    if (payload?.purpose !== 'stream' || payload.lecture !== req.params.id) {
        res.status(401);
        throw new Error('Invalid stream token');
    }
    if (!isConfigured()) {
        res.status(503);
        throw new Error('Telegram streaming is not configured');
    }

    const lecture = await Lecture.findById(req.params.id).select('resourceUrl');
    const link = parseTelegramLink(lecture?.resourceUrl);
    const doc = link && await getDocument(link.channelId, link.messageId);
    if (!doc) {
        res.status(404);
        throw new Error('Video not found');
    }

    try {
        await streamDocument(doc, req, res);
    } catch (err) {
        if (!res.headersSent) throw err;
        console.error('[stream]', err.message);
        res.destroy();
    }
});

module.exports = { streamLecture };
