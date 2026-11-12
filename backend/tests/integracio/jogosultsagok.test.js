const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
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
    ['post', '/new-auto', {}, ['ertekesito', 'admin']],
    ['put', `/update-auto/${NEM_LETEZO}`, {}, ['ertekesito', 'admin']],
    ['patch', `/autok/${NEM_LETEZO}/allapot`, { statusz: 'foglalt' }, ['ertekesito', 'admin']],
    ['delete', `/delete-auto/${NEM_LETEZO}`, undefined, ['admin']],
    ['post', '/kepek', {}, ['ertekesito', 'admin']],
    ['post', '/telephelyek', {}, ['admin']],
    ['put', `/telephelyek/${NEM_LETEZO}`, {}, ['admin']],
    ['delete', `/telephelyek/${NEM_LETEZO}`, undefined, ['admin']],
    ['get', '/felhasznalok', undefined, ['admin']],
    ['post', '/new-user', {}, ['admin']],
    ['put', `/update-user/${NEM_LETEZO}`, {}, ['admin']],
    ['delete', `/delete-user/${NEM_LETEZO}`, undefined, ['admin']],
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

test('/auth/me: a jogok listája a szerepkörhöz igazodik', async () => {
    const ertekesito = await k.bejelentkezve('ertekesito');
    const admin = await k.bejelentkezve('admin');
    const vasarlo = await k.bejelentkezve('felhasznalo');

    const { adat: e } = await ertekesito.get('/auth/me');
    assert.ok(e.user.jogok.includes('kezelofelulet'));
    assert.ok(e.user.jogok.includes('hirdetesSzerkesztes'));
    assert.ok(!e.user.jogok.includes('hirdetesTorles'));
    assert.ok(!e.user.jogok.includes('penzugy'));
    assert.equal(e.user.jelszo, undefined);

    assert.ok((await admin.get('/auth/me')).adat.user.jogok.includes('penzugy'));
    assert.deepEqual((await vasarlo.get('/auth/me')).adat.user.jogok, []);
});

test('admin értékesítőt hoz létre; ismeretlen szerepkör elutasítva', async () => {
    const admin = await k.bejelentkezve('admin');
    const letrehozas = await admin.post('/new-user', { nev: 'Új Értékesítő', email: 'uj@teszt.hu', jelszo: 'jelszo12345', statusz: 'ertekesito' });
    assert.equal(letrehozas.status, 201);
    assert.equal(letrehozas.adat.user.statusz, 'ertekesito');

    const rossz = await admin.post('/new-user', { nev: 'X', email: 'x@teszt.hu', jelszo: 'jelszo12345', statusz: 'fonok' });
    assert.equal(rossz.status, 400);

    const belepes = k.kliens();
    assert.equal((await belepes.post('/auth/login', { email: 'uj@teszt.hu', jelszo: 'jelszo12345' })).status, 200);
    assert.equal((await belepes.get('/admin/dashboard')).status, 200);
});

test('lefokozás azonnal érvényes, a munkamenet nem őrzi meg a régi jogot', async () => {
    const admin = await k.bejelentkezve('admin');
    const ertekesito = await k.bejelentkezve('ertekesito');
    assert.equal((await ertekesito.get('/admin/autok')).status, 200);

    const { user } = ertekesito;
    const modositas = await admin.put(`/update-user/${user._id}`, { nev: user.nev, email: user.email, statusz: 'felhasznalo' });
    assert.equal(modositas.status, 200);
    assert.equal((await ertekesito.get('/admin/autok')).status, 403);
});

test('a nyilvános regisztráció nem adhat munkatársi szerepkört', async () => {
    const kl = k.kliens();
    const valasz = await kl.post('/auth/register', { nev: 'Ügyes Béla', email: 'bela@teszt.hu', jelszo: 'jelszo12345', adatkezeles: true, statusz: 'admin' });
    assert.equal(valasz.status, 201);
    assert.equal(valasz.adat.user.statusz, 'felhasznalo');
    assert.equal((await kl.get('/admin/dashboard')).status, 403);
});
