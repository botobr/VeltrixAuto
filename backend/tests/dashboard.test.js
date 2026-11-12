const assert = require('node:assert/strict');
const { test } = require('node:test');
const AutokModel = require('../models/Autok');
const { autoAdatokEllenorzese } = require('../utils/autoMezok');
const {
    arSavokKitoltese, budapestiNap, idoszakFeldolgozasa, idosorKitoltese,
    kategoriakOsszevonasa, utolsoHonapok, utolsoNapok, valtozas,
} = require('../utils/dashboard');

const NAP = 24 * 60 * 60 * 1000;
const most = new Date('2026-11-12T10:00:00Z');

test('időszak: ismert kulcs, ismeretlen esetén 30 nap, "osszes" határ nélkül', () => {
    const idoszak = idoszakFeldolgozasa('90', most);
    assert.equal(idoszak.kulcs, '90');
    assert.equal(most - idoszak.tol, 90 * NAP);
    assert.equal(most - idoszak.elozoTol, 180 * NAP);
    assert.equal(idoszakFeldolgozasa('7', most).kulcs, '30');
    assert.equal(idoszakFeldolgozasa(undefined, most).kulcs, '30');
    assert.deepEqual(idoszakFeldolgozasa('osszes', most), { kulcs: 'osszes', napok: null, tol: null, elozoTol: null });
});

test('budapesti nap: UTC éjfél előtt már a következő nap', () => {
    assert.equal(budapestiNap(new Date('2026-11-11T23:30:00Z')), '2026-11-12');
    assert.equal(budapestiNap(new Date('2026-07-01T21:59:00Z')), '2026-07-01');
    assert.equal(budapestiNap(new Date('2026-07-01T22:01:00Z')), '2026-07-02');
});

test('napi és havi kulcsok: a mai nappal / folyó hónappal zárnak, évhatáron is', () => {
    const napok = utolsoNapok(30, most);
    assert.equal(napok.length, 30);
    assert.equal(napok.at(-1), '2026-11-12');
    assert.equal(napok[0], '2026-10-14');
    assert.equal(new Set(napok).size, 30);

    const honapok = utolsoHonapok(12, new Date('2026-02-10T12:00:00Z'));
    assert.equal(honapok[0], '2025-03');
    assert.equal(honapok.at(-1), '2026-02');
});

test('idősor: a hiányzó kulcsok 0 értéket kapnak, az ismeretlenek kimaradnak', () => {
    const sor = idosorKitoltese(['2026-10', '2026-11'], [{ _id: '2026-11', bevetel: 5, db: 1 }, { _id: '2020-01', bevetel: 9, db: 9 }], ['bevetel', 'db']);
    assert.deepEqual(sor, [{ kulcs: '2026-10', bevetel: 0, db: 0 }, { kulcs: '2026-11', bevetel: 5, db: 1 }]);
});

test('változás: százalék egy tizedesre, 0 vagy hiányzó előzménynél null', () => {
    assert.equal(valtozas(150, 100), 50);
    assert.equal(valtozas(1, 3), -66.7);
    assert.equal(valtozas(5, 0), null);
    assert.equal(valtozas(5, null), null);
});

test('kategóriák: csökkenő sorrend, a sok kategória vége „Egyéb”', () => {
    const lista = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((nev, i) => ({ _id: nev, db: 10 - i }));
    const eredmeny = kategoriakOsszevonasa(lista, 4);
    assert.deepEqual(eredmeny.map((e) => e.nev), ['A', 'B', 'C', 'Egyéb']);
    assert.equal(eredmeny.at(-1).db, 7 + 6 + 5 + 4);
    assert.equal(kategoriakOsszevonasa([{ _id: null, db: 2 }])[0].nev, 'Nincs megadva');
});

test('ársávok: minden sáv szerepel, az üresek 0-val', () => {
    const savok = arSavokKitoltese([{ _id: 5e8, db: 3 }]);
    assert.equal(savok.length, 7);
    assert.equal(savok.at(-1).db, 3);
    assert.equal(savok[0].db, 0);
});

const alapAuto = () => ({
    marka: 'BMW', modell: '320d', szin: 'Fekete', kivitel: 'Sedan', uzemanyag: 'Dízel', szarmazasi_hely: 'Németország',
    evjarat: 2019, vetel_ar: 8990000, teljesitmeny: 190, hengerur_tartalom: 1995, kmora_allas: 85000,
});

test('eladás: elkelt autónál a dátum és az ár (vételár) automatikusan kitöltődik', async () => {
    const auto = new AutokModel({ ...alapAuto(), statusz: 'elkelt' });
    await auto.validate();
    assert.ok(auto.eladas_datum instanceof Date);
    assert.equal(auto.eladasi_ar, 8990000);
});

test('eladás: megadott eladási ár megmarad, visszaállításkor törlődik', async () => {
    const auto = new AutokModel({ ...alapAuto(), statusz: 'elkelt', eladasi_ar: 8500000 });
    await auto.validate();
    assert.equal(auto.eladasi_ar, 8500000);

    auto.statusz = 'elerheto';
    await auto.validate();
    assert.equal(auto.eladas_datum, null);
    assert.equal(auto.eladasi_ar, null);
});

test('eladási adatok validálása: jövőbeli dátum és negatív ár hiba', () => {
    const kep = { url: 'https://res.cloudinary.com/demo/image/upload/v1/veltrix/autok/a.jpg', publicId: 'veltrix/autok/a' };
    const holnaputan = new Date(Date.now() + 3 * NAP).toISOString().slice(0, 10);
    const { hibak } = autoAdatokEllenorzese({ ...alapAuto(), kepek: [kep], statusz: 'elkelt', eladas_datum: holnaputan, eladasi_ar: -5 });
    assert.ok(hibak.some((hiba) => hiba.includes('jövőben')));
    assert.ok(hibak.some((hiba) => hiba.startsWith('Eladási ár')));
});
