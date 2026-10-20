const express = require('express');
const UserModel = require('../models/User');
const publicUser = require('../utils/userResponse');
const { adminRequired } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/felhasznalok', adminRequired, async (req, res) => {
    try {
        const felhasznalok = await UserModel.find().select('-jelszo');
        return res.status(200).json({ felhasznalok });
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

router.post('/new-user', adminRequired, async (req, res) => {
    try {
        const { nev, email, jelszo, statusz } = req.body;
        const newUser = new UserModel({ nev, email, jelszo, statusz });
        await newUser.save();
        return res.status(201).json({ message: 'Felhasználó sikeresen létrehozva!' });
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

router.delete('/delete-user/:id', adminRequired, async (req, res) => {
    try {
        const deletedUser = await UserModel.findByIdAndDelete(req.params.id);
        if (!deletedUser) {
            return res.status(404).json({ error: 'Felhasználó nem található!' });
        }
        return res.status(200).json({ message: 'Felhasználó sikeresen törölve!' });
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

router.put('/update-user/:id', adminRequired, async (req, res) => {
    try {
        const { nev, email, jelszo, statusz } = req.body;
        const user = await UserModel.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Felhasználó nem található!' });
        }

        user.nev = nev;
        user.email = email;
        user.statusz = statusz;
        if (jelszo) {
            user.jelszo = jelszo;
        }
        const updatedUser = await user.save();
        return res.status(200).json({
            message: 'Felhasználó sikeresen frissítve!',
            user: publicUser(updatedUser),
        });
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

module.exports = router;
