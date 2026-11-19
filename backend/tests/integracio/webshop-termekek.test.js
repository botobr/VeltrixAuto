const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const AlkatreszModel = require('../../models/Alkatresz');
const k = require('./kornyezet');

before(k.inditas);
after(k.leallitas);
beforeEach(k.uritas);

test('termék létrehozása: validáció, ismétlődő cikkszám, kompatibilitás kötelező', async () => {
    const ertekesito = await k.bejelentkezve('ertekesito');
    const letrehozas = await ertekesito.post('/admin/alkatreszek', k.alkatreszUrlap({ cikkszam: 'kw-35220', akciosAr: 359000 }));
    assert.equal(letrehozas.status, 201);
    assert.equal(letrehozas.adat.alkatresz.cikkszam, 'KW-35220');
    assert.equal(letrehozas.adat.alkatresz.aktualisAr, 359000);
    assert.ok(letrehozas.adat.alkatresz.slug.startsWith('kw-v3-allithato-futomu-'));

    const ismetlodo = await ertekesito.post('/admin/alkatreszek', k.alkatreszUrlap({ cikkszam: 'KW-35220' }));
    assert.equal(ismetlodo.status, 400);
    assert.match(ismetlodo.adat.error, /cikkszámmal/);

    const nemIllik = await ertekesito.post('/admin/alkatreszek', k.alkatreszUrlap({ kompatibilitas: [] }));
    assert.equal(nemIllik.status, 400);
    assert.equal((await ertekesito.post('/admin/alkatreszek', k.alkatreszUrlap({ kompatibilitas: [], univerzalis: true }))).status, 201);

    const rosszAkcio = await ertekesito.post('/admin/alkatreszek', k.alkatreszUrlap({ akciosAr: 500000 }));
    assert.equal(rosszAkcio.status, 400);
});

test('„Melyik autódhoz?” szűrés: márka, modell, évjárat; az univerzális mindig illik', async () => {
    await k.alkatreszMentese({ nev: 'BMW futómű' }); // BMW 3-as, 2012–2019
    await k.alkatreszMentese({ nev: 'BMW minden modell', kompatibilitas: [{ marka: 'BMW' }] });
    await k.alkatreszMentese({ nev: 'Univerzális szűrő', kategoria: 'szivorendszer', univerzalis: true, kompatibilitas: [] });
    await k.alkatreszMentese({ nev: 'Audi kipufogó', kategoria: 'kipufogo', kompatibilitas: [{ marka: 'Audi', modell: 'A4' }] });
    await k.alkatreszMentese({ nev: 'Rejtett', lathato: false, univerzalis: true });
    const vendeg = k.kliens();
    const nevek = async (utvonal) => (await vendeg.get(utvonal)).adat.alkatreszek.map((a) => a.nev).sort();

    assert.deepEqual(await nevek('/alkatreszek?autoMarka=bmw&autoModell=3-as%20sorozat&autoEvjarat=2015'),
        ['BMW futómű', 'BMW minden modell', 'Univerzális szűrő']);
    assert.deepEqual(await nevek('/alkatreszek?autoMarka=BMW&autoModell=3-as%20sorozat&autoEvjarat=2021'),
        ['BMW minden modell', 'Univerzális szűrő'], 'évjáraton kívül');
    assert.deepEqual(await nevek('/alkatreszek?autoMarka=Audi&autoModell=A4'), ['Audi kipufogó', 'Univerzális szűrő']);
    assert.deepEqual(await nevek('/alkatreszek?kategoria=kipufogo,szivorendszer'), ['Audi kipufogó', 'Univerzális szűrő']);
    assert.equal((await vendeg.get('/alkatreszek')).adat.lapozas.osszes, 4, 'a rejtett kimarad');
});

test('platformra megadott alkatrész a részletesebb modellnevű autóra is illik (szavas előtag)', async () => {
    await k.alkatreszMentese({ nev: 'E46 futómű', kompatibilitas: [{ marka: 'BMW', modell: 'E46', evjaratTol: 1998, evjaratIg: 2006 }] });
    await k.alkatreszMentese({ nev: 'Astra H szűrő', kompatibilitas: [{ marka: 'Opel', modell: 'Astra H' }] });
    const auto = await k.autoMentese({ marka: 'BMW', modell: 'E46 318CI', evjarat: 2001 });
    const vendeg = k.kliens();
    assert.deepEqual((await vendeg.get(`/alkatreszek/autohoz/${auto._id}`)).adat.alkatreszek.map((a) => a.nev), ['E46 futómű']);
    assert.deepEqual((await vendeg.get('/alkatreszek?autoMarka=Opel&autoModell=Astra%20H%20OPC')).adat.alkatreszek.map((a) => a.nev), ['Astra H szűrő']);
    assert.equal((await vendeg.get('/alkatreszek?autoMarka=BMW&autoModell=E4')).adat.lapozas.osszes, 0, 'csak egész szóra illeszt');
    assert.equal((await vendeg.get('/alkatreszek?autoMarka=Opel&autoModell=Astra')).adat.lapozas.osszes, 0, 'az általánosabb név nem illik a szűkebb platformra');
});

test('ár szerinti rendezés és szűrés az akciós árral számol', async () => {
    await k.alkatreszMentese({ nev: 'Drága, de akciós', ar: 300000, akciosAr: 90000 });
    await k.alkatreszMentese({ nev: 'Közepes', ar: 150000 });
    await k.alkatreszMentese({ nev: 'Olcsó', ar: 100000 });
    const vendeg = k.kliens();

    const rendezett = (await vendeg.get('/alkatreszek?rendezes=arNovekvo')).adat.alkatreszek;
    assert.deepEqual(rendezett.map((a) => a.nev), ['Drága, de akciós', 'Olcsó', 'Közepes']);
    assert.equal(rendezett[0].akcios, true);
    assert.equal(rendezett[0].eladottDb, undefined, 'belső statisztika nem kerül ki');

    const sav = (await vendeg.get('/alkatreszek?maxAr=120000')).adat.alkatreszek.map((a) => a.nev).sort();
    assert.deepEqual(sav, ['Drága, de akciós', 'Olcsó']);
    assert.deepEqual((await vendeg.get('/alkatreszek?akcios=1')).adat.alkatreszek.map((a) => a.nev), ['Drága, de akciós']);
});

test('autó adatlapja: előbb a típusra illők, aztán az univerzálisak', async () => {
    const auto = await k.autoMentese({ marka: 'BMW', modell: '3-as sorozat', evjarat: 2016 });
    await k.alkatreszMentese({ nev: 'Univerzális A', univerzalis: true, kompatibilitas: [], kiemelt: true });
    await k.alkatreszMentese({ nev: 'BMW futómű' });
    const valasz = await k.kliens().get(`/alkatreszek/autohoz/${auto._id}`);
    assert.equal(valasz.status, 200);
    assert.deepEqual(valasz.adat.alkatreszek.map((a) => a.nev), ['BMW futómű', 'Univerzális A']);
});

test('szűrőadatok, adatlap, gyors módosítás és törlés jogosultsággal', async () => {
    const termek = await k.alkatreszMentese({ gyarto: 'K&N', kategoria: 'szivorendszer' });
    await k.alkatreszMentese({ gyarto: 'KW' });
    const vendeg = k.kliens();

    const szurok = (await vendeg.get('/alkatreszek/szurok')).adat;
    assert.equal(szurok.kategoriak.find((kat) => kat.kulcs === 'futomu').db, 1);
    assert.deepEqual(szurok.gyartok.map((g) => g.nev), ['K&N', 'KW']);
    assert.deepEqual(szurok.markak, [{ marka: 'BMW', modellek: ['3-as sorozat'] }]);

    const adatlap = await vendeg.get(`/alkatreszek/${termek._id}`);
    assert.equal(adatlap.status, 200);
    assert.equal(adatlap.adat.alkatresz.kategoriaNev, 'Levegőszűrő és szívórendszer');
    assert.equal((await AlkatreszModel.findById(termek._id)).megtekintesek, 1);

    const ertekesito = await k.bejelentkezve('ertekesito');
    const gyors = await ertekesito.patch(`/admin/alkatreszek/${termek._id}`, { keszlet: 12, akciosAr: 350000 });
    assert.equal(gyors.status, 200);
    assert.equal(gyors.adat.alkatresz.aktualisAr, 350000);
    assert.equal((await ertekesito.patch(`/admin/alkatreszek/${termek._id}`, { akciosAr: 999999 })).status, 400);

    assert.equal((await ertekesito.delete(`/admin/alkatreszek/${termek._id}`)).status, 403);
    const admin = await k.bejelentkezve('admin');
    assert.equal((await admin.delete(`/admin/alkatreszek/${termek._id}`)).status, 200);
    assert.deepEqual(k.toroltKepek, [termek.kepek[0].publicId]);
    assert.equal((await vendeg.get(`/alkatreszek/${termek._id}`)).status, 404);
});

test('képvédelem: autó képe nem rendelhető termékhez, és a takarítás nem törli a termék képét', async () => {
    const auto = await k.autoMentese();
    const admin = await k.bejelentkezve('admin');
    const lopott = await admin.post('/admin/alkatreszek', k.alkatreszUrlap({ kepek: auto.kepek.map(({ url, publicId }) => ({ url, publicId })) }));
    assert.equal(lopott.status, 400);

    const termek = await k.alkatreszMentese();
    await admin.delete('/kepek', { publicIds: [termek.kepek[0].publicId, 'veltrix/autok/elveszett'] });
    assert.deepEqual(k.toroltKepek, ['veltrix/autok/elveszett']);
});
