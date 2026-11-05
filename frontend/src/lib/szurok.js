/** Az URL-ben tárolt szűrők (a backend /api/autok paramétereivel azonos nevekkel). */
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

export const szurokParamsbol = (params) => Object.fromEntries(
    SZURO_KULCSOK.filter((kulcs) => params.get(kulcs)).map((kulcs) => [kulcs, params.get(kulcs)]),
);

export const aktivSzurokSzama = (szurok) => Object.keys(szurok).filter((kulcs) => kulcs !== 'q').length;

export const lista = (ertek) => (ertek ? ertek.split(',').filter(Boolean) : []);

const szam = new Intl.NumberFormat('hu-HU');
const tartomanyCimke = (tol, ig, egyseg) => {
    if (tol && ig) return `${szam.format(tol)}–${szam.format(ig)} ${egyseg}`;
    if (tol) return `${szam.format(tol)} ${egyseg}-tól`;
    return `${szam.format(ig)} ${egyseg}-ig`;
};

/** Ember számára olvasható összefoglaló a mentett keresésekhez és a szűrőcímkékhez. */
export const szuroCimkek = (szurok) => {
    const cimkek = [];
    if (szurok.q) cimkek.push(['q', `„${szurok.q}”`]);
    if (szurok.marka) cimkek.push(['marka', szurok.modell ? `${szurok.marka} ${szurok.modell}` : szurok.marka]);
    for (const kulcs of ['uzemanyag', 'valto', 'hajtas', 'kivitel']) {
        if (szurok[kulcs]) cimkek.push([kulcs, lista(szurok[kulcs]).join(', ')]);
    }
    if (szurok.minAr || szurok.maxAr) cimkek.push(['ar', tartomanyCimke(szurok.minAr, szurok.maxAr, 'Ft')]);
    if (szurok.evjaratTol || szurok.evjaratIg) {
        cimkek.push(['evjarat', `${szurok.evjaratTol || '…'}–${szurok.evjaratIg || '…'}`]);
    }
    if (szurok.kmTol || szurok.kmIg) cimkek.push(['km', tartomanyCimke(szurok.kmTol, szurok.kmIg, 'km')]);
    if (szurok.teljesitmenyTol || szurok.teljesitmenyIg) {
        cimkek.push(['teljesitmeny', tartomanyCimke(szurok.teljesitmenyTol, szurok.teljesitmenyIg, 'LE')]);
    }
    if (szurok.megye) cimkek.push(['megye', lista(szurok.megye).join(', ')]);
    if (szurok.telephely) cimkek.push(['telephely', 'Kiválasztott telephely']);
    if (szurok.ujak === '1') cimkek.push(['ujak', 'Új hirdetések']);
    if (szurok.garancias === '1') cimkek.push(['garancias', 'Garanciális']);
    return cimkek;
};

/** Egy címke eltávolításakor törlendő URL-paraméterek. */
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
