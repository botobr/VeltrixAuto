// Az első admin létrehozása (vagy egy meglévő felhasználó adminná tétele).
// Használat: npm run admin -- email@pelda.hu "Teljes Név" jelszo123

const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const adatbazisKapcsolodas = require('../utils/adatbazis');
const FelhasznaloModel = require('../models/Felhasznalo');

// a parancssorból kapott adatok
const email = process.argv[2];
const nev = process.argv[3];
const jelszo = process.argv[4];

const futtatas = async () => {
    if (!email || !nev || !jelszo || jelszo.length < 8) {
        console.error('Használat: npm run admin -- email@pelda.hu "Teljes Név" jelszo123 (legalább 8 karakteres jelszó)');
        process.exitCode = 1;
        return;
    }

    await adatbazisKapcsolodas();

    const meglevo = await FelhasznaloModel.findOne({ email: email.trim().toLowerCase() });
    if (meglevo) {
        meglevo.statusz = 'admin';
        await meglevo.save();
        console.log(meglevo.email + ' mostantól admin.');
    } else {
        await FelhasznaloModel.create({ nev: nev, email: email, jelszo: jelszo, statusz: 'admin' });
        console.log('Admin létrehozva: ' + email);
    }
};

futtatas()
    .catch((error) => {
        console.error('Hiba: ' + error.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
