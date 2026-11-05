const express = require('express');
const mongoose = require('mongoose');
const AutokModel = require('../models/Autok');
const TelephelyModel = require('../models/Telephely');
const { adminRequired } = require('../middlewares/authMiddleware');

const { NAPOK } = TelephelyModel;
const router = express.Router();

const IDO_MINTA = /^([01]\d|2[0-3]):[0-5]\d$/;
const szoveg = (ertek) => (typeof ertek === 'string' ? ertek.trim() : '');
const szamVagyNull = (ertek) => (ertek === '' || ertek === null || ertek === undefined ? null : Number(ertek));

const telephelyEllenorzese = (body = {}) => {
    const hibak = [];
    const adatok = {
        nev: szoveg(body.nev),
        iranyitoszam: szoveg(body.iranyitoszam),
        varos: szoveg(body.varos),
        cim: szoveg(body.cim),
        megye: szoveg(body.megye),
        telefon: szoveg(body.telefon),
        email: szoveg(body.email).toLowerCase(),
        szelesseg: szamVagyNull(body.szelesseg),
        hosszusag: szamVagyNull(body.hosszusag),
    };
    for (const [mezo, cimke] of [['nev', 'Név'], ['varos', 'Város'], ['cim', 'Cím'], ['megye', 'Megye']]) {
        if (!adatok[mezo]) hibak.push(`${cimke}: kötelező mező.`);
    }
    if (adatok.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(adatok.email)) hibak.push('Érvénytelen e-mail-cím.');
    if (adatok.szelesseg !== null && !(Math.abs(adatok.szelesseg) <= 90)) hibak.push('Érvénytelen földrajzi szélesség.');
    if (adatok.hosszusag !== null && !(Math.abs(adatok.hosszusag) <= 180)) hibak.push('Érvénytelen földrajzi hosszúság.');

    const nyitvatartas = Array.isArray(body.nyitvatartas) ? body.nyitvatartas : [];
    adatok.nyitvatartas = NAPOK.map((nap) => {
        const sor = nyitvatartas.find((elem) => elem?.nap === nap) || { nap, zarva: true };
        const zarva = Boolean(sor.zarva);
        if (!zarva && (!IDO_MINTA.test(sor.nyitas) || !IDO_MINTA.test(sor.zaras) || sor.nyitas >= sor.zaras)) {
            hibak.push('A nyitvatartási időpontok érvénytelenek (ÓÓ:PP, a nyitás a zárás előtt).');
        }
        return { nap, zarva, nyitas: zarva ? '09:00' : sor.nyitas, zaras: zarva ? '17:00' : sor.zaras };
    });
    return { adatok, hibak: [...new Set(hibak)] };
};

router.get('/telephelyek', async (req, res) => {
    const telephelyek = await TelephelyModel.find().sort({ nev: 1 });
    return res.status(200).json({ telephelyek });
});

router.post('/telephelyek', adminRequired, async (req, res) => {
    const { adatok, hibak } = telephelyEllenorzese(req.body);
    if (hibak.length) return res.status(400).json({ error: hibak[0], hibak });
    const telephely = await TelephelyModel.create(adatok);
    return res.status(201).json({ message: 'Telephely létrehozva.', telephely });
});

router.put('/telephelyek/:id', adminRequired, async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'Telephely nem található!' });
    const { adatok, hibak } = telephelyEllenorzese(req.body);
    if (hibak.length) return res.status(400).json({ error: hibak[0], hibak });
    const telephely = await TelephelyModel.findByIdAndUpdate(req.params.id, { $set: adatok }, { returnDocument: 'after', runValidators: true });
    if (!telephely) return res.status(404).json({ error: 'Telephely nem található!' });
    return res.status(200).json({ message: 'Telephely frissítve.', telephely });
});

router.delete('/telephelyek/:id', adminRequired, async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'Telephely nem található!' });
    const hasznalatban = await AutokModel.countDocuments({ telephely: req.params.id });
    if (hasznalatban > 0) {
        return res.status(409).json({ error: `A telephelyhez ${hasznalatban} hirdetés tartozik – előbb rendeld őket másik telephelyhez.` });
    }
    const torolt = await TelephelyModel.findByIdAndDelete(req.params.id);
    if (!torolt) return res.status(404).json({ error: 'Telephely nem található!' });
    return res.status(200).json({ message: 'Telephely törölve.' });
});

module.exports = router;
