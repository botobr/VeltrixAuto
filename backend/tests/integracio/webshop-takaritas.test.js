// Ki nem fizetett rendelések automatikus lemondása és a kártyás visszatérítés.
const assert = require('node:assert/strict');
const { after, afterEach, before, beforeEach, test } = require('node:test');
const AlkatreszModel = require('../../models/Alkatresz');
const RendelesModel = require('../../models/Rendeles');
const k = require('./kornyezet');
const { lejartFoglalasokTakaritasa } = require('../../utils/takaritas');

process.env.STRIPE_SECRET_KEY = 'sk_test_teszt';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_teszt';

before(k.inditas);
after(k.leallitas);
beforeEach(k.uritas);

// a tesztek átírják a kamu Stripe függvényeket, ezeket minden teszt után visszaállítjuk
const eredetiAllapot = k.fizetes.munkamenetAllapota;
const eredetiVisszaterites = k.fizetes.visszaterites;
afterEach(() => {
    k.fizetes.munkamenetAllapota = eredetiAllapot;
    k.fizetes.visszaterites = eredetiVisszaterites;
});

const NAP = 24 * 60 * 60 * 1000;

const tetel = (termek, mennyiseg = 1) => {
    return { id: String(termek._id), mennyiseg: mennyiseg };
};

const keszlet = async (termek) => {
    const alkatresz = await AlkatreszModel.findById(termek._id);
    return alkatresz.keszlet;
};

// a rendelés dátumainak átírása a múltba (mintha régen adták volna le)
const regiRendeles = async (rendelesSzam, napja) => {
    const datum = new Date(Date.now() - napja * NAP);
    await RendelesModel.collection.updateOne({ rendelesSzam: rendelesSzam }, { $set: { createdAt: datum, updatedAt: datum } });
};

test('átutalás: 8 nap után automatikusan lemondva, a készlet visszakerül; a friss rendelés marad', async () => {
    const termek = await k.alkatreszMentese({ keszlet: 5 });
    const atutalas = { fizetesiMod: 'atutalas' };

    const regi = await k.kliens().post('/rendelesek', k.rendelesTorzs([tetel(termek, 2)], atutalas));
    const friss = await k.kliens().post('/rendelesek', k.rendelesTorzs([tetel(termek, 1)], atutalas));
    assert.equal(await keszlet(termek), 2);
    await regiRendeles(regi.adat.rendelesSzam, 9);

    const eredmeny = await lejartFoglalasokTakaritasa();
    assert.equal(eredmeny.utalasLemondva, 1);

    const regiMentett = await RendelesModel.findOne({ rendelesSzam: regi.adat.rendelesSzam });
    assert.equal(regiMentett.statusz, 'lemondva');
    const frissMentett = await RendelesModel.findOne({ rendelesSzam: friss.adat.rendelesSzam });
    assert.equal(frissMentett.statusz, 'fizetesre_var');
    assert.equal(await keszlet(termek), 4, 'a lemondott 2 db visszakerült');

    // másodszorra már nincs mit lemondani, és a készlet sem duplázódik
    const masodszor = await lejartFoglalasokTakaritasa();
    assert.equal(masodszor.utalasLemondva, 0);
    assert.equal(await keszlet(termek), 4);
});

test('kártya: elveszett "lejárt" visszajelzés után a takarítás lemondja a rendelést', async () => {
    const termek = await k.alkatreszMentese({ keszlet: 3 });
    const valasz = await k.kliens().post('/rendelesek', k.rendelesTorzs([tetel(termek)], { fizetesiMod: 'kartya' }));
    assert.equal(valasz.status, 201);

    // 10 perces rendelésnél még várunk (a Stripe munkamenet 30 percig él)
    k.fizetes.munkamenetAllapota = async () => 'lejart';
    let eredmeny = await lejartFoglalasokTakaritasa();
    assert.equal(eredmeny.kartyaLemondva, 0);

    await regiRendeles(valasz.adat.rendelesSzam, 1);
    eredmeny = await lejartFoglalasokTakaritasa();
    assert.equal(eredmeny.kartyaLemondva, 1);

    const rendeles = await RendelesModel.findOne();
    assert.equal(rendeles.statusz, 'lemondva');
    assert.equal(await keszlet(termek), 3);
});

test('kártya: ha a Stripe szerint kifizették (csak a webhook veszett el), a fizetést rögzítjük', async () => {
    const termek = await k.alkatreszMentese({ keszlet: 3 });
    const valasz = await k.kliens().post('/rendelesek', k.rendelesTorzs([tetel(termek)], { fizetesiMod: 'kartya' }));
    await regiRendeles(valasz.adat.rendelesSzam, 1);

    k.fizetes.munkamenetAllapota = async () => 'fizetve';
    const eredmeny = await lejartFoglalasokTakaritasa();
    assert.equal(eredmeny.kartyaFizetve, 1);

    const rendeles = await RendelesModel.findOne();
    assert.equal(rendeles.statusz, 'uj');
    assert.equal(rendeles.fizetes.statusz, 'fizetve');
    assert.equal(await keszlet(termek), 2, 'a készlet lefoglalva marad');
});

test('kártya: ha a Stripe nem elérhető, nem mondjuk le (legközelebb újra próbáljuk)', async () => {
    const termek = await k.alkatreszMentese({ keszlet: 3 });
    const valasz = await k.kliens().post('/rendelesek', k.rendelesTorzs([tetel(termek)], { fizetesiMod: 'kartya' }));
    await regiRendeles(valasz.adat.rendelesSzam, 1);

    k.fizetes.munkamenetAllapota = async () => {
        throw new Error('Stripe nem elérhető');
    };
    const eredetiHiba = console.error;
    console.error = () => {};
    try {
        await lejartFoglalasokTakaritasa();
    } finally {
        console.error = eredetiHiba;
    }

    const rendeles = await RendelesModel.findOne();
    assert.equal(rendeles.statusz, 'fizetesre_var');
});

// kártyás rendelés, amit a (kamu) Stripe visszajelzés kifizetettnek jelöl
const kifizetettKartyasRendeles = async (termek) => {
    await k.kliens().post('/rendelesek', k.rendelesTorzs([tetel(termek, 2)], { fizetesiMod: 'kartya' }));
    const rendeles = await RendelesModel.findOne();
    rendeles.fizetes.statusz = 'fizetve';
    rendeles.statusz = 'uj';
    await rendeles.save();
    return rendeles;
};

test('admin lemondja a kifizetett kártyás rendelést: a Stripe visszatéríti az összeget', async () => {
    const termek = await k.alkatreszMentese({ keszlet: 5 });
    const rendeles = await kifizetettKartyasRendeles(termek);

    let visszateritettMunkamenet = null;
    k.fizetes.visszaterites = async (munkamenetId) => {
        visszateritettMunkamenet = munkamenetId;
        return { id: 're_123', osszeg: rendeles.osszegek.vegosszeg };
    };

    const admin = await k.bejelentkezve('admin');
    const valasz = await admin.patch('/admin/rendelesek/' + rendeles._id, { statusz: 'lemondva' });
    assert.equal(valasz.status, 200);
    assert.equal(valasz.adat.rendeles.statusz, 'lemondva');
    assert.equal(valasz.adat.rendeles.fizetes.visszaterites.id, 're_123');
    assert.equal(visszateritettMunkamenet, rendeles.fizetes.munkamenetId);
    assert.equal(await keszlet(termek), 5);
});

test('ha a visszatérítés nem sikerül, a rendelés nem lesz lemondva, és a készlet sem változik', async () => {
    const termek = await k.alkatreszMentese({ keszlet: 5 });
    const rendeles = await kifizetettKartyasRendeles(termek);

    k.fizetes.visszaterites = async () => {
        throw new Error('A Stripe elutasította');
    };
    const eredetiHiba = console.error;
    console.error = () => {};

    const admin = await k.bejelentkezve('admin');
    let valasz;
    try {
        valasz = await admin.patch('/admin/rendelesek/' + rendeles._id, { statusz: 'lemondva' });
    } finally {
        console.error = eredetiHiba;
    }

    assert.equal(valasz.status, 502);
    assert.match(valasz.adat.hiba, /visszatérítés nem sikerült/);
    const mentett = await RendelesModel.findById(rendeles._id);
    assert.equal(mentett.statusz, 'uj');
    assert.equal(await keszlet(termek), 3);
});

test('nem kifizetett vagy utánvétes rendelés lemondásakor nincs visszatérítés', async () => {
    const termek = await k.alkatreszMentese({ keszlet: 5 });
    await k.kliens().post('/rendelesek', k.rendelesTorzs([tetel(termek)]));
    const rendeles = await RendelesModel.findOne();

    let hivva = false;
    k.fizetes.visszaterites = async () => {
        hivva = true;
        return { id: 're_x', osszeg: 0 };
    };

    const admin = await k.bejelentkezve('admin');
    const valasz = await admin.patch('/admin/rendelesek/' + rendeles._id, { statusz: 'lemondva' });
    assert.equal(valasz.status, 200);
    assert.equal(hivva, false);
});
