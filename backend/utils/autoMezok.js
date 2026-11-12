const mongoose = require('mongoose');

const VALTOK = ['Manuális', 'Automata', 'Félautomata', 'Fokozatmentes (CVT)'];
const HAJTASOK = ['Elsőkerék', 'Hátsókerék', 'Összkerék'];
const STATUSZOK = ['elerheto', 'foglalt', 'elkelt'];
const KEP_TIPUSOK = ['kulso', 'belso', 'muszerfal', 'motorter', 'csomagter', 'serules', 'egyeb'];
const MAX_KEP = 30;

const aktualisEv = () => new Date().getFullYear();

/*
 * Az autó minden szerkeszthető mezőjének leírása. Ugyanebből a táblázatból
 * dolgozik a validáció, így új mezőnél csak ide kell felvenni.
 */
const MEZOK = {
    marka: { tipus: 'szoveg', kotelezo: true, max: 60 },
    modell: { tipus: 'szoveg', kotelezo: true, max: 80 },
    szin: { tipus: 'szoveg', kotelezo: true, max: 40 },
    kivitel: { tipus: 'szoveg', kotelezo: true, max: 40 },
    uzemanyag: { tipus: 'szoveg', kotelezo: true, max: 40 },
    szarmazasi_hely: { tipus: 'szoveg', kotelezo: true, max: 60 },
    valto: { tipus: 'enum', ertekek: VALTOK },
    hajtas: { tipus: 'enum', ertekek: HAJTASOK },

    evjarat: { tipus: 'szam', kotelezo: true, min: 1886, max: () => aktualisEv() + 1, egesz: true },
    vetel_ar: { tipus: 'szam', kotelezo: true, min: 0, max: 1e11, egesz: true },
    teljesitmeny: { tipus: 'szam', kotelezo: true, min: 0, max: 5000, egesz: true },
    hengerur_tartalom: { tipus: 'szam', kotelezo: true, min: 0, max: 20000, egesz: true },
    kmora_allas: { tipus: 'szam', kotelezo: true, min: 0, max: 5e6, egesz: true },
    ajtok_szama: { tipus: 'szam', min: 1, max: 9, egesz: true },
    ulesek_szama: { tipus: 'szam', min: 1, max: 60, egesz: true },
    tulajdonosok_szama: { tipus: 'szam', min: 0, max: 50, egesz: true },
    garancia_honap: { tipus: 'szam', min: 0, max: 120, egesz: true },
    fogyasztas: { tipus: 'szam', min: 0, max: 100 },
    co2: { tipus: 'szam', min: 0, max: 1000, egesz: true },

    elso_forgalomba_helyezes: { tipus: 'datum' },
    muszaki_vizsga: { tipus: 'datum' },
    lejarat: { tipus: 'datum' },

    szervizkonyv: { tipus: 'logikai' },
    serulesmentes: { tipus: 'logikai' },
    lathato: { tipus: 'logikai', alap: true },
    kiemelt: { tipus: 'logikai', alap: false },

    statusz: { tipus: 'enum', ertekek: STATUSZOK, alap: 'elerheto' },
    // Üresen hagyva elkelt autónál a modell tölti ki (mai nap, illetve a vételár).
    eladas_datum: { tipus: 'datum' },
    eladasi_ar: { tipus: 'szam', min: 0, max: 1e11, egesz: true },
    felszereltseg: { tipus: 'lista', maxElem: 120, max: 60 },

    alvazszam: { tipus: 'szoveg', max: 17, minta: /^[A-HJ-NPR-Z0-9]{17}$/i, mintaHiba: 'Az alvázszám 17 karakter (I, O, Q nélkül).' },
    azonosito: { tipus: 'szoveg', max: 30 },
    telephely: { tipus: 'id' },

    elado_nev: { tipus: 'szoveg', max: 120 },
    elado_telefonszam: { tipus: 'szoveg', max: 40, minta: /^[+\d][\d\s()/-]{5,}$/, mintaHiba: 'Érvénytelen telefonszám.' },
    leiras: { tipus: 'szoveg', max: 5000 },
};

const CIMKEK = {
    marka: 'Márka', modell: 'Modell', szin: 'Szín', kivitel: 'Kivitel', uzemanyag: 'Üzemanyag',
    szarmazasi_hely: 'Származási hely', valto: 'Sebességváltó', hajtas: 'Hajtás', evjarat: 'Évjárat',
    vetel_ar: 'Vételár', teljesitmeny: 'Teljesítmény', hengerur_tartalom: 'Hengerűrtartalom',
    kmora_allas: 'Kilométeróra állása', ajtok_szama: 'Ajtók száma', ulesek_szama: 'Ülések száma',
    tulajdonosok_szama: 'Tulajdonosok száma', garancia_honap: 'Garancia', fogyasztas: 'Fogyasztás',
    co2: 'CO₂-kibocsátás', elso_forgalomba_helyezes: 'Első forgalomba helyezés', muszaki_vizsga: 'Műszaki vizsga',
    lejarat: 'Hirdetés lejárata', statusz: 'Státusz', eladas_datum: 'Eladás dátuma', eladasi_ar: 'Eladási ár', felszereltseg: 'Felszereltség', alvazszam: 'Alvázszám',
    azonosito: 'Belső azonosító', telephely: 'Telephely', elado_nev: 'Kapcsolattartó neve',
    elado_telefonszam: 'Kapcsolattartó telefonszáma', leiras: 'Leírás',
};

const ures = (ertek) => ertek === undefined || ertek === null || (typeof ertek === 'string' && !ertek.trim());

const mezoErteke = (nev, leiro, nyers, hibak) => {
    const cimke = CIMKEK[nev] || nev;

    if (leiro.tipus === 'logikai') {
        if (ures(nyers)) return leiro.alap ?? null;
        if (typeof nyers === 'boolean') return nyers;
        if (nyers === 'true' || nyers === 'false') return nyers === 'true';
        hibak.push(`${cimke}: érvénytelen érték.`);
        return null;
    }

    if (leiro.tipus === 'lista') {
        if (ures(nyers)) return [];
        if (!Array.isArray(nyers) || nyers.some((elem) => typeof elem !== 'string')) {
            hibak.push(`${cimke}: szöveges listát kell megadni.`);
            return [];
        }
        const lista = [...new Set(nyers.map((elem) => elem.trim()).filter(Boolean))];
        if (lista.length > leiro.maxElem) hibak.push(`${cimke}: legfeljebb ${leiro.maxElem} elem adható meg.`);
        if (lista.some((elem) => elem.length > leiro.max)) hibak.push(`${cimke}: egy elem legfeljebb ${leiro.max} karakter lehet.`);
        return lista;
    }

    if (ures(nyers)) {
        if (leiro.kotelezo) hibak.push(`${cimke}: kötelező mező.`);
        if (leiro.alap !== undefined) return leiro.alap;
        return leiro.tipus === 'szoveg' ? '' : null;
    }

    if (leiro.tipus === 'szoveg' || leiro.tipus === 'enum') {
        if (typeof nyers !== 'string') {
            hibak.push(`${cimke}: szöveget kell megadni.`);
            return null;
        }
        const ertek = nyers.trim();
        if (leiro.tipus === 'enum' && !leiro.ertekek.includes(ertek)) {
            hibak.push(`${cimke}: nem engedélyezett érték.`);
            return null;
        }
        if (leiro.max && ertek.length > leiro.max) hibak.push(`${cimke}: legfeljebb ${leiro.max} karakter lehet.`);
        if (leiro.minta && !leiro.minta.test(ertek)) hibak.push(leiro.mintaHiba || `${cimke}: érvénytelen formátum.`);
        return nev === 'alvazszam' ? ertek.toUpperCase() : ertek;
    }

    if (leiro.tipus === 'szam') {
        const szam = typeof nyers === 'number' ? nyers : Number(String(nyers).replace(',', '.'));
        const max = typeof leiro.max === 'function' ? leiro.max() : leiro.max;
        if (!Number.isFinite(szam)) {
            hibak.push(`${cimke}: számot kell megadni.`);
            return null;
        }
        if (leiro.egesz && !Number.isInteger(szam)) hibak.push(`${cimke}: egész számot kell megadni.`);
        if (leiro.min !== undefined && szam < leiro.min) hibak.push(`${cimke}: legalább ${leiro.min} lehet.`);
        if (max !== undefined && szam > max) hibak.push(`${cimke}: legfeljebb ${max} lehet.`);
        return szam;
    }

    if (leiro.tipus === 'datum') {
        const datum = new Date(nyers);
        if (typeof nyers !== 'string' || Number.isNaN(datum.getTime())) {
            hibak.push(`${cimke}: érvénytelen dátum.`);
            return null;
        }
        return datum;
    }

    if (leiro.tipus === 'id') {
        if (typeof nyers !== 'string' || !mongoose.Types.ObjectId.isValid(nyers)) {
            hibak.push(`${cimke}: érvénytelen azonosító.`);
            return null;
        }
        return nyers;
    }

    return null;
};

const cloudinaryUrlElotag = () => {
    const felho = process.env.CLOUDINARY_API_CLOUD_NAME;
    return felho ? `https://res.cloudinary.com/${felho}/` : 'https://res.cloudinary.com/';
};

const kepekErvenyesitese = (nyers, hibak) => {
    if (!Array.isArray(nyers) || nyers.length === 0) {
        hibak.push('Legalább egy képet fel kell tölteni.');
        return [];
    }
    if (nyers.length > MAX_KEP) {
        hibak.push(`Legfeljebb ${MAX_KEP} kép tölthető fel.`);
        return [];
    }
    const elotag = cloudinaryUrlElotag();
    const kepek = [];
    for (const kep of nyers) {
        const ervenyes = kep && typeof kep === 'object'
            && typeof kep.url === 'string' && kep.url.startsWith(elotag)
            && typeof kep.publicId === 'string' && kep.publicId.startsWith('veltrix/autok/');
        if (!ervenyes) {
            hibak.push('Érvénytelen kép a listában – töltsd fel újra.');
            return [];
        }
        kepek.push({
            url: kep.url,
            publicId: kep.publicId,
            tipus: KEP_TIPUSOK.includes(kep.tipus) ? kep.tipus : 'egyeb',
            leiras: typeof kep.leiras === 'string' ? kep.leiras.trim().slice(0, 120) : '',
        });
    }
    if (new Set(kepek.map((kep) => kep.publicId)).size !== kepek.length) {
        hibak.push('Ugyanaz a kép többször szerepel.');
    }
    return kepek;
};

/** A teljes űrlapot ellenőrzi; visszaadja a tisztított adatokat és a hibalistát. */
const autoAdatokEllenorzese = (nyers = {}) => {
    const hibak = [];
    const adatok = {};
    for (const [nev, leiro] of Object.entries(MEZOK)) {
        adatok[nev] = mezoErteke(nev, leiro, nyers[nev], hibak);
    }
    adatok.kepek = kepekErvenyesitese(nyers.kepek, hibak);

    if (adatok.elso_forgalomba_helyezes && adatok.evjarat
        && adatok.elso_forgalomba_helyezes.getFullYear() < adatok.evjarat - 1) {
        hibak.push('Az első forgalomba helyezés nem lehet jóval korábbi az évjáratnál.');
    }
    if (adatok.eladas_datum && adatok.eladas_datum.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
        hibak.push('Az eladás dátuma nem lehet a jövőben.');
    }
    return { adatok, hibak };
};

/** Csak a gyors admin-műveletekhez (státusz, láthatóság, kiemelés, lejárat). */
const ALLAPOT_MEZOK = ['statusz', 'lathato', 'kiemelt', 'lejarat'];

const allapotEllenorzese = (nyers = {}) => {
    const hibak = [];
    const adatok = {};
    for (const nev of ALLAPOT_MEZOK) {
        if (Object.hasOwn(nyers, nev)) adatok[nev] = mezoErteke(nev, MEZOK[nev], nyers[nev], hibak);
    }
    if (Object.keys(adatok).length === 0) hibak.push('Nincs módosítandó adat.');
    return { adatok, hibak };
};

module.exports = {
    MEZOK,
    VALTOK,
    HAJTASOK,
    STATUSZOK,
    KEP_TIPUSOK,
    MAX_KEP,
    autoAdatokEllenorzese,
    allapotEllenorzese,
};
