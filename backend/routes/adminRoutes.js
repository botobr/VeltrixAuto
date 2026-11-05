const express = require('express');
const AutokModel = require('../models/Autok');
const ErdeklodesModel = require('../models/Erdeklodes');
const UserModel = require('../models/User');
const { adminRequired } = require('../middlewares/authMiddleware');
const { autoValasz, rendezesEpitese, szuroEpitese } = require('../utils/autoSzuro');

const router = express.Router();
router.use('/admin', adminRequired);

/** Minden hirdetés (rejtett és lejárt is), statisztikával és érdeklődésszámmal. */
router.get('/admin/autok', async (req, res) => {
    const feltetelek = [];
    const alap = await szuroEpitese({ q: req.query.q }, { publikus: false });
    if (alap.$and) feltetelek.push(...alap.$and);
    if (['elerheto', 'foglalt', 'elkelt'].includes(req.query.statusz)) feltetelek.push({ statusz: req.query.statusz });
    if (req.query.lathatosag === 'rejtett') feltetelek.push({ lathato: false });
    if (req.query.lathatosag === 'lejart') feltetelek.push({ lejarat: { $lte: new Date() } });
    if (req.query.lathatosag === 'kiemelt') feltetelek.push({ kiemelt: true });
    const szuro = feltetelek.length ? { $and: feltetelek } : {};

    const autok = await AutokModel.find(szuro)
        .sort(req.query.rendezes === 'megtekintes' ? { megtekintesek: -1 } : rendezesEpitese(req.query.rendezes))
        .limit(500)
        .populate('telephely', 'nev varos');

    const erdeklodesek = await ErdeklodesModel.aggregate([
        { $match: { auto: { $in: autok.map((auto) => auto._id) } } },
        { $group: { _id: '$auto', db: { $sum: 1 }, uj: { $sum: { $cond: [{ $eq: ['$statusz', 'uj'] }, 1, 0] } } } },
    ]);
    const erdeklodesSzam = new Map(erdeklodesek.map((elem) => [String(elem._id), elem]));

    return res.status(200).json({
        autok: autok.map((auto) => ({
            ...autoValasz(auto, { admin: true }),
            erdeklodesek: erdeklodesSzam.get(String(auto._id))?.db || 0,
            ujErdeklodesek: erdeklodesSzam.get(String(auto._id))?.uj || 0,
        })),
    });
});

router.get('/admin/statisztika', async (req, res) => {
    const most = new Date();
    const harmincNapja = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    const [statuszok, osszesitett, rejtett, lejart, kiemelt, erdeklodesStatusz, friss, napi, top, felhasznalok] = await Promise.all([
        AutokModel.aggregate([{ $group: { _id: '$statusz', db: { $sum: 1 } } }]),
        AutokModel.aggregate([{
            $group: {
                _id: null,
                megtekintesek: { $sum: '$megtekintesek' },
                telefonKattintasok: { $sum: '$telefonKattintasok' },
                keszletErtek: { $sum: { $cond: [{ $ne: ['$statusz', 'elkelt'] }, '$vetel_ar', 0] } },
            },
        }]),
        AutokModel.countDocuments({ lathato: false }),
        AutokModel.countDocuments({ lejarat: { $lte: most } }),
        AutokModel.countDocuments({ kiemelt: true }),
        ErdeklodesModel.aggregate([{ $group: { _id: '$statusz', db: { $sum: 1 } } }]),
        ErdeklodesModel.countDocuments({ createdAt: { $gte: harmincNapja } }),
        ErdeklodesModel.aggregate([
            { $match: { createdAt: { $gte: harmincNapja } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Europe/Budapest' } }, db: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]),
        AutokModel.find().sort({ megtekintesek: -1 }).limit(5).select('marka modell evjarat megtekintesek telefonKattintasok kepek kep createdAt'),
        UserModel.aggregate([{ $group: { _id: '$statusz', db: { $sum: 1 } } }]),
    ]);

    const szamlalo = (lista) => Object.fromEntries(lista.map((elem) => [elem._id, elem.db]));
    return res.status(200).json({
        autok: { ...szamlalo(statuszok), rejtett, lejart, kiemelt },
        osszesitett: osszesitett[0] ? { ...osszesitett[0], _id: undefined } : { megtekintesek: 0, telefonKattintasok: 0, keszletErtek: 0 },
        erdeklodesek: { ...szamlalo(erdeklodesStatusz), utolso30nap: friss, napi },
        top: top.map((auto) => autoValasz(auto, { admin: true })),
        felhasznalok: szamlalo(felhasznalok),
    });
});

module.exports = router;
