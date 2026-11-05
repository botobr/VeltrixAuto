const express = require('express');
const UserModel = require('../models/User');
const publicUser = require('../utils/userResponse');
const { authRequired } = require('../middlewares/authMiddleware');
const korlatozo = require('../utils/rateLimit');

const router = express.Router();
const loginProbal = new Map();

const EMAIL_MINTA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const regisztracioLimit = korlatozo({ ablakMs: 60 * 60 * 1000, max: 5, uzenet: 'Túl sok regisztráció erről a címről. Próbáld újra később.' });

const loginLimit = (req, res, next) => {
    const ip = req.ip;
    const probalkozas = loginProbal.get(ip);
    if (probalkozas && probalkozas.letiltvaEddig > Date.now()) {
        const masodperc = Math.ceil((probalkozas.letiltvaEddig - Date.now()) / 1000);
        return res.status(429).json({ error: `Túl sok próbálkozás. Próbáld újra ${masodperc} másodperc múlva.` });
    }
    next();
};

const sikertelenLogin = (ip) => {
    const probalkozas = loginProbal.get(ip) || { db: 0 };
    probalkozas.db += 1;
    if (probalkozas.db >= 5) {
        probalkozas.letiltvaEddig = Date.now() + 15 * 60 * 1000;
    }
    loginProbal.set(ip, probalkozas);
};

/** Új munkamenetet indít a felhasználónak (session fixation ellen). */
const bejelentkeztetes = (req, user) => new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
        if (error) {
            reject(error);
            return;
        }
        req.session.userId = user._id.toString();
        req.session.statusz = user.statusz;
        resolve();
    });
});

router.post('/login', loginLimit, async (req, res) => {
    const { email, jelszo } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!normalizedEmail || typeof jelszo !== 'string' || !jelszo) {
        return res.status(400).json({ error: 'Email és jelszó megadása kötelező.' });
    }
    const user = await UserModel.findOne({ email: normalizedEmail });

    if (!user || !(await user.comparePassword(jelszo))) {
        sikertelenLogin(req.ip);
        return res.status(401).json({ error: 'Hibás email vagy jelszó!' });
    }

    loginProbal.delete(req.ip);
    await bejelentkeztetes(req, user);
    return res.status(200).json({
        message: 'Sikeres bejelentkezés!',
        user: publicUser(user),
    });
});

router.post('/register', regisztracioLimit, async (req, res) => {
    const { nev, email, jelszo, weboldal, adatkezeles } = req.body || {};
    // Rejtett mező: ha ki van töltve, robot küldte.
    if (typeof weboldal === 'string' && weboldal.trim()) {
        return res.status(400).json({ error: 'A regisztráció nem sikerült.' });
    }
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (typeof nev !== 'string' || nev.trim().length < 2 || nev.trim().length > 100) {
        return res.status(400).json({ error: 'Add meg a neved (2–100 karakter).' });
    }
    if (!EMAIL_MINTA.test(normalizedEmail)) {
        return res.status(400).json({ error: 'Érvényes e-mail-címet adj meg.' });
    }
    if (typeof jelszo !== 'string' || jelszo.length < 8 || jelszo.length > 200) {
        return res.status(400).json({ error: 'A jelszó legalább 8 karakter legyen.' });
    }
    if (adatkezeles !== true) {
        return res.status(400).json({ error: 'A regisztrációhoz el kell fogadnod az adatkezelési tájékoztatót.' });
    }
    if (await UserModel.exists({ email: normalizedEmail })) {
        return res.status(409).json({ error: 'Ezzel az e-mail-címmel már regisztráltak.' });
    }

    // Nyilvános regisztrációval mindig normál felhasználó jön létre.
    const user = await UserModel.create({ nev: nev.trim(), email: normalizedEmail, jelszo, statusz: 'felhasznalo' });
    await bejelentkeztetes(req, user);
    return res.status(201).json({ message: 'Sikeres regisztráció!', user: publicUser(user) });
});

router.get('/me', authRequired, async (req, res) => {
    const user = await UserModel.findById(req.session.userId).select('-jelszo');
    if (!user) {
        return res.status(404).json({ error: 'Felhasználó nem található!' });
    }
    // Ha egy admin közben módosította a szerepkört, a munkamenet is kövesse.
    req.session.statusz = user.statusz;
    return res.status(200).json({ user: publicUser(user) });
});

/** Saját profil módosítása. E-mail- vagy jelszócseréhez a jelenlegi jelszó szükséges. */
router.put('/me', authRequired, async (req, res) => {
    const { nev, email, jelenlegiJelszo, ujJelszo } = req.body || {};
    const user = await UserModel.findById(req.session.userId);
    if (!user) {
        return res.status(404).json({ error: 'Felhasználó nem található!' });
    }

    if (typeof nev !== 'string' || nev.trim().length < 2 || nev.trim().length > 100) {
        return res.status(400).json({ error: 'Add meg a neved (2–100 karakter).' });
    }
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!EMAIL_MINTA.test(normalizedEmail)) {
        return res.status(400).json({ error: 'Érvényes e-mail-címet adj meg.' });
    }
    const emailValtozik = normalizedEmail !== user.email;
    const jelszoValtozik = typeof ujJelszo === 'string' && ujJelszo.length > 0;

    if (jelszoValtozik && (ujJelszo.length < 8 || ujJelszo.length > 200)) {
        return res.status(400).json({ error: 'Az új jelszó legalább 8 karakter legyen.' });
    }
    if ((emailValtozik || jelszoValtozik)
        && (typeof jelenlegiJelszo !== 'string' || !(await user.comparePassword(jelenlegiJelszo)))) {
        return res.status(403).json({ error: 'A jelenlegi jelszó nem megfelelő.' });
    }

    user.nev = nev.trim();
    user.email = normalizedEmail;
    if (jelszoValtozik) user.jelszo = ujJelszo;
    await user.save();
    return res.status(200).json({ message: 'Profil frissítve.', user: publicUser(user) });
});

/** Fiók törlése (GDPR – elfeledtetéshez való jog). */
router.delete('/me', authRequired, async (req, res) => {
    const user = await UserModel.findById(req.session.userId);
    if (!user) {
        return res.status(404).json({ error: 'Felhasználó nem található!' });
    }
    if (typeof req.body?.jelszo !== 'string' || !(await user.comparePassword(req.body.jelszo))) {
        return res.status(403).json({ error: 'A jelszó nem megfelelő.' });
    }
    if (user.statusz === 'admin' && (await UserModel.countDocuments({ statusz: 'admin' })) <= 1) {
        return res.status(409).json({ error: 'Az utolsó admin fiók nem törölhető.' });
    }
    await user.deleteOne();
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'A fiókodat töröltük.' });
    });
    return undefined;
});

router.post('/logout', authRequired, (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({ error: `Hiba: ${error.message}` });
        }

        res.clearCookie('connect.sid');
        return res.status(200).json({ message: 'Sikeres kijelentkezés!' });
    });
});

module.exports = router;
