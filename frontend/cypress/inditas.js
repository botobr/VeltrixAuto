/*
 * E2E-tesztek indítása egy paranccsal:
 *   npm run e2e                          – minden teszt, fej nélküli böngészőben
 *   npm run e2e -- --spec cypress/e2e/webshop.cy.js   – csak egy fájl
 *   npm run e2e:open                     – a Cypress interaktív felülete
 *
 * Elindítja a backend E2E tesztszerverét (memóriabeli adatbázis, port 3601) és egy
 * külön Vite-példányt (port 5174), megvárja őket, futtatja a Cypress-t, majd leállít mindent.
 * A fejlesztői szerverekhez (3600, 5173) és az éles adatbázishoz nem nyúl.
 */
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_PORT = 3601;
const FRONTEND_PORT = 5174;
const FRONTEND_MAPPA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND_MAPPA = path.resolve(FRONTEND_MAPPA, '../backend');

const interaktiv = process.argv.includes('--open');
const cypressArgumentumok = process.argv.slice(2).filter((a) => a !== '--open');
const folyamatok = [];

// A Vite a „localhost”-ot gyakran csak IPv6-on (::1) nyitja meg, a backend IPv4-en is – mindkettőt nézzük.
const CIMEK = ['127.0.0.1', '::1'];

const kapcsolodik = (port, cim) => new Promise((resolve) => {
    const kapcsolat = net.connect(port, cim).once('connect', () => { kapcsolat.destroy(); resolve(true); }).once('error', () => resolve(false));
});

const portSzabad = async (port) => !(await Promise.all(CIMEK.map((cim) => kapcsolodik(port, cim)))).some(Boolean);

const portraVar = async (port, nev, idokorlatMs = 120000) => {
    const vege = Date.now() + idokorlatMs;
    while (Date.now() < vege) {
        const elerheto = (await Promise.all(CIMEK.map((cim) => kapcsolodik(port, cim)))).some(Boolean);
        if (elerheto) return;
        await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`${nev} nem indult el ${idokorlatMs / 1000} másodperc alatt (port ${port}).`);
};

const indit = (nev, args, opciok) => {
    const folyamat = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opciok });
    const kiir = (adat) => {
        for (const sor of String(adat).split(/\r?\n/).filter(Boolean)) console.log(`[${nev}] ${sor}`);
    };
    folyamat.stdout.on('data', kiir);
    folyamat.stderr.on('data', kiir);
    folyamatok.push(folyamat);
    return folyamat;
};

const leallitas = () => {
    for (const folyamat of folyamatok) {
        if (folyamat.exitCode !== null) continue;
        // Windowson a teljes folyamatfát le kell állítani (a Vite / mongod gyerekfolyamatai miatt).
        if (process.platform === 'win32') spawn('taskkill', ['/pid', String(folyamat.pid), '/T', '/F'], { stdio: 'ignore' });
        else folyamat.kill('SIGTERM');
    }
};
process.on('SIGINT', () => { leallitas(); process.exit(130); });

try {
    for (const port of [API_PORT, FRONTEND_PORT]) {
        if (!(await portSzabad(port))) throw new Error(`A ${port}-es port foglalt – egy korábbi tesztfuttatás még fut? Állítsd le, és próbáld újra.`);
    }

    indit('backend', ['tests/e2e/szerver.js'], {
        cwd: BACKEND_MAPPA,
        env: { ...process.env, E2E_API_PORT: String(API_PORT), E2E_FRONTEND_URL: `http://localhost:${FRONTEND_PORT}` },
    });
    indit('frontend', ['node_modules/vite/bin/vite.js', '--port', String(FRONTEND_PORT), '--strictPort'], {
        cwd: FRONTEND_MAPPA,
        env: { ...process.env, VITE_API_URL: `http://localhost:${API_PORT}/api` },
    });
    await Promise.all([portraVar(API_PORT, 'Az E2E tesztszerver'), portraVar(FRONTEND_PORT, 'A frontend (Vite)')]);

    // A VS Code / Electron alapú terminálokból örökölt ELECTRON_RUN_AS_NODE megakadályozná a Cypress indulását.
    const cypressKornyezet = { ...process.env };
    delete cypressKornyezet.ELECTRON_RUN_AS_NODE;
    const cypress = spawn(process.execPath, ['node_modules/cypress/bin/cypress', interaktiv ? 'open' : 'run', '--e2e', ...cypressArgumentumok], {
        cwd: FRONTEND_MAPPA,
        env: cypressKornyezet,
        stdio: 'inherit',
    });
    const kilepesiKod = await new Promise((resolve) => cypress.on('exit', (kod) => resolve(kod ?? 1)));
    process.exitCode = kilepesiKod;
} catch (error) {
    console.error(`\n✖ ${error.message}`);
    process.exitCode = 1;
} finally {
    leallitas();
}
