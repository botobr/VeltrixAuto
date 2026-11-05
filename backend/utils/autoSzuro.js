const TelephelyModel = require('../models/Telephely');
const { autoSlug } = require('./slug');

const NAP_MS = 24 * 60 * 60 * 1000;
const UJ_AUTO_NAPOK = 7;

/** Az /api/autok által elfogadott szűrőparaméterek – a mentett keresés is csak ezeket tárolhatja. */
const SZURO_PARAMETEREK = [
    'q', 'marka', 'modell', 'uzemanyag', 'valto', 'hajtas', 'kivitel', 'megye', 'telephely',
    'minAr', 'maxAr', 'evjaratTol', 'evjaratIg', 'kmTol', 'kmIg', 'teljesitmenyTol', 'teljesitmenyIg',
    'ujak', 'garancias', 'rendezes',
];

const rendezesiSorrend = {
    ujElol: { kiemelt: -1, createdAt: -1, _id: -1 },
    regiElol: { createdAt: 1, _id: 1 },
    arNovekvo: { vetel_ar: 1, _id: 1 },
    arCsokkeno: { vetel_ar: -1, _id: -1 },
    evjaratCsokkeno: { evjarat: -1, _id: -1 },
    kmNovekvo: { kmora_allas: 1, _id: 1 },
};

const biztonsagos = (ertek) => String(ertek).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pontosEgyezes = (ertek) => new RegExp(`^${biztonsagos(String(ertek).trim())}$`, 'i');
const lista = (ertek) => String(ertek).split(',').map((elem) => elem.trim()).filter(Boolean).slice(0, 12);
const szamVagyNull = (ertek) => {
    if (ertek === undefined || ertek === null || ertek === '') return null;
    const szam = Number(ertek);
    return Number.isFinite(szam) ? szam : null;
};

/** Ami a nyilvános oldalon egyáltalán megjelenhet: látható és nem járt le. */
const publikusFeltetelek = (most = new Date()) => [
    { lathato: { $ne: false } },
    { $or: [{ lejarat: null }, { lejarat: { $gt: most } }] },
];

const tartomany = (mezo, tol, ig) => {
    const min = szamVagyNull(tol);
    const max = szamVagyNull(ig);
    if (min === null && max === null) return null;
    const feltetel = {};
    if (min !== null) feltetel.$gte = min;
    if (max !== null) feltetel.$lte = max;
    return { [mezo]: feltetel };
};

/**
 * A lekérdezési paraméterekből MongoDB-szűrőt épít.
 * @param {object} p – a query paraméterek (stringek)
 * @param {{ publikus?: boolean, elkeltekIs?: boolean }} opciok
 */
const szuroEpitese = async (p = {}, { publikus = true, elkeltekIs = false } = {}) => {
    const feltetelek = publikus ? publikusFeltetelek() : [];
    const szoveg = (kulcs) => (typeof p[kulcs] === 'string' && p[kulcs].trim() ? p[kulcs].trim() : null);

    if (publikus && !elkeltekIs) feltetelek.push({ statusz: { $ne: 'elkelt' } });

    const q = szoveg('q');
    if (q) {
        for (const kifejezes of q.split(/\s+/).slice(0, 6)) {
            const minta = new RegExp(biztonsagos(kifejezes), 'i');
            const vagy = ['marka', 'modell', 'uzemanyag', 'kivitel', 'szin', 'valto', 'felszereltseg']
                .map((mezo) => ({ [mezo]: minta }));
            if (/^\d{4}$/.test(kifejezes)) vagy.push({ evjarat: Number(kifejezes) });
            feltetelek.push({ $or: vagy });
        }
    }

    if (szoveg('marka')) feltetelek.push({ marka: pontosEgyezes(p.marka) });
    if (szoveg('modell')) feltetelek.push({ modell: pontosEgyezes(p.modell) });

    for (const mezo of ['uzemanyag', 'valto', 'hajtas', 'kivitel']) {
        if (szoveg(mezo)) feltetelek.push({ [mezo]: { $in: lista(p[mezo]).map(pontosEgyezes) } });
    }

    for (const [mezo, tol, ig] of [
        ['vetel_ar', 'minAr', 'maxAr'],
        ['evjarat', 'evjaratTol', 'evjaratIg'],
        ['kmora_allas', 'kmTol', 'kmIg'],
        ['teljesitmeny', 'teljesitmenyTol', 'teljesitmenyIg'],
    ]) {
        const feltetel = tartomany(mezo, p[tol], p[ig]);
        if (feltetel) feltetelek.push(feltetel);
    }

    if (szoveg('telephely') && /^[a-f0-9]{24}$/i.test(p.telephely)) {
        feltetelek.push({ telephely: p.telephely });
    } else if (szoveg('megye')) {
        const telephelyek = await TelephelyModel.find({ megye: { $in: lista(p.megye).map(pontosEgyezes) } }).select('_id');
        feltetelek.push({ telephely: { $in: telephelyek.map((t) => t._id) } });
    }

    if (p.ujak === '1') feltetelek.push({ createdAt: { $gte: new Date(Date.now() - UJ_AUTO_NAPOK * NAP_MS) } });
    if (p.garancias === '1') feltetelek.push({ garancia_honap: { $gt: 0 } });

    return feltetelek.length ? { $and: feltetelek } : {};
};

const rendezesEpitese = (rendezes) => rendezesiSorrend[Object.hasOwn(rendezesiSorrend, rendezes) ? rendezes : 'ujElol'];

/** Csak az engedélyezett, nem üres szűrőket tartja meg (mentett kereséshez). */
const parameterekTisztitasa = (nyers = {}) => {
    const eredmeny = {};
    for (const kulcs of SZURO_PARAMETEREK) {
        const ertek = nyers[kulcs];
        if (typeof ertek === 'string' && ertek.trim() && ertek.length <= 200) eredmeny[kulcs] = ertek.trim();
        if (typeof ertek === 'number' && Number.isFinite(ertek)) eredmeny[kulcs] = String(ertek);
    }
    return eredmeny;
};

const alvazszamMaszk = (alvazszam) => (alvazszam ? `${alvazszam.slice(0, 11)}••••••` : '');

/**
 * Az autó válaszformája. Nyilvános nézetben a belső adatok (statisztika, teljes
 * alvázszám, Cloudinary-azonosítók) nem kerülnek ki.
 */
const autoValasz = (auto, { admin = false } = {}) => {
    const adat = auto.toObject ? auto.toObject({ virtuals: false }) : { ...auto };
    if ((!adat.kepek || adat.kepek.length === 0) && adat.kep) {
        adat.kepek = [{ url: adat.kep, publicId: adat.kepPublicId || '', tipus: 'kulso', leiras: '' }];
    }
    adat.kepek = adat.kepek || [];
    adat.kep = adat.kepek[0]?.url || null;
    adat.slug = autoSlug(adat);
    adat.uj = Boolean(adat.createdAt) && Date.now() - new Date(adat.createdAt).getTime() < UJ_AUTO_NAPOK * NAP_MS;

    if (!admin) {
        adat.alvazszam = alvazszamMaszk(adat.alvazszam);
        adat.kepek = adat.kepek.map(({ url, tipus, leiras }) => ({ url, tipus, leiras }));
        delete adat.kepPublicId;
        delete adat.megtekintesek;
        delete adat.telefonKattintasok;
        delete adat.lathato;
        delete adat.lejarat;
        delete adat.__v;
    }
    return adat;
};

module.exports = {
    SZURO_PARAMETEREK,
    UJ_AUTO_NAPOK,
    szuroEpitese,
    rendezesEpitese,
    publikusFeltetelek,
    parameterekTisztitasa,
    autoValasz,
};
