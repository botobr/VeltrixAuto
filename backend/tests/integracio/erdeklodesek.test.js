const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const ErdeklodesModel = require('../../models/Erdeklodes');
const k = require('./kornyezet');

before(k.inditas);
after(k.leallitas);
beforeEach(k.uritas);

// Az érdeklődés-végpont IP-nként 15 percenként 5 kérést enged – a fájl összesen ennél kevesebbet küld.
const urlap = (auto, felulir = {}) => ({
    auto: String(auto._id), nev: 'Kiss Anna', email: 'anna@teszt.hu', telefon: '+36 30 123 4567',
    uzenet: 'Érdeklődnék, megvan még az autó?', adatkezeles: true, kezdes: Date.now() - 10000, ...felulir,
});

test('érdeklődés: beérkezik, az értékesítő kezeli, de nem törölheti', async () => {
    const auto = await k.autoMentese({ marka: 'Honda', modell: 'Civic' });
    const kuldes = await k.kliens().post('/erdeklodesek', urlap(auto));
    assert.equal(kuldes.status, 201);

    const ertekesito = await k.bejelentkezve('ertekesito');
    const lista = await ertekesito.get('/admin/erdeklodesek');
    assert.equal(lista.adat.erdeklodesek.length, 1);
    const [erdeklodes] = lista.adat.erdeklodesek;
    assert.equal(erdeklodes.autoNev, 'Honda Civic (2021)');
    assert.equal(erdeklodes.statusz, 'uj');

    const kezeles = await ertekesito.patch(`/admin/erdeklodesek/${erdeklodes._id}`, { statusz: 'folyamatban', megjegyzes: 'Visszahívtam.' });
    assert.equal(kezeles.status, 200);
    assert.equal(kezeles.adat.erdeklodes.megjegyzes, 'Visszahívtam.');

    assert.equal((await ertekesito.delete(`/admin/erdeklodesek/${erdeklodes._id}`)).status, 403);
    const admin = await k.bejelentkezve('admin');
    assert.equal((await admin.delete(`/admin/erdeklodesek/${erdeklodes._id}`)).status, 200);
    assert.equal(await ErdeklodesModel.countDocuments(), 0);
});

test('spamszűrés: kitöltött rejtett mező vagy túl gyors kitöltés → látszólag siker, de nem mentjük', async () => {
    const auto = await k.autoMentese();
    assert.equal((await k.kliens().post('/erdeklodesek', urlap(auto, { weboldal: 'http://spam.example' }))).status, 201);
    assert.equal((await k.kliens().post('/erdeklodesek', urlap(auto, { kezdes: Date.now() }))).status, 201);
    assert.equal(await ErdeklodesModel.countDocuments(), 0);
});

test('rejtett autóra nem lehet érdeklődni', async () => {
    const auto = await k.autoMentese({ lathato: false });
    assert.equal((await k.kliens().post('/erdeklodesek', urlap(auto))).status, 404);
});
