const express = require('express');
const mongoose = require('mongoose');
const FelhasznaloModel = require('../models/Felhasznalo');
const felhasznaloValasz = require('../utils/felhasznaloValasz');
const { jogSzukseges } = require('../middlewares/authMiddleware');
const { SZEREPKOROK } = require('../utils/jogosultsagok');

const router = express.Router();

const EMAIL_MINTA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const hibaValasz = (res, error) => {
    // 11000 = ilyen e-mail cím már van
    if (error && error.code === 11000) {
        return res.status(409).json({ hiba: 'Ezzel az email-címmel már létezik felhasználó.' });
    }
    return res.status(500).json({ hiba: 'Hiba: ' + error.message });
};

const ervenyesId = (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ hiba: 'Felhasználó nem található!' });
    }
    return next();
};

// ő-e az utolsó admin (az utolsó admint nem lehet törölni / lefokozni)
const utolsoAdmin = async (felhasznalo) => {
    if (felhasznalo.statusz !== 'admin') {
        return false;
    }
    const adminokSzama = await FelhasznaloModel.countDocuments({ statusz: 'admin' });
    return adminokSzama <= 1;
};

// felhasználók listája
router.get('/felhasznalok', jogSzukseges('felhasznaloKezeles'), async (req, res) => {
    try {
        const felhasznalok = await FelhasznaloModel.find()
            .select('-jelszo -mentettKeresesek')
            .sort({ statusz: 1, createdAt: -1 });
        const lista = [];
        for (const felhasznalo of felhasznalok) {
            lista.push(felhasznaloValasz(felhasznalo));
        }
        return res.status(200).json({ felhasznalok: lista });
    } catch (error) {
        res.status(500).json({ hiba: 'Hiba: ' + error.message });
    }
});

// új felhasználó (pl. értékesítő) létrehozása az adminban
router.post('/felhasznalok', jogSzukseges('felhasznaloKezeles'), async (req, res) => {
    try {
        const adatok = req.body || {};
        let email = '';
        if (typeof adatok.email === 'string') {
            email = adatok.email.trim().toLowerCase();
        }

        let jo = true;
        if (typeof adatok.nev !== 'string' || !adatok.nev.trim()) {
            jo = false;
        }
        if (!EMAIL_MINTA.test(email)) {
            jo = false;
        }
        if (typeof adatok.jelszo !== 'string' || adatok.jelszo.length < 8) {
            jo = false;
        }
        if (!SZEREPKOROK.includes(adatok.statusz)) {
            jo = false;
        }
        if (!jo) {
            return res.status(400).json({ hiba: 'A név, érvényes email, legalább 8 karakteres jelszó és szerepkör kötelező.' });
        }

        const ujFelhasznalo = new FelhasznaloModel({
            nev: adatok.nev.trim(),
            email: email,
            jelszo: adatok.jelszo,
            statusz: adatok.statusz,
        });
        await ujFelhasznalo.save();
        return res.status(201).json({ uzenet: 'Felhasználó sikeresen létrehozva!', felhasznalo: felhasznaloValasz(ujFelhasznalo) });
    } catch (error) {
        hibaValasz(res, error);
    }
});

// felhasználó törlése
router.delete('/felhasznalok/:id', jogSzukseges('felhasznaloKezeles'), ervenyesId, async (req, res) => {
    try {
        if (req.params.id === req.session.userId) {
            return res.status(409).json({ hiba: 'A saját fiókodat a Fiókom oldalon törölheted.' });
        }
        const felhasznalo = await FelhasznaloModel.findById(req.params.id);
        if (!felhasznalo) {
            return res.status(404).json({ hiba: 'Felhasználó nem található!' });
        }
        if (await utolsoAdmin(felhasznalo)) {
            return res.status(409).json({ hiba: 'Az utolsó admin nem törölhető.' });
        }
        await felhasznalo.deleteOne();
        return res.status(200).json({ uzenet: 'Felhasználó sikeresen törölve!' });
    } catch (error) {
        res.status(500).json({ hiba: 'Hiba: ' + error.message });
    }
});

// felhasználó módosítása
router.put('/felhasznalok/:id', jogSzukseges('felhasznaloKezeles'), ervenyesId, async (req, res) => {
    try {
        const adatok = req.body || {};
        const felhasznalo = await FelhasznaloModel.findById(req.params.id);
        if (!felhasznalo) {
            return res.status(404).json({ hiba: 'Felhasználó nem található!' });
        }

        let jo = true;
        if (typeof adatok.nev !== 'string' || !adatok.nev.trim()) {
            jo = false;
        }
        if (typeof adatok.email !== 'string' || !EMAIL_MINTA.test(adatok.email.trim().toLowerCase())) {
            jo = false;
        }
        // a jelszó nem kötelező, csak ha meg akarják változtatni
        if (adatok.jelszo && (typeof adatok.jelszo !== 'string' || adatok.jelszo.length < 8)) {
            jo = false;
        }
        if (!SZEREPKOROK.includes(adatok.statusz)) {
            jo = false;
        }
        if (!jo) {
            return res.status(400).json({ hiba: 'A megadott felhasználói adatok nem megfelelőek.' });
        }

        if (adatok.statusz !== 'admin' && (await utolsoAdmin(felhasznalo))) {
            return res.status(409).json({ hiba: 'Az utolsó admin szerepköre nem vehető el.' });
        }
        if (adatok.statusz !== 'admin' && req.params.id === req.session.userId) {
            return res.status(409).json({ hiba: 'A saját admin jogosultságodat nem veheted el.' });
        }

        felhasznalo.nev = adatok.nev.trim();
        felhasznalo.email = adatok.email.trim().toLowerCase();
        felhasznalo.statusz = adatok.statusz;
        if (adatok.jelszo) {
            felhasznalo.jelszo = adatok.jelszo;
        }
        const mentett = await felhasznalo.save();
        return res.status(200).json({
            uzenet: 'Felhasználó sikeresen frissítve!',
            felhasznalo: felhasznaloValasz(mentett),
        });
    } catch (error) {
        hibaValasz(res, error);
    }
});

module.exports = router;
