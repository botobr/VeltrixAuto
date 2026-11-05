const express = require('express');
const mongoose = require('mongoose');
const AutokModel = require('../models/Autok');
const { adminRequired } = require('../middlewares/authMiddleware');
const { uploadImage, deleteImage } = require('../utils/cloudinary');

const router = express.Router();

const szovegMezok = ['marka', 'modell', 'szin', 'kivitel', 'uzemanyag', 'szarmazasi_hely'];
const szamMezok = ['evjarat', 'vetel_ar', 'teljesitmeny', 'hengerur_tartalom', 'kmora_allas'];
const opcionalisMezok = ['elado_nev', 'elado_telefonszam', 'leiras'];
const keresettMezok = ['marka', 'modell', 'uzemanyag', 'kivitel', 'szin'];

const rendezesiSorrend = {
    arNovekvo: { vetel_ar: 1, _id: 1 },
    arCsokkeno: { vetel_ar: -1, _id: -1 },
    ujElol: { createdAt: -1, _id: -1 },
    regiElol: { createdAt: 1, _id: 1 },
    evjaratCsokkeno: { evjarat: -1, _id: -1 },
};

const hibasAutoAdatok = (adatok) => {
    const hianyzoSzoveg = szovegMezok.some((mezo) => (
        typeof adatok[mezo] !== 'string' || !adatok[mezo].trim()
    ));
    const hibasSzam = szamMezok.some((mezo) => (
        adatok[mezo] === '' || adatok[mezo] === null
        || !Number.isFinite(Number(adatok[mezo])) || Number(adatok[mezo]) < 0
    ));
    const hibasOpcionalis = opcionalisMezok.some((mezo) => (
        adatok[mezo] != null && typeof adatok[mezo] !== 'string'
    ));
    return hianyzoSzoveg || hibasSzam || hibasOpcionalis;
};

const autoAdatok = (adatok) => {
    const eredmeny = {};
    for (const mezo of szovegMezok) eredmeny[mezo] = adatok[mezo].trim();
    for (const mezo of szamMezok) eredmeny[mezo] = Number(adatok[mezo]);
    for (const mezo of opcionalisMezok) eredmeny[mezo] = (adatok[mezo] || '').trim();
    return eredmeny;
};

const biztonsagosKereses = (ertek) => (
    String(ertek).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
);

const ervenyesId = (id) => mongoose.Types.ObjectId.isValid(id);

// A kép törlése nem akaszthatja meg a sikeres adatbázis-műveletet.
const kepTorleseCsendben = async (publicId) => {
    try {
        await deleteImage(publicId);
    } catch (error) {
        console.error(`Kép törlése sikertelen (${publicId}): ${error.message}`);
    }
};

router.get('/autok', async (req, res) => {
    try {
        const { q, marka, modell, uzemanyag, minAr, maxAr, evjaratTol, evjaratIg, rendezes } = req.query;
        const oldal = Math.max(Number.parseInt(req.query.oldal, 10) || 1, 1);
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 12, 1), 50);
        const szuro = {};

        if (typeof q === 'string' && q.trim()) {
            const kifejezesek = q.trim().split(/\s+/).slice(0, 6);
            szuro.$and = kifejezesek.map((kifejezes) => {
                const minta = new RegExp(biztonsagosKereses(kifejezes), 'i');
                const feltetelek = keresettMezok.map((mezo) => ({ [mezo]: minta }));
                if (/^\d{4}$/.test(kifejezes)) feltetelek.push({ evjarat: Number(kifejezes) });
                return { $or: feltetelek };
            });
        }
        if (marka) szuro.marka = new RegExp(biztonsagosKereses(marka), 'i');
        if (modell) szuro.modell = new RegExp(biztonsagosKereses(modell), 'i');
        if (uzemanyag) szuro.uzemanyag = new RegExp(biztonsagosKereses(uzemanyag), 'i');
        if (minAr || maxAr) szuro.vetel_ar = {};
        if (minAr && Number.isFinite(Number(minAr))) szuro.vetel_ar.$gte = Number(minAr);
        if (maxAr && Number.isFinite(Number(maxAr))) szuro.vetel_ar.$lte = Number(maxAr);
        if (evjaratTol || evjaratIg) szuro.evjarat = {};
        if (evjaratTol && Number.isFinite(Number(evjaratTol))) szuro.evjarat.$gte = Number(evjaratTol);
        if (evjaratIg && Number.isFinite(Number(evjaratIg))) szuro.evjarat.$lte = Number(evjaratIg);

        const rendezesKulcs = Object.hasOwn(rendezesiSorrend, rendezes) ? rendezes : 'ujElol';
        const [osszes, autok] = await Promise.all([
            AutokModel.countDocuments(szuro),
            AutokModel.find(szuro)
                .sort(rendezesiSorrend[rendezesKulcs])
                .skip((oldal - 1) * limit)
                .limit(limit),
        ]);

        return res.status(200).json({
            autok,
            lapozas: { oldal, limit, osszes, oldalak: Math.ceil(osszes / limit) },
        });
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

router.post('/new-auto', adminRequired, async (req, res) => {
    try {
        const adatok = req.body || {};
        if (hibasAutoAdatok(adatok)) {
            return res.status(400).json({ error: 'Minden autóadatot helyesen kell megadni.' });
        }
        if (typeof adatok.kep !== 'string' || !adatok.kep.startsWith('data:image/')) {
            return res.status(400).json({ error: 'Érvényes autóképet kell feltölteni.' });
        }

        const uploadedImage = await uploadImage(adatok.kep);
        const newAuto = new AutokModel({
            ...autoAdatok(adatok),
            kep: uploadedImage.secure_url,
            kepPublicId: uploadedImage.public_id,
        });
        try {
            await newAuto.save();
        } catch (error) {
            await kepTorleseCsendben(uploadedImage.public_id);
            throw error;
        }
        return res.status(201).json({ message: 'Autó sikeresen létrehozva!', auto: newAuto });
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

router.delete('/delete-auto/:id', adminRequired, async (req, res) => {
    try {
        if (!ervenyesId(req.params.id)) {
            return res.status(404).json({ error: 'Autó nem található!' });
        }
        const auto = await AutokModel.findByIdAndDelete(req.params.id);
        if (!auto) {
            return res.status(404).json({ error: 'Autó nem található!' });
        }

        await kepTorleseCsendben(auto.kepPublicId);
        return res.status(200).json({ message: 'Autó sikeresen törölve!' });
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

router.get('/autok/:id', async (req, res) => {
    try {
        if (!ervenyesId(req.params.id)) {
            return res.status(404).json({ error: 'Autó nem található!' });
        }
        const auto = await AutokModel.findById(req.params.id);
        if (!auto) {
            return res.status(404).json({ error: 'Autó nem található!' });
        }
        return res.status(200).json({ auto });
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

router.put('/update-auto/:id', adminRequired, async (req, res) => {
    try {
        const adatok = req.body || {};
        if (hibasAutoAdatok(adatok)) {
            return res.status(400).json({ error: 'Minden autóadatot helyesen kell megadni.' });
        }
        if (!ervenyesId(req.params.id)) {
            return res.status(404).json({ error: 'Autó nem található!' });
        }
        const auto = await AutokModel.findById(req.params.id);
        if (!auto) {
            return res.status(404).json({ error: 'Autó nem található!' });
        }

        auto.set(autoAdatok(adatok));

        let regiKepPublicId;
        let ujKepPublicId;
        if (typeof adatok.kep === 'string' && adatok.kep.startsWith('data:image/')) {
            const uploadedImage = await uploadImage(adatok.kep);
            regiKepPublicId = auto.kepPublicId;
            ujKepPublicId = uploadedImage.public_id;
            auto.kep = uploadedImage.secure_url;
            auto.kepPublicId = uploadedImage.public_id;
        }

        let updatedAuto;
        try {
            updatedAuto = await auto.save();
        } catch (error) {
            await kepTorleseCsendben(ujKepPublicId);
            throw error;
        }
        await kepTorleseCsendben(regiKepPublicId);
        return res.status(200).json({ message: 'Autó sikeresen frissítve!', updatedAuto });
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

module.exports = router;
