const express = require('express');
const mongoose = require('mongoose');
const AutokModel = require('../models/Autok');
const ErdeklodesModel = require('../models/Erdeklodes');
const UserModel = require('../models/User');
const { jogSzukseges } = require('../middlewares/authMiddleware');
const { publikusFeltetelek } = require('../utils/autoSzuro');
const { emailKuldes, oldalUrl } = require('../utils/email');
const { autoSlug } = require('../utils/slug');
const korlatozo = require('../utils/rateLimit');

const { ERDEKLODES_STATUSZOK } = ErdeklodesModel;
const router = express.Router();

const erdeklodesLimit = korlatozo({
    ablakMs: 15 * 60 * 1000,
    max: 5,
    uzenet: 'Túl sok üzenetet küldtél rövid idő alatt. Kérjük, próbáld újra később, vagy hívj minket telefonon.',
});

const EMAIL_MINTA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEFON_MINTA = /^[+\d][\d\s()/-]{5,}$/;
const MIN_KITOLTESI_IDO_MS = 3000;

const szoveg = (ertek) => (typeof ertek === 'string' ? ertek.trim() : '');

/**
 * Spamvédelem: rejtett „weboldal” mező (botok kitöltik), minimális kitöltési idő,
 * linkek számának korlátozása és IP-alapú kéréskorlát.
 */
const spamGyanus = (body) => {
    if (szoveg(body.weboldal)) return true;
    const kezdes = Number(body.kezdes);
    if (!Number.isFinite(kezdes) || Date.now() - kezdes < MIN_KITOLTESI_IDO_MS || Date.now() - kezdes > 24 * 3600 * 1000) return true;
    const linkek = (szoveg(body.uzenet).match(/https?:\/\/|www\./gi) || []).length;
    return linkek > 2;
};

const ertesitesiCimek = async (auto) => {
    if (auto.telephely?.email) return [auto.telephely.email];
    if (process.env.ERTESITESI_EMAIL) return process.env.ERTESITESI_EMAIL.split(',').map((cim) => cim.trim());
    const adminok = await UserModel.find({ statusz: 'admin' }).select('email');
    return adminok.map((admin) => admin.email);
};

router.post('/erdeklodesek', erdeklodesLimit, async (req, res) => {
    const body = req.body || {};
    if (spamGyanus(body)) {
        // A botnak nem áruljuk el, hogy kiszűrtük.
        return res.status(201).json({ message: 'Köszönjük, üzenetedet megkaptuk!' });
    }

    const adatok = {
        nev: szoveg(body.nev),
        email: szoveg(body.email).toLowerCase(),
        telefon: szoveg(body.telefon),
        uzenet: szoveg(body.uzenet),
    };
    const hibak = [];
    if (adatok.nev.length < 2 || adatok.nev.length > 100) hibak.push('Add meg a neved.');
    if (!EMAIL_MINTA.test(adatok.email) || adatok.email.length > 120) hibak.push('Érvényes e-mail-címet adj meg.');
    if (adatok.telefon && (!TELEFON_MINTA.test(adatok.telefon) || adatok.telefon.length > 40)) hibak.push('Érvénytelen telefonszám.');
    if (adatok.uzenet.length < 10 || adatok.uzenet.length > 3000) hibak.push('Az üzenet 10 és 3000 karakter között legyen.');
    if (body.adatkezeles !== true) hibak.push('Az adatkezelési tájékoztató elfogadása szükséges.');
    if (hibak.length) return res.status(400).json({ error: hibak[0], hibak });

    if (!mongoose.Types.ObjectId.isValid(body.auto)) {
        return res.status(404).json({ error: 'Autó nem található!' });
    }
    const auto = await AutokModel.findOne({ $and: [{ _id: body.auto }, ...publikusFeltetelek()] })
        .populate('telephely', 'nev email');
    if (!auto) {
        return res.status(404).json({ error: 'Autó nem található!' });
    }

    const autoNev = `${auto.marka} ${auto.modell} (${auto.evjarat})`;
    const erdeklodes = await ErdeklodesModel.create({
        ...adatok,
        auto: auto._id,
        autoNev,
        felhasznalo: req.session?.userId || null,
    });

    emailKuldes({
        cimzett: await ertesitesiCimek(auto),
        valaszCim: adatok.email,
        targy: `Új érdeklődés: ${autoNev}`,
        szoveg: [
            `Új érdeklődés érkezett a következő autóra: ${autoNev}`,
            `${oldalUrl()}/autok/${autoSlug(auto)}`,
            '',
            `Név: ${adatok.nev}`,
            `E-mail: ${adatok.email}`,
            `Telefon: ${adatok.telefon || '—'}`,
            '',
            adatok.uzenet,
            '',
            `Kezelés: ${oldalUrl()}/admin?lap=erdeklodesek`,
        ].join('\n'),
    });

    return res.status(201).json({ message: 'Köszönjük, üzenetedet megkaptuk! Hamarosan felvesszük veled a kapcsolatot.', id: erdeklodes._id });
});

// ---------- Admin ----------

router.get('/admin/erdeklodesek', jogSzukseges('erdeklodesKezeles'), async (req, res) => {
    const szuro = {};
    if (ERDEKLODES_STATUSZOK.includes(req.query.statusz)) szuro.statusz = req.query.statusz;
    if (mongoose.Types.ObjectId.isValid(req.query.auto)) szuro.auto = req.query.auto;
    const oldal = Math.max(Number.parseInt(req.query.oldal, 10) || 1, 1);
    const limit = 30;

    const [osszes, erdeklodesek, szamok] = await Promise.all([
        ErdeklodesModel.countDocuments(szuro),
        ErdeklodesModel.find(szuro)
            .sort({ createdAt: -1 })
            .skip((oldal - 1) * limit)
            .limit(limit)
            .populate('auto', 'marka modell evjarat kepek kep'),
        ErdeklodesModel.aggregate([{ $group: { _id: '$statusz', db: { $sum: 1 } } }]),
    ]);

    return res.status(200).json({
        erdeklodesek: erdeklodesek.map((elem) => {
            const adat = elem.toObject();
            if (adat.auto) {
                adat.auto = {
                    _id: adat.auto._id,
                    nev: `${adat.auto.marka} ${adat.auto.modell}`,
                    kep: adat.auto.kepek?.[0]?.url || adat.auto.kep || null,
                    slug: autoSlug(adat.auto),
                };
            }
            return adat;
        }),
        statuszSzamok: Object.fromEntries(szamok.map((s) => [s._id, s.db])),
        lapozas: { oldal, limit, osszes, oldalak: Math.ceil(osszes / limit) },
    });
});

router.patch('/admin/erdeklodesek/:id', jogSzukseges('erdeklodesKezeles'), async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ error: 'Érdeklődés nem található!' });
    }
    const modositas = {};
    if (req.body?.statusz !== undefined) {
        if (!ERDEKLODES_STATUSZOK.includes(req.body.statusz)) return res.status(400).json({ error: 'Érvénytelen státusz.' });
        modositas.statusz = req.body.statusz;
    }
    if (req.body?.megjegyzes !== undefined) {
        if (typeof req.body.megjegyzes !== 'string' || req.body.megjegyzes.length > 2000) {
            return res.status(400).json({ error: 'A megjegyzés legfeljebb 2000 karakter lehet.' });
        }
        modositas.megjegyzes = req.body.megjegyzes.trim();
    }
    const erdeklodes = await ErdeklodesModel.findByIdAndUpdate(req.params.id, { $set: modositas }, { returnDocument: 'after' });
    if (!erdeklodes) {
        return res.status(404).json({ error: 'Érdeklődés nem található!' });
    }
    return res.status(200).json({ erdeklodes });
});

router.delete('/admin/erdeklodesek/:id', jogSzukseges('erdeklodesTorles'), async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ error: 'Érdeklődés nem található!' });
    }
    const torolt = await ErdeklodesModel.findByIdAndDelete(req.params.id);
    if (!torolt) {
        return res.status(404).json({ error: 'Érdeklődés nem található!' });
    }
    return res.status(200).json({ message: 'Érdeklődés törölve.' });
});

module.exports = router;
