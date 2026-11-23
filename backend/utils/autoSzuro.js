const TelephelyModel = require('../models/Telephely');
const { autoSlug } = require('./slug');

const NAP_MS = 24 * 60 * 60 * 1000;
const UJ_AUTO_NAPOK = 7; // ennyi napig számít újnak egy hirdetés

// az /api/autok ezeket a szűrőket fogadja el (mentett keresésben is csak ezek lehetnek)
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

// a regex speciális karaktereit levédjük, hogy a felhasználó ne tudjon regexet beírni
const biztonsagos = (ertek) => String(ertek).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// kis- és nagybetűre nem érzékeny, pontos egyezés
const pontosEgyezes = (ertek) => new RegExp('^' + biztonsagos(String(ertek).trim()) + '$', 'i');

// "Benzin,Dízel" -> ['Benzin', 'Dízel'] (max 12 elem)
const lista = (ertek) => {
    const elemek = [];
    for (const resz of String(ertek).split(',')) {
        const tisztitott = resz.trim();
        if (tisztitott) {
            elemek.push(tisztitott);
        }
    }
    return elemek.slice(0, 12);
};

const szamVagyNull = (ertek) => {
    if (ertek === undefined || ertek === null || ertek === '') {
        return null;
    }
    const szam = Number(ertek);
    if (Number.isFinite(szam)) {
        return szam;
    }
    return null;
};

// a nyilvános oldalon csak a látható és le nem járt hirdetések jelennek meg
const publikusFeltetelek = (most = new Date()) => {
    return [
        { lathato: { $ne: false } },
        { $or: [{ lejarat: null }, { lejarat: { $gt: most } }] },
    ];
};

// tól-ig szűrő egy mezőre (pl. ár), null ha egyik sincs megadva
const tartomany = (mezo, tol, ig) => {
    const min = szamVagyNull(tol);
    const max = szamVagyNull(ig);
    if (min === null && max === null) {
        return null;
    }

    const feltetel = {};
    if (min !== null) {
        feltetel.$gte = min;
    }
    if (max !== null) {
        feltetel.$lte = max;
    }

    const eredmeny = {};
    eredmeny[mezo] = feltetel;
    return eredmeny;
};

// A kapott paraméterekből (pl. ?marka=BMW&minAr=1000000) MongoDB szűrőt készít.
const szuroEpitese = async (p = {}, { publikus = true, elkeltekIs = false } = {}) => {
    let feltetelek = [];
    if (publikus) {
        feltetelek = publikusFeltetelek();
    }

    // visszaadja a paraméter értékét, ha nem üres szöveg
    const szoveg = (kulcs) => {
        if (typeof p[kulcs] === 'string' && p[kulcs].trim() !== '') {
            return p[kulcs].trim();
        }
        return null;
    };

    if (publikus && !elkeltekIs) {
        feltetelek.push({ statusz: { $ne: 'elkelt' } });
    }

    // szabadszavas keresés: minden szónak illeszkednie kell valamelyik mezőre
    const q = szoveg('q');
    if (q) {
        const szavak = q.split(/\s+/).slice(0, 6);
        for (const szo of szavak) {
            const minta = new RegExp(biztonsagos(szo), 'i');
            const vagy = [
                { marka: minta },
                { modell: minta },
                { uzemanyag: minta },
                { kivitel: minta },
                { szin: minta },
                { valto: minta },
                { felszereltseg: minta },
            ];
            // ha évszámot írt be, az évjáratra is keresünk
            if (/^\d{4}$/.test(szo)) {
                vagy.push({ evjarat: Number(szo) });
            }
            feltetelek.push({ $or: vagy });
        }
    }

    if (szoveg('marka')) {
        feltetelek.push({ marka: pontosEgyezes(p.marka) });
    }
    if (szoveg('modell')) {
        feltetelek.push({ modell: pontosEgyezes(p.modell) });
    }

    // ezeknél több érték is megadható vesszővel
    const tobbErtekuMezok = ['uzemanyag', 'valto', 'hajtas', 'kivitel'];
    for (const mezo of tobbErtekuMezok) {
        if (szoveg(mezo)) {
            const feltetel = {};
            feltetel[mezo] = { $in: lista(p[mezo]).map(pontosEgyezes) };
            feltetelek.push(feltetel);
        }
    }

    const tartomanyok = [
        tartomany('vetel_ar', p.minAr, p.maxAr),
        tartomany('evjarat', p.evjaratTol, p.evjaratIg),
        tartomany('kmora_allas', p.kmTol, p.kmIg),
        tartomany('teljesitmeny', p.teljesitmenyTol, p.teljesitmenyIg),
    ];
    for (const feltetel of tartomanyok) {
        if (feltetel) {
            feltetelek.push(feltetel);
        }
    }

    // telephely szerint, vagy ha az nincs, megye szerint
    if (szoveg('telephely') && /^[a-f0-9]{24}$/i.test(p.telephely)) {
        feltetelek.push({ telephely: p.telephely });
    } else if (szoveg('megye')) {
        const telephelyek = await TelephelyModel.find({ megye: { $in: lista(p.megye).map(pontosEgyezes) } }).select('_id');
        const telephelyIdk = telephelyek.map((telephely) => telephely._id);
        feltetelek.push({ telephely: { $in: telephelyIdk } });
    }

    if (p.ujak === '1') {
        const hatar = new Date(Date.now() - UJ_AUTO_NAPOK * NAP_MS);
        feltetelek.push({ createdAt: { $gte: hatar } });
    }
    if (p.garancias === '1') {
        feltetelek.push({ garancia_honap: { $gt: 0 } });
    }

    if (feltetelek.length === 0) {
        return {};
    }
    return { $and: feltetelek };
};

const rendezesEpitese = (rendezes) => {
    if (Object.hasOwn(rendezesiSorrend, rendezes)) {
        return rendezesiSorrend[rendezes];
    }
    return rendezesiSorrend.ujElol;
};

// mentett kereséshez: csak az ismert és nem üres szűrőket tartjuk meg
const parameterekTisztitasa = (nyers = {}) => {
    const eredmeny = {};
    for (const kulcs of SZURO_PARAMETEREK) {
        const ertek = nyers[kulcs];
        if (typeof ertek === 'string' && ertek.trim() && ertek.length <= 200) {
            eredmeny[kulcs] = ertek.trim();
        }
        if (typeof ertek === 'number' && Number.isFinite(ertek)) {
            eredmeny[kulcs] = String(ertek);
        }
    }
    return eredmeny;
};

// az alvázszám végét eltakarjuk a nyilvános oldalon
const alvazszamMaszk = (alvazszam) => {
    if (!alvazszam) {
        return '';
    }
    return alvazszam.slice(0, 11) + '••••••';
};

// Az autó adatai, amit a frontendnek küldünk.
// Sima látogató nem látja a belső adatokat (statisztika, teljes alvázszám, kép azonosítók),
// az eladási árat és dátumot pedig csak az admin, ha van pénzügyi joga.
const autoValasz = (auto, { admin = false, penzugy = false } = {}) => {
    let adat;
    if (auto.toObject) {
        adat = auto.toObject({ virtuals: false });
    } else {
        adat = { ...auto };
    }

    // régi autóknál csak egy kép mező volt
    if ((!adat.kepek || adat.kepek.length === 0) && adat.kep) {
        adat.kepek = [{ url: adat.kep, publicId: adat.kepPublicId || '', tipus: 'kulso', leiras: '' }];
    }
    if (!adat.kepek) {
        adat.kepek = [];
    }

    if (adat.kepek.length > 0) {
        adat.kep = adat.kepek[0].url;
    } else {
        adat.kep = null;
    }

    adat.slug = autoSlug(adat);

    adat.uj = false;
    if (adat.createdAt) {
        const eltelt = Date.now() - new Date(adat.createdAt).getTime();
        if (eltelt < UJ_AUTO_NAPOK * NAP_MS) {
            adat.uj = true;
        }
    }

    if (!admin) {
        adat.alvazszam = alvazszamMaszk(adat.alvazszam);
        // a képeknél a Cloudinary azonosító nem kell
        adat.kepek = adat.kepek.map((kep) => ({ url: kep.url, tipus: kep.tipus, leiras: kep.leiras }));
        delete adat.kepPublicId;
        delete adat.megtekintesek;
        delete adat.telefonKattintasok;
        delete adat.lathato;
        delete adat.lejarat;
        delete adat.__v;
    }
    if (!admin || !penzugy) {
        delete adat.eladas_datum;
        delete adat.eladasi_ar;
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
