const AutokModel = require('../models/Autok');
const AlkatreszModel = require('../models/Alkatresz');

/*
 * A Cloudinary-képeket autók és webshop-termékek is használják. Egy kép csak
 * egy rekordhoz tartozhat, és csak akkor törölhető, ha egyik sem hivatkozik rá.
 */

const keresoFeltetel = (publicIds) => ({ $or: [{ 'kepek.publicId': { $in: publicIds } }, { kepPublicId: { $in: publicIds } }] });

/** A megadott azonosítók közül azok, amelyeket bármelyik autó vagy termék használ. */
const hasznaltKepek = async (publicIds) => {
    if (publicIds.length === 0) return new Set();
    const [autok, alkatreszek] = await Promise.all([
        AutokModel.find(keresoFeltetel(publicIds)).select('kepek.publicId kepPublicId'),
        AlkatreszModel.find({ 'kepek.publicId': { $in: publicIds } }).select('kepek.publicId'),
    ]);
    return new Set([...autok, ...alkatreszek].flatMap((rekord) => [rekord.kepPublicId, ...rekord.kepek.map((kep) => kep.publicId)]).filter(Boolean));
};

/** Igaz, ha valamelyik kép egy MÁSIK rekordhoz (autóhoz vagy termékhez) tartozik. */
const masholHasznalt = async (kepek, sajatId) => {
    const publicIds = kepek.map((kep) => kep.publicId);
    if (publicIds.length === 0) return false;
    const [auto, alkatresz] = await Promise.all([
        AutokModel.exists({ _id: { $ne: sajatId }, ...keresoFeltetel(publicIds) }),
        AlkatreszModel.exists({ _id: { $ne: sajatId }, 'kepek.publicId': { $in: publicIds } }),
    ]);
    return Boolean(auto || alkatresz);
};

module.exports = { hasznaltKepek, masholHasznalt };
