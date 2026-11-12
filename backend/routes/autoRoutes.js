const express = require('express');
const mongoose = require('mongoose');
const AutokModel = require('../models/Autok');
const TelephelyModel = require('../models/Telephely');
const UserModel = require('../models/User');
const { adminRequired } = require('../middlewares/authMiddleware');
const { uploadImage, deleteImagesQuietly } = require('../utils/cloudinary');
const { autoAdatokEllenorzese, allapotEllenorzese } = require('../utils/autoMezok');
const { autoValasz, publikusFeltetelek, rendezesEpitese, szuroEpitese } = require('../utils/autoSzuro');
const { idSlugbol } = require('../utils/slug');
const { ujAutoErtesites } = require('../utils/ertesitesek');
const korlatozo = require('../utils/rateLimit');

const router = express.Router();

const esemenyLimit = korlatozo({ ablakMs: 10 * 60 * 1000, max: 300 });
const kepLimit = korlatozo({ ablakMs: 10 * 60 * 1000, max: 200, uzenet: 'Túl sok képfeltöltés. Próbáld újra később.' });

const TELEPHELY_MEZOK = 'nev iranyitoszam varos cim megye telefon email nyitvatartas szelesseg hosszusag';
const LISTA_TELEPHELY_MEZOK = 'nev varos megye';

const admin = (req) => req.session?.statusz === 'admin';

const hibasValasz = (res, hibak) => res.status(400).json({ error: hibak[0], hibak });

/** Csak olyan képet engedünk menteni, amely nincs egy másik autóhoz rendelve. */
const idegenKepek = async (kepek, sajatId) => {
    const publicIds = kepek.map((kep) => kep.publicId);
    const masik = await AutokModel.findOne({
        _id: { $ne: sajatId },
        $or: [{ 'kepek.publicId': { $in: publicIds } }, { kepPublicId: { $in: publicIds } }],
    }).select('_id');
    return Boolean(masik);
};

const telephelyLetezik = async (id) => !id || Boolean(await TelephelyModel.exists({ _id: id }));

// ---------- Nyilvános lekérdezések ----------

router.get('/autok', async (req, res) => {
    const oldal = Math.max(Number.parseInt(req.query.oldal, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 12, 1), 50);
    const kiemeltek = req.query.kiemelt === '1';

    const szuro = await szuroEpitese(req.query);
    if (kiemeltek) szuro.$and = [...(szuro.$and || []), { kiemelt: true }];

    const [osszes, autok] = await Promise.all([
        AutokModel.countDocuments(szuro),
        AutokModel.find(szuro)
            .sort(rendezesEpitese(req.query.rendezes))
            .skip((oldal - 1) * limit)
            .limit(limit)
            .populate('telephely', LISTA_TELEPHELY_MEZOK),
    ]);

    return res.status(200).json({
        autok: autok.map((auto) => autoValasz(auto)),
        lapozas: { oldal, limit, osszes, oldalak: Math.ceil(osszes / limit) },
    });
});

/** A szűrőpanelhez: elérhető márkák/modellek, megyék, értéktartományok. */
router.get('/autok/szurok', async (req, res) => {
    const alap = { $and: [...publikusFeltetelek(), { statusz: { $ne: 'elkelt' } }] };
    const [markak, tartomanyok, telephelyek] = await Promise.all([
        AutokModel.aggregate([
            { $match: alap },
            { $group: { _id: '$marka', modellek: { $addToSet: '$modell' }, db: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]),
        AutokModel.aggregate([
            { $match: alap },
            {
                $group: {
                    _id: null,
                    minAr: { $min: '$vetel_ar' }, maxAr: { $max: '$vetel_ar' },
                    minEv: { $min: '$evjarat' }, maxEv: { $max: '$evjarat' },
                    maxKm: { $max: '$kmora_allas' }, maxLe: { $max: '$teljesitmeny' },
                },
            },
        ]),
        TelephelyModel.find().select(LISTA_TELEPHELY_MEZOK).sort({ nev: 1 }),
    ]);

    return res.status(200).json({
        markak: markak.map((m) => ({ marka: m._id, db: m.db, modellek: m.modellek.sort((a, b) => a.localeCompare(b, 'hu')) })),
        megyek: [...new Set(telephelyek.map((t) => t.megye))].sort((a, b) => a.localeCompare(b, 'hu')),
        telephelyek,
        tartomanyok: tartomanyok[0] ? { ...tartomanyok[0], _id: undefined } : null,
    });
});

router.get('/autok/:id', async (req, res) => {
    const id = idSlugbol(req.params.id);
    if (!id) {
        return res.status(404).json({ error: 'Autó nem található!' });
    }
    const feltetel = admin(req) ? { _id: id } : { $and: [{ _id: id }, ...publikusFeltetelek()] };
    const auto = await AutokModel.findOne(feltetel).populate('telephely', TELEPHELY_MEZOK);
    if (!auto) {
        return res.status(404).json({ error: 'Autó nem található!' });
    }

    const hasonlok = await AutokModel.find({
        $and: [
            ...publikusFeltetelek(),
            { _id: { $ne: auto._id } },
            { statusz: { $ne: 'elkelt' } },
            { $or: [{ marka: auto.marka }, { kivitel: auto.kivitel, vetel_ar: { $gte: auto.vetel_ar * 0.6, $lte: auto.vetel_ar * 1.4 } }] },
        ],
    }).sort({ createdAt: -1 }).limit(3).populate('telephely', LISTA_TELEPHELY_MEZOK);

    return res.status(200).json({
        auto: autoValasz(auto, { admin: admin(req) }),
        hasonlok: hasonlok.map((elem) => autoValasz(elem)),
    });
});

/** Megtekintés és telefonszám-kattintás számlálása (a frontend munkamenetenként egyszer küldi). */
router.post('/autok/:id/esemeny', esemenyLimit, async (req, res) => {
    const id = idSlugbol(req.params.id);
    const mezo = { megtekintes: 'megtekintesek', telefon: 'telefonKattintasok' }[req.body?.tipus];
    if (!id || !mezo) {
        return res.status(400).json({ error: 'Érvénytelen esemény.' });
    }
    if (!admin(req)) {
        await AutokModel.updateOne({ _id: id }, { $inc: { [mezo]: 1 } });
    }
    return res.status(204).end();
});

// ---------- Képek (admin) ----------

router.post('/kepek', adminRequired, kepLimit, async (req, res) => {
    const kep = req.body?.kep;
    if (typeof kep !== 'string' || !kep.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Érvényes képet kell küldeni.' });
    }
    const feltoltott = await uploadImage(kep);
    return res.status(201).json({ url: feltoltott.secure_url, publicId: feltoltott.public_id });
});

/** Mentés nélkül elvetett, frissen feltöltött képek takarítása. Hirdetéshez tartozó képet nem töröl. */
router.delete('/kepek', adminRequired, async (req, res) => {
    const publicIds = Array.isArray(req.body?.publicIds)
        ? req.body.publicIds.filter((id) => typeof id === 'string' && id.startsWith('veltrix/autok/')).slice(0, 50)
        : [];
    const hasznalt = await AutokModel.find({
        $or: [{ 'kepek.publicId': { $in: publicIds } }, { kepPublicId: { $in: publicIds } }],
    }).select('kepek.publicId kepPublicId');
    const foglalt = new Set(hasznalt.flatMap((auto) => [auto.kepPublicId, ...auto.kepek.map((k) => k.publicId)]));
    await deleteImagesQuietly(publicIds.filter((id) => !foglalt.has(id)));
    return res.status(204).end();
});

// ---------- Hirdetések kezelése (admin) ----------

router.post('/new-auto', adminRequired, async (req, res) => {
    const { adatok, hibak } = autoAdatokEllenorzese(req.body);
    if (hibak.length) return hibasValasz(res, hibak);
    if (!(await telephelyLetezik(adatok.telephely))) return hibasValasz(res, ['A kiválasztott telephely nem létezik.']);
    if (await idegenKepek(adatok.kepek, null)) return hibasValasz(res, ['Egy kép már egy másik hirdetéshez tartozik.']);

    const ujAuto = await AutokModel.create(adatok);
    if (ujAuto.lathato && ujAuto.statusz !== 'elkelt') {
        ujAutoErtesites(ujAuto);
    }
    return res.status(201).json({ message: 'Autó sikeresen létrehozva!', auto: autoValasz(ujAuto, { admin: true }) });
});

router.put('/update-auto/:id', adminRequired, async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ error: 'Autó nem található!' });
    }
    const { adatok, hibak } = autoAdatokEllenorzese(req.body);
    if (hibak.length) return hibasValasz(res, hibak);

    const auto = await AutokModel.findById(req.params.id);
    if (!auto) {
        return res.status(404).json({ error: 'Autó nem található!' });
    }
    if (!(await telephelyLetezik(adatok.telephely))) return hibasValasz(res, ['A kiválasztott telephely nem létezik.']);
    if (await idegenKepek(adatok.kepek, auto._id)) return hibasValasz(res, ['Egy kép már egy másik hirdetéshez tartozik.']);

    const regiKepek = new Set([auto.kepPublicId, ...auto.kepek.map((kep) => kep.publicId)].filter(Boolean));
    auto.set(adatok);
    const updatedAuto = await auto.save();

    const megmaradt = new Set(updatedAuto.kepek.map((kep) => kep.publicId));
    await deleteImagesQuietly([...regiKepek].filter((id) => !megmaradt.has(id)));

    return res.status(200).json({ message: 'Autó sikeresen frissítve!', updatedAuto: autoValasz(updatedAuto, { admin: true }) });
});

/** Gyors állapotváltás: státusz, láthatóság, kiemelés, lejárat. */
router.patch('/autok/:id/allapot', adminRequired, async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ error: 'Autó nem található!' });
    }
    const { adatok, hibak } = allapotEllenorzese(req.body);
    if (hibak.length) return hibasValasz(res, hibak);

    // Betöltés + mentés (nem findByIdAndUpdate), hogy a modell hookja kitöltse/törölje az eladási adatokat.
    const auto = await AutokModel.findById(req.params.id);
    if (!auto) {
        return res.status(404).json({ error: 'Autó nem található!' });
    }
    auto.set(adatok);
    await auto.save();
    return res.status(200).json({ message: 'Állapot frissítve.', auto: autoValasz(auto, { admin: true }) });
});

router.delete('/delete-auto/:id', adminRequired, async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ error: 'Autó nem található!' });
    }
    const auto = await AutokModel.findByIdAndDelete(req.params.id);
    if (!auto) {
        return res.status(404).json({ error: 'Autó nem található!' });
    }

    await UserModel.updateMany({ kedvencek: auto._id }, { $pull: { kedvencek: auto._id } });
    await deleteImagesQuietly([auto.kepPublicId, ...auto.kepek.map((kep) => kep.publicId)]);
    return res.status(200).json({ message: 'Autó sikeresen törölve!' });
});

module.exports = router;
