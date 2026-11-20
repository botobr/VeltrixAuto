const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const FelhasznaloModel = require('../../models/Felhasznalo');
const k = require('./kornyezet');

before(k.inditas);
after(k.leallitas);
beforeEach(k.uritas);

const NEM_LETEZO = '0123456789abcdef01234567';

/*
 * Jogosultsági mátrix: [metódus, útvonal, törzs, mely szerepkörök férhetnek hozzá].
 * „Hozzáfér” = nem 401/403 (a hamis azonosító miatt lehet 400/404 – az már nem jogosultsági kérdés).
 */
const MATRIX = [
    ['get', '/admin/dashboard', undefined, ['ertekesito', 'admin']],
    ['get', '/admin/autok', undefined, ['ertekesito', 'admin']],
    ['get', '/admin/erdeklodesek', undefined, ['ertekesito', 'admin']],
    ['patch', `/admin/erdeklodesek/${NEM_LETEZO}`, { statusz: 'lezart' }, ['ertekesito', 'admin']],
    ['delete', `/admin/erdeklodesek/${NEM_LETEZO}`, undefined, ['admin']],
    ['post', '/autok', {}, ['ertekesito', 'admin']],
    ['put', `/autok/${NEM_LETEZO}`, {}, ['ertekesito', 'admin']],
    ['patch', `/autok/${NEM_LETEZO}/allapot`, { statusz: 'foglalt' }, ['ertekesito', 'admin']],
    ['delete', `/autok/${NEM_LETEZO}`, undefined, ['admin']],
    ['post', '/kepek', {}, ['ertekesito', 'admin']],
    ['get', '/admin/alkatreszek', undefined, ['ertekesito', 'admin']],
    ['post', '/admin/alkatreszek', {}, ['ertekesito', 'admin']],
    ['put', `/admin/alkatreszek/${NEM_LETEZO}`, {}, ['ertekesito', 'admin']],
    ['patch', `/admin/alkatreszek/${NEM_LETEZO}`, { keszlet: 3 }, ['ertekesito', 'admin']],
    ['delete', `/admin/alkatreszek/${NEM_LETEZO}`, undefined, ['admin']],
    ['get', '/admin/rendelesek', undefined, ['ertekesito', 'admin']],
    ['patch', `/admin/rendelesek/${NEM_LETEZO}`, { statusz: 'feldolgozas' }, ['ertekesito', 'admin']],
    ['post', '/telephelyek', {}, ['admin']],
    ['put', `/telephelyek/${NEM_LETEZO}`, {}, ['admin']],
    ['delete', `/telephelyek/${NEM_LETEZO}`, undefined, ['admin']],
    ['get', '/felhasznalok', undefined, ['admin']],
    ['post', '/felhasznalok', {}, ['admin']],
    ['put', `/felhasznalok/${NEM_LETEZO}`, {}, ['admin']],
    ['delete', `/felhasznalok/${NEM_LETEZO}`, undefined, ['admin']],
];

test('jogosultsági mátrix: vendég, vásárló, értékesítő, admin', async () => {
    const kliensek = {
        vendeg: k.kliens(),
        felhasznalo: await k.bejelentkezve('felhasznalo'),
        ertekesito: await k.bejelentkezve('ertekesito'),
        admin: await k.bejelentkezve('admin'),
    };
    const hibak = [];
    for (const [metodus, utvonal, body, engedett] of MATRIX) {
        for (const [szerepkor, kl] of Object.entries(kliensek)) {
            const { status } = await kl[metodus](utvonal, body);
            const tiltott = status === 401 || status === 403;
            const elvart = engedett.includes(szerepkor);
            if (tiltott === elvart) hibak.push(`${metodus.toUpperCase()} ${utvonal} – ${szerepkor}: ${status} (${elvart ? 'engedni' : 'tiltani'} kellene)`);
        }
    }
    assert.deepEqual(hibak, []);
});

test('/auth/profil: a jogok listája a szerepkörhöz igazodik', async () => {
    const ertekesito = await k.bejelentkezve('ertekesito');
    const admin = await k.bejelentkezve('admin');
    const vasarlo = await k.bejelentkezve('felhasznalo');

    const { adat: e } = await ertekesito.get('/auth/profil');
    assert.ok(e.felhasznalo.jogok.includes('kezelofelulet'));
    assert.ok(e.felhasznalo.jogok.includes('hirdetesSzerkesztes'));
    assert.ok(!e.felhasznalo.jogok.includes('hirdetesTorles'));
    assert.ok(!e.felhasznalo.jogok.includes('penzugy'));
    assert.equal(e.felhasznalo.jelszo, undefined);

    assert.ok((await admin.get('/auth/profil')).adat.felhasznalo.jogok.includes('penzugy'));
    assert.deepEqual((await vasarlo.get('/auth/profil')).adat.felhasznalo.jogok, []);
});

test('admin értékesítőt hoz létre; ismeretlen szerepkör elutasítva', async () => {
    const admin = await k.bejelentkezve('admin');
    const letrehozas = await admin.post('/felhasznalok', { nev: 'Új Értékesítő', email: 'uj@teszt.hu', jelszo: 'jelszo12345', statusz: 'ertekesito' });
    assert.equal(letrehozas.status, 201);
    assert.equal(letrehozas.adat.felhasznalo.statusz, 'ertekesito');

    const rossz = await admin.post('/felhasznalok', { nev: 'X', email: 'x@teszt.hu', jelszo: 'jelszo12345', statusz: 'fonok' });
    assert.equal(rossz.status, 400);

    const belepes = k.kliens();
    assert.equal((await belepes.post('/auth/bejelentkezes', { email: 'uj@teszt.hu', jelszo: 'jelszo12345' })).status, 200);
    assert.equal((await belepes.get('/admin/dashboard')).status, 200);
});

test('lefokozás azonnal érvényes, a munkamenet nem őrzi meg a régi jogot', async () => {
    const admin = await k.bejelentkezve('admin');
    const ertekesito = await k.bejelentkezve('ertekesito');
    assert.equal((await ertekesito.get('/admin/autok')).status, 200);

    const { user } = ertekesito;
    const modositas = await admin.put(`/felhasznalok/${user._id}`, { nev: user.nev, email: user.email, statusz: 'felhasznalo' });
    assert.equal(modositas.status, 200);
    assert.equal((await ertekesito.get('/admin/autok')).status, 403);
});

test('a nyilvános regisztráció nem adhat munkatársi szerepkört', async () => {
    const kl = k.kliens();
    const valasz = await kl.post('/auth/regisztracio', { nev: 'Ügyes Béla', email: 'bela@teszt.hu', jelszo: 'jelszo12345', adatkezeles: true, statusz: 'admin' });
    assert.equal(valasz.status, 201);
    assert.equal(valasz.adat.felhasznalo.statusz, 'felhasznalo');
    assert.equal((await kl.get('/admin/dashboard')).status, 403);
});

test('az új regisztráció e-mail-megerősítésig nem léptethető be', async () => {
    const kl = k.kliens();
    const valasz = await kl.post('/auth/regisztracio', { nev: 'Hiteles Béla', email: 'hiteles@teszt.hu', jelszo: 'jelszo12345', adatkezeles: true });
    assert.equal(valasz.status, 201);
    assert.equal(valasz.adat.felhasznalo.emailHitelesitve, false);

    const user = await FelhasznaloModel.findOne({ email: 'hiteles@teszt.hu' }).select('+emailHitelesitoTokenHash +emailHitelesitoLejarat');
    assert.ok(user.emailHitelesitoTokenHash);
    assert.ok(user.emailHitelesitoLejarat > new Date());
    assert.equal((await kl.post('/auth/bejelentkezes', { email: 'hiteles@teszt.hu', jelszo: 'jelszo12345' })).status, 403);
});

test('a jelszó-visszaállítás nem árulja el, létezik-e az e-mail-cím', async () => {
    const kl = k.kliens();
    const letezik = await kl.post('/auth/elfelejtett-jelszo', { email: 'nincs@teszt.hu' });
    const nincs = await kl.post('/auth/elfelejtett-jelszo', { email: 'masik@teszt.hu' });
    assert.equal(letezik.status, 200);
    assert.deepEqual(letezik.adat, nincs.adat);
});

test('érvénytelen vagy lejárt tokennel nem módosítható e-mail vagy jelszó', async () => {
    const kl = k.kliens();
    assert.equal((await kl.post('/auth/email-megerosites', { token: 'a'.repeat(64) })).status, 400);
    assert.equal((await kl.post('/auth/jelszo-visszaallitas', { token: 'b'.repeat(64), jelszo: 'ujjelszo123' })).status, 400);
});
