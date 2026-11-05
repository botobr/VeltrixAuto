/**
 * Első admin létrehozása (vagy meglévő felhasználó adminná tétele).
 * Használat: npm run admin -- email@pelda.hu "Teljes Név" jelszo123
 */
const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const dbConnection = require('../utils/dbConnect');
const UserModel = require('../models/User');

const [email, nev, jelszo] = process.argv.slice(2);

const futtatas = async () => {
    if (!email || !nev || !jelszo || jelszo.length < 8) {
        console.error('Használat: npm run admin -- email@pelda.hu "Teljes Név" jelszo123 (legalább 8 karakteres jelszó)');
        process.exitCode = 1;
        return;
    }
    await dbConnection();
    const meglevo = await UserModel.findOne({ email: email.trim().toLowerCase() });
    if (meglevo) {
        meglevo.statusz = 'admin';
        await meglevo.save();
        console.log(`${meglevo.email} mostantól admin.`);
    } else {
        await UserModel.create({ nev, email, jelszo, statusz: 'admin' });
        console.log(`Admin létrehozva: ${email}`);
    }
};

futtatas()
    .catch((error) => {
        console.error(`Hiba: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
