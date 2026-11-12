/*
 * A webshop (tuning alkatrészek) frontend-segédei. Az árakat és a végösszeget
 * mindig a backend számolja (/api/kosar) – itt csak megjelenítés történik.
 */

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
export const ft = (ertek) => `${szamFormatum.format(Math.round(ertek || 0))} Ft`;

export const alkatreszUrl = (alkatresz) => `/alkatreszek/${alkatresz.slug || alkatresz._id || alkatresz.id}`;

/** Készlet szövegesen a vevőnek. */
export const keszletSzoveg = (keszlet) => {
    if (keszlet <= 0) return { szoveg: 'Elfogyott', tipus: 'elfogyott' };
    if (keszlet <= 2) return { szoveg: `Utolsó ${keszlet} db`, tipus: 'utolso' };
    return { szoveg: 'Készleten', tipus: 'keszleten' };
};

/** Kompatibilitási sor olvasható formában: „BMW 3-as sorozat (2012–2019)”. */
export const kompatibilitasSzoveg = ({ marka, modell, evjaratTol, evjaratIg }) => {
    const evek = evjaratTol || evjaratIg ? ` (${evjaratTol || '…'}–${evjaratIg || '…'})` : '';
    return `${marka}${modell ? ` ${modell}` : ' – minden modell'}${evek}`;
};

/** Üres termékűrlap (az admin szerkesztőhöz). */
export const uresAlkatresz = () => ({
    nev: '', cikkszam: '', gyarto: '', kategoria: '', rovidLeiras: '', leiras: '',
    ar: '', akciosAr: '', keszlet: '0', kepek: [], parameterek: [], kompatibilitas: [],
    univerzalis: false, lathato: true, kiemelt: false,
});

export const alkatreszUrlapbol = (a) => ({
    ...uresAlkatresz(),
    ...a,
    ar: a.ar ?? '',
    akciosAr: a.akciosAr ?? '',
    keszlet: a.keszlet ?? '0',
    kepek: (a.kepek || []).filter((kep) => kep.publicId),
    kompatibilitas: (a.kompatibilitas || []).map((sor) => ({ ...sor, evjaratTol: sor.evjaratTol ?? '', evjaratIg: sor.evjaratIg ?? '' })),
    parameterek: a.parameterek || [],
});
