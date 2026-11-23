const express = require('express');
const mongoose = require('mongoose');
const AutoModel = require('../models/Auto');
const ErdeklodesModel = require('../models/Erdeklodes');
const FelhasznaloModel = require('../models/Felhasznalo');
const { jogSzukseges } = require('../middlewares/authMiddleware');
const { publikusFeltetelek } = require('../utils/autoSzuro');
const { emailKuldes, oldalUrl } = require('../utils/email');
const { autoSlug } = require('../utils/slug');
const korlatozo = require('../utils/rateLimit');

const ERDEKLODES_STATUSZOK = ErdeklodesModel.ERDEKLODES_STATUSZOK;
const router = express.Router();

// 15 percenként max 5 üzenet egy IP-ről
const erdeklodesLimit = korlatozo({
    ablakMs: 15 * 60 * 1000,
    max: 5,
    uzenet: 'Túl sok üzenetet küldtél rövid idő alatt. Kérjük, próbáld újra később, vagy hívj minket telefonon.',
});

const EMAIL_MINTA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEFON_MINTA = /^[+\d][\d\s()/-]{5,}$/;
const MIN_KITOLTESI_IDO_MS = 3000; // 3 másodperc alatt ember nem tölti ki az űrlapot

const szoveg = (ertek) => {
    if (typeof ertek !== 'string') {
        return '';
    }
    return ertek.trim();
};

// Spam szűrés:
// - a rejtett "weboldal" mezőt csak a robotok töltik ki
// - túl gyorsan kitöltött űrlap
// - kettőnél több link az üzenetben
const spamGyanus = (adatok) => {
    if (szoveg(adatok.weboldal)) {
        return true;
    }

    const kezdes = Number(adatok.kezdes);
    if (!Number.isFinite(kezdes)) {
        return true;
    }
    const eltelt = Date.now() - kezdes;
    if (eltelt < MIN_KITOLTESI_IDO_MS || eltelt > 24 * 3600 * 1000) {
        return true;
    }

    const linkek = szoveg(adatok.uzenet).match(/https?:\/\/|www\./gi);
    if (linkek && linkek.length > 2) {
        return true;
    }
    return false;
};

// kinek menjen az értesítő e-mail: a telephelynek, a beállított címre, vagy az adminoknak
const ertesitesiCimek = async (auto) => {
    if (auto.telephely && auto.telephely.email) {
        return [auto.telephely.email];
    }
    if (process.env.ERTESITESI_EMAIL) {
        return process.env.ERTESITESI_EMAIL.split(',').map((cim) => cim.trim());
    }
    const adminok = await FelhasznaloModel.find({ statusz: 'admin' }).select('email');
    return adminok.map((admin) => admin.email);
};

// érdeklődés küldése egy autóról
router.post('/erdeklodesek', erdeklodesLimit, async (req, res) => {
    const kapott = req.body || {};
    if (spamGyanus(kapott)) {
        // a robotnak nem mondjuk meg, hogy kiszűrtük
        return res.status(201).json({ uzenet: 'Köszönjük, üzenetedet megkaptuk!' });
    }

    const adatok = {
        nev: szoveg(kapott.nev),
        email: szoveg(kapott.email).toLowerCase(),
        telefon: szoveg(kapott.telefon),
        uzenet: szoveg(kapott.uzenet),
    };

    const hibak = [];
    if (adatok.nev.length < 2 || adatok.nev.length > 100) {
        hibak.push('Add meg a neved.');
    }
    if (!EMAIL_MINTA.test(adatok.email) || adatok.email.length > 120) {
        hibak.push('Érvényes e-mail-címet adj meg.');
    }
    // a telefonszám nem kötelező, de ha megadta, jónak kell lennie
    if (adatok.telefon && (!TELEFON_MINTA.test(adatok.telefon) || adatok.telefon.length > 40)) {
        hibak.push('Érvénytelen telefonszám.');
    }
    if (adatok.uzenet.length < 10 || adatok.uzenet.length > 3000) {
        hibak.push('Az üzenet 10 és 3000 karakter között legyen.');
    }
    if (kapott.adatkezeles !== true) {
        hibak.push('Az adatkezelési tájékoztató elfogadása szükséges.');
    }
    if (hibak.length > 0) {
        return res.status(400).json({ hiba: hibak[0], hibak: hibak });
    }

    if (!mongoose.Types.ObjectId.isValid(kapott.auto)) {
        return res.status(404).json({ hiba: 'Autó nem található!' });
    }
    const auto = await AutoModel.findOne({ $and: [{ _id: kapott.auto }, ...publikusFeltetelek()] })
        .populate('telephely', 'nev email');
    if (!auto) {
        return res.status(404).json({ hiba: 'Autó nem található!' });
    }

    let felhasznaloId = null;
    if (req.session && req.session.userId) {
        felhasznaloId = req.session.userId;
    }

    const autoNev = auto.marka + ' ' + auto.modell + ' (' + auto.evjarat + ')';
    const erdeklodes = await ErdeklodesModel.create({
        nev: adatok.nev,
        email: adatok.email,
        telefon: adatok.telefon,
        uzenet: adatok.uzenet,
        auto: auto._id,
        autoNev: autoNev,
        felhasznalo: felhasznaloId,
    });

    // értesítés a kereskedésnek (nem várjuk meg)
    const sorok = [
        'Új érdeklődés érkezett a következő autóra: ' + autoNev,
        oldalUrl() + '/autok/' + autoSlug(auto),
        '',
        'Név: ' + adatok.nev,
        'E-mail: ' + adatok.email,
        'Telefon: ' + (adatok.telefon || '—'),
        '',
        adatok.uzenet,
        '',
        'Kezelés: ' + oldalUrl() + '/admin?lap=erdeklodesek',
    ];
    emailKuldes({
        cimzett: await ertesitesiCimek(auto),
        valaszCim: adatok.email,
        targy: 'Új érdeklődés: ' + autoNev,
        szoveg: sorok.join('\n'),
    });

    return res.status(201).json({
        uzenet: 'Köszönjük, üzenetedet megkaptuk! Hamarosan felvesszük veled a kapcsolatot.',
        id: erdeklodes._id,
    });
});

// ---------- Admin ----------

// érdeklődések listája
router.get('/admin/erdeklodesek', jogSzukseges('erdeklodesKezeles'), async (req, res) => {
    const szuro = {};
    if (ERDEKLODES_STATUSZOK.includes(req.query.statusz)) {
        szuro.statusz = req.query.statusz;
    }
    if (mongoose.Types.ObjectId.isValid(req.query.auto)) {
        szuro.auto = req.query.auto;
    }

    let oldal = Number.parseInt(req.query.oldal, 10) || 1;
    if (oldal < 1) {
        oldal = 1;
    }
    const limit = 30;

    const osszes = await ErdeklodesModel.countDocuments(szuro);
    const erdeklodesek = await ErdeklodesModel.find(szuro)
        .sort({ createdAt: -1 })
        .skip((oldal - 1) * limit)
        .limit(limit)
        .populate('auto', 'marka modell evjarat kepek kep');

    // státuszonként hány darab van
    const statuszSzamok = {};
    const osszesErdeklodes = await ErdeklodesModel.find().select('statusz');
    for (const erdeklodes of osszesErdeklodes) {
        if (!statuszSzamok[erdeklodes.statusz]) {
            statuszSzamok[erdeklodes.statusz] = 0;
        }
        statuszSzamok[erdeklodes.statusz]++;
    }

    const lista = [];
    for (const erdeklodes of erdeklodesek) {
        const adat = erdeklodes.toObject();
        // az autóból csak a név, a kép és a link kell
        if (adat.auto) {
            let kep = adat.auto.kep || null;
            if (adat.auto.kepek && adat.auto.kepek.length > 0) {
                kep = adat.auto.kepek[0].url;
            }
            adat.auto = {
                _id: adat.auto._id,
                nev: adat.auto.marka + ' ' + adat.auto.modell,
                kep: kep,
                slug: autoSlug(adat.auto),
            };
        }
        lista.push(adat);
    }

    return res.status(200).json({
        erdeklodesek: lista,
        statuszSzamok: statuszSzamok,
        lapozas: { oldal: oldal, limit: limit, osszes: osszes, oldalak: Math.ceil(osszes / limit) },
    });
});

// érdeklődés státuszának vagy megjegyzésének módosítása
router.patch('/admin/erdeklodesek/:id', jogSzukseges('erdeklodesKezeles'), async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ hiba: 'Érdeklődés nem található!' });
    }
    const adatok = req.body || {};
    const modositas = {};

    if (adatok.statusz !== undefined) {
        if (!ERDEKLODES_STATUSZOK.includes(adatok.statusz)) {
            return res.status(400).json({ hiba: 'Érvénytelen státusz.' });
        }
        modositas.statusz = adatok.statusz;
    }
    if (adatok.megjegyzes !== undefined) {
        if (typeof adatok.megjegyzes !== 'string' || adatok.megjegyzes.length > 2000) {
            return res.status(400).json({ hiba: 'A megjegyzés legfeljebb 2000 karakter lehet.' });
        }
        modositas.megjegyzes = adatok.megjegyzes.trim();
    }

    const erdeklodes = await ErdeklodesModel.findByIdAndUpdate(req.params.id, { $set: modositas }, { returnDocument: 'after' });
    if (!erdeklodes) {
        return res.status(404).json({ hiba: 'Érdeklődés nem található!' });
    }
    return res.status(200).json({ erdeklodes: erdeklodes });
});

// érdeklődés törlése
router.delete('/admin/erdeklodesek/:id', jogSzukseges('erdeklodesTorles'), async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ hiba: 'Érdeklődés nem található!' });
    }
    const torolt = await ErdeklodesModel.findByIdAndDelete(req.params.id);
    if (!torolt) {
        return res.status(404).json({ hiba: 'Érdeklődés nem található!' });
    }
    return res.status(200).json({ uzenet: 'Érdeklődés törölve.' });
});

module.exports = router;
