const FelhasznaloModel = require('../models/Felhasznalo');
const { JOGOK, vanJoga } = require('../utils/jogosultsagok');

/**
 * A szerepkört minden védett kérésnél az adatbázisból ellenőrizzük, így egy
 * törölt vagy lefokozott felhasználó jogosultsága azonnal megszűnik, nem csak
 * a munkamenet lejártakor.
 */
const aktualisFelhasznalo = async (req) => {
    if (!req.session?.userId) return null;
    const user = await FelhasznaloModel.findById(req.session.userId).select('statusz');
    if (!user) return null;
    req.session.statusz = user.statusz;
    return user;
};

const bejelentkezesSzukseges = async (req, res, next) => {
    const user = await aktualisFelhasznalo(req);
    if (!user) {
        return res.status(401).json({ hiba: 'Bejelentkezés szükséges!' });
    }

    return next();
};

/**
 * Middleware: csak a jog(ok)kal rendelkező szerepkör engedi tovább (lásd utils/jogosultsagok.js).
 * Több jog esetén bármelyik elég.
 */
const jogSzukseges = (...jogok) => {
    for (const jog of jogok) if (!JOGOK[jog]) throw new Error(`Ismeretlen jogosultság: ${jog}`);
    return async (req, res, next) => {
        const user = req.session?.userId ? await aktualisFelhasznalo(req) : null;
        if (!jogok.some((jog) => vanJoga(user?.statusz, jog))) {
            return res.status(403).json({ hiba: 'Nincs jogosultságod ehhez a művelethez.' });
        }
        return next();
    };
};

/**
 * A munkamenetben tárolt szerepkör alapján (a védett útvonalak frissítik).
 * Nyilvános útvonalakon használjuk, ahol a belső nézet csak plusz adat.
 */
const munkamenetJoga = (req, jog) => vanJoga(req.session?.statusz, jog);

module.exports = { bejelentkezesSzukseges, jogSzukseges, munkamenetJoga };
