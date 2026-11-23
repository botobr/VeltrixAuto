const { szerepkorJogai } = require('./jogosultsagok');

// A felhasználó adatai, amiket visszaküldünk a frontendnek (jelszó és tokenek nélkül).
const felhasznaloValasz = (felhasznalo) => {
    let adatok;
    if (felhasznalo.toObject) {
        adatok = felhasznalo.toObject();
    } else {
        adatok = { ...felhasznalo };
    }

    // ezeket nem szabad kiküldeni
    delete adatok.jelszo;
    delete adatok.mentettKeresesek;
    delete adatok.emailHitelesitoTokenHash;
    delete adatok.emailHitelesitoLejarat;
    delete adatok.jelszoVisszaallitoTokenHash;
    delete adatok.jelszoVisszaallitoLejarat;

    // a kedvencek id-jai szövegként kellenek
    const kedvencek = [];
    if (adatok.kedvencek) {
        for (const id of adatok.kedvencek) {
            kedvencek.push(String(id));
        }
    }
    adatok.kedvencek = kedvencek;

    // a frontend ebből tudja, mit mutasson (az ellenőrzés úgyis a szerveren van)
    adatok.jogok = szerepkorJogai(adatok.statusz);
    return adatok;
};

module.exports = felhasznaloValasz;
