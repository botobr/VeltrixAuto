const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const ejs = require('ejs');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const autoRoutes = require('./routes/autoRoutes');
const userRoutes = require('./routes/userRoutes');
const dbConnection = require('./utils/dbConnect.js');

const PORT = process.env.PORT || 3600;

const app = express();

app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(session({
    secret: process.env.SESSION_SECRET || 'veltrix-dev-session-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
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

app.use('/api/auth', authRoutes);
app.use('/api', autoRoutes);
app.use('/api', userRoutes);

dbConnection()
    .then(() => {
        console.log('Sikeres adatbázis csatlakozás!');

        app.listen(PORT, () => {
            console.log(`http://localhost:${PORT}/api`);
        });
    })
    .catch((error) => {
        console.error(`Hiba: ${error.message}`);
    });
