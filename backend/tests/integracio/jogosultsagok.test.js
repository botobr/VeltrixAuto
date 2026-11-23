const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const FelhasznaloModel = require('../../models/Felhasznalo');
const k = require('./kornyezet');

before(k.inditas);
after(k.leallitas);
beforeEach(k.uritas);

const NEM_LETEZO = '0123456789abcdef01234567';

// Jogosultsági táblázat: [metódus, útvonal, küldött adat, kik férhetnek hozzá]
// Hozzáfér = nem 401 vagy 403 a válasz (a nem létező id miatt lehet 400/404, az most nem számít).
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
    // minden útvonalat kipróbálunk mind a 4 szerepkörrel, a hibákat összegyűjtjük
    const hibak = [];
    for (const sor of MATRIX) {
        const metodus = sor[0];
        const utvonal = sor[1];
        const torzs = sor[2];
        const engedett = sor[3];

        for (const szerepkor in kliensek) {
            const valasz = await kliensek[szerepkor][metodus](utvonal, torzs);
            const tiltott = valasz.status === 401 || valasz.status === 403;
            const szabad = engedett.includes(szerepkor);

            if (tiltott && szabad) {
                hibak.push(metodus.toUpperCase() + ' ' + utvonal + ' – ' + szerepkor + ': ' + valasz.status + ' (engedni kellene)');
            }
            if (!tiltott && !szabad) {
                hibak.push(metodus.toUpperCase() + ' ' + utvonal + ' – ' + szerepkor + ': ' + valasz.status + ' (tiltani kellene)');
            }
        }
    }
    assert.deepEqual(hibak, []);
});

test('/auth/profil: a jogok listája a szerepkörhöz igazodik', async () => {
    const ertekesito = await k.bejelentkezve('ertekesito');
    const admin = await k.bejelentkezve('admin');
    const vasarlo = await k.bejelentkezve('felhasznalo');

    const ertekesitoProfil = await ertekesito.get('/auth/profil');
    const ertekesitoJogai = ertekesitoProfil.adat.felhasznalo.jogok;
    assert.ok(ertekesitoJogai.includes('kezelofelulet'));
    assert.ok(ertekesitoJogai.includes('hirdetesSzerkesztes'));
    assert.ok(!ertekesitoJogai.includes('hirdetesTorles'));
    assert.ok(!ertekesitoJogai.includes('penzugy'));
    assert.equal(ertekesitoProfil.adat.felhasznalo.jelszo, undefined);

    const adminProfil = await admin.get('/auth/profil');
    assert.ok(adminProfil.adat.felhasznalo.jogok.includes('penzugy'));

    const vasarloProfil = await vasarlo.get('/auth/profil');
    assert.deepEqual(vasarloProfil.adat.felhasznalo.jogok, []);
});

test('admin értékesítőt hoz létre; ismeretlen szerepkör elutasítva', async () => {
    const admin = await k.bejelentkezve('admin');
    const letrehozas = await admin.post('/felhasznalok', { nev: 'Új Értékesítő', email: 'uj@teszt.hu', jelszo: 'jelszo12345', statusz: 'ertekesito' });
    assert.equal(letrehozas.status, 201);
    assert.equal(letrehozas.adat.felhasznalo.statusz, 'ertekesito');

    const rossz = await admin.post('/felhasznalok', { nev: 'X', email: 'x@teszt.hu', jelszo: 'jelszo12345', statusz: 'fonok' });
    assert.equal(rossz.status, 400);

    // az új értékesítő be tud lépni és látja a dashboardot
    const belepes = k.kliens();
    const bejelentkezes = await belepes.post('/auth/bejelentkezes', { email: 'uj@teszt.hu', jelszo: 'jelszo12345' });
    assert.equal(bejelentkezes.status, 200);
    const dashboard = await belepes.get('/admin/dashboard');
    assert.equal(dashboard.status, 200);
});

test('lefokozás azonnal érvényes, a munkamenet nem őrzi meg a régi jogot', async () => {
    const admin = await k.bejelentkezve('admin');
    const ertekesito = await k.bejelentkezve('ertekesito');
    const elotte = await ertekesito.get('/admin/autok');
    assert.equal(elotte.status, 200);

    const user = ertekesito.user;
    const modositas = await admin.put(`/felhasznalok/${user._id}`, { nev: user.nev, email: user.email, statusz: 'felhasznalo' });
    assert.equal(modositas.status, 200);

    // ugyanazzal a munkamenettel már nem fér hozzá
    const utana = await ertekesito.get('/admin/autok');
    assert.equal(utana.status, 403);
});

test('a nyilvános regisztráció nem adhat munkatársi szerepkört', async () => {
    const kl = k.kliens();
    const valasz = await kl.post('/auth/regisztracio', { nev: 'Ügyes Béla', email: 'bela@teszt.hu', jelszo: 'jelszo12345', adatkezeles: true, statusz: 'admin' });
    assert.equal(valasz.status, 201);
    assert.equal(valasz.adat.felhasznalo.statusz, 'felhasznalo');
    const dashboard = await kl.get('/admin/dashboard');
    assert.equal(dashboard.status, 403);
});

test('az új regisztráció e-mail-megerősítésig nem léptethető be', async () => {
    const kl = k.kliens();
    const valasz = await kl.post('/auth/regisztracio', { nev: 'Hiteles Béla', email: 'hiteles@teszt.hu', jelszo: 'jelszo12345', adatkezeles: true });
    assert.equal(valasz.status, 201);
    assert.equal(valasz.adat.felhasznalo.emailHitelesitve, false);

    const user = await FelhasznaloModel.findOne({ email: 'hiteles@teszt.hu' }).select('+emailHitelesitoTokenHash +emailHitelesitoLejarat');
    assert.ok(user.emailHitelesitoTokenHash);
    assert.ok(user.emailHitelesitoLejarat > new Date());

    const bejelentkezes = await kl.post('/auth/bejelentkezes', { email: 'hiteles@teszt.hu', jelszo: 'jelszo12345' });
    assert.equal(bejelentkezes.status, 403);
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
    const megerosites = await kl.post('/auth/email-megerosites', { token: 'a'.repeat(64) });
    assert.equal(megerosites.status, 400);
    const visszaallitas = await kl.post('/auth/jelszo-visszaallitas', { token: 'b'.repeat(64), jelszo: 'ujjelszo123' });
    assert.equal(visszaallitas.status, 400);
});
