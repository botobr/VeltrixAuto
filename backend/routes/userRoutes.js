const express = require('express');
const mongoose = require('mongoose');
const UserModel = require('../models/User');
const publicUser = require('../utils/userResponse');
const { adminRequired } = require('../middlewares/authMiddleware');

const router = express.Router();

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

router.get('/felhasznalok', adminRequired, async (req, res) => {
    try {
        const felhasznalok = await UserModel.find().select('-jelszo');
        return res.status(200).json({ felhasznalok });
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

router.post('/new-user', adminRequired, async (req, res) => {
    try {
        const { nev, email, jelszo, statusz } = req.body;
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;
        if (typeof nev !== 'string' || !nev.trim() || !normalizedEmail || typeof jelszo !== 'string' || jelszo.length < 6 || statusz !== 'admin') {
            return res.status(400).json({ error: 'A név, email, legalább 6 karakteres jelszó és admin státusz kötelező.' });
        }
        const newUser = new UserModel({ nev: nev.trim(), email: normalizedEmail, jelszo, statusz });
        await newUser.save();
        return res.status(201).json({ message: 'Felhasználó sikeresen létrehozva!' });
    } catch (error) {
        hibaValasz(res, error);
    }
});

router.delete('/delete-user/:id', adminRequired, ervenyesId, async (req, res) => {
    try {
        const deletedUser = await UserModel.findByIdAndDelete(req.params.id);
        if (!deletedUser) {
            return res.status(404).json({ error: 'Felhasználó nem található!' });
        }
        return res.status(200).json({ message: 'Felhasználó sikeresen törölve!' });
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

router.put('/update-user/:id', adminRequired, ervenyesId, async (req, res) => {
    try {
        const { nev, email, jelszo, statusz } = req.body;
        const user = await UserModel.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Felhasználó nem található!' });
        }

        if (typeof nev !== 'string' || !nev.trim() || typeof email !== 'string' || !email.trim()
            || (jelszo && (typeof jelszo !== 'string' || jelszo.length < 6)) || statusz !== 'admin') {
            return res.status(400).json({ error: 'A megadott felhasználói adatok nem megfelelőek.' });
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
