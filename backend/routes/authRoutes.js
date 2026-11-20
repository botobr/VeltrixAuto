const crypto = require('node:crypto');
const express = require('express');
const FelhasznaloModel = require('../models/Felhasznalo');
const felhasznaloValasz = require('../utils/felhasznaloValasz');
const { bejelentkezesSzukseges } = require('../middlewares/authMiddleware');
const korlatozo = require('../utils/rateLimit');
const { emailKuldes, oldalUrl } = require('../utils/email');

const router = express.Router();
const belepesiProbalkozasok = new Map();

const EMAIL_MINTA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const regisztracioLimit = korlatozo({ ablakMs: 60 * 60 * 1000, max: 5, uzenet: 'Túl sok regisztráció erről a címről. Próbáld újra később.' });
const emailLimit = korlatozo({ ablakMs: 60 * 60 * 1000, max: 5, uzenet: 'Túl sok kérés. Próbáld újra később.' });
const TOKEN_LEJARAT_MS = 60 * 60 * 1000;

const tokenLetrehozasa = () => {
    const token = crypto.randomBytes(32).toString('hex');
    return { token, hash: crypto.createHash('sha256').update(token).digest('hex') };
};

const tokenHash = (token) => (typeof token === 'string' && /^[a-f0-9]{64}$/i.test(token)
    ? crypto.createHash('sha256').update(token).digest('hex')
    : null);

const hitelesitoEmailKuldese = (user, token) => emailKuldes({
    cimzett: user.email,
    targy: 'Erősítsd meg a Veltrix-fiókod e-mail-címét',
    szoveg: [
        `Kedves ${user.nev}!`,
        '',
        'A fiókod aktiválásához erősítsd meg az e-mail-címedet az alábbi linken:',
        `${oldalUrl()}/email-hitelesites?token=${encodeURIComponent(token)}`,
        '',
        'A link 60 percig érvényes.',
    ].join('\n'),
});

const jelszoVisszaallitoEmailKuldese = (user, token) => emailKuldes({
    cimzett: user.email,
    targy: 'Veltrix-jelszó visszaállítása',
    szoveg: [
        `Kedves ${user.nev}!`,
        '',
        'A jelszavad visszaállításához nyisd meg ezt a linket:',
        `${oldalUrl()}/jelszo-visszaallitas?token=${encodeURIComponent(token)}`,
        '',
        'A link 60 percig érvényes. Ha nem te kérted, nincs további teendőd.',
    ].join('\n'),
});

const belepesKorlat = (req, res, next) => {
    const ip = req.ip;
    const probalkozas = belepesiProbalkozasok.get(ip);
    if (probalkozas && probalkozas.letiltvaEddig > Date.now()) {
        const masodperc = Math.ceil((probalkozas.letiltvaEddig - Date.now()) / 1000);
        return res.status(429).json({ hiba: `Túl sok próbálkozás. Próbáld újra ${masodperc} másodperc múlva.` });
    }
    next();
};

const sikertelenBelepes = (ip) => {
    const probalkozas = belepesiProbalkozasok.get(ip) || { db: 0 };
    probalkozas.db += 1;
    if (probalkozas.db >= 5) {
        probalkozas.letiltvaEddig = Date.now() + 15 * 60 * 1000;
    }
    belepesiProbalkozasok.set(ip, probalkozas);
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

router.post('/bejelentkezes', belepesKorlat, async (req, res) => {
    const { email, jelszo } = req.body || {};
    const tisztitottEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!tisztitottEmail || typeof jelszo !== 'string' || !jelszo) {
        return res.status(400).json({ hiba: 'Email és jelszó megadása kötelező.' });
    }
    const user = await FelhasznaloModel.findOne({ email: tisztitottEmail });

    if (!user || !(await user.jelszoEgyezik(jelszo))) {
        sikertelenBelepes(req.ip);
        return res.status(401).json({ hiba: 'Hibás email vagy jelszó!' });
    }

    if (!user.emailHitelesitve) {
        return res.status(403).json({ hiba: 'Előbb erősítsd meg az e-mail-címedet.' });
    }

    belepesiProbalkozasok.delete(req.ip);
    await bejelentkeztetes(req, user);
    return res.status(200).json({
        uzenet: 'Sikeres bejelentkezés!',
        felhasznalo: felhasznaloValasz(user),
    });
});

router.post('/regisztracio', regisztracioLimit, async (req, res) => {
    const { nev, email, jelszo, weboldal, adatkezeles } = req.body || {};
    // Rejtett mező: ha ki van töltve, robot küldte.
    if (typeof weboldal === 'string' && weboldal.trim()) {
        return res.status(400).json({ hiba: 'A regisztráció nem sikerült.' });
    }
    const tisztitottEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (typeof nev !== 'string' || nev.trim().length < 2 || nev.trim().length > 100) {
        return res.status(400).json({ hiba: 'Add meg a neved (2–100 karakter).' });
    }
    if (!EMAIL_MINTA.test(tisztitottEmail)) {
        return res.status(400).json({ hiba: 'Érvényes e-mail-címet adj meg.' });
    }
    if (typeof jelszo !== 'string' || jelszo.length < 8 || jelszo.length > 200) {
        return res.status(400).json({ hiba: 'A jelszó legalább 8 karakter legyen.' });
    }
    if (adatkezeles !== true) {
        return res.status(400).json({ hiba: 'A regisztrációhoz el kell fogadnod az adatkezelési tájékoztatót.' });
    }
    if (await FelhasznaloModel.exists({ email: tisztitottEmail })) {
        return res.status(409).json({ hiba: 'Ezzel az e-mail-címmel már regisztráltak.' });
    }

    // Nyilvános regisztrációval mindig normál felhasználó jön létre.
    const { token, hash } = tokenLetrehozasa();
    const user = await FelhasznaloModel.create({
        nev: nev.trim(), email: tisztitottEmail, jelszo, statusz: 'felhasznalo',
        emailHitelesitve: false,
        emailHitelesitoTokenHash: hash,
        emailHitelesitoLejarat: new Date(Date.now() + TOKEN_LEJARAT_MS),
    });
    hitelesitoEmailKuldese(user, token);
    return res.status(201).json({ uzenet: 'Regisztráció sikeres. Ellenőrizd az e-mail-fiókodat!', felhasznalo: felhasznaloValasz(user) });
});

router.post('/email-megerosites', emailLimit, async (req, res) => {
    const hash = tokenHash(req.body?.token);
    const user = hash
        ? await FelhasznaloModel.findOne({ emailHitelesitoTokenHash: hash, emailHitelesitoLejarat: { $gt: new Date() } }).select('+emailHitelesitoTokenHash +emailHitelesitoLejarat')
        : null;
    if (!user) return res.status(400).json({ hiba: 'A megerősítő link érvénytelen vagy lejárt.' });

    user.emailHitelesitve = true;
    user.emailHitelesitoTokenHash = null;
    user.emailHitelesitoLejarat = null;
    await user.save();
    return res.status(200).json({ uzenet: 'E-mail-cím megerősítve. Most már bejelentkezhetsz.', felhasznalo: felhasznaloValasz(user) });
});

router.post('/megerosites-ujrakuldese', emailLimit, async (req, res) => {
    const tisztitottEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const user = EMAIL_MINTA.test(tisztitottEmail) ? await FelhasznaloModel.findOne({ email: tisztitottEmail }).select('+emailHitelesitoTokenHash +emailHitelesitoLejarat') : null;
    if (user && !user.emailHitelesitve) {
        const { token, hash } = tokenLetrehozasa();
        user.emailHitelesitoTokenHash = hash;
        user.emailHitelesitoLejarat = new Date(Date.now() + TOKEN_LEJARAT_MS);
        await user.save();
        hitelesitoEmailKuldese(user, token);
    }
    return res.status(200).json({ uzenet: 'Ha ehhez a címhez nemrég regisztráltak, új megerősítő linket küldtünk.' });
});

router.post('/elfelejtett-jelszo', emailLimit, async (req, res) => {
    const tisztitottEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const user = EMAIL_MINTA.test(tisztitottEmail) ? await FelhasznaloModel.findOne({ email: tisztitottEmail }).select('+jelszoVisszaallitoTokenHash +jelszoVisszaallitoLejarat') : null;
    if (user) {
        const { token, hash } = tokenLetrehozasa();
        user.jelszoVisszaallitoTokenHash = hash;
        user.jelszoVisszaallitoLejarat = new Date(Date.now() + TOKEN_LEJARAT_MS);
        await user.save();
        jelszoVisszaallitoEmailKuldese(user, token);
    }
    return res.status(200).json({ uzenet: 'Ha létezik ilyen fiók, elküldtük a jelszó-visszaállító linket.' });
});

router.post('/jelszo-visszaallitas', emailLimit, async (req, res) => {
    const jelszo = req.body?.jelszo;
    const hash = tokenHash(req.body?.token);
    if (typeof jelszo !== 'string' || jelszo.length < 8 || jelszo.length > 200) {
        return res.status(400).json({ hiba: 'Az új jelszó legalább 8 karakter legyen.' });
    }
    const user = hash
        ? await FelhasznaloModel.findOne({ jelszoVisszaallitoTokenHash: hash, jelszoVisszaallitoLejarat: { $gt: new Date() } }).select('+jelszoVisszaallitoTokenHash +jelszoVisszaallitoLejarat')
        : null;
    if (!user) return res.status(400).json({ hiba: 'A jelszó-visszaállító link érvénytelen vagy lejárt.' });

    user.jelszo = jelszo;
    user.jelszoVisszaallitoTokenHash = null;
    user.jelszoVisszaallitoLejarat = null;
    await user.save();
    return res.status(200).json({ uzenet: 'A jelszavad frissült. Most már bejelentkezhetsz.' });
});

router.get('/profil', bejelentkezesSzukseges, async (req, res) => {
    const user = await FelhasznaloModel.findById(req.session.userId).select('-jelszo');
    if (!user) {
        return res.status(404).json({ hiba: 'Felhasználó nem található!' });
    }
    // Ha egy admin közben módosította a szerepkört, a munkamenet is kövesse.
    req.session.statusz = user.statusz;
    return res.status(200).json({ felhasznalo: felhasznaloValasz(user) });
});

/** Saját profil módosítása. E-mail- vagy jelszócseréhez a jelenlegi jelszó szükséges. */
router.put('/profil', bejelentkezesSzukseges, async (req, res) => {
    const { nev, email, jelenlegiJelszo, ujJelszo } = req.body || {};
    const user = await FelhasznaloModel.findById(req.session.userId);
    if (!user) {
        return res.status(404).json({ hiba: 'Felhasználó nem található!' });
    }

    if (typeof nev !== 'string' || nev.trim().length < 2 || nev.trim().length > 100) {
        return res.status(400).json({ hiba: 'Add meg a neved (2–100 karakter).' });
    }
    const tisztitottEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!EMAIL_MINTA.test(tisztitottEmail)) {
        return res.status(400).json({ hiba: 'Érvényes e-mail-címet adj meg.' });
    }
    const emailValtozik = tisztitottEmail !== user.email;
    const jelszoValtozik = typeof ujJelszo === 'string' && ujJelszo.length > 0;

    if (jelszoValtozik && (ujJelszo.length < 8 || ujJelszo.length > 200)) {
        return res.status(400).json({ hiba: 'Az új jelszó legalább 8 karakter legyen.' });
    }
    if ((emailValtozik || jelszoValtozik)
        && (typeof jelenlegiJelszo !== 'string' || !(await user.jelszoEgyezik(jelenlegiJelszo)))) {
        return res.status(403).json({ hiba: 'A jelenlegi jelszó nem megfelelő.' });
    }

    user.nev = nev.trim();
    if (jelszoValtozik) user.jelszo = ujJelszo;
    if (emailValtozik) {
        const { token, hash } = tokenLetrehozasa();
        user.email = tisztitottEmail;
        user.emailHitelesitve = false;
        user.emailHitelesitoTokenHash = hash;
        user.emailHitelesitoLejarat = new Date(Date.now() + TOKEN_LEJARAT_MS);
        await user.save();
        hitelesitoEmailKuldese(user, token);
        return res.status(200).json({ uzenet: 'Profil frissítve. Az új e-mail-címet erősítsd meg a postaládádban.', felhasznalo: felhasznaloValasz(user) });
    }
    await user.save();
    return res.status(200).json({ uzenet: 'Profil frissítve.', felhasznalo: felhasznaloValasz(user) });
});

/** Fiók törlése (GDPR – elfeledtetéshez való jog). */
router.delete('/profil', bejelentkezesSzukseges, async (req, res) => {
    const user = await FelhasznaloModel.findById(req.session.userId);
    if (!user) {
        return res.status(404).json({ hiba: 'Felhasználó nem található!' });
    }
    if (typeof req.body?.jelszo !== 'string' || !(await user.jelszoEgyezik(req.body.jelszo))) {
        return res.status(403).json({ hiba: 'A jelszó nem megfelelő.' });
    }
    if (user.statusz === 'admin' && (await FelhasznaloModel.countDocuments({ statusz: 'admin' })) <= 1) {
        return res.status(409).json({ hiba: 'Az utolsó admin fiók nem törölhető.' });
    }
    await user.deleteOne();
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.status(200).json({ uzenet: 'A fiókodat töröltük.' });
    });
    return undefined;
});

router.post('/kijelentkezes', bejelentkezesSzukseges, (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({ hiba: `Hiba: ${error.message}` });
        }

        res.clearCookie('connect.sid');
        return res.status(200).json({ uzenet: 'Sikeres kijelentkezés!' });
    });
});

module.exports = router;
/** A sikertelen bejelentkezések számlálójának törlése – csak tesztkörnyezetből hívjuk. */
module.exports.belepesiProbalkozasokTorlese = () => belepesiProbalkozasok.clear();
