const authRequired = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Bejelentkezés szükséges!' });
    }

    next();
};

const adminRequired = (req, res, next) => {
    if (!req.session.userId || req.session.statusz !== 'admin') {
        return res.status(403).json({ error: 'Admin jogosultság szükséges!' });
    }

    next();
};

module.exports = { authRequired, adminRequired };
