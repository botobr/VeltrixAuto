const UserModel = require('../models/User');

/**
 * A szerepkört minden védett kérésnél az adatbázisból ellenőrizzük, így egy
 * törölt vagy lefokozott felhasználó jogosultsága azonnal megszűnik, nem csak
 * a munkamenet lejártakor.
 */
const aktualisFelhasznalo = async (req) => {
    if (!req.session?.userId) return null;
    const user = await UserModel.findById(req.session.userId).select('statusz');
    if (!user) return null;
    req.session.statusz = user.statusz;
    return user;
};

const authRequired = async (req, res, next) => {
    const user = await aktualisFelhasznalo(req);
    if (!user) {
        return res.status(401).json({ error: 'Bejelentkezés szükséges!' });
    }

    return next();
};

const adminRequired = async (req, res, next) => {
    if (!req.session?.userId) {
        return res.status(403).json({ error: 'Admin jogosultság szükséges!' });
    }
    const user = await aktualisFelhasznalo(req);
    if (user?.statusz !== 'admin') {
        return res.status(403).json({ error: 'Admin jogosultság szükséges!' });
    }

    return next();
};

module.exports = { authRequired, adminRequired };
