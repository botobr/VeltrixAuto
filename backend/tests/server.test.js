const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const session = require('express-session');
const appLetrehozasa = require('../app');

let server;
let url;

// a szerver elindítása a tesztek előtt (adatbázis nélkül)
before(async () => {
    server = appLetrehozasa({ munkamenetTarolo: new session.MemoryStore() }).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    url = 'http://127.0.0.1:' + server.address().port;
});

after(() => {
    return new Promise((resolve) => server.close(resolve));
});

// bejelentkezés üres adatokkal
const login = () => {
    return fetch(url + '/api/auth/bejelentkezes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
    });
};

test('GET health: pass', async () => {
    const valasz = await fetch(url + '/api/health');
    assert.equal(valasz.status, 200);
});

test('biztonsági fejlécek az API-n: pass', async () => {
    const valasz = await fetch(url + '/api/health');
    assert.equal(valasz.headers.get('x-frame-options'), 'DENY');
    assert.match(valasz.headers.get('content-security-policy'), /default-src 'none'/);
    assert.match(valasz.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(valasz.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(valasz.headers.get('x-powered-by'), null);
});

test('POST login hiányzó adatokkal: pass', async () => {
    const valasz = await login();
    assert.equal(valasz.status, 400);
});

test('GET dashboard bejelentkezés nélkül: pass', async () => {
    const valasz = await fetch(url + '/api/admin/dashboard');
    assert.equal(valasz.status, 403);
});

// Ez a két teszt szándékosan rossz, a tesztelési dokumentációban a sikertelen teszt példája.
test('POST login: fail demo', async () => {
    const valasz = await login();
    assert.equal(valasz.status, 200); // valójában 400 jön
});

test('GET felhasználók admin nélkül: fail demo', async () => {
    const valasz = await fetch(url + '/api/felhasznalok');
    assert.equal(valasz.status, 200); // valójában 403 jön
});
