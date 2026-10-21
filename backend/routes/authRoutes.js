const express = require('express');
const UserModel = require('../models/User');
const publicUser = require('../utils/userResponse');
const { authRequired } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/login', async (req, res) => {
    try {
        const { email, jelszo } = req.body;
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        const user = await UserModel.findOne({ email: normalizedEmail });

        if (!user || !(await user.comparePassword(jelszo))) {
            return res.status(401).json({ error: 'Hibás email vagy jelszó!' });
        }

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
