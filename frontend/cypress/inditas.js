// Az E2E tesztek indítása egy paranccsal:
//   npm run e2e                                      – az összes teszt (ablak nélkül)
//   npm run e2e -- --spec cypress/e2e/webshop.cy.js  – csak egy fájl
//   npm run e2e:open                                 – a Cypress felülete
//
// Elindítja a backend tesztszerverét (port 3601) és egy külön Vite-ot (port 5174),
// megvárja, amíg elindulnak, lefuttatja a Cypress-t, végül mindent leállít.
// A fejlesztői szerverekhez (3600, 5173) és az éles adatbázishoz nem nyúl.
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_PORT = 3601;
const FRONTEND_PORT = 5174;
const FRONTEND_MAPPA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND_MAPPA = path.resolve(FRONTEND_MAPPA, '../backend');

const interaktiv = process.argv.includes('--open');
// a többi parancssori argumentumot továbbadjuk a Cypress-nek
const cypressArgumentumok = process.argv.slice(2).filter((arg) => arg !== '--open');
const folyamatok = [];

// A Vite a localhost-ot néha csak IPv6-on (::1) nyitja meg, ezért mindkettőt nézzük.
const CIMEK = ['127.0.0.1', '::1'];

// lehet-e kapcsolódni a porthoz (true / false)
const kapcsolodik = (port, cim) => {
    return new Promise((resolve) => {
        const kapcsolat = net.connect(port, cim);
        kapcsolat.once('connect', () => {
            kapcsolat.destroy();
            resolve(true);
        });
        kapcsolat.once('error', () => {
            resolve(false);
        });
    });
};

// fut-e már valami a porton (valamelyik címen)
const portFoglalt = async (port) => {
    for (const cim of CIMEK) {
        if (await kapcsolodik(port, cim)) {
            return true;
        }
    }
    return false;
};

const varakozas = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// várunk, amíg a szerver elindul a porton (max 2 perc)
const portraVar = async (port, nev, idokorlatMs = 120000) => {
    const vege = Date.now() + idokorlatMs;
    while (Date.now() < vege) {
        if (await portFoglalt(port)) {
            return;
        }
        await varakozas(500);
    }
    throw new Error(nev + ' nem indult el ' + (idokorlatMs / 1000) + ' másodperc alatt (port ' + port + ').');
};

// egy node folyamat indítása, a kimenetét a névvel együtt kiírjuk
const indit = (nev, args, opciok) => {
    const folyamat = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opciok });
    const kiir = (adat) => {
        const sorok = String(adat).split(/\r?\n/);
        for (const sor of sorok) {
            if (sor) {
                console.log('[' + nev + '] ' + sor);
            }
        }
    };
    folyamat.stdout.on('data', kiir);
    folyamat.stderr.on('data', kiir);
    folyamatok.push(folyamat);
    return folyamat;
};

// az összes elindított folyamat leállítása
const leallitas = () => {
    for (const folyamat of folyamatok) {
        if (folyamat.exitCode !== null) {
            continue;
        }
        if (process.platform === 'win32') {
            // Windowson az egész folyamatfát le kell állítani (a Vite és a mongod miatt)
            spawn('taskkill', ['/pid', String(folyamat.pid), '/T', '/F'], { stdio: 'ignore' });
        } else {
            folyamat.kill('SIGTERM');
        }
    }
};

process.on('SIGINT', () => {
    leallitas();
    process.exit(130);
});

try {
    for (const port of [API_PORT, FRONTEND_PORT]) {
        if (await portFoglalt(port)) {
            throw new Error('A ' + port + '-es port foglalt – egy korábbi tesztfuttatás még fut? Állítsd le, és próbáld újra.');
        }
    }

    indit('backend', ['tests/e2e/szerver.js'], {
        cwd: BACKEND_MAPPA,
        env: { ...process.env, E2E_API_PORT: String(API_PORT), E2E_FRONTEND_URL: 'http://localhost:' + FRONTEND_PORT },
    });
    indit('frontend', ['node_modules/vite/bin/vite.js', '--port', String(FRONTEND_PORT), '--strictPort'], {
        cwd: FRONTEND_MAPPA,
        env: { ...process.env, VITE_API_URL: 'http://localhost:' + API_PORT + '/api' },
    });
    await portraVar(API_PORT, 'Az E2E tesztszerver');
    await portraVar(FRONTEND_PORT, 'A frontend (Vite)');

    // VS Code terminálból ez a változó öröklődik, és miatta nem indulna el a Cypress
    const cypressKornyezet = { ...process.env };
    delete cypressKornyezet.ELECTRON_RUN_AS_NODE;

    const cypress = spawn(process.execPath, ['node_modules/cypress/bin/cypress', interaktiv ? 'open' : 'run', '--e2e', ...cypressArgumentumok], {
        cwd: FRONTEND_MAPPA,
        env: cypressKornyezet,
        stdio: 'inherit',
    });

    // megvárjuk, amíg a Cypress lefut
    const kilepesiKod = await new Promise((resolve) => {
        cypress.on('exit', (kod) => {
            if (kod === null) {
                resolve(1);
            } else {
                resolve(kod);
            }
        });
    });
    process.exitCode = kilepesiKod;
} catch (error) {
    console.error('\n✖ ' + error.message);
    process.exitCode = 1;
} finally {
    leallitas();
}
