const express = require('express');
const mongoose = require('mongoose');
const AutoModel = require('../models/Auto');
const TelephelyModel = require('../models/Telephely');
const FelhasznaloModel = require('../models/Felhasznalo');
const { jogSzukseges, munkamenetJoga } = require('../middlewares/authMiddleware');
const { kepFeltoltese, kepekTorlese } = require('../utils/cloudinary');
const { autoAdatokEllenorzese, allapotEllenorzese } = require('../utils/autoMezok');
const { autoValasz, publikusFeltetelek, rendezesEpitese, szuroEpitese } = require('../utils/autoSzuro');
const { idSlugbol } = require('../utils/slug');
const { hasznaltKepek, masholHasznalt } = require('../utils/kepek');
const { ujAutoErtesites } = require('../utils/ertesitesek');
const korlatozo = require('../utils/rateLimit');

const router = express.Router();

const esemenyLimit = korlatozo({ ablakMs: 10 * 60 * 1000, max: 300 });
const kepLimit = korlatozo({ ablakMs: 10 * 60 * 1000, max: 200, uzenet: 'Túl sok képfeltöltés. Próbáld újra később.' });

const TELEPHELY_MEZOK = 'nev iranyitoszam varos cim megye telefon email nyitvatartas szelesseg hosszusag';
const LISTA_TELEPHELY_MEZOK = 'nev varos megye';

// munkatárs = admin vagy értékesítő, ők a rejtett hirdetéseket is látják
const munkatars = (req) => munkamenetJoga(req, 'kezelofelulet');

const belsoNezet = (req) => {
    return { admin: true, penzugy: munkamenetJoga(req, 'penzugy') };
};

// pénzügyi jog nélkül az eladási adatokat nem lehet módosítani
const penzugyiMezokKiszurese = (req, adatok) => {
    if (munkamenetJoga(req, 'penzugy')) {
        return adatok;
    }
    const szurt = { ...adatok };
    delete szurt.eladas_datum;
    delete szurt.eladasi_ar;
    return szurt;
};

const hibasValasz = (res, hibak) => {
    return res.status(400).json({ hiba: hibak[0], hibak: hibak });
};

const telephelyLetezik = async (id) => {
    if (!id) {
        return true; // a telephely nem kötelező
    }
    const van = await TelephelyModel.exists({ _id: id });
    return Boolean(van);
};

// az autó összes képének azonosítója (a régi kepPublicId mezővel együtt)
const autoKepei = (auto) => {
    const idk = [];
    if (auto.kepPublicId) {
        idk.push(auto.kepPublicId);
    }
    for (const kep of auto.kepek) {
        if (kep.publicId && !idk.includes(kep.publicId)) {
            idk.push(kep.publicId);
        }
    }
    return idk;
};

// ---------- Nyilvános lekérdezések ----------

// autók listája szűréssel és lapozással
router.get('/autok', async (req, res) => {
    let oldal = Number.parseInt(req.query.oldal, 10) || 1;
    if (oldal < 1) {
        oldal = 1;
    }
    let limit = Number.parseInt(req.query.limit, 10) || 12;
    if (limit < 1) {
        limit = 1;
    }
    if (limit > 50) {
        limit = 50;
    }

    const szuro = await szuroEpitese(req.query);
    // a főoldalon csak a kiemelt autók kellenek
    if (req.query.kiemelt === '1') {
        if (!szuro.$and) {
            szuro.$and = [];
        }
        szuro.$and.push({ kiemelt: true });
    }

    const osszes = await AutoModel.countDocuments(szuro);
    const autok = await AutoModel.find(szuro)
        .sort(rendezesEpitese(req.query.rendezes))
        .skip((oldal - 1) * limit)
        .limit(limit)
        .populate('telephely', LISTA_TELEPHELY_MEZOK);

    return res.status(200).json({
        autok: autok.map((auto) => autoValasz(auto)),
        lapozas: { oldal: oldal, limit: limit, osszes: osszes, oldalak: Math.ceil(osszes / limit) },
    });
});

// a szűrőpanel adatai: márkák és modellek, megyék, ár- és évjárat tartomány
router.get('/autok/szurok', async (req, res) => {
    const feltetelek = publikusFeltetelek();
    feltetelek.push({ statusz: { $ne: 'elkelt' } });

    const autok = await AutoModel.find({ $and: feltetelek })
        .select('marka modell vetel_ar evjarat kmora_allas teljesitmeny');
    const telephelyek = await TelephelyModel.find().select(LISTA_TELEPHELY_MEZOK).sort({ nev: 1 });

    // márkánként a modellek és a darabszám
    const markak = [];
    for (const auto of autok) {
        let marka = markak.find((elem) => elem.marka === auto.marka);
        if (!marka) {
            marka = { marka: auto.marka, db: 0, modellek: [] };
            markak.push(marka);
        }
        marka.db++;
        if (!marka.modellek.includes(auto.modell)) {
            marka.modellek.push(auto.modell);
        }
    }
    markak.sort((a, b) => (a.marka < b.marka ? -1 : 1));
    for (const marka of markak) {
        marka.modellek.sort((a, b) => a.localeCompare(b, 'hu'));
    }

    // megyék, ahol van telephely
    const megyek = [];
    for (const telephely of telephelyek) {
        if (!megyek.includes(telephely.megye)) {
            megyek.push(telephely.megye);
        }
    }
    megyek.sort((a, b) => a.localeCompare(b, 'hu'));

    // legkisebb és legnagyobb értékek a csúszkákhoz
    let tartomanyok = null;
    if (autok.length > 0) {
        tartomanyok = {
            minAr: autok[0].vetel_ar,
            maxAr: autok[0].vetel_ar,
            minEv: autok[0].evjarat,
            maxEv: autok[0].evjarat,
            maxKm: autok[0].kmora_allas,
            maxLe: autok[0].teljesitmeny,
        };
        for (const auto of autok) {
            tartomanyok.minAr = Math.min(tartomanyok.minAr, auto.vetel_ar);
            tartomanyok.maxAr = Math.max(tartomanyok.maxAr, auto.vetel_ar);
            tartomanyok.minEv = Math.min(tartomanyok.minEv, auto.evjarat);
            tartomanyok.maxEv = Math.max(tartomanyok.maxEv, auto.evjarat);
            tartomanyok.maxKm = Math.max(tartomanyok.maxKm, auto.kmora_allas);
            tartomanyok.maxLe = Math.max(tartomanyok.maxLe, auto.teljesitmeny);
        }
    }

    return res.status(200).json({
        markak: markak,
        megyek: megyek,
        telephelyek: telephelyek,
        tartomanyok: tartomanyok,
    });
});

// egy autó adatlapja és 3 hasonló autó
router.get('/autok/:id', async (req, res) => {
    const id = idSlugbol(req.params.id);
    if (!id) {
        return res.status(404).json({ hiba: 'Autó nem található!' });
    }

    let feltetel;
    if (munkatars(req)) {
        feltetel = { _id: id };
    } else {
        feltetel = { $and: [{ _id: id }, ...publikusFeltetelek()] };
    }

    const auto = await AutoModel.findOne(feltetel).populate('telephely', TELEPHELY_MEZOK);
    if (!auto) {
        return res.status(404).json({ hiba: 'Autó nem található!' });
    }

    // hasonló autó: ugyanaz a márka, vagy ugyanaz a kivitel hasonló áron (+-40%)
    const hasonloFeltetel = {
        $or: [
            { marka: auto.marka },
            { kivitel: auto.kivitel, vetel_ar: { $gte: auto.vetel_ar * 0.6, $lte: auto.vetel_ar * 1.4 } },
        ],
    };
    const hasonlok = await AutoModel.find({
        $and: [
            ...publikusFeltetelek(),
            { _id: { $ne: auto._id } },
            { statusz: { $ne: 'elkelt' } },
            hasonloFeltetel,
        ],
    }).sort({ createdAt: -1 }).limit(3).populate('telephely', LISTA_TELEPHELY_MEZOK);

    let nezet = {};
    if (munkatars(req)) {
        nezet = belsoNezet(req);
    }

    return res.status(200).json({
        auto: autoValasz(auto, nezet),
        hasonlok: hasonlok.map((elem) => autoValasz(elem)),
    });
});

// megtekintés és telefonszám kattintás számolása (statisztikához)
router.post('/autok/:id/esemeny', esemenyLimit, async (req, res) => {
    const id = idSlugbol(req.params.id);
    const tipus = req.body ? req.body.tipus : null;

    let mezo = null;
    if (tipus === 'megtekintes') {
        mezo = 'megtekintesek';
    } else if (tipus === 'telefon') {
        mezo = 'telefonKattintasok';
    }

    if (!id || !mezo) {
        return res.status(400).json({ hiba: 'Érvénytelen esemény.' });
    }

    // a munkatársak kattintásait nem számoljuk
    if (!munkatars(req)) {
        const noveles = {};
        noveles[mezo] = 1;
        await AutoModel.updateOne({ _id: id }, { $inc: noveles });
    }
    return res.status(204).end();
});

// ---------- Képek (admin) ----------

// képfeltöltés (autóhoz és alkatrészhez is ezt használjuk)
router.post('/kepek', jogSzukseges('hirdetesSzerkesztes', 'alkatreszSzerkesztes'), kepLimit, async (req, res) => {
    const kep = req.body ? req.body.kep : null;
    if (typeof kep !== 'string' || !kep.startsWith('data:image/')) {
        return res.status(400).json({ hiba: 'Érvényes képet kell küldeni.' });
    }
    const feltoltott = await kepFeltoltese(kep);
    return res.status(201).json({ url: feltoltott.secure_url, publicId: feltoltott.public_id });
});

// Feltöltött, de végül nem mentett képek törlése.
// Ha a képet már használja egy autó vagy alkatrész, azt nem töröljük.
router.delete('/kepek', jogSzukseges('hirdetesSzerkesztes', 'alkatreszSzerkesztes'), async (req, res) => {
    let publicIdk = [];
    if (req.body && Array.isArray(req.body.publicIds)) {
        for (const id of req.body.publicIds) {
            if (typeof id === 'string' && id.startsWith('veltrix/autok/')) {
                publicIdk.push(id);
            }
        }
    }
    publicIdk = publicIdk.slice(0, 50);

    const foglalt = await hasznaltKepek(publicIdk);
    const torlendok = publicIdk.filter((id) => !foglalt.has(id));
    await kepekTorlese(torlendok);
    return res.status(204).end();
});

// ---------- Hirdetések kezelése (admin) ----------

// új autó
router.post('/autok', jogSzukseges('hirdetesSzerkesztes'), async (req, res) => {
    const ellenorzes = autoAdatokEllenorzese(req.body);
    if (ellenorzes.hibak.length > 0) {
        return hibasValasz(res, ellenorzes.hibak);
    }
    const adatok = penzugyiMezokKiszurese(req, ellenorzes.adatok);

    if (!(await telephelyLetezik(adatok.telephely))) {
        return hibasValasz(res, ['A kiválasztott telephely nem létezik.']);
    }
    if (await masholHasznalt(adatok.kepek, null)) {
        return hibasValasz(res, ['Egy kép már egy másik hirdetéshez tartozik.']);
    }

    const ujAuto = await AutoModel.create(adatok);

    // akiknek illik a mentett keresésére, kapnak e-mailt (nem várjuk meg)
    if (ujAuto.lathato && ujAuto.statusz !== 'elkelt') {
        ujAutoErtesites(ujAuto);
    }
    return res.status(201).json({ uzenet: 'Autó sikeresen létrehozva!', auto: autoValasz(ujAuto, belsoNezet(req)) });
});

// autó módosítása
router.put('/autok/:id', jogSzukseges('hirdetesSzerkesztes'), async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ hiba: 'Autó nem található!' });
    }

    const ellenorzes = autoAdatokEllenorzese(req.body);
    if (ellenorzes.hibak.length > 0) {
        return hibasValasz(res, ellenorzes.hibak);
    }
    const adatok = penzugyiMezokKiszurese(req, ellenorzes.adatok);

    const auto = await AutoModel.findById(req.params.id);
    if (!auto) {
        return res.status(404).json({ hiba: 'Autó nem található!' });
    }
    if (!(await telephelyLetezik(adatok.telephely))) {
        return hibasValasz(res, ['A kiválasztott telephely nem létezik.']);
    }
    if (await masholHasznalt(adatok.kepek, auto._id)) {
        return hibasValasz(res, ['Egy kép már egy másik hirdetéshez tartozik.']);
    }

    const regiKepek = autoKepei(auto);
    auto.set(adatok);
    const mentettAuto = await auto.save();

    // azokat a képeket, amiket kivettek a hirdetésből, töröljük a Cloudinary-ról
    const megmaradtKepek = autoKepei(mentettAuto);
    const torlendok = regiKepek.filter((id) => !megmaradtKepek.includes(id));
    await kepekTorlese(torlendok);

    return res.status(200).json({ uzenet: 'Autó sikeresen frissítve!', auto: autoValasz(mentettAuto, belsoNezet(req)) });
});

// gyors állapotváltás a listából: státusz, látható, kiemelt, lejárat
router.patch('/autok/:id/allapot', jogSzukseges('hirdetesSzerkesztes'), async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ hiba: 'Autó nem található!' });
    }
    const { adatok, hibak } = allapotEllenorzese(req.body);
    if (hibak.length > 0) {
        return hibasValasz(res, hibak);
    }

    // nem findByIdAndUpdate-et használunk, mert így lefut a modell pre('validate') része
    // (ez tölti ki az eladási adatokat)
    const auto = await AutoModel.findById(req.params.id);
    if (!auto) {
        return res.status(404).json({ hiba: 'Autó nem található!' });
    }
    auto.set(adatok);
    await auto.save();
    return res.status(200).json({ uzenet: 'Állapot frissítve.', auto: autoValasz(auto, belsoNezet(req)) });
});

// autó törlése
router.delete('/autok/:id', jogSzukseges('hirdetesTorles'), async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ hiba: 'Autó nem található!' });
    }
    const auto = await AutoModel.findByIdAndDelete(req.params.id);
    if (!auto) {
        return res.status(404).json({ hiba: 'Autó nem található!' });
    }

    // a kedvencek közül is kivesszük
    await FelhasznaloModel.updateMany({ kedvencek: auto._id }, { $pull: { kedvencek: auto._id } });
    await kepekTorlese(autoKepei(auto));
    return res.status(200).json({ uzenet: 'Autó sikeresen törölve!' });
});

module.exports = router;
