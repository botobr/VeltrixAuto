const FelhasznaloModel = require('../models/Felhasznalo');
const { JOGOK, vanJoga } = require('../utils/jogosultsagok');

// A bejelentkezett felhasználót mindig az adatbázisból kérjük le, így ha közben
// törölték vagy elvették a jogát, azonnal nem fér hozzá semmihez.
const aktualisFelhasznalo = async (req) => {
    if (!req.session || !req.session.userId) {
        return null;
    }

    const felhasznalo = await FelhasznaloModel.findById(req.session.userId).select('statusz');
    if (!felhasznalo) {
        return null;
    }

    req.session.statusz = felhasznalo.statusz;
    return felhasznalo;
};

// csak bejelentkezett felhasználó mehet tovább
const bejelentkezesSzukseges = async (req, res, next) => {
    const felhasznalo = await aktualisFelhasznalo(req);
    if (!felhasznalo) {
        return res.status(401).json({ hiba: 'Bejelentkezés szükséges!' });
    }
    return next();
};

// Csak az mehet tovább, akinek megvan a jog (ha több jogot adunk meg, elég az egyik).
// Pl. router.get('/', jogSzukseges('kezelofelulet'), ...)
const jogSzukseges = (...jogok) => {
    // elírás ellen: ha nem létező jogot adunk meg, már induláskor hibát dob
    for (const jog of jogok) {
        if (!JOGOK[jog]) {
            throw new Error('Ismeretlen jogosultság: ' + jog);
        }
    }

    return async (req, res, next) => {
        const felhasznalo = await aktualisFelhasznalo(req);

        let szabad = false;
        if (felhasznalo) {
            for (const jog of jogok) {
                if (vanJoga(felhasznalo.statusz, jog)) {
                    szabad = true;
                }
            }
        }

        if (!szabad) {
            return res.status(403).json({ hiba: 'Nincs jogosultságod ehhez a művelethez.' });
        }
        return next();
    };
};

// A munkamenetben tárolt szerepkör alapján nézi a jogot.
// Nyilvános oldalakon használjuk, ahol a munkatárs csak plusz adatokat lát.
const munkamenetJoga = (req, jog) => {
    if (!req.session) {
        return false;
    }
    return vanJoga(req.session.statusz, jog);
};

module.exports = { bejelentkezesSzukseges, jogSzukseges, munkamenetJoga };
