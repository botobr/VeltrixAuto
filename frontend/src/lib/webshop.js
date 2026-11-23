// Webshop segédfüggvények a frontendhez.
// Az árakat és a végösszeget mindig a backend számolja (/api/kosar), itt csak kiírjuk őket.

export const KATEGORIAK = {
    futomu: 'Futómű',
    szivorendszer: 'Levegőszűrő és szívórendszer',
    kipufogo: 'Kipufogórendszer',
    motor: 'Motor és teljesítmény',
    fek: 'Fékrendszer',
    felni: 'Felni és gumi',
    karosszeria: 'Karosszéria és aerodinamika',
    belter: 'Beltér',
    vilagitas: 'Világítás',
    egyeb: 'Egyéb',
};

export const RENDELES_STATUSZOK = {
    fizetesre_var: 'Fizetésre vár',
    uj: 'Új',
    feldolgozas: 'Összekészítés alatt',
    feladva: 'Feladva',
    atveheto: 'Átvehető',
    teljesitve: 'Teljesítve',
    lemondva: 'Lemondva',
};

export const ALKATRESZ_RENDEZESEK = [
    ['ujElol', 'Legújabb'],
    ['nepszeru', 'Legnépszerűbb'],
    ['arNovekvo', 'Legolcsóbb elöl'],
    ['arCsokkeno', 'Legdrágább elöl'],
    ['nevSzerint', 'Név szerint'],
];

const szamFormatum = new Intl.NumberFormat('hu-HU');

// pl. 12 990 Ft
export const ft = (ertek) => {
    return szamFormatum.format(Math.round(ertek || 0)) + ' Ft';
};

export const alkatreszUrl = (alkatresz) => {
    return '/alkatreszek/' + (alkatresz.slug || alkatresz._id || alkatresz.id);
};

// a készlet szövegesen a vásárlónak
export const keszletSzoveg = (keszlet) => {
    if (keszlet <= 0) {
        return { szoveg: 'Elfogyott', tipus: 'elfogyott' };
    }
    if (keszlet <= 2) {
        return { szoveg: 'Utolsó ' + keszlet + ' db', tipus: 'utolso' };
    }
    return { szoveg: 'Készleten', tipus: 'keszleten' };
};

// pl. "BMW 3-as sorozat (2012–2019)"
export const kompatibilitasSzoveg = (sor) => {
    let szoveg = sor.marka;
    if (sor.modell) {
        szoveg += ' ' + sor.modell;
    } else {
        szoveg += ' – minden modell';
    }
    if (sor.evjaratTol || sor.evjaratIg) {
        szoveg += ' (' + (sor.evjaratTol || '…') + '–' + (sor.evjaratIg || '…') + ')';
    }
    return szoveg;
};

// üres termék űrlap az admin szerkesztőhöz
export const uresAlkatresz = () => {
    return {
        nev: '',
        cikkszam: '',
        gyarto: '',
        kategoria: '',
        rovidLeiras: '',
        leiras: '',
        ar: '',
        akciosAr: '',
        keszlet: '0',
        kepek: [],
        parameterek: [],
        kompatibilitas: [],
        univerzalis: false,
        lathato: true,
        kiemelt: false,
    };
};

// ha az érték null vagy undefined, akkor a megadott alapérték
const vagyAlap = (ertek, alap) => {
    if (ertek === null || ertek === undefined) {
        return alap;
    }
    return ertek;
};

// a szervertől kapott termékből űrlap adatok (a null értékekből üres mező lesz)
export const alkatreszUrlapbol = (alkatresz) => {
    const kompatibilitas = [];
    for (const sor of alkatresz.kompatibilitas || []) {
        kompatibilitas.push({ ...sor, evjaratTol: vagyAlap(sor.evjaratTol, ''), evjaratIg: vagyAlap(sor.evjaratIg, '') });
    }

    // csak a már feltöltött képek
    const kepek = [];
    for (const kep of alkatresz.kepek || []) {
        if (kep.publicId) {
            kepek.push(kep);
        }
    }

    return {
        ...uresAlkatresz(),
        ...alkatresz,
        ar: vagyAlap(alkatresz.ar, ''),
        akciosAr: vagyAlap(alkatresz.akciosAr, ''),
        keszlet: vagyAlap(alkatresz.keszlet, '0'),
        kepek: kepek,
        kompatibilitas: kompatibilitas,
        parameterek: alkatresz.parameterek || [],
    };
};

// A díjak az ÁSZF-hez és a tájékoztató szövegekhez.
// A számolást a backend végzi (backend/utils/webshop.js), ha ott változik, itt is át kell írni!
export const DIJAK = {
    futar: 2490,
    ingyenesSzallitasHatar: 100000,
    utanvet: 590,
    // ennyi napon belül kell átutalni, utána lemondhatjuk a rendelést
    utalasiHatarido: 8,
};
