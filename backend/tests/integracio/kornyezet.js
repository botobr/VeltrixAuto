/*
 * Közös környezet az integrációs tesztekhez: valódi (memóriában futó) MongoDB,
 * a valódi Express-alkalmazás véletlen porton, és egy sütikezelő kliens, amely
 * böngészőként tartja a munkamenetet.
 *
 * Használat egy tesztfájlban:
 *   const k = require('./kornyezet');
 *   before(k.inditas); after(k.leallitas); beforeEach(k.uritas);
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const session = require('express-session');

process.env.CLOUDINARY_API_CLOUD_NAME = 'teszt';
process.env.NODE_ENV = 'test';

// A Cloudinary-hívásokat még az alkalmazás betöltése előtt kicseréljük: nincs hálózat, a törléseket rögzítjük.
const cloudinary = require('../../utils/cloudinary');

const toroltKepek = [];
cloudinary.deleteImagesQuietly = async (publicIds = []) => {
    // Mint az eredeti: üres és ismétlődő azonosítók nélkül.
    toroltKepek.push(...new Set(publicIds.filter(Boolean)));
};
cloudinary.uploadImage = async () => ({
    secure_url: 'https://res.cloudinary.com/teszt/image/upload/v1/veltrix/autok/feltoltott.jpg',
    public_id: 'veltrix/autok/feltoltott',
});

// Online fizetés: a Stripe API-t nem hívjuk; a munkamenet-indítást a tesztek felülírhatják.
const fizetes = require('../../utils/fizetes');

let munkamenetSorszam = 0;
fizetes.fizetesInditasa = async () => {
    munkamenetSorszam += 1;
    return { url: `https://checkout.stripe.test/c/${munkamenetSorszam}`, munkamenetId: `cs_test_${munkamenetSorszam}` };
};

const createApp = require('../../app');
const AlkatreszModel = require('../../models/Alkatresz');
const UserModel = require('../../models/User');
const AutokModel = require('../../models/Autok');

// A szerver az e-maileket SMTP nélkül a konzolra írná – a tesztkimenetben ez csak zaj.
console.info = () => {};

let mongod;
let server;
let alapUrl;

const inditas = async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    await Promise.all(mongoose.modelNames().map((nev) => mongoose.model(nev).syncIndexes()));
    server = createApp({ sessionStore: new session.MemoryStore() }).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    alapUrl = `http://127.0.0.1:${server.address().port}`;
};

const leallitas = async () => {
    await new Promise((resolve) => server?.close(resolve));
    await mongoose.disconnect();
    await mongod?.stop();
};

const uritas = async () => {
    toroltKepek.length = 0;
    await Promise.all(Object.values(mongoose.connection.collections).map((gyujtemeny) => gyujtemeny.deleteMany({})));
};

/** HTTP-kliens saját munkamenet-sütivel (mint egy külön böngésző). */
const kliens = () => {
    let suti = '';
    const keres = async (metodus, utvonal, body) => {
        const valasz = await fetch(`${alapUrl}/api${utvonal}`, {
            method: metodus,
            headers: {
                ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
                ...(suti ? { Cookie: suti } : {}),
            },
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const ujSuti = valasz.headers.getSetCookie().find((s) => s.startsWith('connect.sid='));
        if (ujSuti) suti = ujSuti.split(';')[0];
        const szoveg = await valasz.text();
        let adat = null;
        try { adat = szoveg ? JSON.parse(szoveg) : null; } catch { adat = szoveg; }
        return { status: valasz.status, adat };
    };
    return {
        get: (utvonal) => keres('GET', utvonal),
        post: (utvonal, body = {}) => keres('POST', utvonal, body),
        put: (utvonal, body = {}) => keres('PUT', utvonal, body),
        patch: (utvonal, body = {}) => keres('PATCH', utvonal, body),
        delete: (utvonal, body) => keres('DELETE', utvonal, body),
    };
};

const JELSZO = 'tesztjelszo123';
let sorszam = 0;

/** Felhasználót hoz létre a megadott szerepkörrel, és bejelentkezett klienst ad vissza. */
const bejelentkezve = async (statusz) => {
    sorszam += 1;
    const user = await UserModel.create({ nev: `Teszt ${statusz}`, email: `${statusz}${sorszam}@teszt.hu`, jelszo: JELSZO, statusz });
    const k = kliens();
    const valasz = await k.post('/auth/login', { email: user.email, jelszo: JELSZO });
    if (valasz.status !== 200) throw new Error(`Bejelentkezés sikertelen (${statusz}): ${valasz.status}`);
    return Object.assign(k, { user });
};

let kepSorszam = 0;
const kep = () => {
    kepSorszam += 1;
    return { url: `https://res.cloudinary.com/teszt/image/upload/v1/veltrix/autok/k${kepSorszam}.jpg`, publicId: `veltrix/autok/k${kepSorszam}`, tipus: 'kulso' };
};

/** Érvényes autó-űrlapadat (ahogy a frontend küldi). */
const autoUrlap = (felulir = {}) => ({
    marka: 'Toyota', modell: 'Corolla', szin: 'Fehér', kivitel: 'Kombi', uzemanyag: 'Hibrid', szarmazasi_hely: 'Magyarország',
    evjarat: 2021, vetel_ar: 8990000, teljesitmeny: 140, hengerur_tartalom: 1798, kmora_allas: 45000,
    kepek: [kep()],
    ...felulir,
});

/** Autó közvetlenül az adatbázisba (a dashboard-tesztekhez, tetszőleges dátumokkal). */
const autoMentese = async (felulir = {}) => {
    const { createdAt, ...tobbi } = felulir;
    const auto = await AutokModel.create({ ...autoUrlap(), ...tobbi });
    if (createdAt) await AutokModel.collection.updateOne({ _id: auto._id }, { $set: { createdAt } });
    return auto;
};

let cikkszamSorszam = 0;
/** Érvényes webshop-termék űrlapadat. */
const alkatreszUrlap = (felulir = {}) => {
    cikkszamSorszam += 1;
    return {
        nev: 'V3 állítható futómű', cikkszam: `KW-${cikkszamSorszam}`, gyarto: 'KW', kategoria: 'futomu',
        ar: 400000, keszlet: 5, kepek: [kep()],
        kompatibilitas: [{ marka: 'BMW', modell: '3-as sorozat', evjaratTol: 2012, evjaratIg: 2019 }],
        ...felulir,
    };
};
const alkatreszMentese = (felulir = {}) => AlkatreszModel.create(alkatreszUrlap(felulir));

/** Érvényes rendelés-törzs (utánvét, futár). */
const rendelesTorzs = (tetelek, felulir = {}) => ({
    tetelek,
    vevo: { nev: 'Nagy Péter', email: 'peter@teszt.hu', telefon: '+36 30 111 2222' },
    szallitasiMod: 'futar',
    fizetesiMod: 'utanvet',
    szallitasiCim: { iranyitoszam: '1111', varos: 'Budapest', cim: 'Fő utca 1.' },
    szamlazasiCim: { nev: 'Nagy Péter', iranyitoszam: '1111', varos: 'Budapest', cim: 'Fő utca 1.' },
    aszf: true,
    ...felulir,
});

module.exports = {
    inditas, leallitas, uritas, kliens, bejelentkezve, autoUrlap, autoMentese, kep, toroltKepek,
    alkatreszUrlap, alkatreszMentese, rendelesTorzs, fizetes, url: () => alapUrl,
};
