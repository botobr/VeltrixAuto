const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');

const authRoutes = require('./routes/authRoutes');
const autoRoutes = require('./routes/autoRoutes');
const userRoutes = require('./routes/userRoutes');
const erdeklodesRoutes = require('./routes/erdeklodesRoutes');
const fiokRoutes = require('./routes/fiokRoutes');
const telephelyRoutes = require('./routes/telephelyRoutes');
const adminRoutes = require('./routes/adminRoutes');
const seoRoutes = require('./routes/seoRoutes');

/** Egységes JSON-hibaválasz; az Express 5 az async útvonalak hibáit ide továbbítja. */
const hibakezelo = (error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === 'entity.too.large') {
        return res.status(413).json({ error: 'A küldött adat túl nagy (a kép legfeljebb 4 MB lehet).' });
    }
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Érvénytelen kérés.' });
    }
    if (error.name === 'ValidationError') {
        return res.status(400).json({ error: Object.values(error.errors)[0]?.message || 'Érvénytelen adatok.' });
    }
    if (error.name === 'CastError') {
        return res.status(400).json({ error: 'Érvénytelen azonosító vagy érték.' });
    }
    if (error.code === 11000) {
        return res.status(409).json({ error: 'Ez az adat már létezik.' });
    }
    console.error(error);
    return res.status(500).json({ error: `Hiba: ${error.message}` });
};

const createApp = ({ sessionStore } = {}) => {
    const app = express();

    if (process.env.TRUST_PROXY) {
        app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
    }

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
    app.use('/api', erdeklodesRoutes);
    app.use('/api', fiokRoutes);
    app.use('/api', telephelyRoutes);
    app.use('/api', adminRoutes);
    app.use('/api', (req, res) => res.status(404).json({ error: 'Nem létező végpont.' }));
    app.use('/', seoRoutes);
    app.use(hibakezelo);

    return app;
};

module.exports = createApp;
