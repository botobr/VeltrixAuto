const nodemailer = require('nodemailer');

let szallito = null;

// a levélküldő létrehozása (csak egyszer hozzuk létre)
const szallitoLetrehozasa = () => {
    // ha nincs SMTP beállítva, nem tudunk levelet küldeni
    if (!process.env.SMTP_HOST) {
        return null;
    }

    if (szallito === null) {
        let bejelentkezes;
        if (process.env.SMTP_USER) {
            bejelentkezes = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
        }

        szallito = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: bejelentkezes,
        });
    }
    return szallito;
};

// E-mail küldése. Ha nincs SMTP, csak kiírjuk a konzolra (fejlesztéshez jó így).
// Hibát nem dob, mert egy rossz e-mail miatt ne álljon le pl. a rendelés.
const emailKuldes = async ({ cimzett, targy, szoveg, valaszCim }) => {
    // a címzett lehet egy cím vagy egy tömb is
    let cimzettek = [];
    if (Array.isArray(cimzett)) {
        cimzettek = cimzett.filter((cim) => cim);
    } else if (cimzett) {
        cimzettek = [cimzett];
    }

    if (cimzettek.length === 0) {
        return false;
    }

    const kuldo = szallitoLetrehozasa();
    if (!kuldo) {
        console.info('[email – SMTP nincs beállítva] → ' + cimzettek.join(', ') + ' | ' + targy + '\n' + szoveg);
        return false;
    }

    try {
        await kuldo.sendMail({
            from: process.env.SMTP_FROM || 'Veltrix Autók <no-reply@localhost>',
            to: cimzettek.join(', '),
            replyTo: valaszCim,
            subject: targy,
            text: szoveg,
        });
        return true;
    } catch (error) {
        console.error('E-mail küldése sikertelen (' + targy + '): ' + error.message);
        return false;
    }
};

// a frontend címe (a levelekben lévő linkekhez), a végéről levesszük a /-t
const oldalUrl = () => {
    let url = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    return url;
};

module.exports = { emailKuldes, oldalUrl };
