const express = require('express');
const mongoose = require('mongoose');
const AlkatreszModel = require('../models/Alkatresz');
const AutokModel = require('../models/Autok');
const { jogSzukseges, munkamenetJoga } = require('../middlewares/authMiddleware');
const { deleteImagesQuietly } = require('../utils/cloudinary');
const { masholHasznalt } = require('../utils/kepek');
const { alkatreszSlug, idSlugbol } = require('../utils/slug');
const {
    ALACSONY_KESZLET, KATEGORIAK, alkatreszEllenorzese, gyorsModositasEllenorzese,
} = require('../utils/webshop');

const router = express.Router();

const biztonsagos = (ertek) => String(ertek).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pontosEgyezes = (ertek) => new RegExp(`^${biztonsagos(String(ertek).trim())}$`, 'i');
const lista = (ertek) => String(ertek || '').split(',').map((elem) => elem.trim()).filter(Boolean).slice(0, 12);
const szamVagyNull = (ertek) => (ertek === undefined || ertek === '' || !Number.isFinite(Number(ertek)) ? null : Number(ertek));
const hibasValasz = (res, hibak) => res.status(400).json({ error: hibak[0], hibak });

const RENDEZESEK = {
    ujElol: { kiemelt: -1, createdAt: -1, _id: -1 },
    arNovekvo: { aktualisAr: 1, _id: 1 },
    arCsokkeno: { aktualisAr: -1, _id: -1 },
    nepszeru: { eladottDb: -1, megtekintesek: -1, _id: -1 },
    nevSzerint: { nev: 1, _id: 1 },
};

/**
 * Az autó modellnevének szavankénti elejei: „E46 318CI” → [„E46”, „E46 318CI”].
 * Így a platformra („E46”, „Astra H”) megadott alkatrész a részletesebb nevű autóra is illik.
 */
const modellElotagok = (modell) => {
    const szavak = String(modell).trim().split(/\s+/).filter(Boolean).slice(0, 8);
    return szavak.map((_, i) => szavak.slice(0, i + 1).join(' '));
};

/** Mely alkatrészek illenek egy adott autóra (márka kötelező; modell és évjárat opcionális). */
const autohozFeltetel = ({ marka, modell, evjarat }, { univerzalisIs = true } = {}) => {
    const sor = [{ marka: pontosEgyezes(marka) }];
    if (modell) sor.push({ $or: [{ modell: '' }, { modell: { $in: modellElotagok(modell).map(pontosEgyezes) } }] });
    if (Number.isInteger(evjarat)) {
        sor.push({ $or: [{ evjaratTol: null }, { evjaratTol: { $lte: evjarat } }] });
        sor.push({ $or: [{ evjaratIg: null }, { evjaratIg: { $gte: evjarat } }] });
    }
    const illik = { kompatibilitas: { $elemMatch: { $and: sor } } };
    return univerzalisIs ? { $or: [{ univerzalis: true }, illik] } : illik;
};

const szuroEpitese = (p = {}, { publikus = true } = {}) => {
    const feltetelek = publikus ? [{ lathato: true }] : [];
    const q = typeof p.q === 'string' ? p.q.trim() : '';
    if (q) {
        for (const kifejezes of q.split(/\s+/).slice(0, 6)) {
            const minta = new RegExp(biztonsagos(kifejezes), 'i');
            feltetelek.push({ $or: ['nev', 'gyarto', 'cikkszam', 'rovidLeiras', 'kompatibilitas.marka', 'kompatibilitas.modell'].map((mezo) => ({ [mezo]: minta })) });
        }
    }
    const kategoriak = lista(p.kategoria).filter((k) => Object.hasOwn(KATEGORIAK, k));
    if (kategoriak.length) feltetelek.push({ kategoria: { $in: kategoriak } });
    const gyartok = lista(p.gyarto);
    if (gyartok.length) feltetelek.push({ gyarto: { $in: gyartok.map(pontosEgyezes) } });

    const minAr = szamVagyNull(p.minAr);
    const maxAr = szamVagyNull(p.maxAr);
    if (minAr !== null || maxAr !== null) {
        feltetelek.push({ aktualisAr: { ...(minAr !== null ? { $gte: minAr } : {}), ...(maxAr !== null ? { $lte: maxAr } : {}) } });
    }
    if (p.keszleten === '1') feltetelek.push({ keszlet: { $gt: 0 } });
    if (p.akcios === '1') feltetelek.push({ akciosAr: { $ne: null } });
    if (typeof p.autoMarka === 'string' && p.autoMarka.trim()) {
        const evjarat = Number.parseInt(p.autoEvjarat, 10);
        feltetelek.push(autohozFeltetel({
            marka: p.autoMarka,
            modell: typeof p.autoModell === 'string' ? p.autoModell.trim() : '',
            evjarat: Number.isInteger(evjarat) ? evjarat : null,
        }));
    }
    return feltetelek.length ? { $and: feltetelek } : {};
};

/** A termék válaszformája; nyilvános nézetben a belső adatok nem kerülnek ki. */
const alkatreszValasz = (alkatresz, { belso = false } = {}) => {
    const adat = alkatresz.toObject ? alkatresz.toObject() : { ...alkatresz };
    adat.slug = alkatreszSlug(adat);
    adat.kep = adat.kepek?.[0]?.url || null;
    adat.kategoriaNev = KATEGORIAK[adat.kategoria] || adat.kategoria;
    adat.akcios = adat.akciosAr !== null && adat.akciosAr !== undefined && adat.akciosAr < adat.ar;
    if (!belso) {
        adat.kepek = (adat.kepek || []).map(({ url, tipus, leiras }) => ({ url, tipus, leiras }));
        delete adat.eladottDb;
        delete adat.megtekintesek;
        delete adat.lathato;
        delete adat.__v;
    }
    return adat;
};

// ---------- Nyilvános ----------

router.get('/alkatreszek', async (req, res) => {
    const oldal = Math.max(Number.parseInt(req.query.oldal, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 12, 1), 50);
    const szuro = szuroEpitese(req.query);
    const rendezes = RENDEZESEK[Object.hasOwn(RENDEZESEK, req.query.rendezes) ? req.query.rendezes : 'ujElol'];

    const [osszes, alkatreszek] = await Promise.all([
        AlkatreszModel.countDocuments(szuro),
        AlkatreszModel.find(szuro).sort(rendezes).skip((oldal - 1) * limit).limit(limit),
    ]);
    return res.status(200).json({
        alkatreszek: alkatreszek.map((a) => alkatreszValasz(a)),
        lapozas: { oldal, limit, osszes, oldalak: Math.ceil(osszes / limit) },
    });
});

/** A szűrőpanelhez: kategóriák és gyártók darabszámmal, kompatibilis márkák/modellek, ártartomány. */
router.get('/alkatreszek/szurok', async (req, res) => {
    const alap = { lathato: true };
    const [kategoriak, gyartok, markak, tartomany] = await Promise.all([
        AlkatreszModel.aggregate([{ $match: alap }, { $group: { _id: '$kategoria', db: { $sum: 1 } } }]),
        AlkatreszModel.aggregate([{ $match: alap }, { $group: { _id: '$gyarto', db: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
        AlkatreszModel.aggregate([
            { $match: alap },
            { $unwind: '$kompatibilitas' },
            { $group: { _id: '$kompatibilitas.marka', modellek: { $addToSet: '$kompatibilitas.modell' } } },
            { $sort: { _id: 1 } },
        ]),
        AlkatreszModel.aggregate([{ $match: alap }, { $group: { _id: null, minAr: { $min: '$aktualisAr' }, maxAr: { $max: '$aktualisAr' } } }]),
    ]);
    const db = new Map(kategoriak.map((k) => [k._id, k.db]));
    return res.status(200).json({
        kategoriak: Object.entries(KATEGORIAK).map(([kulcs, nev]) => ({ kulcs, nev, db: db.get(kulcs) || 0 })),
        gyartok: gyartok.map((g) => ({ nev: g._id, db: g.db })),
        markak: markak.map((m) => ({ marka: m._id, modellek: m.modellek.filter(Boolean).sort((a, b) => a.localeCompare(b, 'hu')) })),
        tartomany: tartomany[0] ? { minAr: tartomany[0].minAr, maxAr: tartomany[0].maxAr } : null,
    });
});

/** Egy konkrét autóhoz illő alkatrészek: előbb a kifejezetten erre a típusra valók, aztán az univerzálisak. */
router.get('/alkatreszek/autohoz/:autoId', async (req, res) => {
    const id = idSlugbol(req.params.autoId);
    const auto = id ? await AutokModel.findById(id).select('marka modell evjarat') : null;
    if (!auto) return res.status(404).json({ error: 'Autó nem található!' });

    const limit = 4;
    const specifikus = await AlkatreszModel.find({ $and: [{ lathato: true }, autohozFeltetel(auto, { univerzalisIs: false })] })
        .sort({ kiemelt: -1, eladottDb: -1 }).limit(limit);
    const univerzalis = specifikus.length < limit
        ? await AlkatreszModel.find({ lathato: true, univerzalis: true }).sort({ kiemelt: -1, eladottDb: -1 }).limit(limit - specifikus.length)
        : [];
    return res.status(200).json({
        auto: { marka: auto.marka, modell: auto.modell, evjarat: auto.evjarat },
        alkatreszek: [...specifikus, ...univerzalis].map((a) => alkatreszValasz(a)),
    });
});

router.get('/alkatreszek/:slug', async (req, res) => {
    const id = idSlugbol(req.params.slug);
    const munkatars = munkamenetJoga(req, 'kezelofelulet');
    const alkatresz = id ? await AlkatreszModel.findOne(munkatars ? { _id: id } : { _id: id, lathato: true }) : null;
    if (!alkatresz) return res.status(404).json({ error: 'A termék nem található!' });

    if (!munkatars) await AlkatreszModel.updateOne({ _id: alkatresz._id }, { $inc: { megtekintesek: 1 } });
    const kapcsolodok = await AlkatreszModel.find({ _id: { $ne: alkatresz._id }, lathato: true, kategoria: alkatresz.kategoria })
        .sort({ kiemelt: -1, eladottDb: -1 }).limit(4);
    return res.status(200).json({
        alkatresz: alkatreszValasz(alkatresz, { belso: munkatars }),
        kapcsolodok: kapcsolodok.map((a) => alkatreszValasz(a)),
    });
});

// ---------- Admin ----------

const ervenyesId = (req, res, next) => (mongoose.Types.ObjectId.isValid(req.params.id)
    ? next()
    : res.status(404).json({ error: 'A termék nem található!' }));

const cikkszamFoglalt = (error) => error?.code === 11000 && error?.keyPattern?.cikkszam;

router.get('/admin/alkatreszek', jogSzukseges('alkatreszSzerkesztes'), async (req, res) => {
    const feltetelek = [];
    const alap = szuroEpitese({ q: req.query.q, kategoria: req.query.kategoria }, { publikus: false });
    if (alap.$and) feltetelek.push(...alap.$and);
    if (req.query.keszlet === 'elfogyott') feltetelek.push({ keszlet: 0 });
    if (req.query.keszlet === 'alacsony') feltetelek.push({ keszlet: { $gt: 0, $lte: ALACSONY_KESZLET } });
    if (req.query.lathatosag === 'rejtett') feltetelek.push({ lathato: false });
    if (req.query.lathatosag === 'akcios') feltetelek.push({ akciosAr: { $ne: null } });
    const rendezes = req.query.rendezes === 'keszlet' ? { keszlet: 1, _id: 1 } : RENDEZESEK[req.query.rendezes] || RENDEZESEK.ujElol;

    const alkatreszek = await AlkatreszModel.find(feltetelek.length ? { $and: feltetelek } : {}).sort(rendezes).limit(500);
    return res.status(200).json({ alkatreszek: alkatreszek.map((a) => alkatreszValasz(a, { belso: true })), alacsonyKeszlet: ALACSONY_KESZLET });
});

router.get('/admin/alkatreszek/:id', jogSzukseges('alkatreszSzerkesztes'), ervenyesId, async (req, res) => {
    const alkatresz = await AlkatreszModel.findById(req.params.id);
    if (!alkatresz) return res.status(404).json({ error: 'A termék nem található!' });
    return res.status(200).json({ alkatresz: alkatreszValasz(alkatresz, { belso: true }) });
});

router.post('/admin/alkatreszek', jogSzukseges('alkatreszSzerkesztes'), async (req, res) => {
    const { adatok, hibak } = alkatreszEllenorzese(req.body);
    if (hibak.length) return hibasValasz(res, hibak);
    if (await masholHasznalt(adatok.kepek, null)) return hibasValasz(res, ['Egy kép már egy másik hirdetéshez vagy termékhez tartozik.']);
    try {
        const alkatresz = await AlkatreszModel.create(adatok);
        return res.status(201).json({ message: 'Termék létrehozva.', alkatresz: alkatreszValasz(alkatresz, { belso: true }) });
    } catch (error) {
        if (cikkszamFoglalt(error)) return hibasValasz(res, ['Ezzel a cikkszámmal már van termék.']);
        throw error;
    }
});

router.put('/admin/alkatreszek/:id', jogSzukseges('alkatreszSzerkesztes'), ervenyesId, async (req, res) => {
    const { adatok, hibak } = alkatreszEllenorzese(req.body);
    if (hibak.length) return hibasValasz(res, hibak);
    const alkatresz = await AlkatreszModel.findById(req.params.id);
    if (!alkatresz) return res.status(404).json({ error: 'A termék nem található!' });
    if (await masholHasznalt(adatok.kepek, alkatresz._id)) return hibasValasz(res, ['Egy kép már egy másik hirdetéshez vagy termékhez tartozik.']);

    const regiKepek = new Set(alkatresz.kepek.map((kep) => kep.publicId));
    alkatresz.set(adatok);
    try {
        await alkatresz.save();
    } catch (error) {
        if (cikkszamFoglalt(error)) return hibasValasz(res, ['Ezzel a cikkszámmal már van termék.']);
        throw error;
    }
    const megmaradt = new Set(alkatresz.kepek.map((kep) => kep.publicId));
    await deleteImagesQuietly([...regiKepek].filter((publicId) => !megmaradt.has(publicId)));
    return res.status(200).json({ message: 'Termék mentve.', alkatresz: alkatreszValasz(alkatresz, { belso: true }) });
});

/** Gyors módosítás a listából: készlet, ár, láthatóság, kiemelés. */
router.patch('/admin/alkatreszek/:id', jogSzukseges('alkatreszSzerkesztes'), ervenyesId, async (req, res) => {
    const { adatok, hibak } = gyorsModositasEllenorzese(req.body);
    if (hibak.length) return hibasValasz(res, hibak);
    const alkatresz = await AlkatreszModel.findById(req.params.id);
    if (!alkatresz) return res.status(404).json({ error: 'A termék nem található!' });
    alkatresz.set(adatok);
    if (alkatresz.akciosAr !== null && alkatresz.akciosAr >= alkatresz.ar) {
        return hibasValasz(res, ['Az akciós árnak kisebbnek kell lennie a normál árnál.']);
    }
    await alkatresz.save();
    return res.status(200).json({ alkatresz: alkatreszValasz(alkatresz, { belso: true }) });
});

router.delete('/admin/alkatreszek/:id', jogSzukseges('alkatreszTorles'), ervenyesId, async (req, res) => {
    const alkatresz = await AlkatreszModel.findByIdAndDelete(req.params.id);
    if (!alkatresz) return res.status(404).json({ error: 'A termék nem található!' });
    // A korábbi rendelések a tételadatokat (név, ár, kép URL) saját maguk őrzik.
    await deleteImagesQuietly(alkatresz.kepek.map((kep) => kep.publicId));
    return res.status(200).json({ message: 'Termék törölve.' });
});

module.exports = router;
module.exports.alkatreszValasz = alkatreszValasz;
module.exports.autohozFeltetel = autohozFeltetel;
