/**
 * Egyszerű, memóriában tárolt kéréskorlátozó IP-cím alapján.
 * Egy szerverpéldányhoz elegendő; több példánynál közös tároló (pl. Redis) kellene.
 */
const korlatozo = ({ ablakMs, max, uzenet = 'Túl sok kérés. Próbáld újra később.' }) => {
    const keresek = new Map();

    const takaritas = setInterval(() => {
        const most = Date.now();
        for (const [kulcs, adat] of keresek) {
            if (adat.kezdete + ablakMs < most) keresek.delete(kulcs);
        }
    }, ablakMs);
    takaritas.unref();

    return (req, res, next) => {
        const most = Date.now();
        const kulcs = req.ip;
        let adat = keresek.get(kulcs);
        if (!adat || adat.kezdete + ablakMs < most) {
            adat = { kezdete: most, db: 0 };
            keresek.set(kulcs, adat);
        }
        adat.db += 1;
        if (adat.db > max) {
            const masodperc = Math.ceil((adat.kezdete + ablakMs - most) / 1000);
            res.set('Retry-After', String(masodperc));
            return res.status(429).json({ error: uzenet });
        }
        return next();
    };
};

module.exports = korlatozo;
