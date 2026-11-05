const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');

const authRoutes = require('./routes/authRoutes');
const autoRoutes = require('./routes/autoRoutes');
const userRoutes = require('./routes/userRoutes');

const createApp = ({ sessionStore } = {}) => {
    const app = express();

    app.use(express.json({ limit: '6mb' }));
    app.use(express.urlencoded({ extended: true }));
    app.use(cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
    }));
    app.use(session({
        secret: process.env.SESSION_SECRET || 'veltrix-dev-session-secret',
        resave: false,
        saveUninitialized: false,
        store: sessionStore || MongoStore.create({
            mongoUrl: process.env.MONGO_DB,
            collectionName: 'sessions',
        }),
        cookie: {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 1000 * 60 * 60 * 8,
        },
    }));

    app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));
    app.use('/api/auth', authRoutes);
    app.use('/api', autoRoutes);
    app.use('/api', userRoutes);

    return app;
};

module.exports = createApp;