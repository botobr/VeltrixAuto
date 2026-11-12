const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const AutokModel = require('../../models/Autok');
const UserModel = require('../../models/User');
const k = require('./kornyezet');

before(k.inditas);
after(k.leallitas);
beforeEach(k.uritas);

test('értékesítő hirdetést hoz létre; a belső statisztikát látja, a pénzügyi adatot nem', async () => {
    const ertekesito = await k.bejelentkezve('ertekesito');
    const { status, adat } = await ertekesito.post('/new-auto', k.autoUrlap());
    assert.equal(status, 201);
    assert.equal(adat.auto.megtekintesek, 0);
    assert.ok(!('eladasi_ar' in adat.auto));
    assert.ok(adat.auto.slug.startsWith('toyota-corolla-2021-'));
});

test('elkelt státusz: az eladási dátum és ár automatikusan kitöltődik, visszaállításkor törlődik', async () => {
    const ertekesito = await k.bejelentkezve('ertekesito');
    const admin = await k.bejelentkezve('admin');
    const { adat } = await ertekesito.post('/new-auto', k.autoUrlap());
    const id = adat.auto._id;

    const eladas = await ertekesito.patch(`/autok/${id}/allapot`, { statusz: 'elkelt' });
    assert.equal(eladas.status, 200);
    assert.ok(!('eladasi_ar' in eladas.adat.auto), 'az értékesítő válaszában nincs eladási ár');

    const mentett = await AutokModel.findById(id);
    assert.equal(mentett.eladasi_ar, 8990000);
    assert.ok(Date.now() - mentett.eladas_datum.getTime() < 60 * 1000);

    const adminNezet = await admin.get(`/autok/${id}`);
    assert.equal(adminNezet.adat.auto.eladasi_ar, 8990000);

    await admin.patch(`/autok/${id}/allapot`, { statusz: 'elerheto' });
    const visszaallitott = await AutokModel.findById(id);
    assert.equal(visszaallitott.eladasi_ar, null);
    assert.equal(visszaallitott.eladas_datum, null);
});

test('értékesítő szerkesztése nem írja felül az admin által rögzített eladási árat', async () => {
    const admin = await k.bejelentkezve('admin');
    const ertekesito = await k.bejelentkezve('ertekesito');
    const urlap = k.autoUrlap({ statusz: 'elkelt', eladasi_ar: 8500000, eladas_datum: '2026-10-01' });
    const { adat } = await admin.post('/new-auto', urlap);
    assert.equal(adat.auto.eladasi_ar, 8500000);

    // Az értékesítő űrlapján nincsenek eladási mezők – és ha a kérésbe mégis beírja, akkor is figyelmen kívül marad.
    const modositas = await ertekesito.put(`/update-auto/${adat.auto._id}`, { ...urlap, leiras: 'Új leírás', eladasi_ar: 1 });
    assert.equal(modositas.status, 200);

    const mentett = await AutokModel.findById(adat.auto._id);
    assert.equal(mentett.leiras, 'Új leírás');
    assert.equal(mentett.eladasi_ar, 8500000);
    assert.equal(mentett.eladas_datum.toISOString().slice(0, 10), '2026-10-01');
});

test('értékesítő új eladott autónál nem adhat meg eladási árat (a vételár lesz)', async () => {
    const ertekesito = await k.bejelentkezve('ertekesito');
    const { adat } = await ertekesito.post('/new-auto', k.autoUrlap({ statusz: 'elkelt', eladasi_ar: 100 }));
    assert.equal((await AutokModel.findById(adat.auto._id)).eladasi_ar, 8990000);
});

test('nyilvános nézet: rejtett és eladott autó kimarad, belső adatok nem kerülnek ki', async () => {
    const lathato = await k.autoMentese({ marka: 'Audi' });
    const rejtett = await k.autoMentese({ marka: 'BMW', lathato: false });
    const eladott = await k.autoMentese({ marka: 'Opel', statusz: 'elkelt', eladasi_ar: 5000000 });
    const vendeg = k.kliens();

    const lista = await vendeg.get('/autok');
    assert.deepEqual(lista.adat.autok.map((auto) => auto.marka), ['Audi']);
    assert.equal(lista.adat.autok[0].megtekintesek, undefined);

    assert.equal((await vendeg.get(`/autok/${rejtett._id}`)).status, 404);
    const eladottAdatlap = await vendeg.get(`/autok/${eladott._id}`);
    assert.equal(eladottAdatlap.status, 200);
    assert.equal(eladottAdatlap.adat.auto.eladasi_ar, undefined);
    assert.equal(eladottAdatlap.adat.auto.eladas_datum, undefined);

    const ertekesito = await k.bejelentkezve('ertekesito');
    assert.equal((await ertekesito.get(`/autok/${rejtett._id}`)).status, 200);
    assert.equal((await ertekesito.get(`/autok/${lathato._id}`)).adat.auto.megtekintesek, 0);
});

test('szűrés és rendezés a nyilvános listában', async () => {
    await k.autoMentese({ marka: 'Audi', vetel_ar: 5000000, evjarat: 2015 });
    await k.autoMentese({ marka: 'BMW', vetel_ar: 12000000, evjarat: 2020 });
    await k.autoMentese({ marka: 'Audi', vetel_ar: 9000000, evjarat: 2019 });
    const vendeg = k.kliens();

    const audik = await vendeg.get('/autok?marka=audi&rendezes=arNovekvo');
    assert.deepEqual(audik.adat.autok.map((auto) => auto.vetel_ar), [5000000, 9000000]);

    const sav = await vendeg.get('/autok?minAr=6000000&evjaratTol=2019');
    assert.equal(sav.adat.lapozas.osszes, 2);

    const szurok = await vendeg.get('/autok/szurok');
    assert.deepEqual(szurok.adat.markak.map((m) => [m.marka, m.db]), [['Audi', 2], ['BMW', 1]]);
});

test('törlés: értékesítőnek tiltott; adminnál a képek és a kedvencek is takarítva', async () => {
    const auto = await k.autoMentese();
    const vasarlo = await k.bejelentkezve('felhasznalo');
    await vasarlo.post(`/fiok/kedvencek/${auto._id}`);
    assert.equal((await UserModel.findById(vasarlo.user._id)).kedvencek.length, 1);

    const ertekesito = await k.bejelentkezve('ertekesito');
    assert.equal((await ertekesito.delete(`/delete-auto/${auto._id}`)).status, 403);
    assert.ok(await AutokModel.exists({ _id: auto._id }));

    const admin = await k.bejelentkezve('admin');
    assert.equal((await admin.delete(`/delete-auto/${auto._id}`)).status, 200);
    assert.equal(await AutokModel.exists({ _id: auto._id }), null);
    assert.deepEqual(k.toroltKepek, [auto.kepek[0].publicId]);
    assert.equal((await UserModel.findById(vasarlo.user._id)).kedvencek.length, 0);
});

test('megtekintés számlálása: látogatónál nő, munkatársnál nem', async () => {
    const auto = await k.autoMentese();
    await k.kliens().post(`/autok/${auto._id}/esemeny`, { tipus: 'megtekintes' });
    await k.kliens().post(`/autok/${auto._id}/esemeny`, { tipus: 'telefon' });
    const ertekesito = await k.bejelentkezve('ertekesito');
    await ertekesito.post(`/autok/${auto._id}/esemeny`, { tipus: 'megtekintes' });

    const mentett = await AutokModel.findById(auto._id);
    assert.equal(mentett.megtekintesek, 1);
    assert.equal(mentett.telefonKattintasok, 1);
});
