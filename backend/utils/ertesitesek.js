const AutoModel = require('../models/Auto');
const FelhasznaloModel = require('../models/Felhasznalo');
const { emailKuldes, oldalUrl } = require('./email');
const { autoSlug } = require('./slug');
const { szuroEpitese } = require('./autoSzuro');

const arFormatum = new Intl.NumberFormat('hu-HU');

// Ha új autót töltenek fel, e-mailt küldünk azoknak, akiknek van rá illő mentett keresésük.
const ujAutoErtesites = async (auto) => {
    try {
        const felhasznalok = await FelhasznaloModel.find({ 'mentettKeresesek.ertesites': true })
            .select('nev email mentettKeresesek');

        for (const felhasznalo of felhasznalok) {
            // melyik mentett keresésekre illik az autó
            const talalatok = [];

            for (const kereses of felhasznalo.mentettKeresesek) {
                if (!kereses.ertesites) {
                    continue;
                }

                // a mentett paraméterekből (Map) sima objektumot csinálunk
                const parameterek = {};
                if (kereses.parameterek) {
                    for (const [kulcs, ertek] of kereses.parameterek) {
                        parameterek[kulcs] = ertek;
                    }
                }

                const szuro = await szuroEpitese(parameterek);
                const illeszkedik = await AutoModel.exists({ $and: [{ _id: auto._id }, szuro] });
                if (illeszkedik) {
                    talalatok.push(kereses.nev);
                }
            }

            if (talalatok.length === 0) {
                continue;
            }

            const sorok = [
                'Kedves ' + felhasznalo.nev + '!',
                '',
                'Új autó érkezett, amely illeszkedik a mentett keresésedre (' + talalatok.join(', ') + '):',
                '',
                auto.marka + ' ' + auto.modell + ' (' + auto.evjarat + ') – ' + arFormatum.format(auto.vetel_ar) + ' Ft',
                oldalUrl() + '/autok/' + autoSlug(auto),
                '',
                'Az értesítéseket a Fiókom › Mentett keresések oldalon kapcsolhatod ki.',
            ];

            await emailKuldes({
                cimzett: felhasznalo.email,
                targy: 'Új találat: ' + auto.marka + ' ' + auto.modell,
                szoveg: sorok.join('\n'),
            });
        }
    } catch (error) {
        console.error('Mentett keresés értesítés sikertelen: ' + error.message);
    }
};

module.exports = { ujAutoErtesites };
