const { szerepkorJogai } = require('./jogosultsagok');

const publicUser = (user) => {
    const userData = user.toObject ? user.toObject() : { ...user };
    delete userData.jelszo;
    delete userData.mentettKeresesek;
    userData.kedvencek = (userData.kedvencek || []).map(String);
    // A frontend ebből dönti el, mit mutasson; a tényleges ellenőrzés mindig a szerveren történik.
    userData.jogok = szerepkorJogai(userData.statusz);
    return userData;
};

module.exports = publicUser;
