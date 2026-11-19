const { mezoErteke, kepekErvenyesitese } = require('./autoMezok');

/*
 * A webshop (tuning alkatrészek) üzleti szabályai egy helyen: kategóriák,
 * szállítási és fizetési módok díjakkal, a termékadatok ellenőrzése és a
 * rendelés végösszegének kiszámítása. Az árakat MINDIG a szerver számolja.
 */

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

/** A ténylegesen fizetendő egységár (akciós, ha van). */
const egysegar = (alkatresz) => (alkatresz.akciosAr !== null && alkatresz.akciosAr !== undefined && alkatresz.akciosAr < alkatresz.ar
    ? alkatresz.akciosAr
    : alkatresz.ar);

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
const szoveg = (ertek, max) => (typeof ertek === 'string' ? ertek.trim().slice(0, max) : '');

const kompatibilitasEllenorzese = (nyers, hibak) => {
    if (nyers === undefined || nyers === null) return [];
    if (!Array.isArray(nyers)) {
        hibak.push('Kompatibilitás: listát kell megadni.');
        return [];
    }
    if (nyers.length > 100) hibak.push('Kompatibilitás: legfeljebb 100 sor adható meg.');
    const sorok = [];
    for (const [i, sor] of nyers.slice(0, 100).entries()) {
        const marka = szoveg(sor?.marka, 60);
        if (!marka) {
            hibak.push(`Kompatibilitás ${i + 1}. sor: a márka kötelező.`);
            continue;
        }
        const evjarat = (ertek) => {
            if (ertek === '' || ertek === null || ertek === undefined) return null;
            const szam = Number(ertek);
            if (!Number.isInteger(szam) || szam < 1886 || szam > maxEvjarat()) {
                hibak.push(`Kompatibilitás ${i + 1}. sor: érvénytelen évjárat.`);
                return null;
            }
            return szam;
        };
        const evjaratTol = evjarat(sor.evjaratTol);
        const evjaratIg = evjarat(sor.evjaratIg);
        if (evjaratTol && evjaratIg && evjaratTol > evjaratIg) hibak.push(`Kompatibilitás ${i + 1}. sor: a „tól” évjárat nem lehet nagyobb az „ig”-nél.`);
        sorok.push({ marka, modell: szoveg(sor.modell, 80), evjaratTol, evjaratIg });
    }
    return sorok;
};

const parameterekEllenorzese = (nyers, hibak) => {
    if (nyers === undefined || nyers === null) return [];
    if (!Array.isArray(nyers)) {
        hibak.push('Paraméterek: listát kell megadni.');
        return [];
    }
    if (nyers.length > 40) hibak.push('Paraméterek: legfeljebb 40 sor adható meg.');
    return nyers.slice(0, 40)
        .map((sor) => ({ nev: szoveg(sor?.nev, 60), ertek: szoveg(sor?.ertek, 120) }))
        .filter((sor) => sor.nev && sor.ertek);
};

/** A teljes termékűrlapot ellenőrzi; visszaadja a tisztított adatokat és a hibalistát. */
const alkatreszEllenorzese = (nyers = {}) => {
    const hibak = [];
    const adatok = {};
    for (const [nev, leiro] of Object.entries(MEZOK)) {
        adatok[nev] = mezoErteke(nev, leiro, nyers[nev], hibak, CIMKEK);
    }
    if (adatok.cikkszam) adatok.cikkszam = adatok.cikkszam.toUpperCase();
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

/** Gyors admin-módosítás (lista nézetből): készlet, ár, láthatóság, kiemelés. */
const GYORS_MEZOK = ['keszlet', 'ar', 'akciosAr', 'lathato', 'kiemelt'];
const gyorsModositasEllenorzese = (nyers = {}) => {
    const hibak = [];
    const adatok = {};
    for (const nev of GYORS_MEZOK) {
        if (Object.hasOwn(nyers, nev)) adatok[nev] = mezoErteke(nev, MEZOK[nev], nyers[nev], hibak, CIMKEK);
    }
    if (Object.keys(adatok).length === 0) hibak.push('Nincs módosítandó adat.');
    return { adatok, hibak };
};

// ---------- Kosár és rendelés ----------

/** A kosár nyers tételeiből [{ id, mennyiseg }] – ismétlődés összevonva, hibás sorok kiszűrve. */
const kosarTetelek = (nyers) => {
    if (!Array.isArray(nyers)) return [];
    const osszevont = new Map();
    for (const tetel of nyers.slice(0, MAX_TETEL * 2)) {
        const id = typeof tetel?.id === 'string' && /^[a-f0-9]{24}$/i.test(tetel.id) ? tetel.id : null;
        const mennyiseg = Number(tetel?.mennyiseg);
        if (!id || !Number.isInteger(mennyiseg) || mennyiseg < 1) continue;
        osszevont.set(id, Math.min((osszevont.get(id) || 0) + mennyiseg, MAX_MENNYISEG));
    }
    return [...osszevont.entries()].slice(0, MAX_TETEL).map(([id, mennyiseg]) => ({ id, mennyiseg }));
};

/** Az adott szállítási módhoz választható fizetési módok (a kártya csak beállított Stripe mellett). */
const fizetesiModok = (szallitasiMod, { kartyaElerheto }) => Object.entries(FIZETESI_MODOK)
    .filter(([kulcs, mod]) => (kulcs !== 'kartya' || kartyaElerheto) && (!szallitasiMod || mod.szallitas.includes(szallitasiMod)))
    .map(([kulcs, mod]) => ({ kulcs, nev: mod.nev, dij: mod.dij, online: Boolean(mod.online) }));

/**
 * A rendelés összegei. `tetelek`: [{ alkatresz (adatbázisból), mennyiseg }].
 * A szállítási díj a termékösszegtől függ (ingyenes határ felett 0).
 */
const rendelesSzamitas = ({ tetelek, szallitasiMod, fizetesiMod }) => {
    const sorok = tetelek.map(({ alkatresz, mennyiseg }) => {
        const ar = egysegar(alkatresz);
        return { alkatresz, mennyiseg, egysegar: ar, sorosszeg: ar * mennyiseg };
    });
    const termekek = sorok.reduce((osszeg, sor) => osszeg + sor.sorosszeg, 0);
    const szallitas = SZALLITASI_MODOK[szallitasiMod];
    const szallitasiDij = !szallitas || (szallitas.ingyenesHatar !== null && termekek >= szallitas.ingyenesHatar) ? 0 : szallitas.dij;
    const kezelesiDij = FIZETESI_MODOK[fizetesiMod]?.dij || 0;
    return { sorok, osszegek: { termekek, szallitas: szallitasiDij, kezelesiDij, vegosszeg: termekek + szallitasiDij + kezelesiDij } };
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
