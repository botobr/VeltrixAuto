const mongoose = require('mongoose');
const { HAJTASOK, KEP_TIPUSOK, STATUSZOK, VALTOK } = require('../utils/autoMezok');

const kepSchema = new mongoose.Schema(
    {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        tipus: { type: String, enum: KEP_TIPUSOK, default: 'kulso' },
        leiras: { type: String, trim: true, maxlength: 120, default: '' },
    },
    { _id: false },
);

const kotelezoSzoveg = { type: String, required: true, trim: true };
const kotelezoSzam = { type: Number, required: true, min: 0 };
const opcionalisSzam = { type: Number, min: 0, default: null };

const autokSchema = new mongoose.Schema(
    {
        // Alapadatok
        marka: kotelezoSzoveg,
        modell: kotelezoSzoveg,
        szin: kotelezoSzoveg,
        kivitel: kotelezoSzoveg,
        uzemanyag: kotelezoSzoveg,
        szarmazasi_hely: kotelezoSzoveg,
        evjarat: kotelezoSzam,
        vetel_ar: kotelezoSzam,
        teljesitmeny: kotelezoSzam,
        hengerur_tartalom: kotelezoSzam,
        kmora_allas: kotelezoSzam,

        // Műszaki adatok
        valto: { type: String, enum: [...VALTOK, null], default: null },
        hajtas: { type: String, enum: [...HAJTASOK, null], default: null },
        ajtok_szama: opcionalisSzam,
        ulesek_szama: opcionalisSzam,
        fogyasztas: opcionalisSzam,
        co2: opcionalisSzam,

        // Előélet, állapot
        elso_forgalomba_helyezes: { type: Date, default: null },
        muszaki_vizsga: { type: Date, default: null },
        tulajdonosok_szama: opcionalisSzam,
        szervizkonyv: { type: Boolean, default: null },
        serulesmentes: { type: Boolean, default: null },
        garancia_honap: opcionalisSzam,
        felszereltseg: { type: [String], default: [] },

        // Azonosítás, telephely
        alvazszam: { type: String, trim: true, uppercase: true, default: '' },
        azonosito: { type: String, trim: true, default: '' },
        telephely: { type: mongoose.Schema.Types.ObjectId, ref: 'telephely', default: null },

        // Hirdetés
        statusz: { type: String, enum: STATUSZOK, default: 'elerheto', index: true },
        lathato: { type: Boolean, default: true },
        kiemelt: { type: Boolean, default: false },
        lejarat: { type: Date, default: null },

        // Képek – az első a borítókép. A `kep`/`kepPublicId` a régi, egyképes rekordok miatt maradt meg.
        kepek: { type: [kepSchema], default: [] },
        kep: { type: String },
        kepPublicId: { type: String },

        // Kapcsolattartó (ha eltér a telephelytől)
        elado_nev: { type: String, trim: true, maxlength: 120, default: '' },
        elado_telefonszam: { type: String, trim: true, maxlength: 40, default: '' },
        leiras: { type: String, trim: true, maxlength: 5000, default: '' },

        // Statisztika
        megtekintesek: { type: Number, default: 0 },
        telefonKattintasok: { type: Number, default: 0 },
    },
    { timestamps: true },
);

// Régi rekordok: az egyetlen `kep` mezőből képtömb lesz; a borítókép mindig az első kép.
autokSchema.pre('validate', function () {
    if (this.kepek.length === 0 && this.kep) {
        this.kepek = [{ url: this.kep, publicId: this.kepPublicId || '', tipus: 'kulso' }];
    }
    this.kep = this.kepek[0]?.url;
    this.kepPublicId = this.kepek[0]?.publicId;
});

autokSchema.index({ lathato: 1, statusz: 1, createdAt: -1 });
autokSchema.index({ marka: 1, modell: 1 });

const AutoModel = mongoose.model('auto', autokSchema);

module.exports = AutoModel;
