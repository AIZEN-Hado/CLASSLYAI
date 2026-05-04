const express = require('express');
const dotenv = require('dotenv').config();
const { errorHandler } = require('./middleware/errorMiddleware');
const activityLogger = require('./middleware/activityLogger');
const { apiLimiter } = require('./middleware/rateLimiter');
const connectDB = require('./config/db');
const cors = require('cors');
const https = require('https');
const http = require('http');

const port = process.env.PORT || 5000;

connectDB();

const app = express();

// Trust proxy (required for Render, rate-limiting, and correct client IP)
app.set('trust proxy', 1);

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    exposedHeaders: ['Content-Disposition']
}));

// Stripe webhook needs raw body - must be before express.json()
app.post('/api/purchase/webhook',
    express.raw({ type: 'application/json' }),
    require('./controllers/purchaseController').handleStripeWebhook
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check route (no auth, no rate limit)
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Activity Logger - Tracks non-GET requests
app.use(activityLogger);

// Existing routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/broadcasts', require('./routes/broadcastRoutes'));
app.use('/api/activities', require('./routes/activityRoutes'));
app.use('/api/quizzes', require('./routes/quizRoutes'));

// Marketplace routes
app.use('/api/marketplace', require('./routes/marketplaceRoutes'));
app.use('/api/purchase', require('./routes/purchaseRoutes'));
app.use('/api/instructor', require('./routes/instructorRoutes'));
app.use('/api/coupons', require('./routes/couponRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));

// Resource routes
app.use('/api/resources', require('./routes/resourceRoutes'));

// AI generation routes
app.use('/api/ai', require('./routes/aiRoutes'));

// Student AI chatbot routes
app.use('/api/student-ai', require('./routes/studentAiRoutes'));

// Answer Checker routes
app.use('/api/evaluate', require('./routes/evaluateRoutes'));

// Admin routes
app.use('/api/admin', require('./routes/adminRoutes'));

// Error handler middleware
app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }
    const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

app.listen(port, () => {
        console.log(`Server started on port ${port}`);
    }
});
