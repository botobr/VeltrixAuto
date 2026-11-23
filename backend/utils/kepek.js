const AutoModel = require('../models/Auto');
const AlkatreszModel = require('../models/Alkatresz');

// A képeket az autók és az alkatrészek is használják.
// Egy képet csak akkor törölhetünk, ha már semmi nem hivatkozik rá.

// autóknál a régi kepPublicId mezőt is nézni kell
const autoKepFeltetel = (publicIdk) => {
    return {
        $or: [
            { 'kepek.publicId': { $in: publicIdk } },
            { kepPublicId: { $in: publicIdk } },
        ],
    };
};

// visszaadja, hogy a megadott képek közül melyiket használja valami (Set-ben)
const hasznaltKepek = async (publicIdk) => {
    const hasznalt = new Set();
    if (publicIdk.length === 0) {
        return hasznalt;
    }

    const autok = await AutoModel.find(autoKepFeltetel(publicIdk)).select('kepek.publicId kepPublicId');
    const alkatreszek = await AlkatreszModel.find({ 'kepek.publicId': { $in: publicIdk } }).select('kepek.publicId');

    for (const auto of autok) {
        if (auto.kepPublicId) {
            hasznalt.add(auto.kepPublicId);
        }
        for (const kep of auto.kepek) {
            if (kep.publicId) {
                hasznalt.add(kep.publicId);
            }
        }
    }
    for (const alkatresz of alkatreszek) {
        for (const kep of alkatresz.kepek) {
            if (kep.publicId) {
                hasznalt.add(kep.publicId);
            }
        }
    }
    return hasznalt;
};

// igaz, ha valamelyik képet egy másik autó vagy alkatrész is használja
const masholHasznalt = async (kepek, sajatId) => {
    const publicIdk = kepek.map((kep) => kep.publicId);
    if (publicIdk.length === 0) {
        return false;
    }

    const autoFeltetel = autoKepFeltetel(publicIdk);
    autoFeltetel._id = { $ne: sajatId };
    const auto = await AutoModel.exists(autoFeltetel);
    if (auto) {
        return true;
    }

    const alkatresz = await AlkatreszModel.exists({ _id: { $ne: sajatId }, 'kepek.publicId': { $in: publicIdk } });
    if (alkatresz) {
        return true;
    }
    return false;
};

module.exports = { hasznaltKepek, masholHasznalt };
