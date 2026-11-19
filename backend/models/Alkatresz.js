const mongoose = require('mongoose');
const { kepSchema } = require('./Autok');
const { KATEGORIAK, egysegar } = require('../utils/webshop');

/** Mely autókra illik: üres modell = a márka minden modellje; üres évjárat = nincs korlát. */
const kompatibilitasSchema = new mongoose.Schema(
    {
        marka: { type: String, required: true, trim: true, maxlength: 60 },
        modell: { type: String, trim: true, maxlength: 80, default: '' },
        evjaratTol: { type: Number, default: null },
        evjaratIg: { type: Number, default: null },
    },
    { _id: false },
);

const parameterSchema = new mongoose.Schema(
    {
        nev: { type: String, required: true, trim: true, maxlength: 60 },
        ertek: { type: String, required: true, trim: true, maxlength: 120 },
    },
    { _id: false },
);

const alkatreszSchema = new mongoose.Schema(
    {
        nev: { type: String, required: true, trim: true, maxlength: 140 },
        cikkszam: { type: String, required: true, trim: true, uppercase: true, maxlength: 40, unique: true },
        gyarto: { type: String, required: true, trim: true, maxlength: 60 },
        kategoria: { type: String, required: true, enum: Object.keys(KATEGORIAK), index: true },
        rovidLeiras: { type: String, trim: true, maxlength: 300, default: '' },
        leiras: { type: String, trim: true, maxlength: 8000, default: '' },

        // Bruttó árak forintban; az akciós ár csak akkor él, ha kisebb a normál árnál.
        ar: { type: Number, required: true, min: 0 },
        akciosAr: { type: Number, min: 0, default: null },
        keszlet: { type: Number, required: true, min: 0, default: 0 },
        // A ténylegesen fizetendő ár (akciós vagy normál) – szűréshez és rendezéshez, mentéskor frissül.
        aktualisAr: { type: Number, default: 0 },

        kepek: { type: [kepSchema], default: [] },
        parameterek: { type: [parameterSchema], default: [] },
        univerzalis: { type: Boolean, default: false },
        kompatibilitas: { type: [kompatibilitasSchema], default: [] },

        lathato: { type: Boolean, default: true },
        kiemelt: { type: Boolean, default: false },

        // Statisztika
        eladottDb: { type: Number, default: 0 },
        megtekintesek: { type: Number, default: 0 },
    },
    { timestamps: true },
);

alkatreszSchema.pre('validate', function () {
    if (this.akciosAr !== null && this.akciosAr >= this.ar) this.akciosAr = null;
    this.aktualisAr = egysegar(this);
});

alkatreszSchema.index({ lathato: 1, kategoria: 1, createdAt: -1 });
alkatreszSchema.index({ aktualisAr: 1 });
alkatreszSchema.index({ 'kompatibilitas.marka': 1 });

const AlkatreszModel = mongoose.model('alkatresz', alkatreszSchema);

module.exports = AlkatreszModel;
