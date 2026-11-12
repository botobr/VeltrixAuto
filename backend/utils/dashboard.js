const AlkatreszModel = require('../models/Alkatresz');
const AutokModel = require('../models/Autok');
const ErdeklodesModel = require('../models/Erdeklodes');
const TelephelyModel = require('../models/Telephely');
const RendelesModel = require('../models/Rendeles');
const UserModel = require('../models/User');
const { autoValasz } = require('./autoSzuro');
const { ALACSONY_KESZLET } = require('./webshop');

/*
 * Az admin dashboard minden számítása itt történik; a frontend csak megjeleníti
 * az eredményt. A napi/havi idősorok is itt kapják meg a hiányzó (0 értékű)
 * napokat, budapesti idő szerint.
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

/** Árkategóriák alsó határa (Ft) és címkéje; a $bucket ugyanezeket a határokat használja. */
const AR_SAVOK = [
    [0, '5 M Ft alatt'],
    [5e6, '5–10 M Ft'],
    [1e7, '10–20 M Ft'],
    [2e7, '20–50 M Ft'],
    [5e7, '50–100 M Ft'],
    [1e8, '100–500 M Ft'],
    [5e8, '500 M Ft felett'],
];

// ---------- Tiszta segédfüggvények (tesztelhetők adatbázis nélkül) ----------

const idoszakFeldolgozasa = (nyers, most = new Date()) => {
    const kulcs = Object.hasOwn(IDOSZAKOK, nyers) ? String(nyers) : ALAP_IDOSZAK;
    const napok = IDOSZAKOK[kulcs];
    if (!napok) return { kulcs, napok: null, tol: null, elozoTol: null };
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
    const r = Object.fromEntries(napFormatum.formatToParts(datum).map((resz) => [resz.type, resz.value]));
    return `${r.year}-${r.month}-${r.day}`;
};

/** Az utolsó `db` nap kulcsa, a legrégebbivel kezdve (a mai nappal zárva). */
const utolsoNapok = (db, most = new Date()) => {
    const [ev, ho, nap] = budapestiNap(most).split('-').map(Number);
    return Array.from({ length: db }, (_, i) => new Date(Date.UTC(ev, ho - 1, nap - (db - 1 - i))).toISOString().slice(0, 10));
};

/** Az utolsó `db` hónap kulcsa ('ÉÉÉÉ-HH'), a folyó hónappal zárva. */
const utolsoHonapok = (db, most = new Date()) => {
    const [ev, ho] = budapestiNap(most).split('-').map(Number);
    return Array.from({ length: db }, (_, i) => new Date(Date.UTC(ev, ho - 1 - (db - 1 - i), 1)).toISOString().slice(0, 7));
};

/** Idősor a megadott kulcsokra; a hiányzó kulcsok minden mezője 0. */
const idosorKitoltese = (kulcsok, lista, mezok) => {
    const ertekek = new Map(lista.map((elem) => [elem._id, elem]));
    return kulcsok.map((kulcs) => ({
        kulcs,
        ...Object.fromEntries(mezok.map((mezo) => [mezo, ertekek.get(kulcs)?.[mezo] || 0])),
    }));
};

/** Százalékos változás az előző időszakhoz képest; null, ha nincs mihez viszonyítani. */
const valtozas = (jelenlegi, elozo) => {
    if (elozo === null || elozo === undefined || elozo === 0) return null;
    return Math.round(((jelenlegi - elozo) / elozo) * 1000) / 10;
};

/** Az első `max - 1` elem marad, a többi „Egyéb” néven összevonva (csökkenő sorrendben). */
const kategoriakOsszevonasa = (lista, max = MAX_KATEGORIA) => {
    const rendezett = lista
        .map((elem) => ({ nev: elem._id || 'Nincs megadva', db: elem.db }))
        .sort((a, b) => b.db - a.db || a.nev.localeCompare(b.nev, 'hu'));
    if (rendezett.length <= max) return rendezett;
    const egyeb = rendezett.slice(max - 1).reduce((osszeg, elem) => osszeg + elem.db, 0);
    return [...rendezett.slice(0, max - 1), { nev: 'Egyéb', db: egyeb }];
};

const arSavokKitoltese = (lista) => {
    const db = new Map(lista.map((elem) => [elem._id, elem.db]));
    return AR_SAVOK.map(([tol, nev]) => ({ nev, tol, db: db.get(tol) || 0 }));
};

const szamlalo = (lista) => Object.fromEntries(lista.map((elem) => [elem._id, elem.db]));
const kerekit = (ertek, tizedes = 0) => (ertek === null || ertek === undefined ? null : Math.round(ertek * 10 ** tizedes) / 10 ** tizedes);

// ---------- Aggregációs részek ----------

const datumE = (mezo) => ({ $eq: [{ $type: mezo }, 'date'] });
const napokbanKozte = (kesobbi, korabbi) => ({
    $cond: [{ $and: [datumE(korabbi), datumE(kesobbi)] }, { $max: [0, { $divide: [{ $subtract: [kesobbi, korabbi] }, NAP_MS] }] }, null],
});

/** Eladott autók: régi, dátum/ár nélküli rekordnál az utolsó módosítás és a vételár a becslés. */
const eladasiMezok = {
    $addFields: {
        _datum: { $ifNull: ['$eladas_datum', '$updatedAt'] },
        _ar: { $ifNull: ['$eladasi_ar', '$vetel_ar'] },
    },
};
const bevetelCsoport = { _id: null, bevetel: { $sum: '$_ar' }, db: { $sum: 1 } };
const datumSzuro = (tol, ig) => ({ $match: { _datum: ig ? { $gte: tol, $lt: ig } : { $gte: tol } } });

const eladasokLekerdezese = ({ tol, elozoTol }, most) => {
    const idoszakban = (lepesek) => (tol ? [datumSzuro(tol), ...lepesek] : lepesek);
    const facet = {
        osszes: [{ $group: bevetelCsoport }],
        idoszak: idoszakban([{
            $group: {
                ...bevetelCsoport,
                atlagAr: { $avg: '$_ar' },
                atlagNap: { $avg: napokbanKozte('$_datum', '$createdAt') },
                atlagEngedmeny: {
                    $avg: { $cond: [{ $gt: ['$vetel_ar', 0] }, { $divide: [{ $subtract: ['$vetel_ar', '$_ar'] }, '$vetel_ar'] }, null] },
                },
            },
        }]),
        havi: [
            datumSzuro(new Date(most.getTime() - 370 * NAP_MS)),
            { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$_datum', timezone: IDOZONA } }, bevetel: { $sum: '$_ar' }, db: { $sum: 1 } } },
        ],
        markak: idoszakban([{ $group: { _id: '$marka', db: { $sum: 1 }, bevetel: { $sum: '$_ar' } } }]),
        telephelyek: idoszakban([{ $group: { _id: '$telephely', db: { $sum: 1 }, bevetel: { $sum: '$_ar' } } }]),
        legutobb: [
            { $sort: { _datum: -1, _id: -1 } },
            { $limit: 6 },
            { $project: { marka: 1, modell: 1, evjarat: 1, vetel_ar: 1, kepek: 1, kep: 1, createdAt: 1, _datum: 1, _ar: 1 } },
        ],
    };
    if (tol) facet.elozo = [datumSzuro(elozoTol, tol), { $group: bevetelCsoport }];

    return AutokModel.aggregate([{ $match: { statusz: 'elkelt' } }, eladasiMezok, { $facet: facet }]);
};

const keszletLekerdezese = (most) => {
    const regiHatar = new Date(most.getTime() - REGI_KESZLET_NAP * NAP_MS);
    return AutokModel.aggregate([
        { $match: { statusz: { $ne: 'elkelt' } } },
        {
            $facet: {
                osszes: [{
                    $group: {
                        _id: null,
                        db: { $sum: 1 },
                        ertek: { $sum: '$vetel_ar' },
                        atlagAr: { $avg: '$vetel_ar' },
                        atlagNap: { $avg: napokbanKozte(most, '$createdAt') },
                        regi: { $sum: { $cond: [{ $and: [datumE('$createdAt'), { $lte: ['$createdAt', regiHatar] }] }, 1, 0] } },
                    },
                }],
                markak: [{ $group: { _id: '$marka', db: { $sum: 1 }, ertek: { $sum: '$vetel_ar' } } }],
                uzemanyag: [{ $group: { _id: '$uzemanyag', db: { $sum: 1 } } }],
                kivitel: [{ $group: { _id: '$kivitel', db: { $sum: 1 } } }],
                arSavok: [{
                    $bucket: {
                        groupBy: '$vetel_ar',
                        boundaries: AR_SAVOK.map(([tol]) => tol),
                        default: AR_SAVOK.at(-1)[0],
                        output: { db: { $sum: 1 } },
                    },
                }],
                telephelyek: [{ $group: { _id: '$telephely', db: { $sum: 1 }, ertek: { $sum: '$vetel_ar' } } }],
            },
        },
    ]);
};

/** Webshop: rendelések és bevétel az időszakban (lemondott nélkül), teendők, készletjelzések, toplista. */
const webshopLekerdezese = async ({ tol, elozoTol }) => {
    const ervenyes = { statusz: { $ne: 'lemondva' } };
    const idoszakban = tol ? { ...ervenyes, createdAt: { $gte: tol } } : ervenyes;
    const osszesito = (szuro) => RendelesModel.aggregate([
        { $match: szuro },
        { $group: { _id: null, db: { $sum: 1 }, bevetel: { $sum: '$osszegek.vegosszeg' } } },
    ]);
    const [[most], elozo, nyitott, fizetesreVar, termekek, alacsony, elfogyott, top] = await Promise.all([
        osszesito(idoszakban),
        tol ? osszesito({ ...ervenyes, createdAt: { $gte: elozoTol, $lt: tol } }) : null,
        RendelesModel.countDocuments({ statusz: { $in: ['uj', 'feldolgozas'] } }),
        RendelesModel.countDocuments({ statusz: 'fizetesre_var' }),
        AlkatreszModel.countDocuments({ lathato: true }),
        AlkatreszModel.countDocuments({ lathato: true, keszlet: { $gt: 0, $lte: ALACSONY_KESZLET } }),
        AlkatreszModel.countDocuments({ lathato: true, keszlet: 0 }),
        RendelesModel.aggregate([
            { $match: idoszakban },
            { $unwind: '$tetelek' },
            {
                $group: {
                    _id: '$tetelek.alkatresz',
                    nev: { $last: '$tetelek.nev' },
                    cikkszam: { $last: '$tetelek.cikkszam' },
                    db: { $sum: '$tetelek.mennyiseg' },
                    bevetel: { $sum: { $multiply: ['$tetelek.egysegar', '$tetelek.mennyiseg'] } },
                },
            },
            { $sort: { db: -1, bevetel: -1 } },
            { $limit: 5 },
        ]),
    ]);
    const jelen = most || { db: 0, bevetel: 0 };
    const elozoOsszeg = tol ? (elozo[0] || { db: 0, bevetel: 0 }) : null;
    return {
        rendelesek: jelen.db,
        elozoRendelesek: elozoOsszeg?.db ?? null,
        rendelesValtozas: valtozas(jelen.db, elozoOsszeg?.db),
        bevetel: jelen.bevetel,
        elozoBevetel: elozoOsszeg?.bevetel ?? null,
        bevetelValtozas: valtozas(jelen.bevetel, elozoOsszeg?.bevetel),
        atlagKosar: jelen.db ? Math.round(jelen.bevetel / jelen.db) : null,
        teendo: nyitott,
        fizetesreVar,
        termekek,
        alacsonyKeszlet: alacsony,
        alacsonyKeszletHatar: ALACSONY_KESZLET,
        elfogyott,
        top: top.map((t) => ({ id: String(t._id), nev: t.nev, cikkszam: t.cikkszam, db: t.db, bevetel: t.bevetel })),
    };
};

// ---------- Összeállítás ----------

const markakOsszefesulese = (keszlet, eladas) => {
    const markak = new Map();
    const marka = (nev) => {
        if (!markak.has(nev)) markak.set(nev, { marka: nev, keszletDb: 0, keszletErtek: 0, eladottDb: 0, bevetel: 0 });
        return markak.get(nev);
    };
    for (const elem of keszlet) Object.assign(marka(elem._id), { keszletDb: elem.db, keszletErtek: elem.ertek });
    for (const elem of eladas) Object.assign(marka(elem._id), { eladottDb: elem.db, bevetel: elem.bevetel });
    return [...markak.values()]
        .sort((a, b) => b.bevetel - a.bevetel || b.keszletDb - a.keszletDb || String(a.marka).localeCompare(String(b.marka), 'hu'))
        .slice(0, MAX_MARKA);
};

const telephelyekOsszefesulese = (telephelyek, keszlet, eladas) => {
    const sorok = new Map(telephelyek.map((t) => [String(t._id), { id: String(t._id), nev: t.nev, varos: t.varos, keszletDb: 0, keszletErtek: 0, eladottDb: 0, bevetel: 0 }]));
    const sor = (id) => {
        const kulcs = id ? String(id) : 'nincs';
        if (!sorok.has(kulcs)) sorok.set(kulcs, { id: kulcs, nev: 'Telephely nélkül', varos: '', keszletDb: 0, keszletErtek: 0, eladottDb: 0, bevetel: 0 });
        return sorok.get(kulcs);
    };
    for (const elem of keszlet) Object.assign(sor(elem._id), { keszletDb: elem.db, keszletErtek: elem.ertek });
    for (const elem of eladas) Object.assign(sor(elem._id), { eladottDb: elem.db, bevetel: elem.bevetel });
    return [...sorok.values()]
        .filter((elem) => elem.keszletDb || elem.eladottDb || elem.id !== 'nincs')
        .sort((a, b) => b.bevetel - a.bevetel || b.keszletDb - a.keszletDb || a.nev.localeCompare(b.nev, 'hu'));
};

/**
 * Pénzügyi jog nélkül (értékesítő) a bevételi adatok ki sem kerülnek a válaszból:
 * a bevétel-blokk, a havi idősor, és minden ár/bevétel mező a listákban.
 */
const penzugyNelkul = (adat) => {
    const { bevetel, havi, ...tobbi } = adat;
    return {
        ...tobbi,
        bevetel: null,
        havi: null,
        eladasok: { idoszak: bevetel.eladottDb, elozo: bevetel.elozoEladottDb, valtozas: bevetel.eladottValtozas, atlagNap: bevetel.atlagNap },
        markak: adat.markak.map(({ bevetel: _b, ...marka }) => marka),
        telephelyek: adat.telephelyek.map(({ bevetel: _b, ...telephely }) => telephely),
        legutobbEladott: adat.legutobbEladott.map(({ eladasi_ar: _a, ...auto }) => auto),
        webshop: (({ bevetel: _b, elozoBevetel: _e, bevetelValtozas: _v, atlagKosar: _k, top, ...webshop }) => ({
            ...webshop,
            top: top.map(({ bevetel: _tb, ...termek }) => termek),
        }))(adat.webshop),
    };
};

/**
 * A teljes dashboard-adatcsomag.
 * @param {{ idoszak?: string, most?: Date, penzugy?: boolean }} opciok
 */
const dashboardAdatok = async ({ idoszak: nyersIdoszak, most = new Date(), penzugy = false } = {}) => {
    const idoszak = idoszakFeldolgozasa(nyersIdoszak, most);
    const { tol, elozoTol } = idoszak;
    const napiTol = new Date(most.getTime() - (NAPI_NAPOK + 1) * NAP_MS);

    const [
        [eladas], [keszlet], statuszok, rejtett, lejart, kiemelt, forgalom, top, telephelyek,
        erdeklodesStatusz, erdeklodesIdoszak, erdeklodesElozo, erdeklodesNapi,
        felhasznalok, ujFelhasznalok, webshop,
    ] = await Promise.all([
        eladasokLekerdezese(idoszak, most),
        keszletLekerdezese(most),
        AutokModel.aggregate([{ $group: { _id: '$statusz', db: { $sum: 1 } } }]),
        AutokModel.countDocuments({ lathato: false, statusz: { $ne: 'elkelt' } }),
        AutokModel.countDocuments({ lejarat: { $lte: most }, statusz: { $ne: 'elkelt' } }),
        AutokModel.countDocuments({ kiemelt: true, statusz: { $ne: 'elkelt' } }),
        AutokModel.aggregate([{ $group: { _id: null, megtekintesek: { $sum: '$megtekintesek' }, telefonKattintasok: { $sum: '$telefonKattintasok' } } }]),
        AutokModel.find().sort({ megtekintesek: -1 }).limit(5).select('marka modell evjarat megtekintesek telefonKattintasok kepek kep createdAt'),
        TelephelyModel.find().select('nev varos').sort({ nev: 1 }),
        ErdeklodesModel.aggregate([{ $group: { _id: '$statusz', db: { $sum: 1 } } }]),
        ErdeklodesModel.countDocuments(tol ? { createdAt: { $gte: tol } } : {}),
        tol ? ErdeklodesModel.countDocuments({ createdAt: { $gte: elozoTol, $lt: tol } }) : null,
        ErdeklodesModel.aggregate([
            { $match: { createdAt: { $gte: napiTol } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: IDOZONA } }, db: { $sum: 1 } } },
        ]),
        UserModel.aggregate([{ $group: { _id: '$statusz', db: { $sum: 1 } } }]),
        UserModel.countDocuments({ statusz: 'felhasznalo', ...(tol ? { createdAt: { $gte: tol } } : {}) }),
        webshopLekerdezese(idoszak),
    ]);

    const osszesEladas = eladas.osszes[0] || { bevetel: 0, db: 0 };
    const idoszakEladas = eladas.idoszak[0] || { bevetel: 0, db: 0, atlagAr: null, atlagNap: null, atlagEngedmeny: null };
    const elozoEladas = tol ? (eladas.elozo[0] || { bevetel: 0, db: 0 }) : null;
    const keszletOsszes = keszlet.osszes[0] || { db: 0, ertek: 0, atlagAr: null, atlagNap: null, regi: 0 };
    const statusz = szamlalo(statuszok);
    const erdeklodes = szamlalo(erdeklodesStatusz);
    const szerepkorok = szamlalo(felhasznalok);

    const adat = {
        generalva: most.toISOString(),
        idoszak,
        bevetel: {
            idoszak: idoszakEladas.bevetel,
            elozo: elozoEladas?.bevetel ?? null,
            valtozas: valtozas(idoszakEladas.bevetel, elozoEladas?.bevetel),
            eladottDb: idoszakEladas.db,
            elozoEladottDb: elozoEladas?.db ?? null,
            eladottValtozas: valtozas(idoszakEladas.db, elozoEladas?.db),
            atlagAr: kerekit(idoszakEladas.atlagAr),
            atlagNap: kerekit(idoszakEladas.atlagNap),
            atlagEngedmeny: kerekit(idoszakEladas.atlagEngedmeny, 4),
            osszes: osszesEladas.bevetel,
            osszesEladott: osszesEladas.db,
        },
        havi: idosorKitoltese(utolsoHonapok(HAVI_HONAPOK, most), eladas.havi, ['bevetel', 'db']),
        legutobbEladott: eladas.legutobb.map(({ _datum, _ar, ...auto }) => ({
            ...autoValasz(auto, { admin: true, penzugy: true }),
            eladas_datum: _datum,
            eladasi_ar: _ar,
        })),
        keszlet: {
            db: keszletOsszes.db,
            ertek: keszletOsszes.ertek,
            atlagAr: kerekit(keszletOsszes.atlagAr),
            atlagNap: kerekit(keszletOsszes.atlagNap),
            regi: keszletOsszes.regi,
            regiHatarNap: REGI_KESZLET_NAP,
            statuszok: { elerheto: statusz.elerheto || 0, foglalt: statusz.foglalt || 0, elkelt: statusz.elkelt || 0 },
            rejtett,
            lejart,
            kiemelt,
            uzemanyag: kategoriakOsszevonasa(keszlet.uzemanyag),
            kivitel: kategoriakOsszevonasa(keszlet.kivitel),
            arSavok: arSavokKitoltese(keszlet.arSavok),
        },
        markak: markakOsszefesulese(keszlet.markak, eladas.markak),
        telephelyek: telephelyekOsszefesulese(telephelyek, keszlet.telephelyek, eladas.telephelyek),
        erdeklodesek: {
            uj: erdeklodes.uj || 0,
            folyamatban: erdeklodes.folyamatban || 0,
            lezart: erdeklodes.lezart || 0,
            idoszak: erdeklodesIdoszak,
            elozo: erdeklodesElozo,
            valtozas: valtozas(erdeklodesIdoszak, erdeklodesElozo),
            napi: idosorKitoltese(utolsoNapok(NAPI_NAPOK, most), erdeklodesNapi, ['db']),
        },
        forgalom: {
            megtekintesek: forgalom[0]?.megtekintesek || 0,
            telefonKattintasok: forgalom[0]?.telefonKattintasok || 0,
        },
        top: top.map((auto) => autoValasz(auto, { admin: true })),
        felhasznalok: {
            felhasznalo: szerepkorok.felhasznalo || 0,
            admin: szerepkorok.admin || 0,
            ertekesito: szerepkorok.ertekesito || 0,
            ujak: ujFelhasznalok,
        },
        webshop,
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
