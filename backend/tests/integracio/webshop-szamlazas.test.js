// Számlázás (Billingo) – a Billingót nem hívjuk meg, kamu függvényekkel figyeljük, mi történik.
const assert = require('node:assert/strict');
const { after, afterEach, before, beforeEach, test } = require('node:test');
const RendelesModel = require('../../models/Rendeles');
const szamlazas = require('../../utils/szamlazas');
const k = require('./kornyezet');

before(k.inditas);
after(k.leallitas);
beforeEach(k.uritas);

// a kamu Billingo: megjegyzi, mi történt
let kiallitott = [];
let sztornozott = [];
let kiallitasHiba = null;

const eredeti = {
    beallitva: szamlazas.beallitva,
    szamlaKiallitasa: szamlazas.szamlaKiallitasa,
    szamlaSztornozasa: szamlazas.szamlaSztornozasa,
};

beforeEach(() => {
    kiallitott = [];
    sztornozott = [];
    kiallitasHiba = null;
    szamlazas.beallitva = () => true;
    szamlazas.szamlaKiallitasa = async (rendeles) => {
        if (kiallitasHiba) {
            throw new Error(kiallitasHiba);
        }
        kiallitott.push(rendeles.rendelesSzam);
        return { id: String(1000 + kiallitott.length), szam: 'VX-2026-' + kiallitott.length };
    };
    szamlazas.szamlaSztornozasa = async (szamlaId) => {
        sztornozott.push(szamlaId);
        return { szam: 'STORNO-' + szamlaId };
    };
});

afterEach(() => {
    szamlazas.beallitva = eredeti.beallitva;
    szamlazas.szamlaKiallitasa = eredeti.szamlaKiallitasa;
    szamlazas.szamlaSztornozasa = eredeti.szamlaSztornozasa;
});

const tetel = (termek, mennyiseg = 1) => {
    return { id: String(termek._id), mennyiseg: mennyiseg };
};

test('átutalás: a fizetés rögzítésekor elkészül a számla, a vevő csak a számát látja', async () => {
    const termek = await k.alkatreszMentese();
    const leadas = await k.kliens().post('/rendelesek', k.rendelesTorzs([tetel(termek)], { fizetesiMod: 'atutalas' }));
    const rendeles = await RendelesModel.findOne();
    assert.equal(kiallitott.length, 0, 'fizetés előtt nincs számla');

    const admin = await k.bejelentkezve('admin');
    const valasz = await admin.patch('/admin/rendelesek/' + rendeles._id, { fizetve: true });
    assert.equal(valasz.status, 200);
    assert.deepEqual(kiallitott, [rendeles.rendelesSzam]);
    assert.equal(valasz.adat.rendeles.szamla.szam, 'VX-2026-1');
    assert.equal(valasz.adat.rendeles.szamla.hiba, null);

    // a vevő oldalán csak a számla száma van
    const vevoNezet = await k.kliens().get('/rendelesek/' + leadas.adat.rendelesSzam + '?kulcs=' + leadas.adat.kulcs);
    assert.deepEqual(vevoNezet.adat.rendeles.szamla, { szam: 'VX-2026-1', sztornoSzam: null });
});

test('utánvét: a számla a teljesítéskor készül el, egyszer', async () => {
    const termek = await k.alkatreszMentese();
    await k.kliens().post('/rendelesek', k.rendelesTorzs([tetel(termek)]));
    const rendeles = await RendelesModel.findOne();
    const admin = await k.bejelentkezve('admin');
    const utvonal = '/admin/rendelesek/' + rendeles._id;

    await admin.patch(utvonal, { statusz: 'feldolgozas' });
    await admin.patch(utvonal, { statusz: 'feladva' });
    assert.equal(kiallitott.length, 0);

    await admin.patch(utvonal, { statusz: 'teljesitve' });
    await admin.patch(utvonal, { belsoMegjegyzes: 'kész' });
    assert.equal(kiallitott.length, 1, 'egy rendeléshez csak egy számla');
});

test('ha a számla nem készül el, a hiba elmentődik, és az adminban újra lehet próbálni', async () => {
    const termek = await k.alkatreszMentese();
    await k.kliens().post('/rendelesek', k.rendelesTorzs([tetel(termek)], { fizetesiMod: 'atutalas' }));
    const rendeles = await RendelesModel.findOne();
    const admin = await k.bejelentkezve('admin');

    kiallitasHiba = 'Billingo hiba (422): hibás adószám';
    const eredetiHiba = console.error;
    console.error = () => {};
    let elso;
    try {
        elso = await admin.patch('/admin/rendelesek/' + rendeles._id, { fizetve: true });
    } finally {
        console.error = eredetiHiba;
    }
    assert.equal(elso.status, 200, 'a fizetés rögzítése a számla hibája miatt nem bukik el');
    assert.equal(elso.adat.rendeles.fizetes.statusz, 'fizetve');
    assert.match(elso.adat.rendeles.szamla.hiba, /hibás adószám/);

    kiallitasHiba = null;
    const ujra = await admin.patch('/admin/rendelesek/' + rendeles._id, { szamla: true });
    assert.equal(ujra.status, 200);
    assert.equal(ujra.adat.rendeles.szamla.szam, 'VX-2026-1');
    assert.equal(ujra.adat.rendeles.szamla.hiba, null);
});

test('kifizetett, számlázott rendelés lemondásakor a számlát sztornózzuk', async () => {
    const termek = await k.alkatreszMentese();
    await k.kliens().post('/rendelesek', k.rendelesTorzs([tetel(termek)], { fizetesiMod: 'atutalas' }));
    const rendeles = await RendelesModel.findOne();
    const admin = await k.bejelentkezve('admin');

    await admin.patch('/admin/rendelesek/' + rendeles._id, { fizetve: true });
    const lemondas = await admin.patch('/admin/rendelesek/' + rendeles._id, { statusz: 'lemondva' });
    assert.equal(lemondas.status, 200);
    assert.deepEqual(sztornozott, ['1001']);
    assert.equal(lemondas.adat.rendeles.szamla.sztornoSzam, 'STORNO-1001');
});

test('számla nélküli (ki nem fizetett) rendeléshez nem kérhető számla', async () => {
    const termek = await k.alkatreszMentese();
    await k.kliens().post('/rendelesek', k.rendelesTorzs([tetel(termek)], { fizetesiMod: 'atutalas' }));
    const rendeles = await RendelesModel.findOne();
    const admin = await k.bejelentkezve('admin');

    const valasz = await admin.patch('/admin/rendelesek/' + rendeles._id, { szamla: true });
    assert.equal(valasz.status, 409);
    assert.equal(kiallitott.length, 0);
});
