const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const AlkatreszModel = require('../../models/Alkatresz');
const RendelesModel = require('../../models/Rendeles');
const TelephelyModel = require('../../models/Telephely');
const k = require('./kornyezet');

before(k.inditas);
after(k.leallitas);
beforeEach(k.uritas);

// A rendelésnél 10 percenként csak 10 kérés mehet egy IP-ről, ez a fájl ennél kevesebbet küld.

// a termék aktuális készlete az adatbázisból
const keszlet = async (termek) => {
    const alkatresz = await AlkatreszModel.findById(termek._id);
    return alkatresz.keszlet;
};

// egy kosár tétel
const tetel = (termek, mennyiseg = 1) => {
    return { id: String(termek._id), mennyiseg: mennyiseg };
};

test('kosár: a szerver számol (akciós ár, ingyenes szállítási határ, utánvét díja), hibák jelezve', async () => {
    const futomu = await k.alkatreszMentese({ ar: 60000, akciosAr: 45000, keszlet: 3 });
    const szuro = await k.alkatreszMentese({ ar: 20000, keszlet: 1, univerzalis: true, kompatibilitas: [] });
    const rejtett = await k.alkatreszMentese({ lathato: false });
    const vendeg = k.kliens();

    // a futómű kétszer szerepel, és a második sorban egy hamis árat is küldünk
    const valasz = await vendeg.post('/kosar', {
        tetelek: [tetel(futomu, 2), tetel(szuro, 2), tetel(rejtett), { id: String(futomu._id), mennyiseg: 1, ar: 1 }],
        szallitasiMod: 'futar',
        fizetesiMod: 'utanvet',
    });
    const kosar = valasz.adat;

    const futomuSor = kosar.tetelek.find((sor) => sor.id === String(futomu._id));
    assert.equal(futomuSor.mennyiseg, 3, 'az ismétlődő sorok összevonva; a küldött „ar” mező figyelmen kívül');
    assert.equal(futomuSor.egysegar, 45000);

    const szuroSor = kosar.tetelek.find((sor) => sor.id === String(szuro._id));
    assert.equal(szuroSor.hiba, 'Csak 1 db van készleten');
    assert.deepEqual(kosar.hianyzo, [String(rejtett._id)]);
    assert.equal(kosar.rendelheto, false);
    assert.deepEqual(kosar.osszegek, { termekek: 175000, szallitas: 0, kezelesiDij: 590, vegosszeg: 175590 }, '100 000 Ft felett ingyenes a szállítás');
    const fizetesiKulcsok = kosar.fizetesiModok.map((mod) => mod.kulcs);
    assert.ok(!fizetesiKulcsok.includes('kartya'), 'Stripe nélkül nincs kártyás fizetés');
    const szallitasiKulcsok = kosar.szallitasiModok.map((mod) => mod.kulcs);
    assert.ok(!szallitasiKulcsok.includes('szemelyes'), 'telephely nélkül nincs személyes átvétel');
});

test('rendelés utánvéttel: készlet csökken, végösszeg a szerverről, visszaigazolás csak kulccsal', async () => {
    const termek = await k.alkatreszMentese({ ar: 30000, keszlet: 5 });
    const vasarlo = await k.bejelentkezve('felhasznalo');

    const valasz = await vasarlo.post('/rendelesek', k.rendelesTorzs([tetel(termek, 2)]));
    assert.equal(valasz.status, 201);
    assert.match(valasz.adat.rendelesSzam, /^VX-\d{4}-00001$/);
    assert.equal(valasz.adat.fizetesUrl, null);
    assert.equal(await keszlet(termek), 3);
    const alkatresz = await AlkatreszModel.findById(termek._id);
    assert.equal(alkatresz.eladottDb, 2);

    const rendeles = await RendelesModel.findOne({ rendelesSzam: valasz.adat.rendelesSzam });
    assert.equal(rendeles.statusz, 'uj');
    assert.deepEqual(rendeles.osszegek.toObject(), { termekek: 60000, szallitas: 2490, kezelesiDij: 590, vegosszeg: 63080 });

    const rendelesSzam = valasz.adat.rendelesSzam;
    const kulcs = valasz.adat.kulcs;

    // más csak a jó kulccsal nézheti meg
    const idegen = k.kliens();
    const kulcsNelkul = await idegen.get(`/rendelesek/${rendelesSzam}`);
    assert.equal(kulcsNelkul.status, 404);
    const rosszKulccsal = await idegen.get(`/rendelesek/${rendelesSzam}?kulcs=${'0'.repeat(48)}`);
    assert.equal(rosszKulccsal.status, 404);
    const nezet = await idegen.get(`/rendelesek/${rendelesSzam}?kulcs=${kulcs}`);
    assert.equal(nezet.status, 200);
    assert.equal(nezet.adat.rendeles.statuszNev, 'Új');
    assert.equal(nezet.adat.rendeles.hozzaferesKulcs, undefined);
    assert.equal(nezet.adat.rendeles.belsoMegjegyzes, undefined);

    const sajat = await vasarlo.get('/fiok/rendelesek');
    assert.equal(sajat.adat.rendelesek.length, 1);
    assert.equal(sajat.adat.rendelesek[0].rendelesSzam, rendelesSzam);
});

test('hiányzó készlet: 409, és a már lefoglalt tételek visszakerülnek', async () => {
    const elso = await k.alkatreszMentese({ keszlet: 5 });
    const masodik = await k.alkatreszMentese({ keszlet: 1 });
    const valasz = await k.kliens().post('/rendelesek', k.rendelesTorzs([tetel(elso, 2), tetel(masodik, 3)]));
    assert.equal(valasz.status, 409);
    assert.match(valasz.adat.hiba, /csak 1 db/);
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
    const statuszok = [eredmenyek[0].status, eredmenyek[1].status].sort();
    assert.deepEqual(statuszok, [201, 409]);
    assert.equal(await keszlet(termek), 0);
});

test('lemondás: a készlet egyszer kerül vissza; lemondott rendelés nem állítható vissza', async () => {
    const termek = await k.alkatreszMentese({ keszlet: 4 });
    await k.kliens().post('/rendelesek', k.rendelesTorzs([tetel(termek, 3)]));
    const rendeles = await RendelesModel.findOne();
    const ertekesito = await k.bejelentkezve('ertekesito');

    const lemondas = await ertekesito.patch(`/admin/rendelesek/${rendeles._id}`, { statusz: 'lemondva' });
    assert.equal(lemondas.status, 200);
    assert.equal(await keszlet(termek), 4);
    const alkatresz = await AlkatreszModel.findById(termek._id);
    assert.equal(alkatresz.eladottDb, 0);

    const visszaallitas = await ertekesito.patch(`/admin/rendelesek/${rendeles._id}`, { statusz: 'feldolgozas' });
    assert.equal(visszaallitas.status, 409);
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
    const fizetesNelkul = await ertekesito.patch(utvonal, { statusz: 'feldolgozas' });
    assert.equal(fizetesNelkul.status, 409);

    const fizetve = await ertekesito.patch(utvonal, { fizetve: true, belsoMegjegyzes: 'Utalás megjött.' });
    assert.equal(fizetve.adat.rendeles.statusz, 'uj');
    assert.equal(fizetve.adat.rendeles.belsoMegjegyzes, 'Utalás megjött.');
    const feladva = await ertekesito.patch(utvonal, { statusz: 'feladva' });
    assert.equal(feladva.status, 400, 'személyes átvételnél nincs „feladva”');
    const atveheto = await ertekesito.patch(utvonal, { statusz: 'atveheto' });
    assert.equal(atveheto.status, 200);

    const teljesitve = await ertekesito.patch(utvonal, { statusz: 'teljesitve' });
    assert.equal(teljesitve.adat.rendeles.statusz, 'teljesitve');
    const esemenyek = teljesitve.adat.rendeles.esemenyek.map((esemeny) => esemeny.statusz);
    assert.deepEqual(esemenyek, ['fizetesre_var', 'uj', 'atveheto', 'teljesitve']);

    const lemondas = await ertekesito.patch(utvonal, { statusz: 'lemondva' });
    assert.equal(lemondas.status, 409);
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
    // minden hibának benne kell lennie a válaszban
    const hibak = valasz.adat.hibak.join(' | ');
    const elvartHibak = ['neved', 'e-mail', 'telefonszám', 'fizetési módot', 'irányítószám', 'ÁSZF'];
    for (const resz of elvartHibak) {
        assert.ok(hibak.includes(resz), resz);
    }
    assert.equal(await keszlet(termek), 5);
});
