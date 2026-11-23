const express = require('express');
const mongoose = require('mongoose');
const AlkatreszModel = require('../models/Alkatresz');
const AutoModel = require('../models/Auto');
const { jogSzukseges, munkamenetJoga } = require('../middlewares/authMiddleware');
const { kepekTorlese } = require('../utils/cloudinary');
const { masholHasznalt } = require('../utils/kepek');
const { alkatreszSlug, idSlugbol } = require('../utils/slug');
const { ALACSONY_KESZLET, KATEGORIAK, alkatreszEllenorzese, gyorsModositasEllenorzese } = require('../utils/webshop');

const router = express.Router();

const RENDEZESEK = {
    ujElol: { kiemelt: -1, createdAt: -1, _id: -1 },
    arNovekvo: { aktualisAr: 1, _id: 1 },
    arCsokkeno: { aktualisAr: -1, _id: -1 },
    nepszeru: { eladottDb: -1, megtekintesek: -1, _id: -1 },
    nevSzerint: { nev: 1, _id: 1 },
};

// a regex speciális karaktereit levédjük
const biztonsagos = (ertek) => String(ertek).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// pontos egyezés, kis- és nagybetű nem számít
const pontosEgyezes = (ertek) => new RegExp('^' + biztonsagos(String(ertek).trim()) + '$', 'i');

// "a,b,c" -> ['a', 'b', 'c']
const lista = (ertek) => {
    const elemek = [];
    for (const resz of String(ertek || '').split(',')) {
        if (resz.trim()) {
            elemek.push(resz.trim());
        }
    }
    return elemek.slice(0, 12);
};

const szamVagyNull = (ertek) => {
    if (ertek === undefined || ertek === '') {
        return null;
    }
    const szam = Number(ertek);
    if (!Number.isFinite(szam)) {
        return null;
    }
    return szam;
};

const hibasValasz = (res, hibak) => {
    return res.status(400).json({ hiba: hibak[0], hibak: hibak });
};

// A modellnév elejei szavanként, pl. "E46 318CI" -> ["E46", "E46 318CI"].
// Így ha egy alkatrész az "E46"-ra van megadva, az "E46 318CI" autóra is illik.
const modellElotagok = (modell) => {
    const szavak = String(modell).trim().split(/\s+/).slice(0, 8);
    const elotagok = [];
    for (let i = 0; i < szavak.length; i++) {
        if (szavak[i] === '') {
            continue;
        }
        elotagok.push(szavak.slice(0, i + 1).join(' '));
    }
    return elotagok;
};

// Feltétel: melyik alkatrész illik egy autóra (a márka kötelező, a modell és az évjárat nem).
const autohozFeltetel = ({ marka, modell, evjarat }, { univerzalisIs = true } = {}) => {
    const sor = [{ marka: pontosEgyezes(marka) }];

    if (modell) {
        // vagy nincs modell megadva (a márka összes modelljére jó), vagy egyezik
        sor.push({ $or: [{ modell: '' }, { modell: { $in: modellElotagok(modell).map(pontosEgyezes) } }] });
    }
    if (Number.isInteger(evjarat)) {
        sor.push({ $or: [{ evjaratTol: null }, { evjaratTol: { $lte: evjarat } }] });
        sor.push({ $or: [{ evjaratIg: null }, { evjaratIg: { $gte: evjarat } }] });
    }

    const illik = { kompatibilitas: { $elemMatch: { $and: sor } } };
    if (univerzalisIs) {
        return { $or: [{ univerzalis: true }, illik] };
    }
    return illik;
};

// szűrő a webshop listához
const szuroEpitese = (p = {}, { publikus = true } = {}) => {
    const feltetelek = [];
    if (publikus) {
        feltetelek.push({ lathato: true });
    }

    // szabadszavas keresés
    let q = '';
    if (typeof p.q === 'string') {
        q = p.q.trim();
    }
    if (q) {
        const szavak = q.split(/\s+/).slice(0, 6);
        for (const szo of szavak) {
            const minta = new RegExp(biztonsagos(szo), 'i');
            feltetelek.push({
                $or: [
                    { nev: minta },
                    { gyarto: minta },
                    { cikkszam: minta },
                    { rovidLeiras: minta },
                    { 'kompatibilitas.marka': minta },
                    { 'kompatibilitas.modell': minta },
                ],
            });
        }
    }

    // csak a létező kategóriákat fogadjuk el
    const kategoriak = lista(p.kategoria).filter((kategoria) => Object.hasOwn(KATEGORIAK, kategoria));
    if (kategoriak.length > 0) {
        feltetelek.push({ kategoria: { $in: kategoriak } });
    }

    const gyartok = lista(p.gyarto);
    if (gyartok.length > 0) {
        feltetelek.push({ gyarto: { $in: gyartok.map(pontosEgyezes) } });
    }

    const minAr = szamVagyNull(p.minAr);
    const maxAr = szamVagyNull(p.maxAr);
    if (minAr !== null || maxAr !== null) {
        const arFeltetel = {};
        if (minAr !== null) {
            arFeltetel.$gte = minAr;
        }
        if (maxAr !== null) {
            arFeltetel.$lte = maxAr;
        }
        feltetelek.push({ aktualisAr: arFeltetel });
    }

    if (p.keszleten === '1') {
        feltetelek.push({ keszlet: { $gt: 0 } });
    }
    if (p.akcios === '1') {
        feltetelek.push({ akciosAr: { $ne: null } });
    }

    // "melyik autómhoz jó" szűrő
    if (typeof p.autoMarka === 'string' && p.autoMarka.trim()) {
        let modell = '';
        if (typeof p.autoModell === 'string') {
            modell = p.autoModell.trim();
        }
        let evjarat = Number.parseInt(p.autoEvjarat, 10);
        if (!Number.isInteger(evjarat)) {
            evjarat = null;
        }
        feltetelek.push(autohozFeltetel({ marka: p.autoMarka, modell: modell, evjarat: evjarat }));
    }

    if (feltetelek.length === 0) {
        return {};
    }
    return { $and: feltetelek };
};

// A termék adatai a frontendnek. Sima látogató nem látja a belső adatokat.
const alkatreszValasz = (alkatresz, { belso = false } = {}) => {
    let adat;
    if (alkatresz.toObject) {
        adat = alkatresz.toObject();
    } else {
        adat = { ...alkatresz };
    }
    if (!adat.kepek) {
        adat.kepek = [];
    }

    adat.slug = alkatreszSlug(adat);
    adat.kep = null;
    if (adat.kepek.length > 0) {
        adat.kep = adat.kepek[0].url;
    }
    adat.kategoriaNev = KATEGORIAK[adat.kategoria] || adat.kategoria;
    adat.akcios = adat.akciosAr !== null && adat.akciosAr !== undefined && adat.akciosAr < adat.ar;

    if (!belso) {
        adat.kepek = adat.kepek.map((kep) => ({ url: kep.url, tipus: kep.tipus, leiras: kep.leiras }));
        delete adat.eladottDb;
        delete adat.megtekintesek;
        delete adat.lathato;
        delete adat.__v;
    }
    return adat;
};

// ---------- Nyilvános ----------

// termékek listája szűréssel és lapozással
router.get('/alkatreszek', async (req, res) => {
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

    const szuro = szuroEpitese(req.query);
    let rendezes = RENDEZESEK.ujElol;
    if (Object.hasOwn(RENDEZESEK, req.query.rendezes)) {
        rendezes = RENDEZESEK[req.query.rendezes];
    }

    const osszes = await AlkatreszModel.countDocuments(szuro);
    const alkatreszek = await AlkatreszModel.find(szuro).sort(rendezes).skip((oldal - 1) * limit).limit(limit);

    return res.status(200).json({
        alkatreszek: alkatreszek.map((alkatresz) => alkatreszValasz(alkatresz)),
        lapozas: { oldal: oldal, limit: limit, osszes: osszes, oldalak: Math.ceil(osszes / limit) },
    });
});

// a szűrőpanel adatai: kategóriák, gyártók, márkák, ártartomány
router.get('/alkatreszek/szurok', async (req, res) => {
    const alkatreszek = await AlkatreszModel.find({ lathato: true }).select('kategoria gyarto kompatibilitas aktualisAr');

    // kategóriánként hány termék van
    const kategoriak = [];
    for (const kulcs in KATEGORIAK) {
        let db = 0;
        for (const alkatresz of alkatreszek) {
            if (alkatresz.kategoria === kulcs) {
                db++;
            }
        }
        kategoriak.push({ kulcs: kulcs, nev: KATEGORIAK[kulcs], db: db });
    }

    // gyártók darabszámmal
    const gyartok = [];
    for (const alkatresz of alkatreszek) {
        const gyarto = gyartok.find((elem) => elem.nev === alkatresz.gyarto);
        if (gyarto) {
            gyarto.db++;
        } else {
            gyartok.push({ nev: alkatresz.gyarto, db: 1 });
        }
    }
    gyartok.sort((a, b) => (a.nev < b.nev ? -1 : 1));

    // melyik autómárkákhoz és modellekhez vannak alkatrészek
    const markak = [];
    for (const alkatresz of alkatreszek) {
        for (const sor of alkatresz.kompatibilitas) {
            let marka = markak.find((elem) => elem.marka === sor.marka);
            if (!marka) {
                marka = { marka: sor.marka, modellek: [] };
                markak.push(marka);
            }
            if (sor.modell && !marka.modellek.includes(sor.modell)) {
                marka.modellek.push(sor.modell);
            }
        }
    }
    markak.sort((a, b) => (a.marka < b.marka ? -1 : 1));
    for (const marka of markak) {
        marka.modellek.sort((a, b) => a.localeCompare(b, 'hu'));
    }

    // legkisebb és legnagyobb ár
    let tartomany = null;
    for (const alkatresz of alkatreszek) {
        if (tartomany === null) {
            tartomany = { minAr: alkatresz.aktualisAr, maxAr: alkatresz.aktualisAr };
        } else {
            tartomany.minAr = Math.min(tartomany.minAr, alkatresz.aktualisAr);
            tartomany.maxAr = Math.max(tartomany.maxAr, alkatresz.aktualisAr);
        }
    }

    return res.status(200).json({
        kategoriak: kategoriak,
        gyartok: gyartok,
        markak: markak,
        tartomany: tartomany,
    });
});

// Egy autóhoz illő alkatrészek az autó adatlapjára.
// Először a kifejezetten erre az autóra valók, ha nincs elég, akkor az univerzálisak.
router.get('/alkatreszek/autohoz/:autoId', async (req, res) => {
    const id = idSlugbol(req.params.autoId);
    let auto = null;
    if (id) {
        auto = await AutoModel.findById(id).select('marka modell evjarat');
    }
    if (!auto) {
        return res.status(404).json({ hiba: 'Autó nem található!' });
    }

    const limit = 4;
    const specifikus = await AlkatreszModel.find({ $and: [{ lathato: true }, autohozFeltetel(auto, { univerzalisIs: false })] })
        .sort({ kiemelt: -1, eladottDb: -1 })
        .limit(limit);

    let univerzalis = [];
    if (specifikus.length < limit) {
        univerzalis = await AlkatreszModel.find({ lathato: true, univerzalis: true })
            .sort({ kiemelt: -1, eladottDb: -1 })
            .limit(limit - specifikus.length);
    }

    const alkatreszek = [];
    for (const alkatresz of specifikus) {
        alkatreszek.push(alkatreszValasz(alkatresz));
    }
    for (const alkatresz of univerzalis) {
        alkatreszek.push(alkatreszValasz(alkatresz));
    }

    return res.status(200).json({
        auto: { marka: auto.marka, modell: auto.modell, evjarat: auto.evjarat },
        alkatreszek: alkatreszek,
    });
});

// egy termék adatlapja és a hasonló termékek
router.get('/alkatreszek/:slug', async (req, res) => {
    const id = idSlugbol(req.params.slug);
    const munkatars = munkamenetJoga(req, 'kezelofelulet');

    let alkatresz = null;
    if (id) {
        if (munkatars) {
            // a munkatárs a rejtett termékeket is megnézheti
            alkatresz = await AlkatreszModel.findOne({ _id: id });
        } else {
            alkatresz = await AlkatreszModel.findOne({ _id: id, lathato: true });
        }
    }
    if (!alkatresz) {
        return res.status(404).json({ hiba: 'A termék nem található!' });
    }

    if (!munkatars) {
        await AlkatreszModel.updateOne({ _id: alkatresz._id }, { $inc: { megtekintesek: 1 } });
    }

    const kapcsolodok = await AlkatreszModel.find({ _id: { $ne: alkatresz._id }, lathato: true, kategoria: alkatresz.kategoria })
        .sort({ kiemelt: -1, eladottDb: -1 })
        .limit(4);

    return res.status(200).json({
        alkatresz: alkatreszValasz(alkatresz, { belso: munkatars }),
        kapcsolodok: kapcsolodok.map((elem) => alkatreszValasz(elem)),
    });
});

// ---------- Admin ----------

// ha az id nem érvényes MongoDB id, egyből 404
const ervenyesId = (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ hiba: 'A termék nem található!' });
    }
    next();
};

// a 11000-es hiba azt jelenti, hogy már van ilyen cikkszám
const cikkszamFoglalt = (error) => {
    return error && error.code === 11000 && error.keyPattern && error.keyPattern.cikkszam;
};

// termékek az admin listához
router.get('/admin/alkatreszek', jogSzukseges('alkatreszSzerkesztes'), async (req, res) => {
    const feltetelek = [];
    const alap = szuroEpitese({ q: req.query.q, kategoria: req.query.kategoria }, { publikus: false });
    if (alap.$and) {
        for (const feltetel of alap.$and) {
            feltetelek.push(feltetel);
        }
    }

    if (req.query.keszlet === 'elfogyott') {
        feltetelek.push({ keszlet: 0 });
    }
    if (req.query.keszlet === 'alacsony') {
        feltetelek.push({ keszlet: { $gt: 0, $lte: ALACSONY_KESZLET } });
    }
    if (req.query.lathatosag === 'rejtett') {
        feltetelek.push({ lathato: false });
    }
    if (req.query.lathatosag === 'akcios') {
        feltetelek.push({ akciosAr: { $ne: null } });
    }

    let rendezes = RENDEZESEK.ujElol;
    if (req.query.rendezes === 'keszlet') {
        rendezes = { keszlet: 1, _id: 1 };
    } else if (RENDEZESEK[req.query.rendezes]) {
        rendezes = RENDEZESEK[req.query.rendezes];
    }

    let szuro = {};
    if (feltetelek.length > 0) {
        szuro = { $and: feltetelek };
    }

    const alkatreszek = await AlkatreszModel.find(szuro).sort(rendezes).limit(500);
    return res.status(200).json({
        alkatreszek: alkatreszek.map((alkatresz) => alkatreszValasz(alkatresz, { belso: true })),
        alacsonyKeszlet: ALACSONY_KESZLET,
    });
});

// egy termék a szerkesztőhöz
router.get('/admin/alkatreszek/:id', jogSzukseges('alkatreszSzerkesztes'), ervenyesId, async (req, res) => {
    const alkatresz = await AlkatreszModel.findById(req.params.id);
    if (!alkatresz) {
        return res.status(404).json({ hiba: 'A termék nem található!' });
    }
    return res.status(200).json({ alkatresz: alkatreszValasz(alkatresz, { belso: true }) });
});

// új termék
router.post('/admin/alkatreszek', jogSzukseges('alkatreszSzerkesztes'), async (req, res) => {
    const { adatok, hibak } = alkatreszEllenorzese(req.body);
    if (hibak.length > 0) {
        return hibasValasz(res, hibak);
    }
    if (await masholHasznalt(adatok.kepek, null)) {
        return hibasValasz(res, ['Egy kép már egy másik hirdetéshez vagy termékhez tartozik.']);
    }

    try {
        const alkatresz = await AlkatreszModel.create(adatok);
        return res.status(201).json({ uzenet: 'Termék létrehozva.', alkatresz: alkatreszValasz(alkatresz, { belso: true }) });
    } catch (error) {
        if (cikkszamFoglalt(error)) {
            return hibasValasz(res, ['Ezzel a cikkszámmal már van termék.']);
        }
        throw error;
    }
});

// termék módosítása
router.put('/admin/alkatreszek/:id', jogSzukseges('alkatreszSzerkesztes'), ervenyesId, async (req, res) => {
    const { adatok, hibak } = alkatreszEllenorzese(req.body);
    if (hibak.length > 0) {
        return hibasValasz(res, hibak);
    }

    const alkatresz = await AlkatreszModel.findById(req.params.id);
    if (!alkatresz) {
        return res.status(404).json({ hiba: 'A termék nem található!' });
    }
    if (await masholHasznalt(adatok.kepek, alkatresz._id)) {
        return hibasValasz(res, ['Egy kép már egy másik hirdetéshez vagy termékhez tartozik.']);
    }

    const regiKepek = alkatresz.kepek.map((kep) => kep.publicId);
    alkatresz.set(adatok);
    try {
        await alkatresz.save();
    } catch (error) {
        if (cikkszamFoglalt(error)) {
            return hibasValasz(res, ['Ezzel a cikkszámmal már van termék.']);
        }
        throw error;
    }

    // a kivett képeket töröljük
    const megmaradtKepek = alkatresz.kepek.map((kep) => kep.publicId);
    const torlendok = regiKepek.filter((publicId) => !megmaradtKepek.includes(publicId));
    await kepekTorlese(torlendok);

    return res.status(200).json({ uzenet: 'Termék mentve.', alkatresz: alkatreszValasz(alkatresz, { belso: true }) });
});

// gyors módosítás a listából: készlet, ár, látható, kiemelt
router.patch('/admin/alkatreszek/:id', jogSzukseges('alkatreszSzerkesztes'), ervenyesId, async (req, res) => {
    const { adatok, hibak } = gyorsModositasEllenorzese(req.body);
    if (hibak.length > 0) {
        return hibasValasz(res, hibak);
    }

    const alkatresz = await AlkatreszModel.findById(req.params.id);
    if (!alkatresz) {
        return res.status(404).json({ hiba: 'A termék nem található!' });
    }

    alkatresz.set(adatok);
    if (alkatresz.akciosAr !== null && alkatresz.akciosAr >= alkatresz.ar) {
        return hibasValasz(res, ['Az akciós árnak kisebbnek kell lennie a normál árnál.']);
    }
    await alkatresz.save();
    return res.status(200).json({ alkatresz: alkatreszValasz(alkatresz, { belso: true }) });
});

// termék törlése
router.delete('/admin/alkatreszek/:id', jogSzukseges('alkatreszTorles'), ervenyesId, async (req, res) => {
    const alkatresz = await AlkatreszModel.findByIdAndDelete(req.params.id);
    if (!alkatresz) {
        return res.status(404).json({ hiba: 'A termék nem található!' });
    }
    // a régi rendelésekben benne van a termék neve, ára és képe, így azok nem romlanak el
    await kepekTorlese(alkatresz.kepek.map((kep) => kep.publicId));
    return res.status(200).json({ uzenet: 'Termék törölve.' });
});

module.exports = router;
module.exports.alkatreszValasz = alkatreszValasz;
module.exports.autohozFeltetel = autohozFeltetel;
