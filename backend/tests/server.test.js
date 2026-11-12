const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const session = require('express-session');
const createApp = require('../app');
let server;
let url;
before(async () => {
    server = createApp({ sessionStore: new session.MemoryStore() }).listen(0);
    await new Promise((r) => server.once('listening', r));
    url = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((r) => server.close(r)));
const login = () => fetch(`${url}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
});

test('GET health: pass', async () => assert.equal((await fetch(`${url}/api/health`)).status, 200));
test('POST login hiányzó adatokkal: pass', async () => assert.equal((await login()).status, 400));
test('GET dashboard bejelentkezés nélkül: pass', async () =>
    assert.equal((await fetch(`${url}/api/admin/dashboard`)).status, 403));
test('POST login: fail demo', async () => assert.equal((await login()).status, 200)); // Ténylegesen 400
test('GET felhasználók admin nélkül: fail demo', async () =>
    assert.equal((await fetch(`${url}/api/felhasznalok`)).status, 200)); // Ténylegesen 403