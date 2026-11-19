/*
 * E2E (Cypress) tesztszerver: a valódi app.js memóriabeli MongoDB-vel, ismert
 * mintaadatokkal. Az éles adatbázishoz, Cloudinary-hoz és Stripe-hoz nem nyúl.
 *
 * Indítás: node tests/e2e/szerver.js   (a frontend `npm run e2e` parancsa magától indítja)
 * Port: E2E_API_PORT (alap 3601), a frontend címe: E2E_FRONTEND_URL (alap http://localhost:5174)
 *
 * Csak tesztre szolgáló végpontok (nem az /api alatt):
 *   POST /__e2e/visszaallitas            – adatbázis ürítése és újratöltése, korlátozók nullázása
 *   GET  /__e2e/rendelesek/utolso        – a legutóbbi rendelés (munkamenet-azonosítóval)
 *   POST /__e2e/fizetes/:munkamenetId    – aláírt Stripe-visszajelzés küldése ({ tipus: 'sikeres' | 'lejart' })
 *   GET  /__e2e/levelek                  – az eddig „elküldött” e-mailek
 */
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

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const session = require('express-session');
const Stripe = require('stripe');

// ---------- Külső szolgáltatások helyettesítése (az app betöltése ELŐTT) ----------

const cloudinary = require('../../utils/cloudinary');

cloudinary.deleteImagesQuietly = async () => {};
cloudinary.uploadImage = async () => ({ secure_url: 'https://res.cloudinary.com/e2e/image/upload/v1/veltrix/autok/feltoltott.jpg', public_id: 'veltrix/autok/feltoltott' });

const levelek = [];
const email = require('../../utils/email');

email.emailKuldes = async ({ cimzett, targy, szoveg }) => {
    levelek.push({ cimzett: [].concat(cimzett), targy, szoveg, idopont: new Date().toISOString() });
    return true;
};

// Stripe Checkout helyett: a „fizetőoldal” rögtön visszairányít a sikeres fizetés oldalára;
// a tényleges „fizetve” jelzést a teszt küldi el aláírt webhookként (/__e2e/fizetes/...).
const fizetes = require('../../utils/fizetes');

let munkamenetSorszam = 0;
fizetes.fizetesInditasa = async (rendeles, kulcs) => {
    munkamenetSorszam += 1;
    return {
        url: `${FRONTEND}/rendeles/${encodeURIComponent(rendeles.rendelesSzam)}?kulcs=${kulcs}&fizetes=siker`,
        munkamenetId: `cs_e2e_${munkamenetSorszam}`,
    };
};

console.info = () => {};

const createApp = require('../../app');
const { korlatokTorlese } = require('../../utils/rateLimit');
const { loginProbalkozasokTorlese } = require('../../routes/authRoutes');
const AlkatreszModel = require('../../models/Alkatresz');
const AutokModel = require('../../models/Autok');
const RendelesModel = require('../../models/Rendeles');
const TelephelyModel = require('../../models/Telephely');
const UserModel = require('../../models/User');

// ---------- Mintaadatok ----------

const JELSZO = 'Teszt1234';
const FELHASZNALOK = [
    { nev: 'Admin Anna', email: 'admin@teszt.hu', statusz: 'admin' },
    { nev: 'Értékesítő Ede', email: 'ertekesito@teszt.hu', statusz: 'ertekesito' },
    { nev: 'Vásárló Vilma', email: 'vasarlo@teszt.hu', statusz: 'felhasznalo' },
];

const svg = (felirat, szin) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#f4f1e8"/><circle cx="400" cy="290" r="170" fill="${szin}"/><text x="400" y="540" font-family="Arial" font-size="40" text-anchor="middle" fill="#333">${felirat}</text></svg>`)}`;
let kepSorszam = 0;
const kepek = (felirat, szin) => {
    kepSorszam += 1;
    return [{ url: svg(felirat, szin), publicId: `veltrix/autok/e2e-${kepSorszam}`, tipus: 'kulso', leiras: '' }];
};

const auto = (adatok) => ({
    szin: 'Fekete', kivitel: 'Coupe', uzemanyag: 'Benzin', szarmazasi_hely: 'Németország',
    teljesitmeny: 143, hengerur_tartalom: 1995, kmora_allas: 180000, ...adatok,
});

const adatfeltoltes = async () => {
    kepSorszam = 0;
    for (const f of FELHASZNALOK) await UserModel.create({ ...f, jelszo: JELSZO });
    const telephely = await TelephelyModel.create({
        nev: 'Veltrix Budaörs', iranyitoszam: '2040', varos: 'Budaörs', cim: 'Szabadság út 1.', megye: 'Pest', telefon: '+36 1 234 5678',
    });

    const autok = {
        bmw: await AutokModel.create(auto({ marka: 'BMW', modell: 'E46 318CI', evjarat: 2001, vetel_ar: 2490000, kiemelt: true, telephely: telephely._id, kepek: kepek('BMW', '#2f6fd6') })),
        golf: await AutokModel.create(auto({ marka: 'Volkswagen', modell: 'Golf', evjarat: 2016, vetel_ar: 6490000, kivitel: 'Ferdehátú', kmora_allas: 98000, telephely: telephely._id, kepek: kepek('Golf', '#d8d8d8') })),
        astra: await AutokModel.create(auto({ marka: 'Opel', modell: 'Astra H OPC', evjarat: 2010, vetel_ar: 3990000, statusz: 'foglalt', kepek: kepek('Opel', '#e0b030') })),
        audi: await AutokModel.create(auto({ marka: 'Audi', modell: 'S3', evjarat: 2001, vetel_ar: 2990000, statusz: 'elkelt', eladasi_ar: 2850000, kepek: kepek('Audi', '#aa2222') })),
    };

    const e46 = [{ marka: 'BMW', modell: 'E46', evjaratTol: 1998, evjaratIg: 2006 }];
    const alkatresz = (adatok) => AlkatreszModel.create({ kepek: kepek(adatok.gyarto, '#c99a35'), ...adatok });
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

    const azonositok = (lista) => Object.fromEntries(Object.entries(lista).map(([kulcs, doc]) => [kulcs, String(doc._id)]));
    return { jelszo: JELSZO, felhasznalok: FELHASZNALOK, autok: azonositok(autok), alkatreszek: azonositok(alkatreszek) };
};

// ---------- Indítás ----------

(async () => {
    const mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    await Promise.all(mongoose.modelNames().map((nev) => mongoose.model(nev).syncIndexes()));

    const app = createApp({ sessionStore: new session.MemoryStore() });

    app.post('/__e2e/visszaallitas', async (req, res) => {
        await Promise.all(Object.values(mongoose.connection.collections).map((gy) => gy.deleteMany({})));
        korlatokTorlese();
        loginProbalkozasokTorlese();
        levelek.length = 0;
        munkamenetSorszam = 0;
        res.json(await adatfeltoltes());
    });

    app.get('/__e2e/rendelesek/utolso', async (req, res) => {
        const rendeles = await RendelesModel.findOne().sort({ createdAt: -1 });
        res.json(rendeles ? { rendelesSzam: rendeles.rendelesSzam, statusz: rendeles.statusz, munkamenetId: rendeles.fizetes.munkamenetId, fizetes: rendeles.fizetes.statusz } : null);
    });

    // A Stripe helyett: aláírt webhook a saját /api/fizetes/webhook végpontunkra (pont úgy, ahogy a Stripe küldené).
    app.post('/__e2e/fizetes/:munkamenetId', async (req, res) => {
        const tipus = req.body?.tipus === 'lejart' ? 'checkout.session.expired' : 'checkout.session.completed';
        const torzs = JSON.stringify({ id: 'evt_e2e', type: tipus, data: { object: { id: req.params.munkamenetId, payment_status: 'paid' } } });
        const valasz = await fetch(`http://127.0.0.1:${PORT}/api/fizetes/webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Stripe-Signature': Stripe.webhooks.generateTestHeaderString({ payload: torzs, secret: WEBHOOK_TITOK }) },
            body: torzs,
        });
        res.status(valasz.status).json(await valasz.json());
    });

    app.get('/__e2e/levelek', (req, res) => res.json(levelek));

    await adatfeltoltes();
    const server = app.listen(PORT, () => console.log(`E2E tesztszerver kész: http://localhost:${PORT} (frontend: ${FRONTEND})`));

    const leallitas = async () => {
        server.close();
        await mongoose.disconnect();
        await mongod.stop();
        process.exit(0);
    };
    process.on('SIGINT', leallitas);
    process.on('SIGTERM', leallitas);
})().catch((error) => {
    console.error('Az E2E tesztszerver nem indult el:', error);
    process.exit(1);
});
