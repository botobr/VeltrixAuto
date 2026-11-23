const crypto = require('node:crypto');
const express = require('express');
const FelhasznaloModel = require('../models/Felhasznalo');
const felhasznaloValasz = require('../utils/felhasznaloValasz');
const { bejelentkezesSzukseges } = require('../middlewares/authMiddleware');
const korlatozo = require('../utils/rateLimit');
const { emailKuldes, oldalUrl } = require('../utils/email');

const router = express.Router();

const EMAIL_MINTA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TOKEN_LEJARAT_MS = 60 * 60 * 1000; // 1 óra
const ORA_MS = 60 * 60 * 1000;

// óránként max 5 regisztráció / e-mail küldés egy IP-ről
const regisztracioLimit = korlatozo({ ablakMs: ORA_MS, max: 5, uzenet: 'Túl sok regisztráció erről a címről. Próbáld újra később.' });
const emailLimit = korlatozo({ ablakMs: ORA_MS, max: 5, uzenet: 'Túl sok kérés. Próbáld újra később.' });

// sikertelen bejelentkezések IP-címenként: { db, letiltvaEddig }
const belepesiProbalkozasok = new Map();

// e-mail cím kisbetűsítve, szóközök nélkül ('' ha nem szöveg)
const emailTisztitasa = (email) => {
    if (typeof email !== 'string') {
        return '';
    }
    return email.trim().toLowerCase();
};

// a jelszó hossza jó-e (8-200 karakter)
const jelszoHosszaJo = (jelszo) => typeof jelszo === 'string' && jelszo.length >= 8 && jelszo.length <= 200;

const nevJo = (nev) => typeof nev === 'string' && nev.trim().length >= 2 && nev.trim().length <= 100;

// Véletlen token az e-mailes linkekhez. Az adatbázisba csak a hash-ét mentjük.
const tokenLetrehozasa = () => {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, hash };
};

const tokenHash = (token) => {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
        return null;
    }
    return crypto.createHash('sha256').update(token).digest('hex');
};

const hitelesitoEmailKuldese = (felhasznalo, token) => {
    const link = oldalUrl() + '/email-hitelesites?token=' + encodeURIComponent(token);
    return emailKuldes({
        cimzett: felhasznalo.email,
        targy: 'Erősítsd meg a Veltrix-fiókod e-mail-címét',
        szoveg: 'Kedves ' + felhasznalo.nev + '!\n\n'
            + 'A fiókod aktiválásához erősítsd meg az e-mail-címedet az alábbi linken:\n'
            + link + '\n\n'
            + 'A link 60 percig érvényes.',
    });
};

const jelszoVisszaallitoEmailKuldese = (felhasznalo, token) => {
    const link = oldalUrl() + '/jelszo-visszaallitas?token=' + encodeURIComponent(token);
    return emailKuldes({
        cimzett: felhasznalo.email,
        targy: 'Veltrix-jelszó visszaállítása',
        szoveg: 'Kedves ' + felhasznalo.nev + '!\n\n'
            + 'A jelszavad visszaállításához nyisd meg ezt a linket:\n'
            + link + '\n\n'
            + 'A link 60 percig érvényes. Ha nem te kérted, nincs további teendőd.',
    });
};

// ha valaki 5-ször elrontja a jelszót, 15 percre letiltjuk
const belepesKorlat = (req, res, next) => {
    const probalkozas = belepesiProbalkozasok.get(req.ip);
    if (probalkozas && probalkozas.letiltvaEddig > Date.now()) {
        const masodperc = Math.ceil((probalkozas.letiltvaEddig - Date.now()) / 1000);
        return res.status(429).json({ hiba: 'Túl sok próbálkozás. Próbáld újra ' + masodperc + ' másodperc múlva.' });
    }
    next();
};

const sikertelenBelepes = (ip) => {
    let probalkozas = belepesiProbalkozasok.get(ip);
    if (!probalkozas) {
        probalkozas = { db: 0 };
    }
    probalkozas.db = probalkozas.db + 1;
    if (probalkozas.db >= 5) {
        probalkozas.letiltvaEddig = Date.now() + 15 * 60 * 1000;
    }
    belepesiProbalkozasok.set(ip, probalkozas);
};

// Bejelentkezéskor új munkamenetet kezdünk (biztonsági okból, session fixation ellen).
const bejelentkeztetes = (req, felhasznalo) => {
    return new Promise((resolve, reject) => {
        req.session.regenerate((error) => {
            if (error) {
                reject(error);
                return;
            }
            req.session.userId = felhasznalo._id.toString();
            req.session.statusz = felhasznalo.statusz;
            resolve();
        });
    });
};

// bejelentkezés
router.post('/bejelentkezes', belepesKorlat, async (req, res) => {
    const adatok = req.body || {};
    const email = emailTisztitasa(adatok.email);
    const jelszo = adatok.jelszo;

    if (!email || typeof jelszo !== 'string' || !jelszo) {
        return res.status(400).json({ hiba: 'Email és jelszó megadása kötelező.' });
    }

    const felhasznalo = await FelhasznaloModel.findOne({ email: email });
    let joJelszo = false;
    if (felhasznalo) {
        joJelszo = await felhasznalo.jelszoEgyezik(jelszo);
    }

    if (!joJelszo) {
        sikertelenBelepes(req.ip);
        return res.status(401).json({ hiba: 'Hibás email vagy jelszó!' });
    }

    if (!felhasznalo.emailHitelesitve) {
        return res.status(403).json({ hiba: 'Előbb erősítsd meg az e-mail-címedet.' });
    }

    belepesiProbalkozasok.delete(req.ip);
    await bejelentkeztetes(req, felhasznalo);
    return res.status(200).json({
        uzenet: 'Sikeres bejelentkezés!',
        felhasznalo: felhasznaloValasz(felhasznalo),
    });
});

// regisztráció
router.post('/regisztracio', regisztracioLimit, async (req, res) => {
    const adatok = req.body || {};
    const email = emailTisztitasa(adatok.email);

    // a weboldal mező rejtett, ember nem tölti ki, csak a robotok
    if (typeof adatok.weboldal === 'string' && adatok.weboldal.trim()) {
        return res.status(400).json({ hiba: 'A regisztráció nem sikerült.' });
    }
    if (!nevJo(adatok.nev)) {
        return res.status(400).json({ hiba: 'Add meg a neved (2–100 karakter).' });
    }
    if (!EMAIL_MINTA.test(email)) {
        return res.status(400).json({ hiba: 'Érvényes e-mail-címet adj meg.' });
    }
    if (!jelszoHosszaJo(adatok.jelszo)) {
        return res.status(400).json({ hiba: 'A jelszó legalább 8 karakter legyen.' });
    }
    if (adatok.adatkezeles !== true) {
        return res.status(400).json({ hiba: 'A regisztrációhoz el kell fogadnod az adatkezelési tájékoztatót.' });
    }

    const marVan = await FelhasznaloModel.exists({ email: email });
    if (marVan) {
        return res.status(409).json({ hiba: 'Ezzel az e-mail-címmel már regisztráltak.' });
    }

    // regisztrációval mindig sima felhasználó jön létre
    const { token, hash } = tokenLetrehozasa();
    const felhasznalo = await FelhasznaloModel.create({
        nev: adatok.nev.trim(),
        email: email,
        jelszo: adatok.jelszo,
        statusz: 'felhasznalo',
        emailHitelesitve: false,
        emailHitelesitoTokenHash: hash,
        emailHitelesitoLejarat: new Date(Date.now() + TOKEN_LEJARAT_MS),
    });

    hitelesitoEmailKuldese(felhasznalo, token);
    return res.status(201).json({
        uzenet: 'Regisztráció sikeres. Ellenőrizd az e-mail-fiókodat!',
        felhasznalo: felhasznaloValasz(felhasznalo),
    });
});

// e-mail cím megerősítése a levélben kapott linkkel
router.post('/email-megerosites', emailLimit, async (req, res) => {
    const hash = tokenHash(req.body ? req.body.token : null);

    let felhasznalo = null;
    if (hash) {
        felhasznalo = await FelhasznaloModel.findOne({
            emailHitelesitoTokenHash: hash,
            emailHitelesitoLejarat: { $gt: new Date() },
        }).select('+emailHitelesitoTokenHash +emailHitelesitoLejarat');
    }

    if (!felhasznalo) {
        return res.status(400).json({ hiba: 'A megerősítő link érvénytelen vagy lejárt.' });
    }

    felhasznalo.emailHitelesitve = true;
    felhasznalo.emailHitelesitoTokenHash = null;
    felhasznalo.emailHitelesitoLejarat = null;
    await felhasznalo.save();
    return res.status(200).json({
        uzenet: 'E-mail-cím megerősítve. Most már bejelentkezhetsz.',
        felhasznalo: felhasznaloValasz(felhasznalo),
    });
});

// új megerősítő link kérése
// mindig ugyanazt válaszoljuk, hogy ne lehessen kideríteni, ki van regisztrálva
router.post('/megerosites-ujrakuldese', emailLimit, async (req, res) => {
    const email = emailTisztitasa(req.body ? req.body.email : null);

    let felhasznalo = null;
    if (EMAIL_MINTA.test(email)) {
        felhasznalo = await FelhasznaloModel.findOne({ email: email }).select('+emailHitelesitoTokenHash +emailHitelesitoLejarat');
    }

    if (felhasznalo && !felhasznalo.emailHitelesitve) {
        const { token, hash } = tokenLetrehozasa();
        felhasznalo.emailHitelesitoTokenHash = hash;
        felhasznalo.emailHitelesitoLejarat = new Date(Date.now() + TOKEN_LEJARAT_MS);
        await felhasznalo.save();
        hitelesitoEmailKuldese(felhasznalo, token);
    }
    return res.status(200).json({ uzenet: 'Ha ehhez a címhez nemrég regisztráltak, új megerősítő linket küldtünk.' });
});

// elfelejtett jelszó: link küldése e-mailben
router.post('/elfelejtett-jelszo', emailLimit, async (req, res) => {
    const email = emailTisztitasa(req.body ? req.body.email : null);

    let felhasznalo = null;
    if (EMAIL_MINTA.test(email)) {
        felhasznalo = await FelhasznaloModel.findOne({ email: email }).select('+jelszoVisszaallitoTokenHash +jelszoVisszaallitoLejarat');
    }

    if (felhasznalo) {
        const { token, hash } = tokenLetrehozasa();
        felhasznalo.jelszoVisszaallitoTokenHash = hash;
        felhasznalo.jelszoVisszaallitoLejarat = new Date(Date.now() + TOKEN_LEJARAT_MS);
        await felhasznalo.save();
        jelszoVisszaallitoEmailKuldese(felhasznalo, token);
    }
    return res.status(200).json({ uzenet: 'Ha létezik ilyen fiók, elküldtük a jelszó-visszaállító linket.' });
});

// új jelszó beállítása a levélben kapott linkkel
router.post('/jelszo-visszaallitas', emailLimit, async (req, res) => {
    const adatok = req.body || {};
    const hash = tokenHash(adatok.token);

    if (!jelszoHosszaJo(adatok.jelszo)) {
        return res.status(400).json({ hiba: 'Az új jelszó legalább 8 karakter legyen.' });
    }

    let felhasznalo = null;
    if (hash) {
        felhasznalo = await FelhasznaloModel.findOne({
            jelszoVisszaallitoTokenHash: hash,
            jelszoVisszaallitoLejarat: { $gt: new Date() },
        }).select('+jelszoVisszaallitoTokenHash +jelszoVisszaallitoLejarat');
    }

    if (!felhasznalo) {
        return res.status(400).json({ hiba: 'A jelszó-visszaállító link érvénytelen vagy lejárt.' });
    }

    felhasznalo.jelszo = adatok.jelszo;
    felhasznalo.jelszoVisszaallitoTokenHash = null;
    felhasznalo.jelszoVisszaallitoLejarat = null;
    await felhasznalo.save();
    return res.status(200).json({ uzenet: 'A jelszavad frissült. Most már bejelentkezhetsz.' });
});

// a bejelentkezett felhasználó adatai
router.get('/profil', bejelentkezesSzukseges, async (req, res) => {
    const felhasznalo = await FelhasznaloModel.findById(req.session.userId).select('-jelszo');
    if (!felhasznalo) {
        return res.status(404).json({ hiba: 'Felhasználó nem található!' });
    }
    // ha közben megváltozott a szerepköre, a munkamenetben is frissítjük
    req.session.statusz = felhasznalo.statusz;
    return res.status(200).json({ felhasznalo: felhasznaloValasz(felhasznalo) });
});

// saját profil módosítása (e-mail vagy jelszó cseréhez kell a jelenlegi jelszó)
router.put('/profil', bejelentkezesSzukseges, async (req, res) => {
    const adatok = req.body || {};
    const felhasznalo = await FelhasznaloModel.findById(req.session.userId);
    if (!felhasznalo) {
        return res.status(404).json({ hiba: 'Felhasználó nem található!' });
    }

    if (!nevJo(adatok.nev)) {
        return res.status(400).json({ hiba: 'Add meg a neved (2–100 karakter).' });
    }
    const email = emailTisztitasa(adatok.email);
    if (!EMAIL_MINTA.test(email)) {
        return res.status(400).json({ hiba: 'Érvényes e-mail-címet adj meg.' });
    }

    const emailValtozik = email !== felhasznalo.email;
    const jelszoValtozik = typeof adatok.ujJelszo === 'string' && adatok.ujJelszo.length > 0;

    if (jelszoValtozik && !jelszoHosszaJo(adatok.ujJelszo)) {
        return res.status(400).json({ hiba: 'Az új jelszó legalább 8 karakter legyen.' });
    }

    if (emailValtozik || jelszoValtozik) {
        let joJelszo = false;
        if (typeof adatok.jelenlegiJelszo === 'string') {
            joJelszo = await felhasznalo.jelszoEgyezik(adatok.jelenlegiJelszo);
        }
        if (!joJelszo) {
            return res.status(403).json({ hiba: 'A jelenlegi jelszó nem megfelelő.' });
        }
    }

    felhasznalo.nev = adatok.nev.trim();
    if (jelszoValtozik) {
        felhasznalo.jelszo = adatok.ujJelszo;
    }

    // új e-mail címet újra meg kell erősíteni
    if (emailValtozik) {
        const { token, hash } = tokenLetrehozasa();
        felhasznalo.email = email;
        felhasznalo.emailHitelesitve = false;
        felhasznalo.emailHitelesitoTokenHash = hash;
        felhasznalo.emailHitelesitoLejarat = new Date(Date.now() + TOKEN_LEJARAT_MS);
        await felhasznalo.save();
        hitelesitoEmailKuldese(felhasznalo, token);
        return res.status(200).json({
            uzenet: 'Profil frissítve. Az új e-mail-címet erősítsd meg a postaládádban.',
            felhasznalo: felhasznaloValasz(felhasznalo),
        });
    }

    await felhasznalo.save();
    return res.status(200).json({ uzenet: 'Profil frissítve.', felhasznalo: felhasznaloValasz(felhasznalo) });
});

// saját fiók törlése (GDPR)
router.delete('/profil', bejelentkezesSzukseges, async (req, res) => {
    const felhasznalo = await FelhasznaloModel.findById(req.session.userId);
    if (!felhasznalo) {
        return res.status(404).json({ hiba: 'Felhasználó nem található!' });
    }

    const jelszo = req.body ? req.body.jelszo : null;
    let joJelszo = false;
    if (typeof jelszo === 'string') {
        joJelszo = await felhasznalo.jelszoEgyezik(jelszo);
    }
    if (!joJelszo) {
        return res.status(403).json({ hiba: 'A jelszó nem megfelelő.' });
    }

    // az utolsó admint nem lehet törölni
    if (felhasznalo.statusz === 'admin') {
        const adminokSzama = await FelhasznaloModel.countDocuments({ statusz: 'admin' });
        if (adminokSzama <= 1) {
            return res.status(409).json({ hiba: 'Az utolsó admin fiók nem törölhető.' });
        }
    }

    await felhasznalo.deleteOne();
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.status(200).json({ uzenet: 'A fiókodat töröltük.' });
    });
});

// kijelentkezés
router.post('/kijelentkezes', bejelentkezesSzukseges, (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({ hiba: 'Hiba: ' + error.message });
        }
        res.clearCookie('connect.sid');
        return res.status(200).json({ uzenet: 'Sikeres kijelentkezés!' });
    });
});

module.exports = router;
// a sikertelen bejelentkezések törlése (csak a tesztek használják)
module.exports.belepesiProbalkozasokTorlese = () => belepesiProbalkozasok.clear();
