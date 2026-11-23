const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');

const authRoutes = require('./routes/authRoutes');
const autoRoutes = require('./routes/autoRoutes');
const felhasznaloRoutes = require('./routes/felhasznaloRoutes');
const erdeklodesRoutes = require('./routes/erdeklodesRoutes');
const fiokRoutes = require('./routes/fiokRoutes');
const telephelyRoutes = require('./routes/telephelyRoutes');
const adminRoutes = require('./routes/adminRoutes');
const seoRoutes = require('./routes/seoRoutes');
const alkatreszRoutes = require('./routes/alkatreszRoutes');
const rendelesRoutes = require('./routes/rendelesRoutes');

const { fizetesWebhook } = rendelesRoutes;

// Hibakezelő: ha valahol hiba történik, ide jut (az Express 5 az async hibákat is ide küldi).
const hibakezelo = (error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }
    if (error.type === 'entity.too.large') {
        return res.status(413).json({ hiba: 'A küldött adat túl nagy (a kép legfeljebb 4 MB lehet).' });
    }
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ hiba: 'Érvénytelen kérés.' });
    }
    if (error.name === 'ValidationError') {
        // a mongoose validációs hibák közül az elsőt küldjük vissza
        const elsoHiba = Object.values(error.errors)[0];
        let uzenet = 'Érvénytelen adatok.';
        if (elsoHiba && elsoHiba.message) {
            uzenet = elsoHiba.message;
        }
        return res.status(400).json({ hiba: uzenet });
    }
    if (error.name === 'CastError') {
        return res.status(400).json({ hiba: 'Érvénytelen azonosító vagy érték.' });
    }
    if (error.code === 11000) {
        return res.status(409).json({ hiba: 'Ez az adat már létezik.' });
    }
    console.error(error);
    return res.status(500).json({ hiba: 'Hiba: ' + error.message });
};

const appLetrehozasa = ({ munkamenetTarolo } = {}) => {
    const app = express();

    if (process.env.TRUST_PROXY) {
        app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
    }

    // Biztonsági fejlécek (helmet). Az API csak JSON-t küld, ezért a CSP nagyon szigorú,
    // és iframe-be sem lehet betenni. A megosztás oldalnak (seoRoutes) saját CSP-je van.
    app.use(helmet({
        contentSecurityPolicy: {
            useDefaults: false,
            directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"] },
        },
        // a frontend másik porton fut, ezért same-site kell
        crossOriginResourcePolicy: { policy: 'same-site' },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        frameguard: { action: 'deny' },
    }));

    // A Stripe webhook a JSON feldolgozás előtt kell, mert az aláíráshoz a nyers törzs kell!
    app.post('/api/fizetes/webhook', express.raw({ type: 'application/json', limit: '1mb' }), fizetesWebhook);
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
        store: munkamenetTarolo || MongoStore.create({
            mongoUrl: process.env.MONGO_DB,
            collectionName: 'sessions',
        }),
        cookie: {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 1000 * 60 * 60 * 8, // 8 óra
        },
    }));

    app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));
    app.use('/api/auth', authRoutes);
    app.use('/api', autoRoutes);
    app.use('/api', felhasznaloRoutes);
    app.use('/api', erdeklodesRoutes);
    app.use('/api', fiokRoutes);
    app.use('/api', telephelyRoutes);
    app.use('/api', alkatreszRoutes);
    app.use('/api', rendelesRoutes);
    app.use('/api', adminRoutes);
    // ha egyik útvonal sem illett rá
    app.use('/api', (req, res) => {
        res.status(404).json({ hiba: 'Nem létező végpont.' });
    });
    app.use('/', seoRoutes);
    app.use(hibakezelo);

    return app;
};

module.exports = appLetrehozasa;
