const mongoose = require('mongoose');
const { FIZETESI_MODOK, RENDELES_STATUSZOK, SZALLITASI_MODOK } = require('../utils/webshop');

const cimSchema = new mongoose.Schema(
    {
        nev: { type: String, trim: true, maxlength: 120, default: '' },
        adoszam: { type: String, trim: true, maxlength: 20, default: '' },
        iranyitoszam: { type: String, trim: true, maxlength: 10, default: '' },
        varos: { type: String, trim: true, maxlength: 60, default: '' },
        cim: { type: String, trim: true, maxlength: 160, default: '' },
    },
    { _id: false },
);

/** A tétel a rendelés pillanatában rögzített adatokkal – a termék későbbi változása nem írja át. */
const tetelSchema = new mongoose.Schema(
    {
        alkatresz: { type: mongoose.Schema.Types.ObjectId, ref: 'alkatresz', required: true },
        nev: { type: String, required: true },
        cikkszam: { type: String, required: true },
        kep: { type: String, default: null },
        egysegar: { type: Number, required: true, min: 0 },
        mennyiseg: { type: Number, required: true, min: 1 },
    },
    { _id: false },
);

const esemenySchema = new mongoose.Schema(
    {
        statusz: { type: String, required: true },
        idopont: { type: Date, default: Date.now },
        megjegyzes: { type: String, default: '' },
    },
    { _id: false },
);

const rendelesSchema = new mongoose.Schema(
    {
        rendelesSzam: { type: String, required: true, unique: true },
        // A visszaigazoló oldal bejelentkezés nélküli megnyitásához (a rendelésszám önmagában kitalálható lenne).
        hozzaferesKulcs: { type: String, required: true, select: false },
        felhasznalo: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null, index: true },

        vevo: {
            nev: { type: String, required: true, trim: true, maxlength: 120 },
            email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
            telefon: { type: String, required: true, trim: true, maxlength: 40 },
        },
        szallitas: {
            mod: { type: String, required: true, enum: Object.keys(SZALLITASI_MODOK) },
            cim: { type: cimSchema, default: null },
            telephely: { type: mongoose.Schema.Types.ObjectId, ref: 'telephely', default: null },
        },
        szamlazasiCim: { type: cimSchema, required: true },

        tetelek: { type: [tetelSchema], required: true },
        osszegek: {
            termekek: { type: Number, required: true },
            szallitas: { type: Number, required: true },
            kezelesiDij: { type: Number, required: true },
            vegosszeg: { type: Number, required: true },
        },

        fizetes: {
            mod: { type: String, required: true, enum: Object.keys(FIZETESI_MODOK) },
            statusz: { type: String, enum: ['fuggo', 'fizetve'], default: 'fuggo' },
            fizetveEkkor: { type: Date, default: null },
            // Online fizetésnél a szolgáltató munkamenet-azonosítója (pl. Stripe Checkout Session).
            munkamenetId: { type: String, default: null, index: true },
        },

        statusz: { type: String, enum: Object.keys(RENDELES_STATUSZOK), required: true, index: true },
        esemenyek: { type: [esemenySchema], default: [] },
        vevoMegjegyzes: { type: String, trim: true, maxlength: 1000, default: '' },
        belsoMegjegyzes: { type: String, trim: true, maxlength: 2000, default: '' },
        // Lemondáskor egyszer adjuk vissza a készletet (ismételt lemondás / webhook ne duplázza).
        keszletVisszaadva: { type: Boolean, default: false },
    },
    { timestamps: true },
);

rendelesSchema.index({ createdAt: -1 });

const RendelesModel = mongoose.model('rendeles', rendelesSchema);

/** Egymást követő rendelésszám: VX-2026-00001 (atomikus számlálóval). */
const szamlaloSchema = new mongoose.Schema({ _id: String, ertek: { type: Number, default: 0 } });
const SzamlaloModel = mongoose.models.szamlalo || mongoose.model('szamlalo', szamlaloSchema);

const kovetkezoRendelesSzam = async (most = new Date()) => {
    const ev = most.getFullYear();
    const szamlalo = await SzamlaloModel.findOneAndUpdate(
        { _id: `rendeles-${ev}` },
        { $inc: { ertek: 1 } },
        { upsert: true, returnDocument: 'after' },
    );
    return `VX-${ev}-${String(szamlalo.ertek).padStart(5, '0')}`;
};

module.exports = RendelesModel;
module.exports.kovetkezoRendelesSzam = kovetkezoRendelesSzam;
