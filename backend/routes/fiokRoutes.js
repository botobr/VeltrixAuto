const express = require('express');
const mongoose = require('mongoose');
const AutokModel = require('../models/Autok');
const UserModel = require('../models/User');
const { authRequired } = require('../middlewares/authMiddleware');
const { autoValasz, parameterekTisztitasa, publikusFeltetelek, szuroEpitese } = require('../utils/autoSzuro');

const router = express.Router();
const MAX_KEDVENC = 200;
const MAX_KERESES = 20;

router.use('/fiok', authRequired);

const felhasznaloBetoltese = async (req, res) => {
    const felhasznalo = await UserModel.findById(req.session.userId);
    if (!felhasznalo) {
        res.status(404).json({ error: 'Felhasználó nem található!' });
        return null;
    }
    return felhasznalo;
};

// ---------- Kedvencek ----------

router.get('/fiok/kedvencek', async (req, res) => {
    const felhasznalo = await UserModel.findById(req.session.userId).select('kedvencek');
    if (!felhasznalo) return res.status(404).json({ error: 'Felhasználó nem található!' });

    const autok = await AutokModel.find({ $and: [{ _id: { $in: felhasznalo.kedvencek } }, ...publikusFeltetelek()] })
        .populate('telephely', 'nev varos megye');
    // A felhasználó által mentett sorrend (legutóbb hozzáadott elöl).
    const sorrend = new Map(felhasznalo.kedvencek.map((id, index) => [String(id), index]));
    autok.sort((a, b) => sorrend.get(String(b._id)) - sorrend.get(String(a._id)));
    return res.status(200).json({ autok: autok.map((auto) => autoValasz(auto)) });
});

router.post('/fiok/kedvencek/:id', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id) || !(await AutokModel.exists({ _id: req.params.id }))) {
        return res.status(404).json({ error: 'Autó nem található!' });
    }
    const felhasznalo = await felhasznaloBetoltese(req, res);
    if (!felhasznalo) return undefined;
    if (!felhasznalo.kedvencek.some((id) => String(id) === req.params.id)) {
        if (felhasznalo.kedvencek.length >= MAX_KEDVENC) {
            return res.status(400).json({ error: `Legfeljebb ${MAX_KEDVENC} kedvenc menthető.` });
        }
        felhasznalo.kedvencek.push(req.params.id);
        await felhasznalo.save();
    }
    return res.status(200).json({ kedvencek: felhasznalo.kedvencek.map(String) });
});

router.delete('/fiok/kedvencek/:id', async (req, res) => {
    const felhasznalo = await felhasznaloBetoltese(req, res);
    if (!felhasznalo) return undefined;
    felhasznalo.kedvencek = felhasznalo.kedvencek.filter((id) => String(id) !== req.params.id);
    await felhasznalo.save();
    return res.status(200).json({ kedvencek: felhasznalo.kedvencek.map(String) });
});

// ---------- Mentett keresések ----------

const keresesValasz = async (kereses) => {
    const parameterek = Object.fromEntries(kereses.parameterek || []);
    const szuro = await szuroEpitese(parameterek);
    const [osszes, uj] = await Promise.all([
        AutokModel.countDocuments(szuro),
        AutokModel.countDocuments({ $and: [szuro, { createdAt: { $gt: kereses.utolsoMegtekintes } }] }),
    ]);
    return {
        _id: kereses._id,
        nev: kereses.nev,
        parameterek,
        ertesites: kereses.ertesites,
        utolsoMegtekintes: kereses.utolsoMegtekintes,
        createdAt: kereses.createdAt,
        talalatok: osszes,
        ujTalalatok: uj,
    };
};

router.get('/fiok/keresesek', async (req, res) => {
    const felhasznalo = await felhasznaloBetoltese(req, res);
    if (!felhasznalo) return undefined;
    const keresesek = await Promise.all([...felhasznalo.mentettKeresesek].reverse().map(keresesValasz));
    return res.status(200).json({ keresesek });
});

router.post('/fiok/keresesek', async (req, res) => {
    const nev = typeof req.body?.nev === 'string' ? req.body.nev.trim() : '';
    const parameterek = parameterekTisztitasa(req.body?.parameterek);
    delete parameterek.rendezes;
    if (!nev || nev.length > 80) return res.status(400).json({ error: 'Adj nevet a keresésnek (legfeljebb 80 karakter).' });
    if (Object.keys(parameterek).length === 0) return res.status(400).json({ error: 'Állíts be legalább egy szűrőt a mentéshez.' });

    const felhasznalo = await felhasznaloBetoltese(req, res);
    if (!felhasznalo) return undefined;
    if (felhasznalo.mentettKeresesek.length >= MAX_KERESES) {
        return res.status(400).json({ error: `Legfeljebb ${MAX_KERESES} keresés menthető.` });
    }
    felhasznalo.mentettKeresesek.push({ nev, parameterek, ertesites: req.body?.ertesites !== false });
    await felhasznalo.save();
    const kereses = felhasznalo.mentettKeresesek.at(-1);
    return res.status(201).json({ message: 'Keresés elmentve.', kereses: await keresesValasz(kereses) });
});

router.patch('/fiok/keresesek/:id', async (req, res) => {
    const felhasznalo = await felhasznaloBetoltese(req, res);
    if (!felhasznalo) return undefined;
    const kereses = felhasznalo.mentettKeresesek.id(req.params.id);
    if (!kereses) return res.status(404).json({ error: 'Keresés nem található!' });

    if (typeof req.body?.ertesites === 'boolean') kereses.ertesites = req.body.ertesites;
    if (typeof req.body?.nev === 'string' && req.body.nev.trim() && req.body.nev.length <= 80) kereses.nev = req.body.nev.trim();
    if (req.body?.megtekintve === true) kereses.utolsoMegtekintes = new Date();
    await felhasznalo.save();
    return res.status(200).json({ kereses: await keresesValasz(kereses) });
});

router.delete('/fiok/keresesek/:id', async (req, res) => {
    const felhasznalo = await felhasznaloBetoltese(req, res);
    if (!felhasznalo) return undefined;
    const kereses = felhasznalo.mentettKeresesek.id(req.params.id);
    if (!kereses) return res.status(404).json({ error: 'Keresés nem található!' });
    kereses.deleteOne();
    await felhasznalo.save();
    return res.status(200).json({ message: 'Keresés törölve.' });
});

module.exports = router;
