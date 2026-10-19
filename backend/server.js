const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const ejs = require('ejs');
const path = require('path');

dotenv.config();
const PORT = process.env.PORT || 3600;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

const dbConnection = require('./utils/dbConnect.js');

dbConnection()
.then(() => {
    console.log('Sikeres adatbázis csatlakozás!');

    app.listen(PORT, () => {
        console.log(`http://localhost:${PORT}/api`);
    });
})
.catch((error) => {
    console.error(`Hiba: ${error.message}`);
});

const AutokModel = require('./models/Autok');
const UserModel = require('./models/User');

// Autok lekerese
app.get('/api/autok', async (req, res) => {
    try {
        const autok = await AutokModel.find();
        return res.status(200).json({autok});
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

// felhasznalok lekerese
app.get('/api/felhasznalok', async (req, res) => {
    try {
        const felhasznalok = await UserModel.find();
        return res.status(200).json({felhasznalok});
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

// felhasznalo letrehozas
app.post('/api/new-user', async (req, res) => {
    try {
        const { nev, email, jelszo, statusz } = req.body;
        const newUser = new UserModel({ nev, email, jelszo, statusz });
        await newUser.save();
        return res.status(201).json({ message: 'Felhasználó sikeresen létrehozva!' });
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

// auto letrehozasa
app.post('/api/new-auto', async (req, res) => {
    try {
        const { marka, modell, szin, kivitel, uzemanyag, szarmazasi_hely, evjarat, vetel_ar, teljesitmeny, hengerur_tartalom, kmora_allas, kep } = req.body;
        const newAuto = new AutokModel({ marka, modell, szin, kivitel, uzemanyag, szarmazasi_hely, evjarat, vetel_ar, teljesitmeny, hengerur_tartalom, kmora_allas, kep });
        await newAuto.save();
        return res.status(201).json({ message: 'Autó sikeresen létrehozva!' });
    } catch (error) {
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

