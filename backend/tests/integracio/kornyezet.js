// Közös beállítások az integrációs tesztekhez.
// - igazi MongoDB, de a memóriában fut (mongodb-memory-server)
// - a mi Express alkalmazásunk egy véletlen porton
// - egy kliens, ami a sütit (munkamenetet) megjegyzi, mint egy böngésző
//
// Használat egy tesztfájlban:
//   const k = require('./kornyezet');
//   before(k.inditas); after(k.leallitas); beforeEach(k.uritas);

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const session = require('express-session');

process.env.CLOUDINARY_API_CLOUD_NAME = 'teszt';
process.env.NODE_ENV = 'test';
// a tesztek ne hívják a valódi Billingót (a számlázást a tesztek maguk kapcsolják be, kamu függvényekkel)
delete process.env.BILLINGO_API_KEY;
delete process.env.BILLINGO_BLOCK_ID;

// A Cloudinary függvényeit lecseréljük (az app betöltése előtt), hogy a teszt ne töltsön fel
// semmit az internetre. A törölt képeket megjegyezzük, hogy ellenőrizni tudjuk.
const cloudinary = require('../../utils/cloudinary');

const toroltKepek = [];
cloudinary.kepekTorlese = async (publicIdk = []) => {
    for (const publicId of publicIdk) {
        if (publicId && !toroltKepek.includes(publicId)) {
            toroltKepek.push(publicId);
        }
    }
};
cloudinary.kepFeltoltese = async () => {
    return {
        secure_url: 'https://res.cloudinary.com/teszt/image/upload/v1/veltrix/autok/feltoltott.jpg',
        public_id: 'veltrix/autok/feltoltott',
    };
};

// A Stripe-ot sem hívjuk meg igazából, helyette egy kamu fizetési linket adunk vissza.
const fizetes = require('../../utils/fizetes');

let munkamenetSorszam = 0;
fizetes.fizetesInditasa = async () => {
    munkamenetSorszam++;
    return {
        url: 'https://checkout.stripe.test/c/' + munkamenetSorszam,
        munkamenetId: 'cs_test_' + munkamenetSorszam,
    };
};

// a visszatérítés és a munkamenet lekérdezése is kamu (a tesztek felülírhatják)
let visszateritesSorszam = 0;
fizetes.visszaterites = async () => {
    visszateritesSorszam++;
    return { id: 're_test_' + visszateritesSorszam, osszeg: null };
};
fizetes.munkamenetAllapota = async () => 'lejart';

const appLetrehozasa = require('../../app');
const AlkatreszModel = require('../../models/Alkatresz');
const FelhasznaloModel = require('../../models/Felhasznalo');
const AutoModel = require('../../models/Auto');

// SMTP nélkül a szerver a konzolra írná az e-maileket, ez a tesztekben csak zavarna
console.info = () => {};

let mongod;
let server;
let alapUrl;

// adatbázis és szerver indítása
const inditas = async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    // az indexek kellenek (pl. az egyedi e-mail címhez)
    for (const nev of mongoose.modelNames()) {
        await mongoose.model(nev).syncIndexes();
    }

    server = appLetrehozasa({ munkamenetTarolo: new session.MemoryStore() }).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    alapUrl = 'http://127.0.0.1:' + server.address().port;
};

const leallitas = async () => {
    if (server) {
        await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
    if (mongod) {
        await mongod.stop();
    }
};

// minden teszt előtt kiürítjük az adatbázist
const uritas = async () => {
    toroltKepek.length = 0;
    for (const gyujtemeny of Object.values(mongoose.connection.collections)) {
        await gyujtemeny.deleteMany({});
    }
};

// HTTP kliens saját sütivel (mintha egy külön böngésző lenne)
const kliens = () => {
    let suti = '';

    const keres = async (metodus, utvonal, torzs) => {
        const fejlecek = {};
        if (torzs !== undefined) {
            fejlecek['Content-Type'] = 'application/json';
        }
        if (suti) {
            fejlecek.Cookie = suti;
        }

        let body;
        if (torzs !== undefined) {
            body = JSON.stringify(torzs);
        }

        const valasz = await fetch(alapUrl + '/api' + utvonal, { method: metodus, headers: fejlecek, body: body });

        // ha a szerver új munkamenet sütit küldött, megjegyezzük
        for (const ujSuti of valasz.headers.getSetCookie()) {
            if (ujSuti.startsWith('connect.sid=')) {
                suti = ujSuti.split(';')[0];
            }
        }

        const szoveg = await valasz.text();
        let adat = null;
        if (szoveg) {
            try {
                adat = JSON.parse(szoveg);
            } catch {
                adat = szoveg;
            }
        }
        return { status: valasz.status, adat: adat };
    };

    return {
        get: (utvonal) => keres('GET', utvonal),
        post: (utvonal, torzs = {}) => keres('POST', utvonal, torzs),
        put: (utvonal, torzs = {}) => keres('PUT', utvonal, torzs),
        patch: (utvonal, torzs = {}) => keres('PATCH', utvonal, torzs),
        delete: (utvonal, torzs) => keres('DELETE', utvonal, torzs),
    };
};

const JELSZO = 'tesztjelszo123';
let sorszam = 0;

// létrehoz egy felhasználót a megadott szerepkörrel, és visszaad egy bejelentkezett klienst
const bejelentkezve = async (statusz) => {
    sorszam++;
    const felhasznalo = await FelhasznaloModel.create({
        nev: 'Teszt ' + statusz,
        email: statusz + sorszam + '@teszt.hu',
        jelszo: JELSZO,
        statusz: statusz,
    });

    const k = kliens();
    const valasz = await k.post('/auth/bejelentkezes', { email: felhasznalo.email, jelszo: JELSZO });
    if (valasz.status !== 200) {
        throw new Error('Bejelentkezés sikertelen (' + statusz + '): ' + valasz.status);
    }
    k.user = felhasznalo;
    return k;
};

// egy "feltöltött" kép adatai
let kepSorszam = 0;
const kep = () => {
    kepSorszam++;
    return {
        url: 'https://res.cloudinary.com/teszt/image/upload/v1/veltrix/autok/k' + kepSorszam + '.jpg',
        publicId: 'veltrix/autok/k' + kepSorszam,
        tipus: 'kulso',
    };
};

// jó autó űrlap adatok (ahogy a frontend küldi), a felulir-ban lehet módosítani
const autoUrlap = (felulir = {}) => {
    const adatok = {
        marka: 'Toyota',
        modell: 'Corolla',
        szin: 'Fehér',
        kivitel: 'Kombi',
        uzemanyag: 'Hibrid',
        szarmazasi_hely: 'Magyarország',
        evjarat: 2021,
        vetel_ar: 8990000,
        teljesitmeny: 140,
        hengerur_tartalom: 1798,
        kmora_allas: 45000,
        kepek: [kep()],
    };
    return { ...adatok, ...felulir };
};

// autó mentése egyenesen az adatbázisba (a dashboard teszteknél kell, hogy régi dátumot is adhassunk)
const autoMentese = async (felulir = {}) => {
    const adatok = { ...felulir };
    const createdAt = adatok.createdAt;
    delete adatok.createdAt;

    const auto = await AutoModel.create({ ...autoUrlap(), ...adatok });
    // a createdAt-et a mongoose nem engedi beállítani, ezért utólag írjuk át
    if (createdAt) {
        await AutoModel.collection.updateOne({ _id: auto._id }, { $set: { createdAt: createdAt } });
    }
    return auto;
};

// jó webshop termék adatok
let cikkszamSorszam = 0;
const alkatreszUrlap = (felulir = {}) => {
    cikkszamSorszam++;
    const adatok = {
        nev: 'V3 állítható futómű',
        cikkszam: 'KW-' + cikkszamSorszam,
        gyarto: 'KW',
        kategoria: 'futomu',
        ar: 400000,
        keszlet: 5,
        kepek: [kep()],
        kompatibilitas: [{ marka: 'BMW', modell: '3-as sorozat', evjaratTol: 2012, evjaratIg: 2019 }],
    };
    return { ...adatok, ...felulir };
};

const alkatreszMentese = (felulir = {}) => {
    return AlkatreszModel.create(alkatreszUrlap(felulir));
};

// jó rendelés adatok (utánvét, futár)
const rendelesTorzs = (tetelek, felulir = {}) => {
    const adatok = {
        tetelek: tetelek,
        vevo: { nev: 'Nagy Péter', email: 'peter@teszt.hu', telefon: '+36 30 111 2222' },
        szallitasiMod: 'futar',
        fizetesiMod: 'utanvet',
        szallitasiCim: { iranyitoszam: '1111', varos: 'Budapest', cim: 'Fő utca 1.' },
        szamlazasiCim: { nev: 'Nagy Péter', iranyitoszam: '1111', varos: 'Budapest', cim: 'Fő utca 1.' },
        aszf: true,
    };
    return { ...adatok, ...felulir };
};

module.exports = {
    inditas,
    leallitas,
    uritas,
    kliens,
    bejelentkezve,
    autoUrlap,
    autoMentese,
    kep,
    toroltKepek,
    alkatreszUrlap,
    alkatreszMentese,
    rendelesTorzs,
    fizetes,
    url: () => alapUrl,
};
