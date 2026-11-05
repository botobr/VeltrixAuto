const nodemailer = require('nodemailer');

let szallito;

const szallitoLetrehozasa = () => {
    if (!process.env.SMTP_HOST) return null;
    if (!szallito) {
        szallito = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        });
    }
    return szallito;
};

/**
 * E-mailt küld, ha be van állítva SMTP. Ha nincs, csak naplóz – így fejlesztés
 * közben is működik minden, ami értesítést küldene.
 * Soha nem dob hibát: az értesítés kudarca nem ronthatja el a fő műveletet.
 */
const emailKuldes = async ({ cimzett, targy, szoveg, valaszCim }) => {
    const cimzettek = [].concat(cimzett).filter(Boolean);
    if (cimzettek.length === 0) return false;

    const kuldo = szallitoLetrehozasa();
    if (!kuldo) {
        console.info(`[email – SMTP nincs beállítva] → ${cimzettek.join(', ')} | ${targy}\n${szoveg}`);
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
        console.error(`E-mail küldése sikertelen (${targy}): ${error.message}`);
        return false;
    }
};

const oldalUrl = () => (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

module.exports = { emailKuldes, oldalUrl };
