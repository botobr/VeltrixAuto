// a szűrők nevei az URL-ben (ugyanazok, mint a backend /api/autok paraméterei)
export const SZURO_KULCSOK = [
    'q', 'marka', 'modell', 'uzemanyag', 'valto', 'hajtas', 'kivitel', 'megye', 'telephely',
    'minAr', 'maxAr', 'evjaratTol', 'evjaratIg', 'kmTol', 'kmIg', 'teljesitmenyTol', 'teljesitmenyIg',
    'ujak', 'garancias',
];

export const RENDEZESEK = [
    ['ujElol', 'Kiemelt és legújabb'],
    ['arNovekvo', 'Ár szerint növekvő'],
    ['arCsokkeno', 'Ár szerint csökkenő'],
    ['evjaratCsokkeno', 'Legújabb évjárat'],
    ['kmNovekvo', 'Legkevesebb km'],
];

// az URL paramétereiből a beállított szűrők: { marka: 'BMW', ... }
export const szurokParamsbol = (params) => {
    const szurok = {};
    for (const kulcs of SZURO_KULCSOK) {
        if (params.get(kulcs)) {
            szurok[kulcs] = params.get(kulcs);
        }
    }
    return szurok;
};

// hány szűrő van beállítva (a keresőszót nem számoljuk)
export const aktivSzurokSzama = (szurok) => {
    let db = 0;
    for (const kulcs in szurok) {
        if (kulcs !== 'q') {
            db++;
        }
    }
    return db;
};

// "Benzin,Dízel" -> ['Benzin', 'Dízel']
export const lista = (ertek) => {
    if (!ertek) {
        return [];
    }
    return ertek.split(',').filter((elem) => elem !== '');
};

const szam = new Intl.NumberFormat('hu-HU');

// pl. "1 000 000–5 000 000 Ft" vagy "100 LE-tól"
const tartomanyCimke = (tol, ig, egyseg) => {
    if (tol && ig) {
        return szam.format(tol) + '–' + szam.format(ig) + ' ' + egyseg;
    }
    if (tol) {
        return szam.format(tol) + ' ' + egyseg + '-tól';
    }
    return szam.format(ig) + ' ' + egyseg + '-ig';
};

// A beállított szűrők szövegesen (a címkékhez és a mentett keresésekhez).
// Egy elem: [kulcs, felirat]
export const szuroCimkek = (szurok) => {
    const cimkek = [];

    if (szurok.q) {
        cimkek.push(['q', '„' + szurok.q + '”']);
    }
    if (szurok.marka) {
        let felirat = szurok.marka;
        if (szurok.modell) {
            felirat = szurok.marka + ' ' + szurok.modell;
        }
        cimkek.push(['marka', felirat]);
    }
    for (const kulcs of ['uzemanyag', 'valto', 'hajtas', 'kivitel']) {
        if (szurok[kulcs]) {
            cimkek.push([kulcs, lista(szurok[kulcs]).join(', ')]);
        }
    }
    if (szurok.minAr || szurok.maxAr) {
        cimkek.push(['ar', tartomanyCimke(szurok.minAr, szurok.maxAr, 'Ft')]);
    }
    if (szurok.evjaratTol || szurok.evjaratIg) {
        cimkek.push(['evjarat', (szurok.evjaratTol || '…') + '–' + (szurok.evjaratIg || '…')]);
    }
    if (szurok.kmTol || szurok.kmIg) {
        cimkek.push(['km', tartomanyCimke(szurok.kmTol, szurok.kmIg, 'km')]);
    }
    if (szurok.teljesitmenyTol || szurok.teljesitmenyIg) {
        cimkek.push(['teljesitmeny', tartomanyCimke(szurok.teljesitmenyTol, szurok.teljesitmenyIg, 'LE')]);
    }
    if (szurok.megye) {
        cimkek.push(['megye', lista(szurok.megye).join(', ')]);
    }
    if (szurok.telephely) {
        cimkek.push(['telephely', 'Kiválasztott telephely']);
    }
    if (szurok.ujak === '1') {
        cimkek.push(['ujak', 'Új hirdetések']);
    }
    if (szurok.garancias === '1') {
        cimkek.push(['garancias', 'Garanciális']);
    }
    return cimkek;
};

// ha egy címkét törölnek, ezeket az URL paramétereket kell kivenni
export const CIMKE_PARAMETEREK = {
    q: ['q'],
    marka: ['marka', 'modell'],
    uzemanyag: ['uzemanyag'],
    valto: ['valto'],
    hajtas: ['hajtas'],
    kivitel: ['kivitel'],
    ar: ['minAr', 'maxAr'],
    evjarat: ['evjaratTol', 'evjaratIg'],
    km: ['kmTol', 'kmIg'],
    teljesitmeny: ['teljesitmenyTol', 'teljesitmenyIg'],
    megye: ['megye'],
    telephely: ['telephely'],
    ujak: ['ujak'],
    garancias: ['garancias'],
};
