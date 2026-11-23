const crypto = require('node:crypto');
const express = require('express');
const mongoose = require('mongoose');
const AlkatreszModel = require('../models/Alkatresz');
const RendelesModel = require('../models/Rendeles');
const TelephelyModel = require('../models/Telephely');
const FelhasznaloModel = require('../models/Felhasznalo');
const { bejelentkezesSzukseges, jogSzukseges } = require('../middlewares/authMiddleware');
const { emailKuldes, oldalUrl } = require('../utils/email');
const fizetes = require('../utils/fizetes');
const korlatozo = require('../utils/rateLimit');
const { alkatreszSlug } = require('../utils/slug');
const {
    FIZETESI_MODOK, RENDELES_STATUSZOK, SZALLITASI_MODOK, fizetesiModok, kosarTetelek, rendelesSzamitas,
} = require('../utils/webshop');

const router = express.Router();

const kosarLimit = korlatozo({ ablakMs: 10 * 60 * 1000, max: 200 });
const rendelesLimit = korlatozo({ ablakMs: 10 * 60 * 1000, max: 10, uzenet: 'Túl sok rendelési kísérlet. Próbáld újra később, vagy hívj minket.' });

const EMAIL_MINTA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEFON_MINTA = /^[+\d][\d\s()/-]{5,}$/;
const IRANYITOSZAM_MINTA = /^\d{4}$/;
const ADOSZAM_MINTA = /^\d{8}-\d-\d{2}$/;

const szamFormatum = new Intl.NumberFormat('hu-HU');

// pl. 12 990 Ft
const ft = (ertek) => szamFormatum.format(ertek) + ' Ft';

// szöveg levágva, ha nem szöveg akkor ''
const szoveg = (ertek, max) => {
    if (typeof ertek !== 'string') {
        return '';
    }
    return ertek.trim().slice(0, max);
};

// ---------- Segédfüggvények ----------

// A kosár termékeit betöltjük az adatbázisból (a friss árakkal).
// Ami már nem elérhető, az a hianyzo listába kerül.
const kosarBetoltese = async (nyersTetelek) => {
    const kosar = kosarTetelek(nyersTetelek);
    const idk = kosar.map((tetel) => tetel.id);
    const alkatreszek = await AlkatreszModel.find({ _id: { $in: idk }, lathato: true });

    const tetelek = [];
    const hianyzo = [];
    for (const tetel of kosar) {
        const alkatresz = alkatreszek.find((elem) => String(elem._id) === tetel.id);
        if (alkatresz) {
            tetelek.push({ alkatresz: alkatresz, mennyiseg: tetel.mennyiseg });
        } else {
            hianyzo.push(tetel.id);
        }
    }
    return { tetelek, hianyzo };
};

// Szállítási módok a díjjal. Személyes átvétel csak akkor van, ha van telephely.
const szallitasiModok = (termekekOsszege, telephelyVan) => {
    const modok = [];
    for (const kulcs in SZALLITASI_MODOK) {
        const mod = SZALLITASI_MODOK[kulcs];
        if (kulcs === 'szemelyes' && !telephelyVan) {
            continue;
        }

        let dij = mod.dij;
        if (mod.ingyenesHatar !== null && termekekOsszege >= mod.ingyenesHatar) {
            dij = 0;
        }

        modok.push({
            kulcs: kulcs,
            nev: mod.nev,
            dij: dij,
            ingyenesHatar: mod.ingyenesHatar,
            cimKell: mod.cimKell,
        });
    }
    return modok;
};

// Lemondáskor visszaadjuk a készletet, de csak egyszer!
// Az updateOne-nal jelöljük meg, így ha kétszer hívják, másodszorra már nem csinál semmit.
const keszletVisszaadasa = async (rendeles) => {
    const jelolve = await RendelesModel.updateOne(
        { _id: rendeles._id, keszletVisszaadva: false },
        { $set: { keszletVisszaadva: true } },
    );
    if (jelolve.modifiedCount === 0) {
        return;
    }

    for (const tetel of rendeles.tetelek) {
        await AlkatreszModel.updateOne(
            { _id: tetel.alkatresz },
            { $inc: { keszlet: tetel.mennyiseg, eladottDb: -tetel.mennyiseg } },
        );
    }
    rendeles.keszletVisszaadva = true;
};

// esemény hozzáadása a rendelés történetéhez
const esemeny = (rendeles, statusz, megjegyzes = '') => {
    rendeles.esemenyek.push({ statusz: statusz, idopont: new Date(), megjegyzes: megjegyzes });
};

const lemondas = async (rendeles, megjegyzes) => {
    rendeles.statusz = 'lemondva';
    esemeny(rendeles, 'lemondva', megjegyzes);
    await rendeles.save();
    await keszletVisszaadasa(rendeles);
};

const rendelesLink = (rendeles, kulcs) => {
    return oldalUrl() + '/rendeles/' + encodeURIComponent(rendeles.rendelesSzam) + '?kulcs=' + kulcs;
};

// a rendelés tételei szövegként az e-mailekhez
const tetelekSzoveg = (rendeles) => {
    const sorok = [];
    for (const tetel of rendeles.tetelek) {
        sorok.push('  ' + tetel.mennyiseg + ' × ' + tetel.nev + ' (' + tetel.cikkszam + ') – ' + ft(tetel.egysegar * tetel.mennyiseg));
    }
    sorok.push('  Szállítás: ' + ft(rendeles.osszegek.szallitas));
    if (rendeles.osszegek.kezelesiDij) {
        sorok.push('  Kezelési díj: ' + ft(rendeles.osszegek.kezelesiDij));
    }
    sorok.push('  Végösszeg: ' + ft(rendeles.osszegek.vegosszeg));
    return sorok.join('\n');
};

const atutalasiInfo = (rendeles) => {
    if (!process.env.BANKSZAMLASZAM) {
        return 'Az utalási adatokat külön e-mailben küldjük el.';
    }
    let szamla = process.env.BANKSZAMLASZAM;
    if (process.env.BANKSZAMLA_KEDVEZMENYEZETT) {
        szamla = szamla + ' (' + process.env.BANKSZAMLA_KEDVEZMENYEZETT + ')';
    }
    return 'Kérjük, utald át a végösszeget: ' + szamla + ', közlemény: ' + rendeles.rendelesSzam;
};

// e-mail a vevőnek
const vevoErtesites = (rendeles, kulcs, targy, bevezeto) => {
    const sorok = [
        'Kedves ' + rendeles.vevo.nev + '!',
        '',
        bevezeto,
        '',
        tetelekSzoveg(rendeles),
        '',
        'Szállítás: ' + SZALLITASI_MODOK[rendeles.szallitas.mod].nev,
        'Fizetés: ' + FIZETESI_MODOK[rendeles.fizetes.mod].nev,
    ];
    // átutalásnál beleírjuk az utalási adatokat is
    if (rendeles.fizetes.mod === 'atutalas' && rendeles.fizetes.statusz === 'fuggo') {
        sorok.push('');
        sorok.push(atutalasiInfo(rendeles));
    }
    sorok.push('');
    sorok.push('A rendelésed állapota: ' + rendelesLink(rendeles, kulcs));

    return emailKuldes({
        cimzett: rendeles.vevo.email,
        targy: targy + ' – ' + rendeles.rendelesSzam,
        szoveg: sorok.join('\n'),
    });
};

// e-mail a boltnak az új rendelésről (az ERTESITESI_EMAIL címekre, vagy az adminoknak)
const boltErtesites = async (rendeles) => {
    let cimzettek = [];
    if (process.env.ERTESITESI_EMAIL) {
        cimzettek = process.env.ERTESITESI_EMAIL.split(',').map((cim) => cim.trim());
    } else {
        const adminok = await FelhasznaloModel.find({ statusz: 'admin' }).select('email');
        cimzettek = adminok.map((admin) => admin.email);
    }

    let megjegyzes = '';
    if (rendeles.vevoMegjegyzes) {
        megjegyzes = 'Megjegyzés: ' + rendeles.vevoMegjegyzes;
    }

    const sorok = [
        'Vevő: ' + rendeles.vevo.nev + ', ' + rendeles.vevo.email + ', ' + rendeles.vevo.telefon,
        '',
        tetelekSzoveg(rendeles),
        '',
        'Szállítás: ' + SZALLITASI_MODOK[rendeles.szallitas.mod].nev + ' · Fizetés: ' + FIZETESI_MODOK[rendeles.fizetes.mod].nev,
        megjegyzes,
        '',
        'Kezelés: ' + oldalUrl() + '/admin?lap=rendelesek',
    ];

    return emailKuldes({
        cimzett: cimzettek,
        valaszCim: rendeles.vevo.email,
        targy: 'Új webshop rendelés: ' + rendeles.rendelesSzam + ' (' + ft(rendeles.osszegek.vegosszeg) + ')',
        szoveg: sorok.join('\n'),
    });
};

// A rendelés adatai a frontendnek. A vevő nem látja a belső megjegyzést és a kulcsot.
const rendelesValasz = (rendeles, { belso = false } = {}) => {
    let adat;
    if (rendeles.toObject) {
        adat = rendeles.toObject();
    } else {
        adat = { ...rendeles };
    }

    delete adat.hozzaferesKulcs;
    delete adat.__v;
    if (!belso) {
        delete adat.belsoMegjegyzes;
        delete adat.keszletVisszaadva;
        if (adat.fizetes) {
            delete adat.fizetes.munkamenetId;
        }
    }

    adat.statuszNev = RENDELES_STATUSZOK[adat.statusz];
    if (adat.szallitas && SZALLITASI_MODOK[adat.szallitas.mod]) {
        adat.szallitasNev = SZALLITASI_MODOK[adat.szallitas.mod].nev;
    }
    if (adat.fizetes && FIZETESI_MODOK[adat.fizetes.mod]) {
        adat.fizetesNev = FIZETESI_MODOK[adat.fizetes.mod].nev;
    }

    // a tételekhez link is kell a termék oldalára
    const tetelek = [];
    for (const tetel of adat.tetelek || []) {
        tetelek.push({ ...tetel, slug: alkatreszSlug({ _id: tetel.alkatresz, nev: tetel.nev }) });
    }
    adat.tetelek = tetelek;

    const fizetesMod = adat.fizetes ? adat.fizetes.mod : null;
    const fizetesStatusz = adat.fizetes ? adat.fizetes.statusz : null;

    // átutalásnál kiírjuk az utalási adatokat
    if (fizetesMod === 'atutalas' && fizetesStatusz === 'fuggo' && adat.statusz !== 'lemondva') {
        if (process.env.BANKSZAMLASZAM) {
            adat.atutalas = {
                szamlaszam: process.env.BANKSZAMLASZAM,
                kedvezmenyezett: process.env.BANKSZAMLA_KEDVEZMENYEZETT || '',
                kozlemeny: adat.rendelesSzam,
            };
        } else {
            adat.atutalas = null;
        }
    }

    // ha a kártyás fizetés megszakadt, újra lehet próbálni
    adat.ujraFizetheto = !belso && fizetesMod === 'kartya' && adat.statusz === 'fizetesre_var' && fizetes.kartyaElerheto();
    return adat;
};

// ---------- Kosár ----------

// A kosár ellenőrzése: friss árak, készlet, szállítási és fizetési módok, végösszeg.
router.post('/kosar', kosarLimit, async (req, res) => {
    const adatok = req.body || {};
    const { tetelek, hianyzo } = await kosarBetoltese(adatok.tetelek);

    let szallitasiMod = null;
    if (Object.hasOwn(SZALLITASI_MODOK, adatok.szallitasiMod)) {
        szallitasiMod = adatok.szallitasiMod;
    }

    // a fizetési mód csak akkor jó, ha a szállítási módhoz választható
    const valaszthatoFizetes = fizetesiModok(szallitasiMod, { kartyaElerheto: fizetes.kartyaElerheto() });
    let fizetesiMod = null;
    for (const mod of valaszthatoFizetes) {
        if (mod.kulcs === adatok.fizetesiMod) {
            fizetesiMod = mod.kulcs;
        }
    }

    const { sorok, osszegek } = rendelesSzamitas({ tetelek, szallitasiMod, fizetesiMod });
    const telephelyek = await TelephelyModel.find().select('nev varos cim iranyitoszam').sort({ nev: 1 });

    const valaszSorok = [];
    let rendelheto = sorok.length > 0;
    for (const sor of sorok) {
        const alkatresz = sor.alkatresz;

        let hiba = null;
        if (alkatresz.keszlet === 0) {
            hiba = 'Elfogyott';
        } else if (sor.mennyiseg > alkatresz.keszlet) {
            hiba = 'Csak ' + alkatresz.keszlet + ' db van készleten';
        }
        if (hiba) {
            rendelheto = false;
        }

        let kep = null;
        if (alkatresz.kepek.length > 0) {
            kep = alkatresz.kepek[0].url;
        }

        valaszSorok.push({
            id: String(alkatresz._id),
            slug: alkatreszSlug(alkatresz),
            nev: alkatresz.nev,
            gyarto: alkatresz.gyarto,
            cikkszam: alkatresz.cikkszam,
            kep: kep,
            ar: alkatresz.ar,
            egysegar: sor.egysegar,
            keszlet: alkatresz.keszlet,
            mennyiseg: sor.mennyiseg,
            sorosszeg: sor.sorosszeg,
            hiba: hiba,
        });
    }

    return res.status(200).json({
        tetelek: valaszSorok,
        hianyzo: hianyzo,
        osszegek: osszegek,
        szallitasiModok: szallitasiModok(osszegek.termekek, telephelyek.length > 0),
        fizetesiModok: valaszthatoFizetes,
        telephelyek: telephelyek,
        rendelheto: rendelheto,
    });
});

// ---------- Rendelés leadása ----------

// szállítási vagy számlázási cím ellenőrzése
const cimEllenorzese = (nyers, hibak, cimke, { nevKell = false } = {}) => {
    const adat = nyers || {};
    const cim = {
        nev: szoveg(adat.nev, 120),
        adoszam: szoveg(adat.adoszam, 20),
        iranyitoszam: szoveg(adat.iranyitoszam, 10),
        varos: szoveg(adat.varos, 60),
        cim: szoveg(adat.cim, 160),
    };

    if (nevKell && cim.nev.length < 2) {
        hibak.push(cimke + ': add meg a nevet.');
    }
    if (!IRANYITOSZAM_MINTA.test(cim.iranyitoszam)) {
        hibak.push(cimke + ': érvénytelen irányítószám.');
    }
    if (cim.varos.length < 2) {
        hibak.push(cimke + ': add meg a települést.');
    }
    if (cim.cim.length < 3) {
        hibak.push(cimke + ': add meg az utcát és a házszámot.');
    }
    if (cim.adoszam && !ADOSZAM_MINTA.test(cim.adoszam)) {
        hibak.push(cimke + ': az adószám formátuma 12345678-1-12.');
    }
    return cim;
};

// a már lefoglalt készlet visszaadása, ha valami hiba volt a rendelés közben
const foglalasVisszavonasa = async (lefoglalt) => {
    for (const tetel of lefoglalt) {
        await AlkatreszModel.updateOne(
            { _id: tetel.alkatresz._id },
            { $inc: { keszlet: tetel.mennyiseg, eladottDb: -tetel.mennyiseg } },
        );
    }
};

// rendelés leadása
router.post('/rendelesek', rendelesLimit, async (req, res) => {
    const adatok = req.body || {};
    const hibak = [];

    // vevő adatai
    const vevoAdat = adatok.vevo || {};
    const vevo = {
        nev: szoveg(vevoAdat.nev, 120),
        email: szoveg(vevoAdat.email, 120).toLowerCase(),
        telefon: szoveg(vevoAdat.telefon, 40),
    };
    if (vevo.nev.length < 2) {
        hibak.push('Add meg a neved.');
    }
    if (!EMAIL_MINTA.test(vevo.email)) {
        hibak.push('Érvényes e-mail-címet adj meg.');
    }
    if (!TELEFON_MINTA.test(vevo.telefon)) {
        hibak.push('Érvényes telefonszámot adj meg.');
    }

    // szállítás és fizetés
    let szallitasiMod = null;
    if (Object.hasOwn(SZALLITASI_MODOK, adatok.szallitasiMod)) {
        szallitasiMod = adatok.szallitasiMod;
    } else {
        hibak.push('Válassz szállítási módot.');
    }

    let fizetesiMod = null;
    const valaszthatoFizetes = fizetesiModok(szallitasiMod, { kartyaElerheto: fizetes.kartyaElerheto() });
    for (const mod of valaszthatoFizetes) {
        if (mod.kulcs === adatok.fizetesiMod) {
            fizetesiMod = mod.kulcs;
        }
    }
    if (szallitasiMod && !fizetesiMod) {
        hibak.push('Válassz a szállítási módhoz illő fizetési módot.');
    }

    let szallitasiCim = null;
    let telephely = null;
    if (szallitasiMod === 'futar') {
        szallitasiCim = cimEllenorzese(adatok.szallitasiCim, hibak, 'Szállítási cím');
    }
    if (szallitasiMod === 'szemelyes') {
        if (mongoose.Types.ObjectId.isValid(adatok.telephely)) {
            telephely = await TelephelyModel.findById(adatok.telephely).select('_id');
        }
        if (!telephely) {
            hibak.push('Válaszd ki az átvételi telephelyet.');
        }
    }

    const szamlazasiCim = cimEllenorzese(adatok.szamlazasiCim, hibak, 'Számlázási cím', { nevKell: true });

    if (adatok.aszf !== true) {
        hibak.push('A rendeléshez el kell fogadnod az ÁSZF-et és az adatkezelési tájékoztatót.');
    }

    const { tetelek, hianyzo } = await kosarBetoltese(adatok.tetelek);
    if (hianyzo.length > 0) {
        hibak.push('A kosárban van olyan termék, amely már nem elérhető. Frissítsd a kosarat.');
    } else if (tetelek.length === 0) {
        hibak.push('A kosár üres.');
    }

    if (hibak.length > 0) {
        return res.status(400).json({ hiba: hibak[0], hibak: hibak });
    }

    // Készlet lefoglalása termékenként.
    // Az updateOne csak akkor csökkenti a készletet, ha van elég (így két vevő nem veheti meg ugyanazt).
    // Ha valamelyik nem sikerül, az eddig lefoglaltakat visszaadjuk.
    const lefoglalt = [];
    for (const tetel of tetelek) {
        const eredmeny = await AlkatreszModel.updateOne(
            { _id: tetel.alkatresz._id, lathato: true, keszlet: { $gte: tetel.mennyiseg } },
            { $inc: { keszlet: -tetel.mennyiseg, eladottDb: tetel.mennyiseg } },
        );

        if (eredmeny.modifiedCount === 0) {
            await foglalasVisszavonasa(lefoglalt);
            const friss = await AlkatreszModel.findById(tetel.alkatresz._id).select('keszlet nev');
            let uzenet = 'elfogyott';
            if (friss && friss.keszlet) {
                uzenet = 'csak ' + friss.keszlet + ' db van készleten';
            }
            return res.status(409).json({ hiba: tetel.alkatresz.nev + ': ' + uzenet + '. Frissítsd a kosarat.' });
        }
        lefoglalt.push(tetel);
    }

    const { sorok, osszegek } = rendelesSzamitas({ tetelek, szallitasiMod, fizetesiMod });
    // ezzel a kulccsal tudja a vevő bejelentkezés nélkül megnézni a rendelést
    const hozzaferesKulcs = crypto.randomBytes(24).toString('hex');
    const onlineFizetes = FIZETESI_MODOK[fizetesiMod].online;

    // ha előre kell fizetni, akkor először "fizetésre vár" a státusz
    let statusz = 'uj';
    if (onlineFizetes || fizetesiMod === 'atutalas') {
        statusz = 'fizetesre_var';
    }

    const rendelesTetelek = [];
    for (const sor of sorok) {
        let kep = null;
        if (sor.alkatresz.kepek.length > 0) {
            kep = sor.alkatresz.kepek[0].url;
        }
        rendelesTetelek.push({
            alkatresz: sor.alkatresz._id,
            nev: sor.alkatresz.nev,
            cikkszam: sor.alkatresz.cikkszam,
            kep: kep,
            egysegar: sor.egysegar,
            mennyiseg: sor.mennyiseg,
        });
    }

    let felhasznaloId = null;
    if (req.session && req.session.userId) {
        felhasznaloId = req.session.userId;
    }

    let rendeles;
    try {
        rendeles = await RendelesModel.create({
            rendelesSzam: await RendelesModel.kovetkezoRendelesSzam(),
            hozzaferesKulcs: hozzaferesKulcs,
            felhasznalo: felhasznaloId,
            vevo: vevo,
            szallitas: { mod: szallitasiMod, cim: szallitasiCim, telephely: telephely ? telephely._id : null },
            szamlazasiCim: szamlazasiCim,
            tetelek: rendelesTetelek,
            osszegek: osszegek,
            fizetes: { mod: fizetesiMod },
            statusz: statusz,
            esemenyek: [{ statusz: statusz, idopont: new Date() }],
            vevoMegjegyzes: szoveg(adatok.megjegyzes, 1000),
        });
    } catch (error) {
        await foglalasVisszavonasa(lefoglalt);
        throw error;
    }

    // kártyás fizetésnél elindítjuk a Stripe fizetést
    if (onlineFizetes) {
        try {
            const inditas = await fizetes.fizetesInditasa(rendeles, hozzaferesKulcs);
            rendeles.fizetes.munkamenetId = inditas.munkamenetId;
            await rendeles.save();
            vevoErtesites(rendeles, hozzaferesKulcs, 'Rendelésedet rögzítettük', 'Rendelésedet rögzítettük. A fizetés után azonnal megkezdjük az összekészítést.');
            return res.status(201).json({ rendelesSzam: rendeles.rendelesSzam, kulcs: hozzaferesKulcs, fizetesUrl: inditas.url });
        } catch (error) {
            console.error('Online fizetés indítása sikertelen (' + rendeles.rendelesSzam + '): ' + error.message);
            await lemondas(rendeles, 'Az online fizetés nem indult el.');
            return res.status(502).json({ hiba: 'Az online fizetés most nem indítható. Válassz másik fizetési módot, vagy próbáld újra később.' });
        }
    }

    vevoErtesites(rendeles, hozzaferesKulcs, 'Köszönjük a rendelésed', 'Köszönjük a rendelésed! Hamarosan megkezdjük az összekészítést.');
    boltErtesites(rendeles);
    return res.status(201).json({ rendelesSzam: rendeles.rendelesSzam, kulcs: hozzaferesKulcs, fizetesUrl: null });
});

// A rendelést a vevő a kulccsal, vagy bejelentkezve a saját fiókjából nézheti meg.
const sajatRendeles = async (req) => {
    const rendeles = await RendelesModel.findOne({ rendelesSzam: String(req.params.szam) }).select('+hozzaferesKulcs');
    if (!rendeles) {
        return null;
    }

    // a kulcsot timingSafeEqual-lal hasonlítjuk össze (biztonsági okból)
    let kulcs = '';
    if (typeof req.query.kulcs === 'string') {
        kulcs = req.query.kulcs;
    }
    if (kulcs.length === rendeles.hozzaferesKulcs.length
        && crypto.timingSafeEqual(Buffer.from(kulcs), Buffer.from(rendeles.hozzaferesKulcs))) {
        return rendeles;
    }

    if (req.session && req.session.userId && String(rendeles.felhasznalo) === req.session.userId) {
        return rendeles;
    }
    return null;
};

// egy rendelés megtekintése
router.get('/rendelesek/:szam', async (req, res) => {
    const rendeles = await sajatRendeles(req);
    if (!rendeles) {
        return res.status(404).json({ hiba: 'A rendelés nem található.' });
    }
    await rendeles.populate('szallitas.telephely', 'nev varos cim iranyitoszam telefon');
    return res.status(200).json({ rendeles: rendelesValasz(rendeles) });
});

// megszakított kártyás fizetés újraindítása
router.post('/rendelesek/:szam/fizetes', rendelesLimit, async (req, res) => {
    const rendeles = await sajatRendeles(req);
    if (!rendeles) {
        return res.status(404).json({ hiba: 'A rendelés nem található.' });
    }
    if (rendeles.fizetes.mod !== 'kartya' || rendeles.statusz !== 'fizetesre_var' || !fizetes.kartyaElerheto()) {
        return res.status(409).json({ hiba: 'Ennél a rendelésnél nincs függő online fizetés.' });
    }

    try {
        const inditas = await fizetes.fizetesInditasa(rendeles, rendeles.hozzaferesKulcs);
        rendeles.fizetes.munkamenetId = inditas.munkamenetId;
        await rendeles.save();
        return res.status(200).json({ fizetesUrl: inditas.url });
    } catch (error) {
        console.error('Online fizetés újraindítása sikertelen (' + rendeles.rendelesSzam + '): ' + error.message);
        return res.status(502).json({ hiba: 'Az online fizetés most nem indítható. Próbáld újra később.' });
    }
});

// a bejelentkezett felhasználó rendelései
router.get('/fiok/rendelesek', bejelentkezesSzukseges, async (req, res) => {
    const rendelesek = await RendelesModel.find({ felhasznalo: req.session.userId }).sort({ createdAt: -1 }).limit(100);
    return res.status(200).json({ rendelesek: rendelesek.map((rendeles) => rendelesValasz(rendeles)) });
});

// ---------- Fizetési visszajelzés (webhook) ----------

// Ezt a Stripe hívja, ha sikeres vagy lejárt a fizetés.
// Az app.js-ben a JSON feldolgozás előtt van bekötve, mert az aláírás ellenőrzéséhez a nyers törzs kell.
// Csak az utolsó fizetési munkamenetre figyelünk, így egy régi, lejárt próbálkozás nem mondja le a rendelést.
const fizetesWebhook = async (req, res) => {
    if (!fizetes.kartyaElerheto()) {
        return res.status(404).json({ hiba: 'Az online fizetés nincs beállítva.' });
    }

    let visszajelzes;
    try {
        visszajelzes = fizetes.webhookFeldolgozasa(req.body, req.headers['stripe-signature']);
    } catch {
        return res.status(400).json({ hiba: 'Érvénytelen aláírás.' });
    }

    if (!visszajelzes.tipus || !visszajelzes.munkamenetId) {
        return res.status(200).json({ fogadva: true });
    }

    const rendeles = await RendelesModel.findOne({ 'fizetes.munkamenetId': visszajelzes.munkamenetId }).select('+hozzaferesKulcs');
    if (!rendeles) {
        return res.status(200).json({ fogadva: true });
    }

    // sikeres fizetés
    if (visszajelzes.tipus === 'fizetve' && rendeles.fizetes.statusz !== 'fizetve') {
        rendeles.fizetes.statusz = 'fizetve';
        rendeles.fizetes.fizetveEkkor = new Date();
        if (rendeles.statusz === 'fizetesre_var') {
            rendeles.statusz = 'uj';
            esemeny(rendeles, 'uj', 'Online fizetés sikeres.');
        } else {
            esemeny(rendeles, rendeles.statusz, 'Online fizetés beérkezett.');
        }
        await rendeles.save();
        vevoErtesites(rendeles, rendeles.hozzaferesKulcs, 'Sikeres fizetés', 'A fizetésed sikeres volt, köszönjük! Hamarosan megkezdjük az összekészítést.');
        boltErtesites(rendeles);
    }

    // nem fizetett időben: lemondjuk, a készlet visszakerül
    if (visszajelzes.tipus === 'lejart' && rendeles.statusz === 'fizetesre_var' && rendeles.fizetes.statusz === 'fuggo') {
        await lemondas(rendeles, 'Az online fizetés nem történt meg, a lefoglalt készlet felszabadult.');
    }

    return res.status(200).json({ fogadva: true });
};

// ---------- Admin ----------

// melyik szállítási módnál milyen státuszok választhatók
const KOVETKEZO_STATUSZOK = {
    futar: ['uj', 'feldolgozas', 'feladva', 'teljesitve', 'lemondva'],
    szemelyes: ['uj', 'feldolgozas', 'atveheto', 'teljesitve', 'lemondva'],
};

// rendelések listája az adminnak
router.get('/admin/rendelesek', jogSzukseges('rendelesKezeles'), async (req, res) => {
    const szuro = {};
    if (Object.hasOwn(RENDELES_STATUSZOK, req.query.statusz)) {
        szuro.statusz = req.query.statusz;
    }
    if (req.query.statusz === 'nyitott') {
        szuro.statusz = { $in: ['fizetesre_var', 'uj', 'feldolgozas', 'feladva', 'atveheto'] };
    }

    // keresés rendelésszámra, névre, e-mailre vagy cikkszámra
    const q = szoveg(req.query.q, 80);
    if (q) {
        const minta = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        szuro.$or = [{ rendelesSzam: minta }, { 'vevo.nev': minta }, { 'vevo.email': minta }, { 'tetelek.cikkszam': minta }];
    }

    let oldal = Number.parseInt(req.query.oldal, 10) || 1;
    if (oldal < 1) {
        oldal = 1;
    }
    const limit = 30;

    const osszes = await RendelesModel.countDocuments(szuro);
    const rendelesek = await RendelesModel.find(szuro)
        .sort({ createdAt: -1 })
        .skip((oldal - 1) * limit)
        .limit(limit)
        .populate('szallitas.telephely', 'nev varos');

    // hány rendelés van az egyes státuszokban (a szűrő gombokhoz)
    const statuszSzamok = {};
    const osszesRendeles = await RendelesModel.find().select('statusz');
    for (const rendeles of osszesRendeles) {
        if (!statuszSzamok[rendeles.statusz]) {
            statuszSzamok[rendeles.statusz] = 0;
        }
        statuszSzamok[rendeles.statusz]++;
    }

    return res.status(200).json({
        rendelesek: rendelesek.map((rendeles) => rendelesValasz(rendeles, { belso: true })),
        statuszSzamok: statuszSzamok,
        statuszok: RENDELES_STATUSZOK,
        kovetkezoStatuszok: KOVETKEZO_STATUSZOK,
        lapozas: { oldal: oldal, limit: limit, osszes: osszes, oldalak: Math.ceil(osszes / limit) },
    });
});

// rendelés módosítása: státusz, fizetés rögzítése, belső megjegyzés
router.patch('/admin/rendelesek/:id', jogSzukseges('rendelesKezeles'), async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ hiba: 'A rendelés nem található.' });
    }
    const rendeles = await RendelesModel.findById(req.params.id).select('+hozzaferesKulcs');
    if (!rendeles) {
        return res.status(404).json({ hiba: 'A rendelés nem található.' });
    }
    const adatok = req.body || {};

    // belső megjegyzés
    if (adatok.belsoMegjegyzes !== undefined) {
        if (typeof adatok.belsoMegjegyzes !== 'string' || adatok.belsoMegjegyzes.length > 2000) {
            return res.status(400).json({ hiba: 'A megjegyzés legfeljebb 2000 karakter lehet.' });
        }
        rendeles.belsoMegjegyzes = adatok.belsoMegjegyzes.trim();
    }

    // fizetés rögzítése (pl. megjött az átutalás)
    if (adatok.fizetve === true && rendeles.fizetes.statusz !== 'fizetve') {
        if (rendeles.statusz === 'lemondva') {
            return res.status(409).json({ hiba: 'Lemondott rendelésnél nem rögzíthető fizetés.' });
        }
        rendeles.fizetes.statusz = 'fizetve';
        rendeles.fizetes.fizetveEkkor = new Date();
        if (rendeles.statusz === 'fizetesre_var') {
            rendeles.statusz = 'uj';
        }
        esemeny(rendeles, rendeles.statusz, 'Fizetés rögzítve.');
    }

    // státusz váltás
    let ertesitesTargy = null;
    let ertesitesSzoveg = null;
    if (adatok.statusz !== undefined && adatok.statusz !== rendeles.statusz) {
        const uj = adatok.statusz;

        if (!KOVETKEZO_STATUSZOK[rendeles.szallitas.mod].includes(uj)) {
            return res.status(400).json({ hiba: 'Ennél a szállítási módnál ez a státusz nem választható.' });
        }
        if (rendeles.statusz === 'lemondva') {
            return res.status(409).json({ hiba: 'Lemondott rendelés nem állítható vissza (a készlet már visszakerült).' });
        }
        if (rendeles.statusz === 'teljesitve' && uj === 'lemondva') {
            return res.status(409).json({ hiba: 'Teljesített rendelés nem mondható le.' });
        }

        // utánvétnél és helyszíni fizetésnél még nincs kifizetve, de mehet tovább
        const kesobbFizet = rendeles.fizetes.mod === 'utanvet' || rendeles.fizetes.mod === 'helyszinen';
        if (uj !== 'lemondva' && rendeles.fizetes.statusz !== 'fizetve' && !kesobbFizet) {
            return res.status(409).json({ hiba: 'A rendelés még nincs kifizetve. Előbb rögzítsd a fizetést.' });
        }

        if (uj === 'lemondva') {
            const megjegyzes = szoveg(adatok.megjegyzes, 300) || 'Lemondva a kereskedő által.';
            await lemondas(rendeles, megjegyzes);
            vevoErtesites(rendeles, rendeles.hozzaferesKulcs, 'Rendelésed lemondva', 'A rendelésedet lemondtuk. Ha már fizettél, a visszatérítésről külön értesítünk.');
            return res.status(200).json({ rendeles: rendelesValasz(rendeles, { belso: true }) });
        }

        rendeles.statusz = uj;
        // utánvétnél / helyszíni fizetésnél teljesítéskor már ki van fizetve
        if (uj === 'teljesitve' && rendeles.fizetes.statusz !== 'fizetve') {
            rendeles.fizetes.statusz = 'fizetve';
            rendeles.fizetes.fizetveEkkor = new Date();
        }
        esemeny(rendeles, uj, szoveg(adatok.megjegyzes, 300));

        if (uj === 'feladva') {
            ertesitesTargy = 'Rendelésed úton van';
            ertesitesSzoveg = 'Rendelésedet átadtuk a futárszolgálatnak, hamarosan megérkezik.';
        }
        if (uj === 'atveheto') {
            ertesitesTargy = 'Rendelésed átvehető';
            ertesitesSzoveg = 'Rendelésed összekészítettük, nyitvatartási időben átveheted a telephelyünkön.';
        }
    }

    await rendeles.save();
    if (ertesitesTargy) {
        vevoErtesites(rendeles, rendeles.hozzaferesKulcs, ertesitesTargy, ertesitesSzoveg);
    }
    return res.status(200).json({ rendeles: rendelesValasz(rendeles, { belso: true }) });
});

module.exports = router;
module.exports.fizetesWebhook = fizetesWebhook;
