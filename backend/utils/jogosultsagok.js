// Szerepkörök és jogosultságok.
// Itt van megadva, hogy melyik szerepkör mit csinálhat. A frontend is ezt a listát kapja meg.

const SZEREPKOROK = ['admin', 'ertekesito', 'felhasznalo'];

const JOGOK = {
    // admin felület megnyitása (dashboard, hirdetések, érdeklődések)
    kezelofelulet: ['admin', 'ertekesito'],
    // hirdetés létrehozása, szerkesztése, képfeltöltés
    hirdetesSzerkesztes: ['admin', 'ertekesito'],
    hirdetesTorles: ['admin'],
    erdeklodesKezeles: ['admin', 'ertekesito'],
    erdeklodesTorles: ['admin'],
    // webshop termékek szerkesztése, készlet
    alkatreszSzerkesztes: ['admin', 'ertekesito'],
    alkatreszTorles: ['admin'],
    // webshop rendelések kezelése
    rendelesKezeles: ['admin', 'ertekesito'],
    telephelyKezeles: ['admin'],
    felhasznaloKezeles: ['admin'],
    // pénzügyi adatok (bevétel, eladási ár)
    penzugy: ['admin'],
};

// megnézi, hogy a szerepkörnek van-e ilyen joga
const vanJoga = (szerepkor, jog) => {
    if (!JOGOK[jog]) {
        return false;
    }
    return JOGOK[jog].includes(szerepkor);
};

// a szerepkör összes joga egy tömbben
const szerepkorJogai = (szerepkor) => {
    const jogok = [];
    for (const jog in JOGOK) {
        if (vanJoga(szerepkor, jog)) {
            jogok.push(jog);
        }
    }
    return jogok;
};

module.exports = { SZEREPKOROK, JOGOK, vanJoga, szerepkorJogai };
