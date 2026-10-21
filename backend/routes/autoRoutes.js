const express = require('express');
const AutokModel = require('../models/Autok');
const { adminRequired } = require('../middlewares/authMiddleware');
const { uploadImage, deleteImage } = require('../utils/cloudinary');

const router = express.Router();

const szovegMezok = ['marka', 'modell', 'szin', 'kivitel', 'uzemanyag', 'szarmazasi_hely'];
const szamMezok = ['evjarat', 'vetel_ar', 'teljesitmeny', 'hengerur_tartalom', 'kmora_allas'];

const hibasAutoAdatok = (adatok) => {
    const hianyzoSzoveg = szovegMezok.some((mezo) => (
        typeof adatok[mezo] !== 'string' || !adatok[mezo].trim()
    ));
    const hibasSzam = szamMezok.some((mezo) => (
        !Number.isFinite(Number(adatok[mezo])) || Number(adatok[mezo]) < 0
    ));
    return hianyzoSzoveg || hibasSzam;
};

const biztonsagosKereses = (ertek) => (
    String(ertek).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
);

router.get('/autok', async (req, res) => {
    try {
        const { marka, modell, uzemanyag, minAr, maxAr, evjaratTol, evjaratIg, rendezes } = req.query;
        const oldal = Math.max(Number.parseInt(req.query.oldal, 10) || 1, 1);
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 12, 1), 50);
        const szuro = {};

        if (marka) szuro.marka = new RegExp(biztonsagosKereses(marka), 'i');
        if (modell) szuro.modell = new RegExp(biztonsagosKereses(modell), 'i');
        if (uzemanyag) szuro.uzemanyag = new RegExp(biztonsagosKereses(uzemanyag), 'i');
        if (minAr || maxAr) szuro.vetel_ar = {};
        if (minAr && Number.isFinite(Number(minAr))) szuro.vetel_ar.$gte = Number(minAr);
        if (maxAr && Number.isFinite(Number(maxAr))) szuro.vetel_ar.$lte = Number(maxAr);
        if (evjaratTol || evjaratIg) szuro.evjarat = {};
        if (evjaratTol && Number.isFinite(Number(evjaratTol))) szuro.evjarat.$gte = Number(evjaratTol);
        if (evjaratIg && Number.isFinite(Number(evjaratIg))) szuro.evjarat.$lte = Number(evjaratIg);

        const rendezesiMezo = ['arNovekvo', 'arCsokkeno', 'ujElol', 'regiElol'].includes(rendezes)
            ? rendezes
            : 'ujElol';
        const rendezesiSorrend = {
            arNovekvo: { vetel_ar: 1 },
            arCsokkeno: { vetel_ar: -1 },
            ujElol: { createdAt: -1 },
            regiElol: { createdAt: 1 },
        };
        const osszes = await AutokModel.countDocuments(szuro);
        const autok = await AutokModel.find(szuro)
            .sort(rendezesiSorrend[rendezesiMezo])
            .skip((oldal - 1) * limit)
            .limit(limit);

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
        const { marka, modell, szin, kivitel, uzemanyag, szarmazasi_hely, evjarat, vetel_ar, teljesitmeny, hengerur_tartalom, kmora_allas, kep } = req.body;
        const adatok = req.body;
        if (hibasAutoAdatok(adatok)) {
            return res.status(400).json({ error: 'Minden autóadatot helyesen kell megadni.' });
        }
        if (typeof kep !== 'string' || !kep.startsWith('data:image/')) {
            return res.status(400).json({ error: 'Érvényes autóképet kell feltölteni.' });
        }

        const uploadedImage = await uploadImage(kep);
        const newAuto = new AutokModel({
            marka,
            modell,
            szin,
            kivitel,
            uzemanyag,
            szarmazasi_hely,
            evjarat,
            vetel_ar,
            teljesitmeny,
            hengerur_tartalom,
            kmora_allas,
            kep: uploadedImage.secure_url,
            kepPublicId: uploadedImage.public_id,
        });
        await newAuto.save();
        return res.status(201).json({ message: 'Autó sikeresen létrehozva!', auto: newAuto });
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

router.delete('/delete-auto/:id', adminRequired, async (req, res) => {
    try {
        const auto = await AutokModel.findById(req.params.id);
        if (!auto) {
            return res.status(404).json({ error: 'Autó nem található!' });
        }

        await AutokModel.findByIdAndDelete(req.params.id);
        await deleteImage(auto.kepPublicId);
        return res.status(200).json({ message: 'Autó sikeresen törölve!' });
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

router.get('/autok/:id', async (req, res) => {
    try {
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
        const { marka, modell, szin, kivitel, uzemanyag, szarmazasi_hely, evjarat, vetel_ar, teljesitmeny, hengerur_tartalom, kmora_allas, kep } = req.body;
        const adatok = req.body;
        if (hibasAutoAdatok(adatok)) {
            return res.status(400).json({ error: 'Minden autóadatot helyesen kell megadni.' });
        }
        const auto = await AutokModel.findById(req.params.id);
        if (!auto) {
            return res.status(404).json({ error: 'Autó nem található!' });
        }

        auto.marka = marka;
        auto.modell = modell;
        auto.szin = szin;
        auto.kivitel = kivitel;
        auto.uzemanyag = uzemanyag;
        auto.szarmazasi_hely = szarmazasi_hely;
        auto.evjarat = evjarat;
        auto.vetel_ar = vetel_ar;
        auto.teljesitmeny = teljesitmeny;
        auto.hengerur_tartalom = hengerur_tartalom;
        auto.kmora_allas = kmora_allas;

        let regiKepPublicId;
        if (kep && kep.startsWith('data:image/')) {
            const uploadedImage = await uploadImage(kep);
            regiKepPublicId = auto.kepPublicId;
            auto.kep = uploadedImage.secure_url;
            auto.kepPublicId = uploadedImage.public_id;
        }

        const updatedAuto = await auto.save();
        await deleteImage(regiKepPublicId);
        return res.status(200).json({ message: 'Autó sikeresen frissítve!', updatedAuto });
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

module.exports = router;
