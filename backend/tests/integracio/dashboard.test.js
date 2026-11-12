const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const ErdeklodesModel = require('../../models/Erdeklodes');
const TelephelyModel = require('../../models/Telephely');
const k = require('./kornyezet');

before(k.inditas);
after(k.leallitas);
beforeEach(k.uritas);

const NAP = 24 * 60 * 60 * 1000;
// Közös viszonyítási pont, hogy a napkülönbségek pontosan egész napok legyenek (az átlagok kerekítése miatt).
const MOST = Date.now();
const napja = (n) => new Date(MOST - n * NAP);

/*
 * Ismert adatkészlet, kézzel kiszámolt elvárt értékekkel:
 *  - eladások: 5 napja 10 M (vételár 10,5 M), 20 napja 6 M, 45 napja 8 M (előző 30 nap), 400 napja 3 M (12 hónapon kívül)
 *  - készlet: Toyota 9 M (100 napja, „régi”), Audi 4 M foglalt, Opel 25 M rejtett
 */
const adatfeltoltes = async () => {
    const telephely = await TelephelyModel.create({ nev: 'Veltrix Budaörs', varos: 'Budaörs', cim: 'Fő út 1.', megye: 'Pest' });
    const elkelt = (marka, vetelAr, eladasiAr, eladvaNapja, felvetelNapja, extra = {}) => k.autoMentese({
        marka, vetel_ar: vetelAr, statusz: 'elkelt', eladasi_ar: eladasiAr, eladas_datum: napja(eladvaNapja), createdAt: napja(felvetelNapja), ...extra,
    });
    await elkelt('Toyota', 10500000, 10000000, 5, 40, { telephely: telephely._id });
    await elkelt('BMW', 6000000, 6000000, 20, 30);
    await elkelt('Toyota', 8000000, 8000000, 45, 60);
    await elkelt('Skoda', 3000000, 3000000, 400, 420);

    await k.autoMentese({ marka: 'Toyota', vetel_ar: 9000000, createdAt: napja(100), telephely: telephely._id });
    await k.autoMentese({ marka: 'Audi', vetel_ar: 4000000, statusz: 'foglalt', createdAt: napja(10), uzemanyag: 'Dízel' });
    await k.autoMentese({ marka: 'Opel', vetel_ar: 25000000, lathato: false, createdAt: napja(5), uzemanyag: 'Benzin' });

    const auto = await k.autoMentese({ marka: 'Mazda' });
    const erdeklodes = (napokkal, statusz) => ErdeklodesModel.create({ auto: auto._id, nev: 'Vevő', email: 'v@teszt.hu', uzenet: 'Érdekel az autó.', statusz })
        .then((e) => ErdeklodesModel.collection.updateOne({ _id: e._id }, { $set: { createdAt: napja(napokkal) } }));
    await erdeklodes(1, 'uj');
    await erdeklodes(2, 'folyamatban');
    await erdeklodes(40, 'lezart');
};

test('bevétel: időszak, előző időszak, változás, átlagok (30 nap)', async () => {
    await adatfeltoltes();
    const admin = await k.bejelentkezve('admin');
    const { status, adat } = await admin.get('/admin/dashboard?idoszak=30');
    assert.equal(status, 200);

    assert.equal(adat.bevetel.idoszak, 16000000);
    assert.equal(adat.bevetel.eladottDb, 2);
    assert.equal(adat.bevetel.elozo, 8000000);
    assert.equal(adat.bevetel.valtozas, 100);
    assert.equal(adat.bevetel.osszes, 27000000);
    assert.equal(adat.bevetel.osszesEladott, 4);
    assert.equal(adat.bevetel.atlagAr, 8000000);
    assert.equal(adat.bevetel.atlagNap, 23); // (35 + 10) / 2 = 22,5 → 23
    assert.equal(adat.bevetel.atlagEngedmeny, 0.0238); // (0,5/10,5 + 0) / 2

    assert.equal(adat.havi.length, 12);
    assert.equal(adat.havi.reduce((osszeg, honap) => osszeg + honap.bevetel, 0), 24000000, 'a 400 napos eladás kimarad');
    assert.deepEqual(adat.legutobbEladott.map((auto) => auto.eladasi_ar), [10000000, 6000000, 8000000, 3000000]);
});

test('készlet: darab, érték, állásidő, státuszok, kategóriák, ársávok', async () => {
    await adatfeltoltes();
    const admin = await k.bejelentkezve('admin');
    const { keszlet } = (await admin.get('/admin/dashboard')).adat;

    assert.equal(keszlet.db, 4); // Toyota, Audi, Opel + az érdeklődésekhez felvett Mazda
    assert.equal(keszlet.ertek, 9000000 + 4000000 + 25000000 + 8990000);
    assert.equal(keszlet.regi, 1);
    assert.deepEqual(keszlet.statuszok, { elerheto: 3, foglalt: 1, elkelt: 4 });
    assert.equal(keszlet.rejtett, 1);
    assert.deepEqual(keszlet.uzemanyag, [{ nev: 'Hibrid', db: 2 }, { nev: 'Benzin', db: 1 }, { nev: 'Dízel', db: 1 }]);

    const sav = Object.fromEntries(keszlet.arSavok.map((s) => [s.nev, s.db]));
    assert.equal(sav['5 M Ft alatt'], 1);
    assert.equal(sav['5–10 M Ft'], 2);
    assert.equal(sav['20–50 M Ft'], 1);
});

test('márkák és telephelyek: készlet és időszaki bevétel összefésülve', async () => {
    await adatfeltoltes();
    const admin = await k.bejelentkezve('admin');
    const { markak, telephelyek } = (await admin.get('/admin/dashboard?idoszak=30')).adat;

    assert.deepEqual(markak[0], { marka: 'Toyota', keszletDb: 1, keszletErtek: 9000000, eladottDb: 1, bevetel: 10000000 });
    assert.deepEqual(markak[1], { marka: 'BMW', keszletDb: 0, keszletErtek: 0, eladottDb: 1, bevetel: 6000000 });

    const budaors = telephelyek.find((t) => t.nev === 'Veltrix Budaörs');
    assert.equal(budaors.keszletDb, 1);
    assert.equal(budaors.bevetel, 10000000);
    assert.equal(telephelyek.find((t) => t.id === 'nincs').keszletDb, 3);
});

test('teljes időszak: nincs előző időszak; ismeretlen időszak → 30 nap', async () => {
    await adatfeltoltes();
    const admin = await k.bejelentkezve('admin');
    const osszes = (await admin.get('/admin/dashboard?idoszak=osszes')).adat;
    assert.equal(osszes.bevetel.idoszak, 27000000);
    assert.equal(osszes.bevetel.elozo, null);
    assert.equal(osszes.bevetel.valtozas, null);

    assert.equal((await admin.get('/admin/dashboard?idoszak=nemletezik')).adat.idoszak.kulcs, '30');
});

test('érdeklődések: státuszok, időszak, napi idősor', async () => {
    await adatfeltoltes();
    const admin = await k.bejelentkezve('admin');
    const { erdeklodesek } = (await admin.get('/admin/dashboard?idoszak=30')).adat;
    assert.equal(erdeklodesek.uj, 1);
    assert.equal(erdeklodesek.folyamatban, 1);
    assert.equal(erdeklodesek.lezart, 1);
    assert.equal(erdeklodesek.idoszak, 2);
    assert.equal(erdeklodesek.elozo, 1);
    assert.equal(erdeklodesek.napi.length, 30);
    assert.equal(erdeklodesek.napi.reduce((osszeg, nap) => osszeg + nap.db, 0), 2);
});

test('értékesítő: a dashboard pénzügyi adatok nélkül érkezik', async () => {
    await adatfeltoltes();
    const ertekesito = await k.bejelentkezve('ertekesito');
    const { status, adat } = await ertekesito.get('/admin/dashboard?idoszak=30');
    assert.equal(status, 200);

    assert.equal(adat.bevetel, null);
    assert.equal(adat.havi, null);
    assert.deepEqual(adat.eladasok, { idoszak: 2, elozo: 1, valtozas: 100, atlagNap: 23 });
    assert.ok(adat.markak.every((marka) => !('bevetel' in marka)));
    assert.ok(adat.telephelyek.every((telephely) => !('bevetel' in telephely)));
    assert.ok(adat.legutobbEladott.every((auto) => !('eladasi_ar' in auto)));
    // Az ársávok határai (pl. 10 000 000 Ft) nem eladási adatok, ezért a keresésből kimaradnak.
    const { arSavok: _arSavok, ...keszletArsavNelkul } = adat.keszlet;
    const valasz = JSON.stringify({ ...adat, keszlet: keszletArsavNelkul });
    assert.ok(!valasz.includes('10000000'), 'a 10 M Ft-os eladási ár sehol nem szerepel a válaszban');
    assert.equal(adat.keszlet.db, 4, 'a készletadatokat látja');
});

test('üres adatbázis: minden nulla, nincs hiba', async () => {
    const admin = await k.bejelentkezve('admin');
    const { status, adat } = await admin.get('/admin/dashboard');
    assert.equal(status, 200);
    assert.equal(adat.bevetel.idoszak, 0);
    assert.equal(adat.bevetel.atlagAr, null);
    assert.equal(adat.keszlet.db, 0);
    assert.equal(adat.keszlet.arSavok.length, 7);
    assert.deepEqual(adat.markak, []);
});
