const express = require('express');
const mongoose = require('mongoose');
const FelhasznaloModel = require('../models/Felhasznalo');
const felhasznaloValasz = require('../utils/felhasznaloValasz');
const { jogSzukseges } = require('../middlewares/authMiddleware');
const { SZEREPKOROK } = require('../utils/jogosultsagok');

const router = express.Router();

const EMAIL_MINTA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const hibaValasz = (res, error) => {
    if (error?.code === 11000) {
        return res.status(409).json({ hiba: 'Ezzel az email-címmel már létezik felhasználó.' });
    }
    return res.status(500).json({ hiba: `Hiba: ${error.message}` });
};

const ervenyesId = (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ hiba: 'Felhasználó nem található!' });
    }
    return next();
};

const utolsoAdmin = async (user) => user.statusz === 'admin'
    && (await FelhasznaloModel.countDocuments({ statusz: 'admin' })) <= 1;

router.get('/felhasznalok', jogSzukseges('felhasznaloKezeles'), async (req, res) => {
    try {
        const felhasznalok = await FelhasznaloModel.find().select('-jelszo -mentettKeresesek').sort({ statusz: 1, createdAt: -1 });
        return res.status(200).json({ felhasznalok: felhasznalok.map(felhasznaloValasz) });
    } catch (error) {
        res.status(500).json({ hiba: `Hiba: ${error.message}` });
    }
});

router.post('/felhasznalok', jogSzukseges('felhasznaloKezeles'), async (req, res) => {
    try {
        const { nev, email, jelszo, statusz } = req.body || {};
        const tisztitottEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        if (typeof nev !== 'string' || !nev.trim() || !EMAIL_MINTA.test(tisztitottEmail)
            || typeof jelszo !== 'string' || jelszo.length < 8 || !SZEREPKOROK.includes(statusz)) {
            return res.status(400).json({ hiba: 'A név, érvényes email, legalább 8 karakteres jelszó és szerepkör kötelező.' });
        }
        const ujFelhasznalo = new FelhasznaloModel({ nev: nev.trim(), email: tisztitottEmail, jelszo, statusz });
        await ujFelhasznalo.save();
        return res.status(201).json({ uzenet: 'Felhasználó sikeresen létrehozva!', felhasznalo: felhasznaloValasz(ujFelhasznalo) });
    } catch (error) {
        hibaValasz(res, error);
    }
});

router.delete('/felhasznalok/:id', jogSzukseges('felhasznaloKezeles'), ervenyesId, async (req, res) => {
    try {
        if (req.params.id === req.session.userId) {
            return res.status(409).json({ hiba: 'A saját fiókodat a Fiókom oldalon törölheted.' });
        }
        const user = await FelhasznaloModel.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ hiba: 'Felhasználó nem található!' });
        }
        if (await utolsoAdmin(user)) {
            return res.status(409).json({ hiba: 'Az utolsó admin nem törölhető.' });
        }
        await user.deleteOne();
        return res.status(200).json({ uzenet: 'Felhasználó sikeresen törölve!' });
    } catch (error) {
        res.status(500).json({ hiba: `Hiba: ${error.message}` });
    }
});

router.put('/felhasznalok/:id', jogSzukseges('felhasznaloKezeles'), ervenyesId, async (req, res) => {
    try {
        const { nev, email, jelszo, statusz } = req.body || {};
        const user = await FelhasznaloModel.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ hiba: 'Felhasználó nem található!' });
        }

        if (typeof nev !== 'string' || !nev.trim() || typeof email !== 'string' || !EMAIL_MINTA.test(email.trim().toLowerCase())
            || (jelszo && (typeof jelszo !== 'string' || jelszo.length < 8)) || !SZEREPKOROK.includes(statusz)) {
            return res.status(400).json({ hiba: 'A megadott felhasználói adatok nem megfelelőek.' });
        }
        if (statusz !== 'admin' && (await utolsoAdmin(user))) {
            return res.status(409).json({ hiba: 'Az utolsó admin szerepköre nem vehető el.' });
        }
        if (statusz !== 'admin' && req.params.id === req.session.userId) {
            return res.status(409).json({ hiba: 'A saját admin jogosultságodat nem veheted el.' });
        }

        user.nev = nev.trim();
        user.email = email.trim().toLowerCase();
        user.statusz = statusz;
        if (jelszo) {
            user.jelszo = jelszo;
        }
        const updatedUser = await user.save();
        return res.status(200).json({
            uzenet: 'Felhasználó sikeresen frissítve!',
            felhasznalo: felhasznaloValasz(updatedUser),
        });
    } catch (error) {
        hibaValasz(res, error);
    }
});

module.exports = router;
