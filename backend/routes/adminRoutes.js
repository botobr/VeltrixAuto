const express = require('express');
const AutokModel = require('../models/Autok');
const ErdeklodesModel = require('../models/Erdeklodes');
const { jogSzukseges } = require('../middlewares/authMiddleware');
const { vanJoga } = require('../utils/jogosultsagok');
const { autoValasz, rendezesEpitese, szuroEpitese } = require('../utils/autoSzuro');
const { dashboardAdatok } = require('../utils/dashboard');

const router = express.Router();
router.use('/admin', jogSzukseges('kezelofelulet'));

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
            ...autoValasz(auto, { admin: true, penzugy: vanJoga(req.session.statusz, 'penzugy') }),
            erdeklodesek: erdeklodesSzam.get(String(auto._id))?.db || 0,
            ujErdeklodesek: erdeklodesSzam.get(String(auto._id))?.uj || 0,
        })),
    });
});

/** Dashboard: bevétel, eladások, készlet, érdeklődések – minden számítás a szerveren. */
router.get('/admin/dashboard', async (req, res) => {
    const adatok = await dashboardAdatok({ idoszak: req.query.idoszak, penzugy: vanJoga(req.session.statusz, 'penzugy') });
    res.set('Cache-Control', 'no-store');
    return res.status(200).json(adatok);
});

module.exports = router;
