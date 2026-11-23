// Egyszerű kéréskorlátozó IP-cím alapján, a memóriában tároljuk a számlálókat.
// Pl. a bejelentkezésnél, hogy ne lehessen végtelen sokszor próbálkozni.

// az összes korlátozó számlálója (a tesztszerver minden teszt előtt kinullázza)
const osszesKorlat = [];

const korlatozo = ({ ablakMs, max, uzenet = 'Túl sok kérés. Próbáld újra később.' }) => {
    // IP-cím -> { kezdete, db }
    const keresek = new Map();
    osszesKorlat.push(keresek);

    // a lejárt bejegyzéseket időnként töröljük
    const takaritas = setInterval(() => {
        const most = Date.now();
        for (const [ip, adat] of keresek) {
            if (adat.kezdete + ablakMs < most) {
                keresek.delete(ip);
            }
        }
    }, ablakMs);
    takaritas.unref(); // emiatt ne fusson tovább a program

    return (req, res, next) => {
        const most = Date.now();
        const ip = req.ip;
        let adat = keresek.get(ip);

        // ha még nincs, vagy már lejárt az időablak, újrakezdjük a számolást
        if (!adat || adat.kezdete + ablakMs < most) {
            adat = { kezdete: most, db: 0 };
            keresek.set(ip, adat);
        }

        adat.db = adat.db + 1;

        if (adat.db > max) {
            const masodperc = Math.ceil((adat.kezdete + ablakMs - most) / 1000);
            res.set('Retry-After', String(masodperc));
            return res.status(429).json({ hiba: uzenet });
        }
        return next();
    };
};

// minden számláló törlése (csak a teszteknél használjuk)
const korlatokTorlese = () => {
    for (const keresek of osszesKorlat) {
        keresek.clear();
    }
};

module.exports = korlatozo;
module.exports.korlatokTorlese = korlatokTorlese;
