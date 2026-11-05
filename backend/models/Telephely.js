const mongoose = require('mongoose');

const NAPOK = ['hetfo', 'kedd', 'szerda', 'csutortok', 'pentek', 'szombat', 'vasarnap'];

const nyitvatartasSchema = new mongoose.Schema(
    {
        nap: { type: String, enum: NAPOK, required: true },
        zarva: { type: Boolean, default: false },
        nyitas: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: '09:00' },
        zaras: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: '17:00' },
    },
    { _id: false },
);

const telephelySchema = new mongoose.Schema(
    {
        nev: { type: String, required: true, trim: true, maxlength: 80 },
        iranyitoszam: { type: String, trim: true, maxlength: 10, default: '' },
        varos: { type: String, required: true, trim: true, maxlength: 60 },
        cim: { type: String, required: true, trim: true, maxlength: 120 },
        megye: { type: String, required: true, trim: true, maxlength: 40 },
        telefon: { type: String, trim: true, maxlength: 40, default: '' },
        email: { type: String, trim: true, lowercase: true, maxlength: 120, default: '' },
        nyitvatartas: { type: [nyitvatartasSchema], default: [] },
        szelesseg: { type: Number, min: -90, max: 90, default: null },
        hosszusag: { type: Number, min: -180, max: 180, default: null },
    },
    { timestamps: true },
);

const TelephelyModel = mongoose.model('telephely', telephelySchema);

module.exports = TelephelyModel;
module.exports.NAPOK = NAPOK;
