const authRequired = (req, res, next) => {
    const bejelentkezett = Boolean(req.session.userId);
    if (!bejelentkezett) {
        return res.status(401).json({ error: 'Bejelentkezés szükséges!' });
    }

    next();
};

const adminRequired = (req, res, next) => {
    const admin = req.session.userId && req.session.statusz === 'admin';
    if (!admin) {
        return res.status(403).json({ error: 'Admin jogosultság szükséges!' });
    }

    next();
};

module.exports = { authRequired, adminRequired };
