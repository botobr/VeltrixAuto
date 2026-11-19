/*
 * Szerepkörök és jogosultságok – az egyetlen hely, ahol eldől, ki mit tehet.
 * A backend minden védett útvonala ezekből a jogokból dolgozik, és a frontend
 * is ugyanezt a listát kapja meg (a felhasználó `jogok` mezőjében).
 */

const SZEREPKOROK = ['admin', 'ertekesito', 'felhasznalo'];

const JOGOK = {
    /** Belépés a kereskedői felületre (dashboard, hirdetések, érdeklődések). */
    kezelofelulet: ['admin', 'ertekesito'],
    /** Hirdetés létrehozása, szerkesztése, státusz, képfeltöltés. */
    hirdetesSzerkesztes: ['admin', 'ertekesito'],
    hirdetesTorles: ['admin'],
    erdeklodesKezeles: ['admin', 'ertekesito'],
    erdeklodesTorles: ['admin'],
    /** Tuning alkatrészek (webshop termékek) létrehozása, szerkesztése, készlet. */
    alkatreszSzerkesztes: ['admin', 'ertekesito'],
    alkatreszTorles: ['admin'],
    /** Webshop rendelések megtekintése, státusz, fizetés rögzítése. */
    rendelesKezeles: ['admin', 'ertekesito'],
    telephelyKezeles: ['admin'],
    felhasznaloKezeles: ['admin'],
    /** Pénzügyi adatok: bevétel (autó és webshop), eladási ár (később beszerzési ár, haszon). */
    penzugy: ['admin'],
};

const vanJoga = (szerepkor, jog) => Boolean(JOGOK[jog]?.includes(szerepkor));

const szerepkorJogai = (szerepkor) => Object.keys(JOGOK).filter((jog) => vanJoga(szerepkor, jog));

module.exports = { SZEREPKOROK, JOGOK, vanJoga, szerepkorJogai };
