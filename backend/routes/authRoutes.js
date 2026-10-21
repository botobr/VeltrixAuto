const express = require('express');
const UserModel = require('../models/User');
const publicUser = require('../utils/userResponse');
const { authRequired } = require('../middlewares/authMiddleware');

const router = express.Router();
const loginProbal = new Map();

const loginLimit = (req, res, next) => {
    const ip = req.ip;
    const probalkozas = loginProbal.get(ip);
    if (probalkozas && probalkozas.letiltvaEddig > Date.now()) {
        const masodperc = Math.ceil((probalkozas.letiltvaEddig - Date.now()) / 1000);
        return res.status(429).json({ error: `Túl sok próbálkozás. Próbáld újra ${masodperc} másodperc múlva.` });
    }
    next();
};

const sikertelenLogin = (ip) => {
    const probalkozas = loginProbal.get(ip) || { db: 0 };
    probalkozas.db += 1;
    if (probalkozas.db >= 5) {
        probalkozas.letiltvaEddig = Date.now() + 15 * 60 * 1000;
    }
    loginProbal.set(ip, probalkozas);
};

router.post('/login', loginLimit, async (req, res) => {
    try {
        const { email, jelszo } = req.body;
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        if (!normalizedEmail || typeof jelszo !== 'string' || !jelszo) {
            return res.status(400).json({ error: 'Email és jelszó megadása kötelező.' });
        }
        const user = await UserModel.findOne({ email: normalizedEmail });

        if (!user || !(await user.comparePassword(jelszo))) {
            sikertelenLogin(req.ip);
            return res.status(401).json({ error: 'Hibás email vagy jelszó!' });
        }

        loginProbal.delete(req.ip);

        req.session.regenerate((error) => {
            if (error) {
                return res.status(500).json({ error: `Hiba: ${error.message}` });
            }

            req.session.userId = user._id.toString();
            req.session.statusz = user.statusz;
            return res.status(200).json({
                message: 'Sikeres bejelentkezés!',
                user: publicUser(user),
            });
        });
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

router.get('/me', authRequired, async (req, res) => {
    try {
        const user = await UserModel.findById(req.session.userId).select('-jelszo');
        if (!user) {
            return res.status(404).json({ error: 'Felhasználó nem található!' });
        }
        return res.status(200).json({ user: publicUser(user) });
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

router.post('/logout', authRequired, (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({ error: `Hiba: ${error.message}` });
        }

        res.clearCookie('connect.sid');
        return res.status(200).json({ message: 'Sikeres kijelentkezés!' });
    });
});

module.exports = router;
