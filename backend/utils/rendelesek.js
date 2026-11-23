// A rendelésekkel kapcsolatos közös műveletek: e-mailek, fizetés rögzítése,
// lemondás (készlet visszaadása, visszatérítés, számla sztornó) és számlázás.
// A rendelés útvonalai és az időzített takarítás is ezeket használja.

const AlkatreszModel = require('../models/Alkatresz');
const RendelesModel = require('../models/Rendeles');
const FelhasznaloModel = require('../models/Felhasznalo');
const { emailKuldes, oldalUrl } = require('./email');
const fizetes = require('./fizetes');
const szamlazas = require('./szamlazas');
const { FIZETESI_MODOK, SZALLITASI_MODOK } = require('./webshop');

const szamFormatum = new Intl.NumberFormat('hu-HU');

// pl. 12 990 Ft
const ft = (ertek) => szamFormatum.format(ertek) + ' Ft';

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
    if (rendeles.fizetes.mod === 'atutalas' && rendeles.fizetes.statusz === 'fuggo' && rendeles.statusz !== 'lemondva') {
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

// esemény hozzáadása a rendelés történetéhez
const esemeny = (rendeles, statusz, megjegyzes = '') => {
    rendeles.esemenyek.push({ statusz: statusz, idopont: new Date(), megjegyzes: megjegyzes });
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

// A fizetés rögzítése (a rendelést még el kell menteni utána).
// Ha a rendelés fizetésre várt, akkor mostantól "új" (lehet összekészíteni).
const fizetveJelolese = (rendeles, megjegyzes) => {
    rendeles.fizetes.statusz = 'fizetve';
    rendeles.fizetes.fizetveEkkor = new Date();
    if (rendeles.statusz === 'fizetesre_var') {
        rendeles.statusz = 'uj';
    }
    esemeny(rendeles, rendeles.statusz, megjegyzes);
};

// Számla kiállítása egy kifizetett rendeléshez (ha a számlázás be van állítva).
// Hibát nem dob: ha nem sikerül, a hibát elmentjük, és az adminban újra lehet próbálni.
const szamlaKeszitese = async (rendeles) => {
    if (!szamlazas.beallitva()) {
        return;
    }
    if (rendeles.fizetes.statusz !== 'fizetve' || rendeles.szamla.id) {
        return;
    }

    // Megjelöljük, hogy épp készül a számla. Ha közben egy másik kérés is ide jutna
    // (pl. a Stripe kétszer küldi a visszajelzést), az már nem talál ilyen rendelést, így nem lesz két számla.
    const jelolve = await RendelesModel.updateOne(
        { _id: rendeles._id, 'szamla.id': null, 'szamla.folyamatban': { $ne: true } },
        { $set: { 'szamla.folyamatban': true } },
    );
    if (jelolve.modifiedCount === 0) {
        return;
    }

    try {
        const szamla = await szamlazas.szamlaKiallitasa(rendeles);
        rendeles.szamla.id = szamla.id;
        rendeles.szamla.szam = szamla.szam;
        rendeles.szamla.kiallitva = new Date();
        rendeles.szamla.hiba = null;
        esemeny(rendeles, rendeles.statusz, 'Számla kiállítva: ' + szamla.szam);
    } catch (error) {
        console.error('Számla kiállítása sikertelen (' + rendeles.rendelesSzam + '): ' + error.message);
        rendeles.szamla.hiba = error.message;
    }
    await rendeles.save();

    // a jelzést külön kell visszaállítani, mert a memóriában lévő rendelésben ez végig false volt,
    // így a save() nem írná ki
    await RendelesModel.updateOne({ _id: rendeles._id }, { $set: { 'szamla.folyamatban': false } });
};

// Lemondott rendelés számlájának sztornózása. Hibát nem dob, a hibát elmentjük.
const szamlaSztornozasa = async (rendeles) => {
    if (!rendeles.szamla.id || rendeles.szamla.sztornozva || !szamlazas.beallitva()) {
        return;
    }
    try {
        const sztorno = await szamlazas.szamlaSztornozasa(rendeles.szamla.id, rendeles.vevo.email);
        rendeles.szamla.sztornozva = new Date();
        rendeles.szamla.sztornoSzam = sztorno.szam;
        rendeles.szamla.hiba = null;
    } catch (error) {
        console.error('Számla sztornózása sikertelen (' + rendeles.rendelesSzam + '): ' + error.message);
        rendeles.szamla.hiba = 'A sztornó számla nem készült el: ' + error.message;
    }
    await rendeles.save();
};

// Rendelés lemondása:
// 1. ha kártyával már kifizették, a Stripe-on visszautaljuk az összeget
//    (ha ez nem sikerül, hibát dob, és a rendelés NEM lesz lemondva)
// 2. lemondott státusz, készlet visszaadása
// 3. ha volt számla, sztornózzuk
const lemondas = async (rendeles, megjegyzes) => {
    const kartyavalFizetve = rendeles.fizetes.mod === 'kartya' && rendeles.fizetes.statusz === 'fizetve';
    const marVisszateritve = rendeles.fizetes.visszaterites && rendeles.fizetes.visszaterites.id;
    if (kartyavalFizetve && !marVisszateritve) {
        const visszaterites = await fizetes.visszaterites(rendeles.fizetes.munkamenetId);
        rendeles.fizetes.visszaterites = { id: visszaterites.id, osszeg: visszaterites.osszeg, ekkor: new Date() };
        megjegyzes = megjegyzes + ' A kártyás fizetés összegét visszatérítettük.';
    }

    rendeles.statusz = 'lemondva';
    esemeny(rendeles, 'lemondva', megjegyzes);
    await rendeles.save();
    await keszletVisszaadasa(rendeles);
    await szamlaSztornozasa(rendeles);
};

// a vevőnek szóló szöveg lemondás után (a fizetéstől függ)
const lemondasSzovege = (rendeles, ok) => {
    let szoveg = ok;
    if (rendeles.fizetes.visszaterites && rendeles.fizetes.visszaterites.id) {
        szoveg += ' A kártyás fizetés összegét visszatérítettük, néhány munkanapon belül megjelenik a számládon.';
    } else if (rendeles.fizetes.statusz === 'fizetve') {
        szoveg += ' A befizetett összeget hamarosan visszautaljuk, erről külön értesítünk.';
    }
    return szoveg;
};

module.exports = {
    ft,
    esemeny,
    vevoErtesites,
    boltErtesites,
    keszletVisszaadasa,
    fizetveJelolese,
    szamlaKeszitese,
    lemondas,
    lemondasSzovege,
};
