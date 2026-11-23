const express = require('express');
const AutoModel = require('../models/Auto');
const ErdeklodesModel = require('../models/Erdeklodes');
const { jogSzukseges } = require('../middlewares/authMiddleware');
const { vanJoga } = require('../utils/jogosultsagok');
const { autoValasz, rendezesEpitese, szuroEpitese } = require('../utils/autoSzuro');
const { dashboardAdatok } = require('../utils/dashboard');

const router = express.Router();

// az összes /admin útvonalhoz kell a kezelőfelület jog
router.use('/admin', jogSzukseges('kezelofelulet'));

// az összes hirdetés az adminnak (a rejtett és lejárt is), érdeklődések számával
router.get('/admin/autok', async (req, res) => {
    const feltetelek = [];
    const alap = await szuroEpitese({ q: req.query.q }, { publikus: false });
    if (alap.$and) {
        for (const feltetel of alap.$and) {
            feltetelek.push(feltetel);
        }
    }

    const statusz = req.query.statusz;
    if (statusz === 'elerheto' || statusz === 'foglalt' || statusz === 'elkelt') {
        feltetelek.push({ statusz: statusz });
    }
    if (req.query.lathatosag === 'rejtett') {
        feltetelek.push({ lathato: false });
    }
    if (req.query.lathatosag === 'lejart') {
        feltetelek.push({ lejarat: { $lte: new Date() } });
    }
    if (req.query.lathatosag === 'kiemelt') {
        feltetelek.push({ kiemelt: true });
    }

    let szuro = {};
    if (feltetelek.length > 0) {
        szuro = { $and: feltetelek };
    }

    let rendezes;
    if (req.query.rendezes === 'megtekintes') {
        rendezes = { megtekintesek: -1 };
    } else {
        rendezes = rendezesEpitese(req.query.rendezes);
    }

    const autok = await AutoModel.find(szuro)
        .sort(rendezes)
        .limit(500)
        .populate('telephely', 'nev varos');

    // érdeklődések az autókhoz
    const autoIdk = autok.map((auto) => auto._id);
    const erdeklodesek = await ErdeklodesModel.find({ auto: { $in: autoIdk } }).select('auto statusz');

    const penzugy = vanJoga(req.session.statusz, 'penzugy');
    const valasz = [];
    for (const auto of autok) {
        let db = 0;
        let uj = 0;
        for (const erdeklodes of erdeklodesek) {
            if (String(erdeklodes.auto) === String(auto._id)) {
                db++;
                if (erdeklodes.statusz === 'uj') {
                    uj++;
                }
            }
        }

        const adat = autoValasz(auto, { admin: true, penzugy: penzugy });
        adat.erdeklodesek = db;
        adat.ujErdeklodesek = uj;
        valasz.push(adat);
    }

    return res.status(200).json({ autok: valasz });
});

// a dashboard adatai (mindent a szerver számol ki)
router.get('/admin/dashboard', async (req, res) => {
    const adatok = await dashboardAdatok({
        idoszak: req.query.idoszak,
        penzugy: vanJoga(req.session.statusz, 'penzugy'),
    });
    res.set('Cache-Control', 'no-store');
    return res.status(200).json(adatok);
});

module.exports = router;
