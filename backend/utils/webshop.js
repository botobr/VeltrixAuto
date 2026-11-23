const { mezoErteke, kepekErvenyesitese } = require('./autoMezok');

// A webshop beállításai és számolásai: kategóriák, szállítás, fizetés,
// a termék adatainak ellenőrzése és a rendelés végösszege.
// Fontos: az árat mindig a szerver számolja ki, nem a frontend!

const KATEGORIAK = {
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

const SZALLITASI_MODOK = {
    futar: { nev: 'Házhozszállítás futárral', dij: 2490, ingyenesHatar: 100000, cimKell: true },
    szemelyes: { nev: 'Személyes átvétel telephelyünkön', dij: 0, ingyenesHatar: null, cimKell: false },
};

const FIZETESI_MODOK = {
    kartya: { nev: 'Online bankkártyás fizetés', dij: 0, szallitas: ['futar', 'szemelyes'], online: true },
    atutalas: { nev: 'Előre utalás (banki átutalás)', dij: 0, szallitas: ['futar', 'szemelyes'] },
    utanvet: { nev: 'Utánvét (fizetés a futárnál)', dij: 590, szallitas: ['futar'] },
    helyszinen: { nev: 'Fizetés átvételkor a telephelyen', dij: 0, szallitas: ['szemelyes'] },
};

const RENDELES_STATUSZOK = {
    fizetesre_var: 'Fizetésre vár',
    uj: 'Új',
    feldolgozas: 'Összekészítés alatt',
    feladva: 'Feladva',
    atveheto: 'Átvehető',
    teljesitve: 'Teljesítve',
    lemondva: 'Lemondva',
};

const MAX_TETEL = 30;
const MAX_MENNYISEG = 99;
const ALACSONY_KESZLET = 2;

// ennyit kell fizetni egy darabért (ha van akció, akkor az akciós ár)
const egysegar = (alkatresz) => {
    const akcios = alkatresz.akciosAr;
    if (akcios !== null && akcios !== undefined && akcios < alkatresz.ar) {
        return akcios;
    }
    return alkatresz.ar;
};

// ---------- Termék (alkatrész) adatai ----------

const MEZOK = {
    nev: { tipus: 'szoveg', kotelezo: true, max: 140 },
    cikkszam: { tipus: 'szoveg', kotelezo: true, max: 40, minta: /^[A-Za-z0-9._/-]+$/, mintaHiba: 'A cikkszám csak betűt, számot és . _ / - jelet tartalmazhat.' },
    gyarto: { tipus: 'szoveg', kotelezo: true, max: 60 },
    kategoria: { tipus: 'enum', kotelezo: true, ertekek: Object.keys(KATEGORIAK) },
    rovidLeiras: { tipus: 'szoveg', max: 300 },
    leiras: { tipus: 'szoveg', max: 8000 },
    ar: { tipus: 'szam', kotelezo: true, min: 0, max: 1e9, egesz: true },
    akciosAr: { tipus: 'szam', min: 0, max: 1e9, egesz: true },
    keszlet: { tipus: 'szam', kotelezo: true, min: 0, max: 100000, egesz: true },
    univerzalis: { tipus: 'logikai', alap: false },
    lathato: { tipus: 'logikai', alap: true },
    kiemelt: { tipus: 'logikai', alap: false },
};

const CIMKEK = {
    nev: 'Név', cikkszam: 'Cikkszám', gyarto: 'Gyártó', kategoria: 'Kategória', rovidLeiras: 'Rövid leírás',
    leiras: 'Leírás', ar: 'Ár', akciosAr: 'Akciós ár', keszlet: 'Készlet', univerzalis: 'Univerzális',
    lathato: 'Látható', kiemelt: 'Kiemelt',
};

const maxEvjarat = () => new Date().getFullYear() + 2;

// szöveg levágva a megadott hosszra, ha nem szöveg, akkor ''
const szoveg = (ertek, max) => {
    if (typeof ertek !== 'string') {
        return '';
    }
    return ertek.trim().slice(0, max);
};

// melyik autókra jó az alkatrész (sorok listája)
const kompatibilitasEllenorzese = (nyers, hibak) => {
    if (nyers === undefined || nyers === null) {
        return [];
    }
    if (!Array.isArray(nyers)) {
        hibak.push('Kompatibilitás: listát kell megadni.');
        return [];
    }
    if (nyers.length > 100) {
        hibak.push('Kompatibilitás: legfeljebb 100 sor adható meg.');
    }

    const sorok = [];
    for (let i = 0; i < nyers.length && i < 100; i++) {
        const sor = nyers[i] || {};
        const sorszam = i + 1;

        const marka = szoveg(sor.marka, 60);
        if (!marka) {
            hibak.push(`Kompatibilitás ${sorszam}. sor: a márka kötelező.`);
            continue;
        }

        const evjaratTol = evjaratEllenorzese(sor.evjaratTol, sorszam, hibak);
        const evjaratIg = evjaratEllenorzese(sor.evjaratIg, sorszam, hibak);
        if (evjaratTol && evjaratIg && evjaratTol > evjaratIg) {
            hibak.push(`Kompatibilitás ${sorszam}. sor: a „tól” évjárat nem lehet nagyobb az „ig”-nél.`);
        }

        sorok.push({ marka: marka, modell: szoveg(sor.modell, 80), evjaratTol: evjaratTol, evjaratIg: evjaratIg });
    }
    return sorok;
};

// egy évjárat ellenőrzése a kompatibilitás sorban (üres is lehet)
const evjaratEllenorzese = (ertek, sorszam, hibak) => {
    if (ertek === '' || ertek === null || ertek === undefined) {
        return null;
    }
    const szam = Number(ertek);
    if (!Number.isInteger(szam) || szam < 1886 || szam > maxEvjarat()) {
        hibak.push(`Kompatibilitás ${sorszam}. sor: érvénytelen évjárat.`);
        return null;
    }
    return szam;
};

// műszaki paraméterek (név - érték párok), az üres sorokat kihagyjuk
const parameterekEllenorzese = (nyers, hibak) => {
    if (nyers === undefined || nyers === null) {
        return [];
    }
    if (!Array.isArray(nyers)) {
        hibak.push('Paraméterek: listát kell megadni.');
        return [];
    }
    if (nyers.length > 40) {
        hibak.push('Paraméterek: legfeljebb 40 sor adható meg.');
    }

    const parameterek = [];
    for (let i = 0; i < nyers.length && i < 40; i++) {
        const sor = nyers[i] || {};
        const nev = szoveg(sor.nev, 60);
        const ertek = szoveg(sor.ertek, 120);
        if (nev && ertek) {
            parameterek.push({ nev: nev, ertek: ertek });
        }
    }
    return parameterek;
};

// Az egész termék űrlap ellenőrzése. Visszaadja a tisztított adatokat és a hibákat.
const alkatreszEllenorzese = (nyers = {}) => {
    const hibak = [];
    const adatok = {};
    for (const nev in MEZOK) {
        adatok[nev] = mezoErteke(nev, MEZOK[nev], nyers[nev], hibak, CIMKEK);
    }
    if (adatok.cikkszam) {
        adatok.cikkszam = adatok.cikkszam.toUpperCase();
    }
    if (adatok.akciosAr !== null && adatok.ar !== null && adatok.akciosAr >= adatok.ar) {
        hibak.push('Az akciós árnak kisebbnek kell lennie a normál árnál.');
    }
    adatok.kepek = kepekErvenyesitese(nyers.kepek, hibak);
    adatok.kompatibilitas = kompatibilitasEllenorzese(nyers.kompatibilitas, hibak);
    adatok.parameterek = parameterekEllenorzese(nyers.parameterek, hibak);
    if (!adatok.univerzalis && adatok.kompatibilitas.length === 0) {
        hibak.push('Add meg, mely autókra illik az alkatrész, vagy jelöld univerzálisnak.');
    }
    return { adatok, hibak };
};

// az admin listában gyorsan átállítható mezők
const GYORS_MEZOK = ['keszlet', 'ar', 'akciosAr', 'lathato', 'kiemelt'];

const gyorsModositasEllenorzese = (nyers = {}) => {
    const hibak = [];
    const adatok = {};
    let db = 0;
    for (const nev of GYORS_MEZOK) {
        if (Object.hasOwn(nyers, nev)) {
            adatok[nev] = mezoErteke(nev, MEZOK[nev], nyers[nev], hibak, CIMKEK);
            db++;
        }
    }
    if (db === 0) {
        hibak.push('Nincs módosítandó adat.');
    }
    return { adatok, hibak };
};

// ---------- Kosár és rendelés ----------

// A frontendről jövő kosár ellenőrzése: [{ id, mennyiseg }]
// Ha egy termék többször szerepel, összeadjuk, a hibás sorokat kihagyjuk.
const kosarTetelek = (nyers) => {
    if (!Array.isArray(nyers)) {
        return [];
    }

    const tetelek = [];
    for (let i = 0; i < nyers.length && i < MAX_TETEL * 2; i++) {
        const tetel = nyers[i] || {};
        const mennyiseg = Number(tetel.mennyiseg);

        // érvényes MongoDB id kell és pozitív egész mennyiség
        if (typeof tetel.id !== 'string' || !/^[a-f0-9]{24}$/i.test(tetel.id)) {
            continue;
        }
        if (!Number.isInteger(mennyiseg) || mennyiseg < 1) {
            continue;
        }

        const meglevo = tetelek.find((elem) => elem.id === tetel.id);
        if (meglevo) {
            meglevo.mennyiseg = Math.min(meglevo.mennyiseg + mennyiseg, MAX_MENNYISEG);
        } else {
            tetelek.push({ id: tetel.id, mennyiseg: Math.min(mennyiseg, MAX_MENNYISEG) });
        }
    }
    return tetelek.slice(0, MAX_TETEL);
};

// A szállítási módhoz választható fizetési módok.
// A kártyás fizetés csak akkor jelenik meg, ha a Stripe be van állítva.
const fizetesiModok = (szallitasiMod, { kartyaElerheto }) => {
    const modok = [];
    for (const kulcs in FIZETESI_MODOK) {
        const mod = FIZETESI_MODOK[kulcs];
        if (kulcs === 'kartya' && !kartyaElerheto) {
            continue;
        }
        if (szallitasiMod && !mod.szallitas.includes(szallitasiMod)) {
            continue;
        }
        modok.push({ kulcs: kulcs, nev: mod.nev, dij: mod.dij, online: Boolean(mod.online) });
    }
    return modok;
};

// A rendelés összegeinek kiszámítása.
// tetelek: [{ alkatresz (az adatbázisból), mennyiseg }]
const rendelesSzamitas = ({ tetelek, szallitasiMod, fizetesiMod }) => {
    const sorok = [];
    let termekek = 0;
    for (const tetel of tetelek) {
        const ar = egysegar(tetel.alkatresz);
        const sorosszeg = ar * tetel.mennyiseg;
        sorok.push({ alkatresz: tetel.alkatresz, mennyiseg: tetel.mennyiseg, egysegar: ar, sorosszeg: sorosszeg });
        termekek = termekek + sorosszeg;
    }

    // szállítási díj: egy összeg felett ingyenes
    const szallitas = SZALLITASI_MODOK[szallitasiMod];
    let szallitasiDij = 0;
    if (szallitas) {
        szallitasiDij = szallitas.dij;
        if (szallitas.ingyenesHatar !== null && termekek >= szallitas.ingyenesHatar) {
            szallitasiDij = 0;
        }
    }

    // kezelési díj (pl. utánvétnél)
    let kezelesiDij = 0;
    if (FIZETESI_MODOK[fizetesiMod]) {
        kezelesiDij = FIZETESI_MODOK[fizetesiMod].dij;
    }

    return {
        sorok: sorok,
        osszegek: {
            termekek: termekek,
            szallitas: szallitasiDij,
            kezelesiDij: kezelesiDij,
            vegosszeg: termekek + szallitasiDij + kezelesiDij,
        },
    };
};

module.exports = {
    KATEGORIAK,
    SZALLITASI_MODOK,
    FIZETESI_MODOK,
    RENDELES_STATUSZOK,
    MAX_MENNYISEG,
    ALACSONY_KESZLET,
    egysegar,
    alkatreszEllenorzese,
    gyorsModositasEllenorzese,
    kosarTetelek,
    fizetesiModok,
    rendelesSzamitas,
};
