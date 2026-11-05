const express = require('express');
const mongoose = require('mongoose');
const UserModel = require('../models/User');
const publicUser = require('../utils/userResponse');
const { adminRequired } = require('../middlewares/authMiddleware');

const { SZEREPKOROK } = UserModel;
const router = express.Router();

const EMAIL_MINTA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const hibaValasz = (res, error) => {
    if (error?.code === 11000) {
        return res.status(409).json({ error: 'Ezzel az email-címmel már létezik felhasználó.' });
    }
    return res.status(500).json({ error: `Hiba: ${error.message}` });
};

const ervenyesId = (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ error: 'Felhasználó nem található!' });
    }
    return next();
};

const utolsoAdmin = async (user) => user.statusz === 'admin'
    && (await UserModel.countDocuments({ statusz: 'admin' })) <= 1;

router.get('/felhasznalok', adminRequired, async (req, res) => {
    try {
        const felhasznalok = await UserModel.find().select('-jelszo -mentettKeresesek').sort({ statusz: 1, createdAt: -1 });
        return res.status(200).json({ felhasznalok: felhasznalok.map(publicUser) });
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

router.post('/new-user', adminRequired, async (req, res) => {
    try {
        const { nev, email, jelszo, statusz } = req.body || {};
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        if (typeof nev !== 'string' || !nev.trim() || !EMAIL_MINTA.test(normalizedEmail)
            || typeof jelszo !== 'string' || jelszo.length < 8 || !SZEREPKOROK.includes(statusz)) {
            return res.status(400).json({ error: 'A név, érvényes email, legalább 8 karakteres jelszó és szerepkör kötelező.' });
        }
        const newUser = new UserModel({ nev: nev.trim(), email: normalizedEmail, jelszo, statusz });
        await newUser.save();
        return res.status(201).json({ message: 'Felhasználó sikeresen létrehozva!', user: publicUser(newUser) });
    } catch (error) {
        hibaValasz(res, error);
    }
});

router.delete('/delete-user/:id', adminRequired, ervenyesId, async (req, res) => {
    try {
        if (req.params.id === req.session.userId) {
            return res.status(409).json({ error: 'A saját fiókodat a Fiókom oldalon törölheted.' });
        }
        const user = await UserModel.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Felhasználó nem található!' });
        }
        if (await utolsoAdmin(user)) {
            return res.status(409).json({ error: 'Az utolsó admin nem törölhető.' });
        }
        await user.deleteOne();
        return res.status(200).json({ message: 'Felhasználó sikeresen törölve!' });
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

router.put('/update-user/:id', adminRequired, ervenyesId, async (req, res) => {
    try {
        const { nev, email, jelszo, statusz } = req.body || {};
        const user = await UserModel.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Felhasználó nem található!' });
        }

        if (typeof nev !== 'string' || !nev.trim() || typeof email !== 'string' || !EMAIL_MINTA.test(email.trim().toLowerCase())
            || (jelszo && (typeof jelszo !== 'string' || jelszo.length < 8)) || !SZEREPKOROK.includes(statusz)) {
            return res.status(400).json({ error: 'A megadott felhasználói adatok nem megfelelőek.' });
        }
        if (statusz !== 'admin' && (await utolsoAdmin(user))) {
            return res.status(409).json({ error: 'Az utolsó admin szerepköre nem vehető el.' });
        }
        if (statusz !== 'admin' && req.params.id === req.session.userId) {
            return res.status(409).json({ error: 'A saját admin jogosultságodat nem veheted el.' });
        }

        user.nev = nev.trim();
        user.email = email.trim().toLowerCase();
        user.statusz = statusz;
        if (jelszo) {
            user.jelszo = jelszo;
        }
        const updatedUser = await user.save();
        return res.status(200).json({
            message: 'Felhasználó sikeresen frissítve!',
            user: publicUser(updatedUser),
        });
    } catch (error) {
        hibaValasz(res, error);
    }
});

module.exports = router;
