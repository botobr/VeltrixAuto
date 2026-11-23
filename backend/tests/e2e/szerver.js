// Tesztszerver a Cypress (E2E) tesztekhez.
// A mi app.js-ünket indítja el, de memóriában futó MongoDB-vel és saját tesztadatokkal.
// Az igazi adatbázishoz, Cloudinary-hoz és Stripe-hoz nem nyúl.
//
// Indítás: node tests/e2e/szerver.js  (a frontendben az `npm run e2e` magától elindítja)
// Port: 3601, a frontend címe: http://localhost:5174
//
// Csak a tesztekhez való végpontok:
//   POST /__e2e/visszaallitas          – adatbázis ürítése és újratöltése
//   GET  /__e2e/rendelesek/utolso      – a legutóbbi rendelés
//   POST /__e2e/fizetes/:munkamenetId  – Stripe visszajelzés küldése ({ tipus: 'sikeres' | 'lejart' })
//   GET  /__e2e/levelek                – az eddig "elküldött" e-mailek
const PORT = Number(process.env.E2E_API_PORT) || 3601;
const FRONTEND = process.env.E2E_FRONTEND_URL || 'http://localhost:5174';
const WEBHOOK_TITOK = 'whsec_e2e_teszt';

process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = FRONTEND;
process.env.CLOUDINARY_API_CLOUD_NAME = 'e2e';
process.env.STRIPE_SECRET_KEY = 'sk_test_e2e';
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_TITOK;
process.env.BANKSZAMLASZAM = '11773016-12345678-00000000';
process.env.BANKSZAMLA_KEDVEZMENYEZETT = 'Veltrix Autó Kft.';
delete process.env.ERTESITESI_EMAIL;
delete process.env.BILLINGO_API_KEY;
delete process.env.BILLINGO_BLOCK_ID;

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const session = require('express-session');
const Stripe = require('stripe');

// ---------- A külső szolgáltatások lecserélése (az app betöltése előtt kell!) ----------

const cloudinary = require('../../utils/cloudinary');

cloudinary.kepekTorlese = async () => {};
cloudinary.kepFeltoltese = async () => {
    return {
        secure_url: 'https://res.cloudinary.com/e2e/image/upload/v1/veltrix/autok/feltoltott.jpg',
        public_id: 'veltrix/autok/feltoltott',
    };
};

// az e-maileket nem küldjük el, csak eltesszük ebbe a tömbbe
const levelek = [];
const email = require('../../utils/email');

email.emailKuldes = async ({ cimzett, targy, szoveg }) => {
    let cimzettek = [cimzett];
    if (Array.isArray(cimzett)) {
        cimzettek = cimzett;
    }
    levelek.push({ cimzett: cimzettek, targy: targy, szoveg: szoveg, idopont: new Date().toISOString() });
    return true;
};

// A Stripe fizetőoldal helyett rögtön visszaküldjük a vevőt a "sikeres fizetés" oldalra.
// A "fizetve" jelzést a teszt küldi el (/__e2e/fizetes/...).
const fizetes = require('../../utils/fizetes');

let munkamenetSorszam = 0;
fizetes.fizetesInditasa = async (rendeles, kulcs) => {
    munkamenetSorszam++;
    return {
        url: FRONTEND + '/rendeles/' + encodeURIComponent(rendeles.rendelesSzam) + '?kulcs=' + kulcs + '&fizetes=siker',
        munkamenetId: 'cs_e2e_' + munkamenetSorszam,
    };
};

// a visszatérítést sem küldjük el a Stripe-nak
fizetes.visszaterites = async () => {
    return { id: 're_e2e_' + Date.now(), osszeg: null };
};

console.info = () => {};

const appLetrehozasa = require('../../app');
const { korlatokTorlese } = require('../../utils/rateLimit');
const { belepesiProbalkozasokTorlese } = require('../../routes/authRoutes');
const AlkatreszModel = require('../../models/Alkatresz');
const AutoModel = require('../../models/Auto');
const RendelesModel = require('../../models/Rendeles');
const TelephelyModel = require('../../models/Telephely');
const FelhasznaloModel = require('../../models/Felhasznalo');

// ---------- Mintaadatok ----------

const JELSZO = 'Teszt1234';
const FELHASZNALOK = [
    { nev: 'Admin Anna', email: 'admin@teszt.hu', statusz: 'admin' },
    { nev: 'Értékesítő Ede', email: 'ertekesito@teszt.hu', statusz: 'ertekesito' },
    { nev: 'Vásárló Vilma', email: 'vasarlo@teszt.hu', statusz: 'felhasznalo' },
];

// egyszerű kép (egy színes kör felirattal), hogy ne kelljen internetről képet tölteni
const svg = (felirat, szin) => {
    const kod = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">'
        + '<rect width="800" height="600" fill="#f4f1e8"/>'
        + '<circle cx="400" cy="290" r="170" fill="' + szin + '"/>'
        + '<text x="400" y="540" font-family="Arial" font-size="40" text-anchor="middle" fill="#333">' + felirat + '</text>'
        + '</svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(kod);
};

let kepSorszam = 0;
const kepek = (felirat, szin) => {
    kepSorszam++;
    return [{ url: svg(felirat, szin), publicId: 'veltrix/autok/e2e-' + kepSorszam, tipus: 'kulso', leiras: '' }];
};

// egy autó alap adatai, amit a megadott adatok felülírnak
const auto = (adatok) => {
    const alap = {
        szin: 'Fekete',
        kivitel: 'Coupe',
        uzemanyag: 'Benzin',
        szarmazasi_hely: 'Németország',
        teljesitmeny: 143,
        hengerur_tartalom: 1995,
        kmora_allas: 180000,
    };
    return { ...alap, ...adatok };
};

// az mongodb id-k szövegként: { kulcs: 'id' }
const azonositok = (lista) => {
    const eredmeny = {};
    for (const kulcs in lista) {
        eredmeny[kulcs] = String(lista[kulcs]._id);
    }
    return eredmeny;
};

const adatfeltoltes = async () => {
    kepSorszam = 0;
    for (const felhasznalo of FELHASZNALOK) {
        await FelhasznaloModel.create({ ...felhasznalo, jelszo: JELSZO });
    }
    const telephely = await TelephelyModel.create({
        nev: 'Veltrix Budaörs', iranyitoszam: '2040', varos: 'Budaörs', cim: 'Szabadság út 1.', megye: 'Pest', telefon: '+36 1 234 5678', szelesseg: 47.4613, hosszusag: 18.9583,
    });

    const autok = {
        bmw: await AutoModel.create(auto({ marka: 'BMW', modell: 'E46 318CI', evjarat: 2001, vetel_ar: 2490000, kiemelt: true, telephely: telephely._id, kepek: kepek('BMW', '#2f6fd6') })),
        golf: await AutoModel.create(auto({ marka: 'Volkswagen', modell: 'Golf', evjarat: 2016, vetel_ar: 6490000, kivitel: 'Ferdehátú', kmora_allas: 98000, telephely: telephely._id, kepek: kepek('Golf', '#d8d8d8') })),
        astra: await AutoModel.create(auto({ marka: 'Opel', modell: 'Astra H OPC', evjarat: 2010, vetel_ar: 3990000, statusz: 'foglalt', kepek: kepek('Opel', '#e0b030') })),
        audi: await AutoModel.create(auto({ marka: 'Audi', modell: 'S3', evjarat: 2001, vetel_ar: 2990000, statusz: 'elkelt', eladasi_ar: 2850000, kepek: kepek('Audi', '#aa2222') })),
    };

    const e46 = [{ marka: 'BMW', modell: 'E46', evjaratTol: 1998, evjaratIg: 2006 }];
    const alkatresz = (adatok) => {
        return AlkatreszModel.create({ kepek: kepek(adatok.gyarto, '#c99a35'), ...adatok });
    };
    const alkatreszek = {
        futomu: await alkatresz({
            nev: 'V3 állítható menetes futómű – BMW 3-as (E46)', cikkszam: 'KW-E2E-1', gyarto: 'KW', kategoria: 'futomu', ar: 649000, akciosAr: 589000, keszlet: 3, kiemelt: true,
            rovidLeiras: 'Magasság, kompresszió és visszarugózás külön állítható.', kompatibilitas: e46,
            parameterek: [{ nev: 'Ültetés', ertek: '20–50 mm' }],
        }),
        szuro: await alkatresz({
            nev: 'Sport levegőszűrő betét – BMW 3-as (E46)', cikkszam: 'KN-E2E-2', gyarto: 'K&N', kategoria: 'szivorendszer', ar: 32900, keszlet: 10,
            rovidLeiras: 'Mosható, gyári helyre illő sportszűrő.', kompatibilitas: e46,
        }),
        dob: await alkatresz({
            nev: 'Sport hátsó dob – VW Golf VII', cikkszam: 'RM-E2E-3', gyarto: 'Remus', kategoria: 'kipufogo', ar: 274000, keszlet: 2,
            kompatibilitas: [{ marka: 'Volkswagen', modell: 'Golf', evjaratTol: 2012, evjaratIg: 2020 }],
        }),
        kupos: await alkatresz({
            nev: 'Nyitott kúpos levegőszűrő 76 mm', cikkszam: 'SIM-E2E-4', gyarto: 'Simota', kategoria: 'szivorendszer', ar: 16900, keszlet: 1, univerzalis: true,
        }),
        chip: await alkatresz({
            nev: 'GTS Black chiptuning box – BMW 3-as (F30)', cikkszam: 'RC-E2E-5', gyarto: 'RaceChip', kategoria: 'motor', ar: 169000, keszlet: 0,
            kompatibilitas: [{ marka: 'BMW', modell: 'F30', evjaratTol: 2012, evjaratIg: 2019 }],
        }),
    };

    return {
        jelszo: JELSZO,
        felhasznalok: FELHASZNALOK,
        autok: azonositok(autok),
        alkatreszek: azonositok(alkatreszek),
    };
};

// ---------- Indítás ----------

const inditas = async () => {
    const mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    for (const nev of mongoose.modelNames()) {
        await mongoose.model(nev).syncIndexes();
    }

    const app = appLetrehozasa({ munkamenetTarolo: new session.MemoryStore() });

    // minden teszt előtt: üres adatbázis + tesztadatok, a korlátozók nullázása
    app.post('/__e2e/visszaallitas', async (req, res) => {
        for (const gyujtemeny of Object.values(mongoose.connection.collections)) {
            await gyujtemeny.deleteMany({});
        }
        korlatokTorlese();
        belepesiProbalkozasokTorlese();
        levelek.length = 0;
        munkamenetSorszam = 0;
        res.json(await adatfeltoltes());
    });

    app.get('/__e2e/rendelesek/utolso', async (req, res) => {
        const rendeles = await RendelesModel.findOne().sort({ createdAt: -1 });
        if (!rendeles) {
            return res.json(null);
        }
        res.json({
            rendelesSzam: rendeles.rendelesSzam,
            statusz: rendeles.statusz,
            munkamenetId: rendeles.fizetes.munkamenetId,
            fizetes: rendeles.fizetes.statusz,
        });
    });

    // A Stripe helyett mi küldjük az aláírt webhookot a saját végpontunkra (ugyanúgy, ahogy a Stripe küldené).
    app.post('/__e2e/fizetes/:munkamenetId', async (req, res) => {
        let tipus = 'checkout.session.completed';
        if (req.body && req.body.tipus === 'lejart') {
            tipus = 'checkout.session.expired';
        }
        const torzs = JSON.stringify({ id: 'evt_e2e', type: tipus, data: { object: { id: req.params.munkamenetId, payment_status: 'paid' } } });
        const alairas = Stripe.webhooks.generateTestHeaderString({ payload: torzs, secret: WEBHOOK_TITOK });

        const valasz = await fetch('http://127.0.0.1:' + PORT + '/api/fizetes/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Stripe-Signature': alairas },
            body: torzs,
        });
        res.status(valasz.status).json(await valasz.json());
    });

    app.get('/__e2e/levelek', (req, res) => {
        res.json(levelek);
    });

    await adatfeltoltes();
    const server = app.listen(PORT, () => {
        console.log('E2E tesztszerver kész: http://localhost:' + PORT + ' (frontend: ' + FRONTEND + ')');
    });

    const leallitas = async () => {
        server.close();
        await mongoose.disconnect();
        await mongod.stop();
        process.exit(0);
    };
    process.on('SIGINT', leallitas);
    process.on('SIGTERM', leallitas);
};

inditas().catch((error) => {
    console.error('Az E2E tesztszerver nem indult el:', error);
    process.exit(1);
});
