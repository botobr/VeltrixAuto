const express = require('express');
const mongoose = require('mongoose');
const AutoModel = require('../models/Auto');
const TelephelyModel = require('../models/Telephely');
const { jogSzukseges } = require('../middlewares/authMiddleware');

const NAPOK = TelephelyModel.NAPOK;
const router = express.Router();

const IDO_MINTA = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_MINTA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const szoveg = (ertek) => {
    if (typeof ertek !== 'string') {
        return '';
    }
    return ertek.trim();
};

const szamVagyNull = (ertek) => {
    if (ertek === '' || ertek === null || ertek === undefined) {
        return null;
    }
    return Number(ertek);
};

// a telephely űrlap ellenőrzése
const telephelyEllenorzese = (kapott = {}) => {
    const hibak = [];
    const adatok = {
        nev: szoveg(kapott.nev),
        iranyitoszam: szoveg(kapott.iranyitoszam),
        varos: szoveg(kapott.varos),
        cim: szoveg(kapott.cim),
        megye: szoveg(kapott.megye),
        telefon: szoveg(kapott.telefon),
        email: szoveg(kapott.email).toLowerCase(),
        szelesseg: szamVagyNull(kapott.szelesseg),
        hosszusag: szamVagyNull(kapott.hosszusag),
    };

    if (!adatok.nev) {
        hibak.push('Név: kötelező mező.');
    }
    if (!adatok.varos) {
        hibak.push('Város: kötelező mező.');
    }
    if (!adatok.cim) {
        hibak.push('Cím: kötelező mező.');
    }
    if (!adatok.megye) {
        hibak.push('Megye: kötelező mező.');
    }
    if (adatok.email && !EMAIL_MINTA.test(adatok.email)) {
        hibak.push('Érvénytelen e-mail-cím.');
    }
    // a koordináták a térképhez kellenek (nem kötelezők)
    if (adatok.szelesseg !== null && !(Math.abs(adatok.szelesseg) <= 90)) {
        hibak.push('Érvénytelen földrajzi szélesség.');
    }
    if (adatok.hosszusag !== null && !(Math.abs(adatok.hosszusag) <= 180)) {
        hibak.push('Érvénytelen földrajzi hosszúság.');
    }

    // nyitvatartás: minden napra kell egy sor, ha egy nap hiányzik, akkor aznap zárva
    let nyitvatartas = [];
    if (Array.isArray(kapott.nyitvatartas)) {
        nyitvatartas = kapott.nyitvatartas;
    }

    let rosszIdopont = false;
    adatok.nyitvatartas = [];
    for (const nap of NAPOK) {
        let sor = nyitvatartas.find((elem) => elem && elem.nap === nap);
        if (!sor) {
            sor = { nap: nap, zarva: true };
        }
        const zarva = Boolean(sor.zarva);

        if (zarva) {
            adatok.nyitvatartas.push({ nap: nap, zarva: true, nyitas: '09:00', zaras: '17:00' });
        } else {
            // a nyitásnak a zárás előtt kell lennie
            if (!IDO_MINTA.test(sor.nyitas) || !IDO_MINTA.test(sor.zaras) || sor.nyitas >= sor.zaras) {
                rosszIdopont = true;
            }
            adatok.nyitvatartas.push({ nap: nap, zarva: false, nyitas: sor.nyitas, zaras: sor.zaras });
        }
    }
    if (rosszIdopont) {
        hibak.push('A nyitvatartási időpontok érvénytelenek (ÓÓ:PP, a nyitás a zárás előtt).');
    }

    return { adatok, hibak };
};

// telephelyek listája (nyilvános)
router.get('/telephelyek', async (req, res) => {
    const telephelyek = await TelephelyModel.find().sort({ nev: 1 });
    return res.status(200).json({ telephelyek: telephelyek });
});

// új telephely
router.post('/telephelyek', jogSzukseges('telephelyKezeles'), async (req, res) => {
    const { adatok, hibak } = telephelyEllenorzese(req.body);
    if (hibak.length > 0) {
        return res.status(400).json({ hiba: hibak[0], hibak: hibak });
    }
    const telephely = await TelephelyModel.create(adatok);
    return res.status(201).json({ uzenet: 'Telephely létrehozva.', telephely: telephely });
});

// telephely módosítása
router.put('/telephelyek/:id', jogSzukseges('telephelyKezeles'), async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ hiba: 'Telephely nem található!' });
    }
    const { adatok, hibak } = telephelyEllenorzese(req.body);
    if (hibak.length > 0) {
        return res.status(400).json({ hiba: hibak[0], hibak: hibak });
    }

    const telephely = await TelephelyModel.findByIdAndUpdate(
        req.params.id,
        { $set: adatok },
        { returnDocument: 'after', runValidators: true },
    );
    if (!telephely) {
        return res.status(404).json({ hiba: 'Telephely nem található!' });
    }
    return res.status(200).json({ uzenet: 'Telephely frissítve.', telephely: telephely });
});

// telephely törlése (csak ha nincs hozzá autó)
router.delete('/telephelyek/:id', jogSzukseges('telephelyKezeles'), async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ hiba: 'Telephely nem található!' });
    }

    const autokSzama = await AutoModel.countDocuments({ telephely: req.params.id });
    if (autokSzama > 0) {
        return res.status(409).json({ hiba: 'A telephelyhez ' + autokSzama + ' hirdetés tartozik – előbb rendeld őket másik telephelyhez.' });
    }

    const torolt = await TelephelyModel.findByIdAndDelete(req.params.id);
    if (!torolt) {
        return res.status(404).json({ hiba: 'Telephely nem található!' });
    }
    return res.status(200).json({ uzenet: 'Telephely törölve.' });
});

module.exports = router;
