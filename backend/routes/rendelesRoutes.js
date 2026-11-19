const crypto = require('node:crypto');
const express = require('express');
const mongoose = require('mongoose');
const AlkatreszModel = require('../models/Alkatresz');
const RendelesModel = require('../models/Rendeles');
const TelephelyModel = require('../models/Telephely');
const UserModel = require('../models/User');
const { authRequired, jogSzukseges } = require('../middlewares/authMiddleware');
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
const ft = (ertek) => `${new Intl.NumberFormat('hu-HU').format(ertek)} Ft`;
const szoveg = (ertek, max) => (typeof ertek === 'string' ? ertek.trim().slice(0, max) : '');

// ---------- Segédfüggvények ----------

/** A kosár tételei a jelenlegi (adatbázisbeli) adatokkal; a nem elérhető termékek külön listában. */
const kosarBetoltese = async (nyersTetelek) => {
    const tetelek = kosarTetelek(nyersTetelek);
    const alkatreszek = await AlkatreszModel.find({ _id: { $in: tetelek.map((t) => t.id) }, lathato: true });
    const szerint = new Map(alkatreszek.map((a) => [String(a._id), a]));
    return {
        tetelek: tetelek.filter((t) => szerint.has(t.id)).map((t) => ({ alkatresz: szerint.get(t.id), mennyiseg: t.mennyiseg })),
        hianyzo: tetelek.filter((t) => !szerint.has(t.id)).map((t) => t.id),
    };
};

const vanTelephely = async () => Boolean(await TelephelyModel.exists({}));

/** Szállítási módok a díjjal (a termékösszegtől függ); személyes átvétel csak ha van telephely. */
const szallitasiModok = (termekek, telephelyVan) => Object.entries(SZALLITASI_MODOK)
    .filter(([kulcs]) => kulcs !== 'szemelyes' || telephelyVan)
    .map(([kulcs, mod]) => ({
        kulcs,
        nev: mod.nev,
        dij: mod.ingyenesHatar !== null && termekek >= mod.ingyenesHatar ? 0 : mod.dij,
        ingyenesHatar: mod.ingyenesHatar,
        cimKell: mod.cimKell,
    }));

/** Lemondáskor egyszer (atomikusan jelölve) visszaadjuk a lefoglalt készletet. */
const keszletVisszaadasa = async (rendeles) => {
    const jelolve = await RendelesModel.updateOne({ _id: rendeles._id, keszletVisszaadva: false }, { $set: { keszletVisszaadva: true } });
    if (!jelolve.modifiedCount) return;
    await Promise.all(rendeles.tetelek.map((t) => AlkatreszModel.updateOne(
        { _id: t.alkatresz },
        { $inc: { keszlet: t.mennyiseg, eladottDb: -t.mennyiseg } },
    )));
    rendeles.keszletVisszaadva = true;
};

const esemeny = (rendeles, statusz, megjegyzes = '') => {
    rendeles.esemenyek.push({ statusz, idopont: new Date(), megjegyzes });
};

const lemondas = async (rendeles, megjegyzes) => {
    rendeles.statusz = 'lemondva';
    esemeny(rendeles, 'lemondva', megjegyzes);
    await rendeles.save();
    await keszletVisszaadasa(rendeles);
};

const rendelesLink = (rendeles, kulcs) => `${oldalUrl()}/rendeles/${encodeURIComponent(rendeles.rendelesSzam)}?kulcs=${kulcs}`;

const tetelekSzoveg = (rendeles) => [
    ...rendeles.tetelek.map((t) => `  ${t.mennyiseg} × ${t.nev} (${t.cikkszam}) – ${ft(t.egysegar * t.mennyiseg)}`),
    `  Szállítás: ${ft(rendeles.osszegek.szallitas)}`,
    ...(rendeles.osszegek.kezelesiDij ? [`  Kezelési díj: ${ft(rendeles.osszegek.kezelesiDij)}`] : []),
    `  Végösszeg: ${ft(rendeles.osszegek.vegosszeg)}`,
].join('\n');

const atutalasiInfo = (rendeles) => (process.env.BANKSZAMLASZAM
    ? `Kérjük, utald át a végösszeget: ${process.env.BANKSZAMLASZAM}${process.env.BANKSZAMLA_KEDVEZMENYEZETT ? ` (${process.env.BANKSZAMLA_KEDVEZMENYEZETT})` : ''}, közlemény: ${rendeles.rendelesSzam}`
    : 'Az utalási adatokat külön e-mailben küldjük el.');

const vevoErtesites = (rendeles, kulcs, targy, bevezeto) => emailKuldes({
    cimzett: rendeles.vevo.email,
    targy: `${targy} – ${rendeles.rendelesSzam}`,
    szoveg: [
        `Kedves ${rendeles.vevo.nev}!`,
        '',
        bevezeto,
        '',
        tetelekSzoveg(rendeles),
        '',
        `Szállítás: ${SZALLITASI_MODOK[rendeles.szallitas.mod].nev}`,
        `Fizetés: ${FIZETESI_MODOK[rendeles.fizetes.mod].nev}`,
        ...(rendeles.fizetes.mod === 'atutalas' && rendeles.fizetes.statusz === 'fuggo' ? ['', atutalasiInfo(rendeles)] : []),
        '',
        `A rendelésed állapota: ${rendelesLink(rendeles, kulcs)}`,
    ].join('\n'),
});

const boltErtesites = async (rendeles) => {
    const cimzettek = process.env.ERTESITESI_EMAIL
        ? process.env.ERTESITESI_EMAIL.split(',').map((cim) => cim.trim())
        : (await UserModel.find({ statusz: 'admin' }).select('email')).map((u) => u.email);
    return emailKuldes({
        cimzett: cimzettek,
        valaszCim: rendeles.vevo.email,
        targy: `Új webshop rendelés: ${rendeles.rendelesSzam} (${ft(rendeles.osszegek.vegosszeg)})`,
        szoveg: [
            `Vevő: ${rendeles.vevo.nev}, ${rendeles.vevo.email}, ${rendeles.vevo.telefon}`,
            '',
            tetelekSzoveg(rendeles),
            '',
            `Szállítás: ${SZALLITASI_MODOK[rendeles.szallitas.mod].nev} · Fizetés: ${FIZETESI_MODOK[rendeles.fizetes.mod].nev}`,
            rendeles.vevoMegjegyzes ? `Megjegyzés: ${rendeles.vevoMegjegyzes}` : '',
            '',
            `Kezelés: ${oldalUrl()}/admin?lap=rendelesek`,
        ].join('\n'),
    });
};

/** A rendelés vevőnek szóló nézete (belső megjegyzés és hozzáférési kulcs nélkül). */
const rendelesValasz = (rendeles, { belso = false } = {}) => {
    const adat = rendeles.toObject ? rendeles.toObject() : { ...rendeles };
    delete adat.hozzaferesKulcs;
    delete adat.__v;
    if (!belso) {
        delete adat.belsoMegjegyzes;
        delete adat.keszletVisszaadva;
        if (adat.fizetes) delete adat.fizetes.munkamenetId;
    }
    adat.statuszNev = RENDELES_STATUSZOK[adat.statusz];
    adat.szallitasNev = SZALLITASI_MODOK[adat.szallitas?.mod]?.nev;
    adat.fizetesNev = FIZETESI_MODOK[adat.fizetes?.mod]?.nev;
    adat.tetelek = (adat.tetelek || []).map((t) => ({ ...t, slug: alkatreszSlug({ _id: t.alkatresz, nev: t.nev }) }));
    if (adat.fizetes?.mod === 'atutalas' && adat.fizetes?.statusz === 'fuggo' && adat.statusz !== 'lemondva') {
        adat.atutalas = process.env.BANKSZAMLASZAM
            ? { szamlaszam: process.env.BANKSZAMLASZAM, kedvezmenyezett: process.env.BANKSZAMLA_KEDVEZMENYEZETT || '', kozlemeny: adat.rendelesSzam }
            : null;
    }
    adat.ujraFizetheto = !belso && adat.fizetes?.mod === 'kartya' && adat.statusz === 'fizetesre_var' && fizetes.kartyaElerheto();
    return adat;
};

// ---------- Kosár ----------

/** A kosár ellenőrzése: aktuális árak, készlet, választható szállítási/fizetési módok, végösszeg. */
router.post('/kosar', kosarLimit, async (req, res) => {
    const { tetelek, hianyzo } = await kosarBetoltese(req.body?.tetelek);
    const szallitasiMod = Object.hasOwn(SZALLITASI_MODOK, req.body?.szallitasiMod) ? req.body.szallitasiMod : null;
    const fizetesiModKert = Object.hasOwn(FIZETESI_MODOK, req.body?.fizetesiMod) ? req.body.fizetesiMod : null;
    const valaszthatoFizetes = fizetesiModok(szallitasiMod, { kartyaElerheto: fizetes.kartyaElerheto() });
    const fizetesiMod = valaszthatoFizetes.some((m) => m.kulcs === fizetesiModKert) ? fizetesiModKert : null;
    const { sorok, osszegek } = rendelesSzamitas({ tetelek, szallitasiMod, fizetesiMod });
    const [telephelyVan, telephelyek] = await Promise.all([vanTelephely(), TelephelyModel.find().select('nev varos cim iranyitoszam').sort({ nev: 1 })]);

    const valaszSorok = sorok.map(({ alkatresz, mennyiseg, egysegar, sorosszeg }) => ({
        id: String(alkatresz._id),
        slug: alkatreszSlug(alkatresz),
        nev: alkatresz.nev,
        gyarto: alkatresz.gyarto,
        cikkszam: alkatresz.cikkszam,
        kep: alkatresz.kepek[0]?.url || null,
        ar: alkatresz.ar,
        egysegar,
        keszlet: alkatresz.keszlet,
        mennyiseg,
        sorosszeg,
        hiba: alkatresz.keszlet === 0 ? 'Elfogyott' : mennyiseg > alkatresz.keszlet ? `Csak ${alkatresz.keszlet} db van készleten` : null,
    }));
    return res.status(200).json({
        tetelek: valaszSorok,
        hianyzo,
        osszegek,
        szallitasiModok: szallitasiModok(osszegek.termekek, telephelyVan),
        fizetesiModok: valaszthatoFizetes,
        telephelyek,
        rendelheto: valaszSorok.length > 0 && valaszSorok.every((sor) => !sor.hiba),
    });
});

// ---------- Rendelés leadása ----------

const cimEllenorzese = (nyers, hibak, cimke, { nevKell = false } = {}) => {
    const cim = {
        nev: szoveg(nyers?.nev, 120),
        adoszam: szoveg(nyers?.adoszam, 20),
        iranyitoszam: szoveg(nyers?.iranyitoszam, 10),
        varos: szoveg(nyers?.varos, 60),
        cim: szoveg(nyers?.cim, 160),
    };
    if (nevKell && cim.nev.length < 2) hibak.push(`${cimke}: add meg a nevet.`);
    if (!IRANYITOSZAM_MINTA.test(cim.iranyitoszam)) hibak.push(`${cimke}: érvénytelen irányítószám.`);
    if (cim.varos.length < 2) hibak.push(`${cimke}: add meg a települést.`);
    if (cim.cim.length < 3) hibak.push(`${cimke}: add meg az utcát és a házszámot.`);
    if (cim.adoszam && !/^\d{8}-\d-\d{2}$/.test(cim.adoszam)) hibak.push(`${cimke}: az adószám formátuma 12345678-1-12.`);
    return cim;
};

router.post('/rendelesek', rendelesLimit, async (req, res) => {
    const body = req.body || {};
    const hibak = [];

    const vevo = { nev: szoveg(body.vevo?.nev, 120), email: szoveg(body.vevo?.email, 120).toLowerCase(), telefon: szoveg(body.vevo?.telefon, 40) };
    if (vevo.nev.length < 2) hibak.push('Add meg a neved.');
    if (!EMAIL_MINTA.test(vevo.email)) hibak.push('Érvényes e-mail-címet adj meg.');
    if (!TELEFON_MINTA.test(vevo.telefon)) hibak.push('Érvényes telefonszámot adj meg.');

    const szallitasiMod = Object.hasOwn(SZALLITASI_MODOK, body.szallitasiMod) ? body.szallitasiMod : null;
    if (!szallitasiMod) hibak.push('Válassz szállítási módot.');
    const fizetesiMod = fizetesiModok(szallitasiMod, { kartyaElerheto: fizetes.kartyaElerheto() }).some((m) => m.kulcs === body.fizetesiMod)
        ? body.fizetesiMod : null;
    if (szallitasiMod && !fizetesiMod) hibak.push('Válassz a szállítási módhoz illő fizetési módot.');

    let szallitasiCim = null;
    let telephely = null;
    if (szallitasiMod === 'futar') szallitasiCim = cimEllenorzese(body.szallitasiCim, hibak, 'Szállítási cím');
    if (szallitasiMod === 'szemelyes') {
        telephely = mongoose.Types.ObjectId.isValid(body.telephely) ? await TelephelyModel.findById(body.telephely).select('_id') : null;
        if (!telephely) hibak.push('Válaszd ki az átvételi telephelyet.');
    }
    const szamlazasiCim = cimEllenorzese(body.szamlazasiCim, hibak, 'Számlázási cím', { nevKell: true });
    if (body.aszf !== true) hibak.push('A rendeléshez el kell fogadnod az ÁSZF-et és az adatkezelési tájékoztatót.');

    const { tetelek, hianyzo } = await kosarBetoltese(body.tetelek);
    if (hianyzo.length) hibak.push('A kosárban van olyan termék, amely már nem elérhető. Frissítsd a kosarat.');
    if (tetelek.length === 0 && !hianyzo.length) hibak.push('A kosár üres.');
    if (hibak.length) return res.status(400).json({ error: hibak[0], hibak });

    // Készletfoglalás termékenként atomikusan; ha bármelyik nem sikerül, az eddigieket visszaadjuk.
    const lefoglalt = [];
    const visszagorgetes = () => Promise.all(lefoglalt.map((t) => AlkatreszModel.updateOne(
        { _id: t.alkatresz._id },
        { $inc: { keszlet: t.mennyiseg, eladottDb: -t.mennyiseg } },
    )));
    for (const tetel of tetelek) {
        const eredmeny = await AlkatreszModel.updateOne(
            { _id: tetel.alkatresz._id, lathato: true, keszlet: { $gte: tetel.mennyiseg } },
            { $inc: { keszlet: -tetel.mennyiseg, eladottDb: tetel.mennyiseg } },
        );
        if (!eredmeny.modifiedCount) {
            await visszagorgetes();
            const friss = await AlkatreszModel.findById(tetel.alkatresz._id).select('keszlet nev');
            return res.status(409).json({ error: `${tetel.alkatresz.nev}: ${friss?.keszlet ? `csak ${friss.keszlet} db van készleten` : 'elfogyott'}. Frissítsd a kosarat.` });
        }
        lefoglalt.push(tetel);
    }

    const { sorok, osszegek } = rendelesSzamitas({ tetelek, szallitasiMod, fizetesiMod });
    const hozzaferesKulcs = crypto.randomBytes(24).toString('hex');
    const onlineFizetes = FIZETESI_MODOK[fizetesiMod].online;
    const statusz = onlineFizetes || fizetesiMod === 'atutalas' ? 'fizetesre_var' : 'uj';

    let rendeles;
    try {
        rendeles = await RendelesModel.create({
            rendelesSzam: await RendelesModel.kovetkezoRendelesSzam(),
            hozzaferesKulcs,
            felhasznalo: req.session?.userId || null,
            vevo,
            szallitas: { mod: szallitasiMod, cim: szallitasiCim, telephely: telephely?._id || null },
            szamlazasiCim,
            tetelek: sorok.map(({ alkatresz, mennyiseg, egysegar }) => ({
                alkatresz: alkatresz._id, nev: alkatresz.nev, cikkszam: alkatresz.cikkszam, kep: alkatresz.kepek[0]?.url || null, egysegar, mennyiseg,
            })),
            osszegek,
            fizetes: { mod: fizetesiMod },
            statusz,
            esemenyek: [{ statusz, idopont: new Date() }],
            vevoMegjegyzes: szoveg(body.megjegyzes, 1000),
        });
    } catch (error) {
        await visszagorgetes();
        throw error;
    }

    if (onlineFizetes) {
        try {
            const { url, munkamenetId } = await fizetes.fizetesInditasa(rendeles, hozzaferesKulcs);
            rendeles.fizetes.munkamenetId = munkamenetId;
            await rendeles.save();
            vevoErtesites(rendeles, hozzaferesKulcs, 'Rendelésedet rögzítettük', 'Rendelésedet rögzítettük. A fizetés után azonnal megkezdjük az összekészítést.');
            return res.status(201).json({ rendelesSzam: rendeles.rendelesSzam, kulcs: hozzaferesKulcs, fizetesUrl: url });
        } catch (error) {
            console.error(`Online fizetés indítása sikertelen (${rendeles.rendelesSzam}): ${error.message}`);
            await lemondas(rendeles, 'Az online fizetés nem indult el.');
            return res.status(502).json({ error: 'Az online fizetés most nem indítható. Válassz másik fizetési módot, vagy próbáld újra később.' });
        }
    }

    vevoErtesites(rendeles, hozzaferesKulcs, 'Köszönjük a rendelésed', 'Köszönjük a rendelésed! Hamarosan megkezdjük az összekészítést.');
    boltErtesites(rendeles);
    return res.status(201).json({ rendelesSzam: rendeles.rendelesSzam, kulcs: hozzaferesKulcs, fizetesUrl: null });
});

/** Rendelés betöltése a vevőnek: a hozzáférési kulccsal, vagy a saját fiókjából. */
const sajatRendeles = async (req) => {
    const rendeles = await RendelesModel.findOne({ rendelesSzam: String(req.params.szam) }).select('+hozzaferesKulcs');
    if (!rendeles) return null;
    const kulcs = typeof req.query.kulcs === 'string' ? req.query.kulcs : '';
    const kulccsal = kulcs.length === rendeles.hozzaferesKulcs.length
        && crypto.timingSafeEqual(Buffer.from(kulcs), Buffer.from(rendeles.hozzaferesKulcs));
    const sajat = req.session?.userId && String(rendeles.felhasznalo) === req.session.userId;
    return kulccsal || sajat ? rendeles : null;
};

router.get('/rendelesek/:szam', async (req, res) => {
    const rendeles = await sajatRendeles(req);
    if (!rendeles) return res.status(404).json({ error: 'A rendelés nem található.' });
    await rendeles.populate('szallitas.telephely', 'nev varos cim iranyitoszam telefon');
    return res.status(200).json({ rendeles: rendelesValasz(rendeles) });
});

/** Megszakított online fizetés újraindítása (amíg a rendelés fizetésre vár). */
router.post('/rendelesek/:szam/fizetes', rendelesLimit, async (req, res) => {
    const rendeles = await sajatRendeles(req);
    if (!rendeles) return res.status(404).json({ error: 'A rendelés nem található.' });
    if (rendeles.fizetes.mod !== 'kartya' || rendeles.statusz !== 'fizetesre_var' || !fizetes.kartyaElerheto()) {
        return res.status(409).json({ error: 'Ennél a rendelésnél nincs függő online fizetés.' });
    }
    try {
        const { url, munkamenetId } = await fizetes.fizetesInditasa(rendeles, rendeles.hozzaferesKulcs);
        rendeles.fizetes.munkamenetId = munkamenetId;
        await rendeles.save();
        return res.status(200).json({ fizetesUrl: url });
    } catch (error) {
        console.error(`Online fizetés újraindítása sikertelen (${rendeles.rendelesSzam}): ${error.message}`);
        return res.status(502).json({ error: 'Az online fizetés most nem indítható. Próbáld újra később.' });
    }
});

router.get('/fiok/rendelesek', authRequired, async (req, res) => {
    const rendelesek = await RendelesModel.find({ felhasznalo: req.session.userId }).sort({ createdAt: -1 }).limit(100);
    return res.status(200).json({ rendelesek: rendelesek.map((r) => rendelesValasz(r)) });
});

// ---------- Fizetési visszajelzés (webhook) ----------

/**
 * A szolgáltató hívja (nyers törzzsel, aláírással) – az app.js a JSON-feldolgozás ELŐTT köti be.
 * Csak az aktuális fizetési munkamenetre reagálunk, így egy korábbi, lejárt próbálkozás nem mond le egy újat.
 */
const fizetesWebhook = async (req, res) => {
    if (!fizetes.kartyaElerheto()) return res.status(404).json({ error: 'Az online fizetés nincs beállítva.' });
    let visszajelzes;
    try {
        visszajelzes = fizetes.webhookFeldolgozasa(req.body, req.headers['stripe-signature']);
    } catch {
        return res.status(400).json({ error: 'Érvénytelen aláírás.' });
    }
    const { tipus, munkamenetId } = visszajelzes;
    if (!tipus || !munkamenetId) return res.status(200).json({ fogadva: true });

    const rendeles = await RendelesModel.findOne({ 'fizetes.munkamenetId': munkamenetId }).select('+hozzaferesKulcs');
    if (!rendeles) return res.status(200).json({ fogadva: true });

    if (tipus === 'fizetve' && rendeles.fizetes.statusz !== 'fizetve') {
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
    if (tipus === 'lejart' && rendeles.statusz === 'fizetesre_var' && rendeles.fizetes.statusz === 'fuggo') {
        await lemondas(rendeles, 'Az online fizetés nem történt meg, a lefoglalt készlet felszabadult.');
    }
    return res.status(200).json({ fogadva: true });
};

// ---------- Admin ----------

const KOVETKEZO_STATUSZOK = {
    futar: ['uj', 'feldolgozas', 'feladva', 'teljesitve', 'lemondva'],
    szemelyes: ['uj', 'feldolgozas', 'atveheto', 'teljesitve', 'lemondva'],
};

router.get('/admin/rendelesek', jogSzukseges('rendelesKezeles'), async (req, res) => {
    const szuro = {};
    if (Object.hasOwn(RENDELES_STATUSZOK, req.query.statusz)) szuro.statusz = req.query.statusz;
    if (req.query.statusz === 'nyitott') szuro.statusz = { $in: ['fizetesre_var', 'uj', 'feldolgozas', 'feladva', 'atveheto'] };
    const q = szoveg(req.query.q, 80);
    if (q) {
        const minta = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        szuro.$or = [{ rendelesSzam: minta }, { 'vevo.nev': minta }, { 'vevo.email': minta }, { 'tetelek.cikkszam': minta }];
    }
    const oldal = Math.max(Number.parseInt(req.query.oldal, 10) || 1, 1);
    const limit = 30;
    const [osszes, rendelesek, szamok] = await Promise.all([
        RendelesModel.countDocuments(szuro),
        RendelesModel.find(szuro).sort({ createdAt: -1 }).skip((oldal - 1) * limit).limit(limit)
            .populate('szallitas.telephely', 'nev varos'),
        RendelesModel.aggregate([{ $group: { _id: '$statusz', db: { $sum: 1 } } }]),
    ]);
    return res.status(200).json({
        rendelesek: rendelesek.map((r) => rendelesValasz(r, { belso: true })),
        statuszSzamok: Object.fromEntries(szamok.map((s) => [s._id, s.db])),
        statuszok: RENDELES_STATUSZOK,
        kovetkezoStatuszok: KOVETKEZO_STATUSZOK,
        lapozas: { oldal, limit, osszes, oldalak: Math.ceil(osszes / limit) },
    });
});

/** Státuszváltás, fizetés rögzítése (átutalás), belső megjegyzés. */
router.patch('/admin/rendelesek/:id', jogSzukseges('rendelesKezeles'), async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'A rendelés nem található.' });
    const rendeles = await RendelesModel.findById(req.params.id).select('+hozzaferesKulcs');
    if (!rendeles) return res.status(404).json({ error: 'A rendelés nem található.' });
    const body = req.body || {};

    if (body.belsoMegjegyzes !== undefined) {
        if (typeof body.belsoMegjegyzes !== 'string' || body.belsoMegjegyzes.length > 2000) {
            return res.status(400).json({ error: 'A megjegyzés legfeljebb 2000 karakter lehet.' });
        }
        rendeles.belsoMegjegyzes = body.belsoMegjegyzes.trim();
    }

    if (body.fizetve === true && rendeles.fizetes.statusz !== 'fizetve') {
        if (rendeles.statusz === 'lemondva') return res.status(409).json({ error: 'Lemondott rendelésnél nem rögzíthető fizetés.' });
        rendeles.fizetes.statusz = 'fizetve';
        rendeles.fizetes.fizetveEkkor = new Date();
        if (rendeles.statusz === 'fizetesre_var') rendeles.statusz = 'uj';
        esemeny(rendeles, rendeles.statusz, 'Fizetés rögzítve.');
    }

    let ertesites = null;
    if (body.statusz !== undefined && body.statusz !== rendeles.statusz) {
        const uj = body.statusz;
        if (!KOVETKEZO_STATUSZOK[rendeles.szallitas.mod].includes(uj)) {
            return res.status(400).json({ error: 'Ennél a szállítási módnál ez a státusz nem választható.' });
        }
        if (rendeles.statusz === 'lemondva') return res.status(409).json({ error: 'Lemondott rendelés nem állítható vissza (a készlet már visszakerült).' });
        if (rendeles.statusz === 'teljesitve' && uj === 'lemondva') return res.status(409).json({ error: 'Teljesített rendelés nem mondható le.' });
        if (uj !== 'lemondva' && rendeles.fizetes.statusz !== 'fizetve' && rendeles.fizetes.mod !== 'utanvet' && rendeles.fizetes.mod !== 'helyszinen') {
            return res.status(409).json({ error: 'A rendelés még nincs kifizetve. Előbb rögzítsd a fizetést.' });
        }
        if (uj === 'lemondva') {
            await lemondas(rendeles, szoveg(body.megjegyzes, 300) || 'Lemondva a kereskedő által.');
            vevoErtesites(rendeles, rendeles.hozzaferesKulcs, 'Rendelésed lemondva', 'A rendelésedet lemondtuk. Ha már fizettél, a visszatérítésről külön értesítünk.');
            return res.status(200).json({ rendeles: rendelesValasz(rendeles, { belso: true }) });
        }
        rendeles.statusz = uj;
        // Utánvét / helyszíni fizetés: a teljesítéskor a fizetés is megtörtént.
        if (uj === 'teljesitve' && rendeles.fizetes.statusz !== 'fizetve') {
            rendeles.fizetes.statusz = 'fizetve';
            rendeles.fizetes.fizetveEkkor = new Date();
        }
        esemeny(rendeles, uj, szoveg(body.megjegyzes, 300));
        if (uj === 'feladva') ertesites = ['Rendelésed úton van', 'Rendelésedet átadtuk a futárszolgálatnak, hamarosan megérkezik.'];
        if (uj === 'atveheto') ertesites = ['Rendelésed átvehető', 'Rendelésed összekészítettük, nyitvatartási időben átveheted a telephelyünkön.'];
    }

    await rendeles.save();
    if (ertesites) vevoErtesites(rendeles, rendeles.hozzaferesKulcs, ...ertesites);
    return res.status(200).json({ rendeles: rendelesValasz(rendeles, { belso: true }) });
});

module.exports = router;
module.exports.fizetesWebhook = fizetesWebhook;
