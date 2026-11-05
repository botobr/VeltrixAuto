const mongoose = require('mongoose');

const ERDEKLODES_STATUSZOK = ['uj', 'folyamatban', 'lezart'];

const erdeklodesSchema = new mongoose.Schema(
    {
        auto: { type: mongoose.Schema.Types.ObjectId, ref: 'auto', required: true, index: true },
        // Az autó neve rögzítve, hogy törölt autónál is olvasható maradjon az érdeklődés.
        autoNev: { type: String, trim: true, default: '' },
        nev: { type: String, required: true, trim: true, maxlength: 100 },
        email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
        telefon: { type: String, trim: true, maxlength: 40, default: '' },
        uzenet: { type: String, required: true, trim: true, maxlength: 3000 },
        felhasznalo: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
        statusz: { type: String, enum: ERDEKLODES_STATUSZOK, default: 'uj', index: true },
        megjegyzes: { type: String, trim: true, maxlength: 2000, default: '' },
    },
    { timestamps: true },
);

const ErdeklodesModel = mongoose.model('erdeklodes', erdeklodesSchema);

module.exports = ErdeklodesModel;
module.exports.ERDEKLODES_STATUSZOK = ERDEKLODES_STATUSZOK;
