const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const AlkatreszModel = require('../../models/Alkatresz');
const RendelesModel = require('../../models/Rendeles');
const TelephelyModel = require('../../models/Telephely');
const k = require('./kornyezet');

before(k.inditas);
after(k.leallitas);
beforeEach(k.uritas);

// A rendelés-végpont IP-nként 10 percenként 10 kérést enged – ez a fájl ennél kevesebbet küld.

const keszlet = async (termek) => (await AlkatreszModel.findById(termek._id)).keszlet;
const tetel = (termek, mennyiseg = 1) => ({ id: String(termek._id), mennyiseg });

test('kosár: a szerver számol (akciós ár, ingyenes szállítási határ, utánvét díja), hibák jelezve', async () => {
    const futomu = await k.alkatreszMentese({ ar: 60000, akciosAr: 45000, keszlet: 3 });
    const szuro = await k.alkatreszMentese({ ar: 20000, keszlet: 1, univerzalis: true, kompatibilitas: [] });
    const rejtett = await k.alkatreszMentese({ lathato: false });
    const vendeg = k.kliens();

    const kosar = (await vendeg.post('/kosar', {
        tetelek: [tetel(futomu, 2), tetel(szuro, 2), tetel(rejtett), { id: String(futomu._id), mennyiseg: 1, ar: 1 }],
        szallitasiMod: 'futar',
        fizetesiMod: 'utanvet',
    })).adat;

    const futomuSor = kosar.tetelek.find((t) => t.id === String(futomu._id));
    assert.equal(futomuSor.mennyiseg, 3, 'az ismétlődő sorok összevonva; a küldött „ar” mező figyelmen kívül');
    assert.equal(futomuSor.egysegar, 45000);
    assert.equal(kosar.tetelek.find((t) => t.id === String(szuro._id)).hiba, 'Csak 1 db van készleten');
    assert.deepEqual(kosar.hianyzo, [String(rejtett._id)]);
    assert.equal(kosar.rendelheto, false);
    assert.deepEqual(kosar.osszegek, { termekek: 175000, szallitas: 0, kezelesiDij: 590, vegosszeg: 175590 }, '100 000 Ft felett ingyenes a szállítás');
    assert.ok(!kosar.fizetesiModok.some((m) => m.kulcs === 'kartya'), 'Stripe nélkül nincs kártyás fizetés');
    assert.ok(!kosar.szallitasiModok.some((m) => m.kulcs === 'szemelyes'), 'telephely nélkül nincs személyes átvétel');
});

test('rendelés utánvéttel: készlet csökken, végösszeg a szerverről, visszaigazolás csak kulccsal', async () => {
    const termek = await k.alkatreszMentese({ ar: 30000, keszlet: 5 });
    const vasarlo = await k.bejelentkezve('felhasznalo');

    const valasz = await vasarlo.post('/rendelesek', k.rendelesTorzs([tetel(termek, 2)]));
    assert.equal(valasz.status, 201);
    assert.match(valasz.adat.rendelesSzam, /^VX-\d{4}-00001$/);
    assert.equal(valasz.adat.fizetesUrl, null);
    assert.equal(await keszlet(termek), 3);
    assert.equal((await AlkatreszModel.findById(termek._id)).eladottDb, 2);

    const rendeles = await RendelesModel.findOne({ rendelesSzam: valasz.adat.rendelesSzam });
    assert.equal(rendeles.statusz, 'uj');
    assert.deepEqual(rendeles.osszegek.toObject(), { termekek: 60000, szallitas: 2490, kezelesiDij: 590, vegosszeg: 63080 });

    const { rendelesSzam, kulcs } = valasz.adat;
    const idegen = k.kliens();
    assert.equal((await idegen.get(`/rendelesek/${rendelesSzam}`)).status, 404);
    assert.equal((await idegen.get(`/rendelesek/${rendelesSzam}?kulcs=${'0'.repeat(48)}`)).status, 404);
    const nezet = await idegen.get(`/rendelesek/${rendelesSzam}?kulcs=${kulcs}`);
    assert.equal(nezet.status, 200);
    assert.equal(nezet.adat.rendeles.statuszNev, 'Új');
    assert.equal(nezet.adat.rendeles.hozzaferesKulcs, undefined);
    assert.equal(nezet.adat.rendeles.belsoMegjegyzes, undefined);

    const sajat = await vasarlo.get('/fiok/rendelesek');
    assert.deepEqual(sajat.adat.rendelesek.map((r) => r.rendelesSzam), [rendelesSzam]);
});

test('hiányzó készlet: 409, és a már lefoglalt tételek visszakerülnek', async () => {
    const elso = await k.alkatreszMentese({ keszlet: 5 });
    const masodik = await k.alkatreszMentese({ keszlet: 1 });
    const valasz = await k.kliens().post('/rendelesek', k.rendelesTorzs([tetel(elso, 2), tetel(masodik, 3)]));
    assert.equal(valasz.status, 409);
    assert.match(valasz.adat.error, /csak 1 db/);
    assert.equal(await keszlet(elso), 5);
    assert.equal(await keszlet(masodik), 1);
    assert.equal(await RendelesModel.countDocuments(), 0);
});

test('párhuzamos rendelés az utolsó darabra: pontosan egy sikerül', async () => {
    const termek = await k.alkatreszMentese({ keszlet: 1 });
    const eredmenyek = await Promise.all([
        k.kliens().post('/rendelesek', k.rendelesTorzs([tetel(termek)])),
        k.kliens().post('/rendelesek', k.rendelesTorzs([tetel(termek)])),
    ]);
    assert.deepEqual(eredmenyek.map((e) => e.status).sort(), [201, 409]);
    assert.equal(await keszlet(termek), 0);
});

test('lemondás: a készlet egyszer kerül vissza; lemondott rendelés nem állítható vissza', async () => {
    const termek = await k.alkatreszMentese({ keszlet: 4 });
    await k.kliens().post('/rendelesek', k.rendelesTorzs([tetel(termek, 3)]));
    const rendeles = await RendelesModel.findOne();
    const ertekesito = await k.bejelentkezve('ertekesito');

    assert.equal((await ertekesito.patch(`/admin/rendelesek/${rendeles._id}`, { statusz: 'lemondva' })).status, 200);
    assert.equal(await keszlet(termek), 4);
    assert.equal((await AlkatreszModel.findById(termek._id)).eladottDb, 0);
    assert.equal((await ertekesito.patch(`/admin/rendelesek/${rendeles._id}`, { statusz: 'feldolgozas' })).status, 409);
    assert.equal(await keszlet(termek), 4, 'nem duplázódik');
});

test('előre utalás: fizetés rögzítéséig nem dolgozható fel; a státuszok a szállítási módhoz igazodnak', async () => {
    const termek = await k.alkatreszMentese({ ar: 150000 });
    const telephely = await TelephelyModel.create({ nev: 'Veltrix Budaörs', varos: 'Budaörs', cim: 'Fő út 1.', megye: 'Pest' });
    const valasz = await k.kliens().post('/rendelesek', k.rendelesTorzs([tetel(termek)], {
        szallitasiMod: 'szemelyes', fizetesiMod: 'atutalas', szallitasiCim: undefined, telephely: String(telephely._id),
    }));
    assert.equal(valasz.status, 201);
    const rendeles = await RendelesModel.findOne();
    assert.equal(rendeles.statusz, 'fizetesre_var');
    assert.equal(rendeles.osszegek.vegosszeg, 150000, 'személyes átvétel: nincs szállítási díj');

    const ertekesito = await k.bejelentkezve('ertekesito');
    const utvonal = `/admin/rendelesek/${rendeles._id}`;
    assert.equal((await ertekesito.patch(utvonal, { statusz: 'feldolgozas' })).status, 409);
    const fizetve = await ertekesito.patch(utvonal, { fizetve: true, belsoMegjegyzes: 'Utalás megjött.' });
    assert.equal(fizetve.adat.rendeles.statusz, 'uj');
    assert.equal(fizetve.adat.rendeles.belsoMegjegyzes, 'Utalás megjött.');
    assert.equal((await ertekesito.patch(utvonal, { statusz: 'feladva' })).status, 400, 'személyes átvételnél nincs „feladva”');
    assert.equal((await ertekesito.patch(utvonal, { statusz: 'atveheto' })).status, 200);
    const teljesitve = await ertekesito.patch(utvonal, { statusz: 'teljesitve' });
    assert.equal(teljesitve.adat.rendeles.statusz, 'teljesitve');
    assert.deepEqual(teljesitve.adat.rendeles.esemenyek.map((e) => e.statusz), ['fizetesre_var', 'uj', 'atveheto', 'teljesitve']);
    assert.equal((await ertekesito.patch(utvonal, { statusz: 'lemondva' })).status, 409);
});

test('rendelés validáció: hiányzó adatok, ÁSZF, fizetési mód a szállításhoz', async () => {
    const termek = await k.alkatreszMentese();
    const valasz = await k.kliens().post('/rendelesek', k.rendelesTorzs([tetel(termek)], {
        aszf: false,
        fizetesiMod: 'helyszinen',
        vevo: { nev: 'X', email: 'nem-email', telefon: '' },
        szallitasiCim: { iranyitoszam: '12', varos: '', cim: '' },
    }));
    assert.equal(valasz.status, 400);
    const hibak = valasz.adat.hibak.join(' | ');
    for (const resz of ['neved', 'e-mail', 'telefonszám', 'fizetési módot', 'irányítószám', 'ÁSZF']) assert.ok(hibak.includes(resz), resz);
    assert.equal(await keszlet(termek), 5);
});
