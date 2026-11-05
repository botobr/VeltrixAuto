const AutokModel = require('../models/Autok');
const UserModel = require('../models/User');
const { emailKuldes, oldalUrl } = require('./email');
const { autoSlug } = require('./slug');
const { szuroEpitese } = require('./autoSzuro');

const arFormatum = new Intl.NumberFormat('hu-HU');

/**
 * Új autó feltöltésekor értesíti azokat a felhasználókat, akiknek van olyan
 * mentett keresésük, amelyre az autó illeszkedik. A háttérben fut, a hibát naplózza.
 */
const ujAutoErtesites = async (auto) => {
    try {
        const felhasznalok = await UserModel.find({ 'mentettKeresesek.ertesites': true })
            .select('nev email mentettKeresesek');

        for (const felhasznalo of felhasznalok) {
            const talalatok = [];
            for (const kereses of felhasznalo.mentettKeresesek) {
                if (!kereses.ertesites) continue;
                const szuro = await szuroEpitese(Object.fromEntries(kereses.parameterek || []));
                const illeszkedik = await AutokModel.exists({ $and: [{ _id: auto._id }, szuro] });
                if (illeszkedik) talalatok.push(kereses.nev);
            }
            if (talalatok.length === 0) continue;

            await emailKuldes({
                cimzett: felhasznalo.email,
                targy: `Új találat: ${auto.marka} ${auto.modell}`,
                szoveg: [
                    `Kedves ${felhasznalo.nev}!`,
                    '',
                    `Új autó érkezett, amely illeszkedik a mentett keresésedre (${talalatok.join(', ')}):`,
                    '',
                    `${auto.marka} ${auto.modell} (${auto.evjarat}) – ${arFormatum.format(auto.vetel_ar)} Ft`,
                    `${oldalUrl()}/autok/${autoSlug(auto)}`,
                    '',
                    'Az értesítéseket a Fiókom › Mentett keresések oldalon kapcsolhatod ki.',
                ].join('\n'),
            });
        }
    } catch (error) {
        console.error(`Mentett keresés értesítés sikertelen: ${error.message}`);
    }
};

module.exports = { ujAutoErtesites };
