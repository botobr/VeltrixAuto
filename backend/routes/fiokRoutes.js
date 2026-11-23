const express = require('express');
const mongoose = require('mongoose');
const AutoModel = require('../models/Auto');
const FelhasznaloModel = require('../models/Felhasznalo');
const { bejelentkezesSzukseges } = require('../middlewares/authMiddleware');
const { autoValasz, parameterekTisztitasa, publikusFeltetelek, szuroEpitese } = require('../utils/autoSzuro');

const router = express.Router();
const MAX_KEDVENC = 200;
const MAX_KERESES = 20;

// a /fiok oldalakhoz be kell jelentkezni
router.use('/fiok', bejelentkezesSzukseges);

const felhasznaloBetoltese = async (req, res) => {
    const felhasznalo = await FelhasznaloModel.findById(req.session.userId);
    if (!felhasznalo) {
        res.status(404).json({ hiba: 'Felhasználó nem található!' });
        return null;
    }
    return felhasznalo;
};

// a kedvencek id-jai szövegként
const kedvencekListaja = (felhasznalo) => {
    const lista = [];
    for (const id of felhasznalo.kedvencek) {
        lista.push(String(id));
    }
    return lista;
};

// ---------- Kedvencek ----------

// kedvenc autók
router.get('/fiok/kedvencek', async (req, res) => {
    const felhasznalo = await FelhasznaloModel.findById(req.session.userId).select('kedvencek');
    if (!felhasznalo) {
        return res.status(404).json({ hiba: 'Felhasználó nem található!' });
    }

    const autok = await AutoModel.find({ $and: [{ _id: { $in: felhasznalo.kedvencek } }, ...publikusFeltetelek()] })
        .populate('telephely', 'nev varos megye');

    // a legutóbb hozzáadott legyen elöl
    const sorrend = kedvencekListaja(felhasznalo);
    autok.sort((a, b) => sorrend.indexOf(String(b._id)) - sorrend.indexOf(String(a._id)));

    return res.status(200).json({ autok: autok.map((auto) => autoValasz(auto)) });
});

// autó hozzáadása a kedvencekhez
router.post('/fiok/kedvencek/:id', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ hiba: 'Autó nem található!' });
    }
    const autoLetezik = await AutoModel.exists({ _id: req.params.id });
    if (!autoLetezik) {
        return res.status(404).json({ hiba: 'Autó nem található!' });
    }

    const felhasznalo = await felhasznaloBetoltese(req, res);
    if (!felhasznalo) {
        return;
    }

    const kedvencek = kedvencekListaja(felhasznalo);
    if (!kedvencek.includes(req.params.id)) {
        if (kedvencek.length >= MAX_KEDVENC) {
            return res.status(400).json({ hiba: 'Legfeljebb ' + MAX_KEDVENC + ' kedvenc menthető.' });
        }
        felhasznalo.kedvencek.push(req.params.id);
        await felhasznalo.save();
    }
    return res.status(200).json({ kedvencek: kedvencekListaja(felhasznalo) });
});

// autó eltávolítása a kedvencek közül
router.delete('/fiok/kedvencek/:id', async (req, res) => {
    const felhasznalo = await felhasznaloBetoltese(req, res);
    if (!felhasznalo) {
        return;
    }
    felhasznalo.kedvencek = felhasznalo.kedvencek.filter((id) => String(id) !== req.params.id);
    await felhasznalo.save();
    return res.status(200).json({ kedvencek: kedvencekListaja(felhasznalo) });
});

// ---------- Mentett keresések ----------

// egy mentett keresés adatai a találatok számával
const keresesValasz = async (kereses) => {
    // a Map-ből sima objektum
    const parameterek = {};
    if (kereses.parameterek) {
        for (const [kulcs, ertek] of kereses.parameterek) {
            parameterek[kulcs] = ertek;
        }
    }

    const szuro = await szuroEpitese(parameterek);
    const osszes = await AutoModel.countDocuments(szuro);
    // az utolsó megnézés óta feltöltött autók
    const uj = await AutoModel.countDocuments({ $and: [szuro, { createdAt: { $gt: kereses.utolsoMegtekintes } }] });

    return {
        _id: kereses._id,
        nev: kereses.nev,
        parameterek: parameterek,
        ertesites: kereses.ertesites,
        utolsoMegtekintes: kereses.utolsoMegtekintes,
        createdAt: kereses.createdAt,
        talalatok: osszes,
        ujTalalatok: uj,
    };
};

// mentett keresések (a legújabb elöl)
router.get('/fiok/keresesek', async (req, res) => {
    const felhasznalo = await felhasznaloBetoltese(req, res);
    if (!felhasznalo) {
        return;
    }

    const keresesek = [];
    for (let i = felhasznalo.mentettKeresesek.length - 1; i >= 0; i--) {
        keresesek.push(await keresesValasz(felhasznalo.mentettKeresesek[i]));
    }
    return res.status(200).json({ keresesek: keresesek });
});

// keresés mentése
router.post('/fiok/keresesek', async (req, res) => {
    const adatok = req.body || {};
    let nev = '';
    if (typeof adatok.nev === 'string') {
        nev = adatok.nev.trim();
    }
    const parameterek = parameterekTisztitasa(adatok.parameterek);
    delete parameterek.rendezes; // a rendezést nem mentjük

    if (!nev || nev.length > 80) {
        return res.status(400).json({ hiba: 'Adj nevet a keresésnek (legfeljebb 80 karakter).' });
    }
    if (Object.keys(parameterek).length === 0) {
        return res.status(400).json({ hiba: 'Állíts be legalább egy szűrőt a mentéshez.' });
    }

    const felhasznalo = await felhasznaloBetoltese(req, res);
    if (!felhasznalo) {
        return;
    }
    if (felhasznalo.mentettKeresesek.length >= MAX_KERESES) {
        return res.status(400).json({ hiba: 'Legfeljebb ' + MAX_KERESES + ' keresés menthető.' });
    }

    felhasznalo.mentettKeresesek.push({
        nev: nev,
        parameterek: parameterek,
        ertesites: adatok.ertesites !== false,
    });
    await felhasznalo.save();

    const kereses = felhasznalo.mentettKeresesek[felhasznalo.mentettKeresesek.length - 1];
    return res.status(201).json({ uzenet: 'Keresés elmentve.', kereses: await keresesValasz(kereses) });
});

// mentett keresés módosítása (értesítés be/ki, átnevezés, megnézve)
router.patch('/fiok/keresesek/:id', async (req, res) => {
    const felhasznalo = await felhasznaloBetoltese(req, res);
    if (!felhasznalo) {
        return;
    }
    const kereses = felhasznalo.mentettKeresesek.id(req.params.id);
    if (!kereses) {
        return res.status(404).json({ hiba: 'Keresés nem található!' });
    }

    const adatok = req.body || {};
    if (typeof adatok.ertesites === 'boolean') {
        kereses.ertesites = adatok.ertesites;
    }
    if (typeof adatok.nev === 'string' && adatok.nev.trim() && adatok.nev.length <= 80) {
        kereses.nev = adatok.nev.trim();
    }
    if (adatok.megtekintve === true) {
        kereses.utolsoMegtekintes = new Date();
    }
    await felhasznalo.save();
    return res.status(200).json({ kereses: await keresesValasz(kereses) });
});

// mentett keresés törlése
router.delete('/fiok/keresesek/:id', async (req, res) => {
    const felhasznalo = await felhasznaloBetoltese(req, res);
    if (!felhasznalo) {
        return;
    }
    const kereses = felhasznalo.mentettKeresesek.id(req.params.id);
    if (!kereses) {
        return res.status(404).json({ hiba: 'Keresés nem található!' });
    }
    kereses.deleteOne();
    await felhasznalo.save();
    return res.status(200).json({ uzenet: 'Keresés törölve.' });
});

module.exports = router;
