const AlkatreszModel = require('../models/Alkatresz');
const AutoModel = require('../models/Auto');
const ErdeklodesModel = require('../models/Erdeklodes');
const TelephelyModel = require('../models/Telephely');
const RendelesModel = require('../models/Rendeles');
const FelhasznaloModel = require('../models/Felhasznalo');
const { autoValasz } = require('./autoSzuro');
const { ALACSONY_KESZLET } = require('./webshop');

/*
 * Az admin dashboard adatai. Az adatbázisból betöltjük a szükséges rekordokat,
 * majd minden számítást itt, egyszerű JavaScripttel végzünk el. A frontend csak
 * megjeleníti az eredményt.
 */

const NAP_MS = 24 * 60 * 60 * 1000;
const IDOZONA = 'Europe/Budapest';
const IDOSZAKOK = { 30: 30, 90: 90, 365: 365, osszes: null };
const ALAP_IDOSZAK = '30';
const REGI_KESZLET_NAP = 90;
const NAPI_NAPOK = 30;
const HAVI_HONAPOK = 12;
const MAX_KATEGORIA = 6;
const MAX_MARKA = 10;

/** Árkategóriák: alsó határ (Ft) és felirat. */
const AR_SAVOK = [
    [0, '5 M Ft alatt'],
    [5e6, '5–10 M Ft'],
    [1e7, '10–20 M Ft'],
    [2e7, '20–50 M Ft'],
    [5e7, '50–100 M Ft'],
    [1e8, '100–500 M Ft'],
    [5e8, '500 M Ft felett'],
];

// ---------- Kis segédfüggvények ----------

const idoszakFeldolgozasa = (nyers, most = new Date()) => {
    const kulcs = Object.hasOwn(IDOSZAKOK, nyers) ? String(nyers) : ALAP_IDOSZAK;
    const napok = IDOSZAKOK[kulcs];
    if (!napok) {
        return { kulcs, napok: null, tol: null, elozoTol: null };
    }
    return {
        kulcs,
        napok,
        tol: new Date(most.getTime() - napok * NAP_MS),
        elozoTol: new Date(most.getTime() - 2 * napok * NAP_MS),
    };
};

const napFormatum = new Intl.DateTimeFormat('en-US', { timeZone: IDOZONA, year: 'numeric', month: '2-digit', day: '2-digit' });

/** A dátum budapesti naptári napja 'ÉÉÉÉ-HH-NN' formában. */
const budapestiNap = (datum) => {
    const reszek = {};
    for (const resz of napFormatum.formatToParts(datum)) {
        reszek[resz.type] = resz.value;
    }
    return `${reszek.year}-${reszek.month}-${reszek.day}`;
};

/** Az utolsó `db` nap kulcsa, a legrégebbivel kezdve (a mai nappal zárva). */
const utolsoNapok = (db, most = new Date()) => {
    const [ev, ho, nap] = budapestiNap(most).split('-').map(Number);
    const napok = [];
    for (let i = db - 1; i >= 0; i--) {
        napok.push(new Date(Date.UTC(ev, ho - 1, nap - i)).toISOString().slice(0, 10));
    }
    return napok;
};

/** Az utolsó `db` hónap kulcsa ('ÉÉÉÉ-HH'), a folyó hónappal zárva. */
const utolsoHonapok = (db, most = new Date()) => {
    const [ev, ho] = budapestiNap(most).split('-').map(Number);
    const honapok = [];
    for (let i = db - 1; i >= 0; i--) {
        honapok.push(new Date(Date.UTC(ev, ho - 1 - i, 1)).toISOString().slice(0, 7));
    }
    return honapok;
};

/** Idősor a megadott kulcsokra: [{ _id, ... }] listából; a hiányzó kulcsok minden mezője 0. */
const idosorKitoltese = (kulcsok, lista, mezok) => kulcsok.map((kulcs) => {
    const talalat = lista.find((elem) => elem._id === kulcs);
    const sor = { kulcs };
    for (const mezo of mezok) {
        sor[mezo] = talalat ? talalat[mezo] || 0 : 0;
    }
    return sor;
});

/** Százalékos változás az előző időszakhoz képest; null, ha nincs mihez viszonyítani. */
const valtozas = (jelenlegi, elozo) => {
    if (elozo === null || elozo === undefined || elozo === 0) {
        return null;
    }
    return Math.round(((jelenlegi - elozo) / elozo) * 1000) / 10;
};

/** Csökkenő sorrend; ha több kategória van, mint `max`, a végük „Egyéb” néven összevonva. */
const kategoriakOsszevonasa = (lista, max = MAX_KATEGORIA) => {
    const rendezett = lista
        .map((elem) => ({ nev: elem._id || 'Nincs megadva', db: elem.db }))
        .sort((a, b) => b.db - a.db || a.nev.localeCompare(b.nev, 'hu'));
    if (rendezett.length <= max) {
        return rendezett;
    }
    let egyeb = 0;
    for (const elem of rendezett.slice(max - 1)) {
        egyeb += elem.db;
    }
    return [...rendezett.slice(0, max - 1), { nev: 'Egyéb', db: egyeb }];
};

/** Az ársávok listája [{ _id: alsó határ, db }] darabszámokból, az üres sávokat 0-val. */
const arSavokKitoltese = (lista) => AR_SAVOK.map(([tol, nev]) => {
    const talalat = lista.find((elem) => elem._id === tol);
    return { nev, tol, db: talalat ? talalat.db : 0 };
});

const kerekit = (ertek, tizedes = 0) => {
    if (ertek === null || ertek === undefined) {
        return null;
    }
    const szorzo = 10 ** tizedes;
    return Math.round(ertek * szorzo) / szorzo;
};

const osszeg = (lista, ertekFv) => {
    let osszesen = 0;
    for (const elem of lista) {
        osszesen += ertekFv(elem);
    }
    return osszesen;
};

/** Átlag; a null/undefined értékeket kihagyja. Üres listánál null. */
const atlag = (lista, ertekFv) => {
    const ertekek = lista.map(ertekFv).filter((ertek) => ertek !== null && ertek !== undefined);
    if (ertekek.length === 0) {
        return null;
    }
    return osszeg(ertekek, (ertek) => ertek) / ertekek.length;
};

/** Darabszám kulcsonként: { kulcs: db }. */
const szamolas = (lista, kulcsFv) => {
    const darabok = {};
    for (const elem of lista) {
        const kulcs = kulcsFv(elem);
        darabok[kulcs] = (darabok[kulcs] || 0) + 1;
    }
    return darabok;
};

const datumE = (ertek) => ertek instanceof Date && !Number.isNaN(ertek.getTime());

/** Két dátum között eltelt napok (legalább 0); ha bármelyik hiányzik, null. */
const eltelNapok = (kesobbi, korabbi) => {
    if (!datumE(kesobbi) || !datumE(korabbi)) {
        return null;
    }
    return Math.max(0, (kesobbi - korabbi) / NAP_MS);
};

/** Benne van-e a dátum a [tol, ig) időszakban (ig nélkül: tol-tól máig). */
const idoszakban = (datum, tol, ig = null) => {
    if (!datumE(datum)) {
        return false;
    }
    return datum >= tol && (!ig || datum < ig);
};

// ---------- Részszámítások ----------

/**
 * Az eladott autók egyszerűsített listája. Régi, eladási dátum/ár nélküli rekordnál
 * az utolsó módosítás dátuma és a vételár a becslés.
 */
const eladasokListaja = (autok) => autok
    .filter((auto) => auto.statusz === 'elkelt')
    .map((auto) => ({
        auto,
        datum: auto.eladas_datum || auto.updatedAt || null,
        ar: auto.eladasi_ar ?? auto.vetel_ar,
    }));

const bevetelSzamitas = (eladasok, { tol, elozoTol }) => {
    const idoszakiEladasok = tol ? eladasok.filter((e) => idoszakban(e.datum, tol)) : eladasok;
    const elozoEladasok = tol ? eladasok.filter((e) => idoszakban(e.datum, elozoTol, tol)) : null;

    const idoszakBevetel = osszeg(idoszakiEladasok, (e) => e.ar);
    const elozoBevetel = elozoEladasok ? osszeg(elozoEladasok, (e) => e.ar) : null;
    const elozoDb = elozoEladasok ? elozoEladasok.length : null;

    return {
        idoszakiEladasok,
        adatok: {
            idoszak: idoszakBevetel,
            elozo: elozoBevetel,
            valtozas: valtozas(idoszakBevetel, elozoBevetel),
            eladottDb: idoszakiEladasok.length,
            elozoEladottDb: elozoDb,
            eladottValtozas: valtozas(idoszakiEladasok.length, elozoDb),
            atlagAr: kerekit(atlag(idoszakiEladasok, (e) => e.ar)),
            atlagNap: kerekit(atlag(idoszakiEladasok, (e) => eltelNapok(e.datum, e.auto.createdAt))),
            atlagEngedmeny: kerekit(atlag(idoszakiEladasok, (e) => (e.auto.vetel_ar > 0 ? (e.auto.vetel_ar - e.ar) / e.auto.vetel_ar : null)), 4),
            osszes: osszeg(eladasok, (e) => e.ar),
            osszesEladott: eladasok.length,
        },
    };
};

const haviBevetel = (eladasok, most) => {
    const kezdet = new Date(most.getTime() - 370 * NAP_MS);
    const honaponkent = {};
    for (const eladas of eladasok) {
        if (!idoszakban(eladas.datum, kezdet)) continue;
        const honap = budapestiNap(eladas.datum).slice(0, 7);
        if (!honaponkent[honap]) honaponkent[honap] = { _id: honap, bevetel: 0, db: 0 };
        honaponkent[honap].bevetel += eladas.ar;
        honaponkent[honap].db += 1;
    }
    return idosorKitoltese(utolsoHonapok(HAVI_HONAPOK, most), Object.values(honaponkent), ['bevetel', 'db']);
};

const legutobbEladottak = (eladasok) => [...eladasok]
    // Legújabb elöl; dátum nélküli eladás a lista végére.
    .sort((a, b) => (b.datum ? b.datum.getTime() : -Infinity) - (a.datum ? a.datum.getTime() : -Infinity)
        || String(b.auto._id).localeCompare(String(a.auto._id)))
    .slice(0, 6)
    .map((e) => ({
        ...autoValasz(e.auto, { admin: true, penzugy: true }),
        eladas_datum: e.datum,
        eladasi_ar: e.ar,
    }));

const arSav = (ar) => {
    let sav = AR_SAVOK[0][0];
    for (const [tol] of AR_SAVOK) {
        if (ar >= tol) sav = tol;
    }
    return sav;
};

const keszletSzamitas = (autok, most) => {
    const keszlet = autok.filter((auto) => auto.statusz !== 'elkelt');
    const regiHatar = new Date(most.getTime() - REGI_KESZLET_NAP * NAP_MS);
    const statuszok = szamolas(autok, (auto) => auto.statusz);

    const darabLista = (kulcsFv) => Object.entries(szamolas(keszlet, kulcsFv)).map(([kulcs, db]) => ({ _id: kulcs === 'undefined' ? null : kulcs, db }));
    const arSavDarabok = szamolas(keszlet, (auto) => arSav(auto.vetel_ar));

    return {
        db: keszlet.length,
        ertek: osszeg(keszlet, (auto) => auto.vetel_ar),
        atlagAr: kerekit(atlag(keszlet, (auto) => auto.vetel_ar)),
        atlagNap: kerekit(atlag(keszlet, (auto) => eltelNapok(most, auto.createdAt))),
        regi: keszlet.filter((auto) => datumE(auto.createdAt) && auto.createdAt <= regiHatar).length,
        regiHatarNap: REGI_KESZLET_NAP,
        statuszok: { elerheto: statuszok.elerheto || 0, foglalt: statuszok.foglalt || 0, elkelt: statuszok.elkelt || 0 },
        rejtett: keszlet.filter((auto) => auto.lathato === false).length,
        lejart: keszlet.filter((auto) => datumE(auto.lejarat) && auto.lejarat <= most).length,
        kiemelt: keszlet.filter((auto) => auto.kiemelt).length,
        uzemanyag: kategoriakOsszevonasa(darabLista((auto) => auto.uzemanyag)),
        kivitel: kategoriakOsszevonasa(darabLista((auto) => auto.kivitel)),
        arSavok: arSavokKitoltese(Object.entries(arSavDarabok).map(([tol, db]) => ({ _id: Number(tol), db }))),
    };
};

/** Márkánként: készlet (most) és eladás/bevétel (az időszakban), a legnagyobb bevétel elöl. */
const markakSzamitas = (autok, idoszakiEladasok) => {
    const markak = {};
    const marka = (nev) => {
        if (!markak[nev]) markak[nev] = { marka: nev, keszletDb: 0, keszletErtek: 0, eladottDb: 0, bevetel: 0 };
        return markak[nev];
    };
    for (const auto of autok) {
        if (auto.statusz === 'elkelt') continue;
        marka(auto.marka).keszletDb += 1;
        marka(auto.marka).keszletErtek += auto.vetel_ar;
    }
    for (const eladas of idoszakiEladasok) {
        marka(eladas.auto.marka).eladottDb += 1;
        marka(eladas.auto.marka).bevetel += eladas.ar;
    }
    return Object.values(markak)
        .sort((a, b) => b.bevetel - a.bevetel || b.keszletDb - a.keszletDb || String(a.marka).localeCompare(String(b.marka), 'hu'))
        .slice(0, MAX_MARKA);
};

/** Telephelyenként ugyanez; a telephely nélküli autók külön sorban. */
const telephelyekSzamitas = (telephelyek, autok, idoszakiEladasok) => {
    const sorok = {};
    for (const telephely of telephelyek) {
        sorok[String(telephely._id)] = { id: String(telephely._id), nev: telephely.nev, varos: telephely.varos, keszletDb: 0, keszletErtek: 0, eladottDb: 0, bevetel: 0 };
    }
    const sor = (telephelyId) => {
        const kulcs = telephelyId ? String(telephelyId) : 'nincs';
        if (!sorok[kulcs]) sorok[kulcs] = { id: kulcs, nev: 'Telephely nélkül', varos: '', keszletDb: 0, keszletErtek: 0, eladottDb: 0, bevetel: 0 };
        return sorok[kulcs];
    };
    for (const auto of autok) {
        if (auto.statusz === 'elkelt') continue;
        sor(auto.telephely).keszletDb += 1;
        sor(auto.telephely).keszletErtek += auto.vetel_ar;
    }
    for (const eladas of idoszakiEladasok) {
        sor(eladas.auto.telephely).eladottDb += 1;
        sor(eladas.auto.telephely).bevetel += eladas.ar;
    }
    return Object.values(sorok)
        .sort((a, b) => b.bevetel - a.bevetel || b.keszletDb - a.keszletDb || a.nev.localeCompare(b.nev, 'hu'));
};

const erdeklodesSzamitas = (erdeklodesek, { tol, elozoTol }, most) => {
    const statuszok = szamolas(erdeklodesek, (e) => e.statusz);
    const idoszakDb = tol ? erdeklodesek.filter((e) => idoszakban(e.createdAt, tol)).length : erdeklodesek.length;
    const elozoDb = tol ? erdeklodesek.filter((e) => idoszakban(e.createdAt, elozoTol, tol)).length : null;

    const napiTol = new Date(most.getTime() - (NAPI_NAPOK + 1) * NAP_MS);
    const naponta = szamolas(erdeklodesek.filter((e) => idoszakban(e.createdAt, napiTol)), (e) => budapestiNap(e.createdAt));
    const napiLista = Object.entries(naponta).map(([nap, db]) => ({ _id: nap, db }));

    return {
        uj: statuszok.uj || 0,
        folyamatban: statuszok.folyamatban || 0,
        lezart: statuszok.lezart || 0,
        idoszak: idoszakDb,
        elozo: elozoDb,
        valtozas: valtozas(idoszakDb, elozoDb),
        napi: idosorKitoltese(utolsoNapok(NAPI_NAPOK, most), napiLista, ['db']),
    };
};

/** Webshop: rendelések és bevétel (lemondott nélkül), teendők, készletjelzés, legkelendőbb termékek. */
const webshopSzamitas = (rendelesek, alkatreszek, { tol, elozoTol }) => {
    const ervenyes = rendelesek.filter((r) => r.statusz !== 'lemondva');
    const idoszakiRendelesek = tol ? ervenyes.filter((r) => idoszakban(r.createdAt, tol)) : ervenyes;
    const elozoRendelesek = tol ? ervenyes.filter((r) => idoszakban(r.createdAt, elozoTol, tol)) : null;

    const bevetel = osszeg(idoszakiRendelesek, (r) => r.osszegek.vegosszeg);
    const elozoBevetel = elozoRendelesek ? osszeg(elozoRendelesek, (r) => r.osszegek.vegosszeg) : null;
    const elozoDb = elozoRendelesek ? elozoRendelesek.length : null;

    // Legkelendőbb termékek: a rendelések tételei termékenként összeadva.
    const termekek = {};
    for (const rendeles of idoszakiRendelesek) {
        for (const tetel of rendeles.tetelek) {
            const id = String(tetel.alkatresz);
            if (!termekek[id]) termekek[id] = { id, nev: tetel.nev, cikkszam: tetel.cikkszam, db: 0, bevetel: 0 };
            termekek[id].nev = tetel.nev;
            termekek[id].cikkszam = tetel.cikkszam;
            termekek[id].db += tetel.mennyiseg;
            termekek[id].bevetel += tetel.egysegar * tetel.mennyiseg;
        }
    }
    const top = Object.values(termekek).sort((a, b) => b.db - a.db || b.bevetel - a.bevetel).slice(0, 5);

    const lathatoTermekek = alkatreszek.filter((a) => a.lathato);
    return {
        rendelesek: idoszakiRendelesek.length,
        elozoRendelesek: elozoDb,
        rendelesValtozas: valtozas(idoszakiRendelesek.length, elozoDb),
        bevetel,
        elozoBevetel,
        bevetelValtozas: valtozas(bevetel, elozoBevetel),
        atlagKosar: idoszakiRendelesek.length ? Math.round(bevetel / idoszakiRendelesek.length) : null,
        teendo: rendelesek.filter((r) => r.statusz === 'uj' || r.statusz === 'feldolgozas').length,
        fizetesreVar: rendelesek.filter((r) => r.statusz === 'fizetesre_var').length,
        termekek: lathatoTermekek.length,
        alacsonyKeszlet: lathatoTermekek.filter((a) => a.keszlet > 0 && a.keszlet <= ALACSONY_KESZLET).length,
        alacsonyKeszletHatar: ALACSONY_KESZLET,
        elfogyott: lathatoTermekek.filter((a) => a.keszlet === 0).length,
        top,
    };
};

/**
 * Pénzügyi jog nélkül (értékesítő) a bevételi adatok ki sem kerülnek a válaszból:
 * a bevétel-blokk, a havi idősor, és minden ár/bevétel mező a listákban.
 */
const penzugyNelkul = (adat) => {
    const bevetelNelkul = (elem) => {
        const masolat = { ...elem };
        delete masolat.bevetel;
        return masolat;
    };

    const webshop = { ...adat.webshop, top: adat.webshop.top.map(bevetelNelkul) };
    delete webshop.bevetel;
    delete webshop.elozoBevetel;
    delete webshop.bevetelValtozas;
    delete webshop.atlagKosar;

    return {
        ...adat,
        bevetel: null,
        havi: null,
        eladasok: {
            idoszak: adat.bevetel.eladottDb,
            elozo: adat.bevetel.elozoEladottDb,
            valtozas: adat.bevetel.eladottValtozas,
            atlagNap: adat.bevetel.atlagNap,
        },
        markak: adat.markak.map(bevetelNelkul),
        telephelyek: adat.telephelyek.map(bevetelNelkul),
        legutobbEladott: adat.legutobbEladott.map((auto) => {
            const masolat = { ...auto };
            delete masolat.eladasi_ar;
            return masolat;
        }),
        webshop,
    };
};

// ---------- A teljes dashboard ----------

/**
 * A dashboard összes adata.
 * @param {{ idoszak?: string, most?: Date, penzugy?: boolean }} opciok
 */
const dashboardAdatok = async ({ idoszak: nyersIdoszak, most = new Date(), penzugy = false } = {}) => {
    const idoszak = idoszakFeldolgozasa(nyersIdoszak, most);

    const [autok, top, telephelyek, erdeklodesek, felhasznalok, rendelesek, alkatreszek] = await Promise.all([
        AutoModel.find().select('marka modell evjarat statusz vetel_ar eladasi_ar eladas_datum uzemanyag kivitel telephely lathato lejarat kiemelt megtekintesek telefonKattintasok kepek kep createdAt updatedAt'),
        AutoModel.find().sort({ megtekintesek: -1 }).limit(5).select('marka modell evjarat megtekintesek telefonKattintasok kepek kep createdAt'),
        TelephelyModel.find().select('nev varos').sort({ nev: 1 }),
        ErdeklodesModel.find().select('statusz createdAt'),
        FelhasznaloModel.find().select('statusz createdAt'),
        RendelesModel.find().select('statusz createdAt osszegek tetelek'),
        AlkatreszModel.find().select('lathato keszlet'),
    ]);

    const eladasok = eladasokListaja(autok);
    const { idoszakiEladasok, adatok: bevetel } = bevetelSzamitas(eladasok, idoszak);
    const szerepkorok = szamolas(felhasznalok, (f) => f.statusz);
    const ujVasarlok = felhasznalok.filter((f) => f.statusz === 'felhasznalo' && (!idoszak.tol || idoszakban(f.createdAt, idoszak.tol)));

    const adat = {
        generalva: most.toISOString(),
        idoszak,
        bevetel,
        havi: haviBevetel(eladasok, most),
        legutobbEladott: legutobbEladottak(eladasok),
        keszlet: keszletSzamitas(autok, most),
        markak: markakSzamitas(autok, idoszakiEladasok),
        telephelyek: telephelyekSzamitas(telephelyek, autok, idoszakiEladasok),
        erdeklodesek: erdeklodesSzamitas(erdeklodesek, idoszak, most),
        forgalom: {
            megtekintesek: osszeg(autok, (auto) => auto.megtekintesek || 0),
            telefonKattintasok: osszeg(autok, (auto) => auto.telefonKattintasok || 0),
        },
        top: top.map((auto) => autoValasz(auto, { admin: true })),
        felhasznalok: {
            felhasznalo: szerepkorok.felhasznalo || 0,
            admin: szerepkorok.admin || 0,
            ertekesito: szerepkorok.ertekesito || 0,
            ujak: ujVasarlok.length,
        },
        webshop: webshopSzamitas(rendelesek, alkatreszek, idoszak),
    };
    return penzugy ? adat : penzugyNelkul(adat);
};

module.exports = {
    AR_SAVOK,
    IDOSZAKOK,
    dashboardAdatok,
    penzugyNelkul,
    idoszakFeldolgozasa,
    budapestiNap,
    utolsoNapok,
    utolsoHonapok,
    idosorKitoltese,
    valtozas,
    kategoriakOsszevonasa,
    arSavokKitoltese,
};
