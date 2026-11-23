// a backend címe (a végéről levesszük a /-t)
let apiCim = import.meta.env.VITE_API_URL || 'http://localhost:3600/api';
if (apiCim.endsWith('/')) {
    apiCim = apiCim.slice(0, -1);
}
export const API_URL = apiCim;

// Kérés küldése a backendnek.
// Ha a válasz hibás, hibát dob a szerver üzenetével (vagy a megadott hibaUzenet-tel).
export const apiKeres = async (utvonal, opciok = {}, hibaUzenet = 'A kérés nem sikerült.') => {
    const beallitasok = {
        credentials: 'include', // a munkamenet süti miatt kell
        method: opciok.method,
        signal: opciok.signal,
        headers: opciok.headers,
    };

    if (opciok.body !== undefined) {
        beallitasok.headers = { 'Content-Type': 'application/json', ...opciok.headers };
        beallitasok.body = JSON.stringify(opciok.body);
    }

    const valasz = await fetch(API_URL + utvonal, beallitasok);

    // ha a válasz nem JSON, üres objektummal megyünk tovább
    let adat;
    try {
        adat = await valasz.json();
    } catch {
        adat = {};
    }

    if (!valasz.ok) {
        const hiba = new Error(adat.hiba || hibaUzenet);
        hiba.status = valasz.status;
        throw hiba;
    }
    return adat;
};
