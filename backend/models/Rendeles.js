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

// a tétel adatait elmentjük a rendeléskor, így ha később változik a termék ára, a rendelés nem változik
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
        // titkos kulcs, ezzel lehet bejelentkezés nélkül megnézni a rendelést
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
            // Stripe fizetésnél a Stripe munkamenet azonosítója
            munkamenetId: { type: String, default: null, index: true },
            // kártyás fizetés visszatérítése lemondáskor (Stripe refund)
            visszaterites: {
                id: { type: String, default: null },
                osszeg: { type: Number, default: null },
                ekkor: { type: Date, default: null },
            },
        },

        // a számla adatai (Billingo)
        szamla: {
            id: { type: String, default: null },
            szam: { type: String, default: null },
            kiallitva: { type: Date, default: null },
            sztornoSzam: { type: String, default: null },
            sztornozva: { type: Date, default: null },
            // ha nem sikerült kiállítani, itt az oka (az adminban újra lehet próbálni)
            hiba: { type: String, default: null },
            // igaz, amíg épp készül a számla (hogy ne készüljön kettő)
            folyamatban: { type: Boolean, default: false },
        },

        statusz: { type: String, enum: Object.keys(RENDELES_STATUSZOK), required: true, index: true },
        esemenyek: { type: [esemenySchema], default: [] },
        vevoMegjegyzes: { type: String, trim: true, maxlength: 1000, default: '' },
        belsoMegjegyzes: { type: String, trim: true, maxlength: 2000, default: '' },
        // lemondáskor csak egyszer adjuk vissza a készletet
        keszletVisszaadva: { type: Boolean, default: false },
    },
    { timestamps: true },
);

rendelesSchema.index({ createdAt: -1 });

const RendelesModel = mongoose.model('rendeles', rendelesSchema);

// rendelésszám generálása, pl. VX-2026-00001
// egy külön számlálót növelünk az adatbázisban
const szamlaloSchema = new mongoose.Schema({ _id: String, ertek: { type: Number, default: 0 } });
const SzamlaloModel = mongoose.models.szamlalo || mongoose.model('szamlalo', szamlaloSchema);

const kovetkezoRendelesSzam = async (most = new Date()) => {
    const ev = most.getFullYear();
    const szamlalo = await SzamlaloModel.findOneAndUpdate(
        { _id: `rendeles-${ev}` },
        { $inc: { ertek: 1 } },
        { upsert: true, returnDocument: 'after' },
    );
    const sorszam = String(szamlalo.ertek).padStart(5, '0');
    return 'VX-' + ev + '-' + sorszam;
};

module.exports = RendelesModel;
module.exports.kovetkezoRendelesSzam = kovetkezoRendelesSzam;
