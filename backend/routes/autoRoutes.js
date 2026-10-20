const express = require('express');
const AutokModel = require('../models/Autok');
const { adminRequired } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/autok', async (req, res) => {
    try {
        const autok = await AutokModel.find();
        return res.status(200).json({ autok });
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

router.post('/new-auto', adminRequired, async (req, res) => {
    try {
        const { marka, modell, szin, kivitel, uzemanyag, szarmazasi_hely, evjarat, vetel_ar, teljesitmeny, hengerur_tartalom, kmora_allas, kep } = req.body;
        const newAuto = new AutokModel({ marka, modell, szin, kivitel, uzemanyag, szarmazasi_hely, evjarat, vetel_ar, teljesitmeny, hengerur_tartalom, kmora_allas, kep });
        await newAuto.save();
        return res.status(201).json({ message: 'Autó sikeresen létrehozva!' });
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

router.delete('/delete-auto/:id', adminRequired, async (req, res) => {
    try {
        const deletedAuto = await AutokModel.findByIdAndDelete(req.params.id);
        if (!deletedAuto) {
            return res.status(404).json({ error: 'Autó nem található!' });
        }
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
        const updatedAuto = await AutokModel.findByIdAndUpdate(
            req.params.id,
            { marka, modell, szin, kivitel, uzemanyag, szarmazasi_hely, evjarat, vetel_ar, teljesitmeny, hengerur_tartalom, kmora_allas, kep },
            { new: true, runValidators: true },
        );
        if (!updatedAuto) {
            return res.status(404).json({ error: 'Autó nem található!' });
        }
        return res.status(200).json({ message: 'Autó sikeresen frissítve!', updatedAuto });
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

module.exports = router;
