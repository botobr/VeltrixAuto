const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const Stripe = require('stripe');
const AlkatreszModel = require('../../models/Alkatresz');
const RendelesModel = require('../../models/Rendeles');
const k = require('./kornyezet');

const WEBHOOK_TITOK = 'whsec_teszt_titok';
process.env.STRIPE_SECRET_KEY = 'sk_test_teszt';
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_TITOK;

before(k.inditas);
after(k.leallitas);
beforeEach(k.uritas);

const eredetiInditas = k.fizetes.fizetesInditasa;

const tetel = (termek, mennyiseg = 1) => {
    return { id: String(termek._id), mennyiseg: mennyiseg };
};

// kártyás rendelés adatai
const kartyas = (tetelek) => {
    return k.rendelesTorzs(tetelek, { fizetesiMod: 'kartya' });
};

// Webhook hívás úgy, ahogy a Stripe küldené (a titokkal aláírva).
// Ha megadunk alairas-t, akkor azt küldi (hamis aláírás teszteléséhez).
const webhook = async (tipus, munkamenet, { alairas } = {}) => {
    const torzs = JSON.stringify({ id: 'evt_teszt', type: tipus, data: { object: munkamenet } });
    let fejlec = alairas;
    if (fejlec === undefined) {
        fejlec = Stripe.webhooks.generateTestHeaderString({ payload: torzs, secret: WEBHOOK_TITOK });
    }
    const valasz = await fetch(`${k.url()}/api/fizetes/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Stripe-Signature': fejlec },
        body: torzs,
    });
    return valasz.status;
};

test('kártyás fizetés: átirányítás, aláírt visszajelzés → fizetve; hamis aláírás elutasítva', async () => {
    const termek = await k.alkatreszMentese({ keszlet: 2 });
    const valasz = await k.kliens().post('/rendelesek', kartyas([tetel(termek)]));
    assert.equal(valasz.status, 201);
    assert.match(valasz.adat.fizetesUrl, /^https:\/\/checkout\.stripe\.test\//);

    const rendeles = await RendelesModel.findOne();
    assert.equal(rendeles.statusz, 'fizetesre_var');
    const alkatresz = await AlkatreszModel.findById(termek._id);
    assert.equal(alkatresz.keszlet, 1, 'a készlet a fizetésig le van foglalva');

    const munkamenet = { id: rendeles.fizetes.munkamenetId, payment_status: 'paid', metadata: { rendelesId: String(rendeles._id) } };

    // hamis aláírással nem fogadjuk el
    const hamis = await webhook('checkout.session.completed', munkamenet, { alairas: 't=1,v1=hamis' });
    assert.equal(hamis, 400);
    const hamisUtan = await RendelesModel.findById(rendeles._id);
    assert.equal(hamisUtan.fizetes.statusz, 'fuggo');

    // jó aláírással igen
    const jo = await webhook('checkout.session.completed', munkamenet);
    assert.equal(jo, 200);
    const fizetett = await RendelesModel.findById(rendeles._id);
    assert.equal(fizetett.fizetes.statusz, 'fizetve');
    assert.equal(fizetett.statusz, 'uj');

    // ha a Stripe még egyszer elküldi, az sem baj
    const ujra = await webhook('checkout.session.completed', munkamenet);
    assert.equal(ujra, 200);
    const ujraUtan = await RendelesModel.findById(rendeles._id);
    assert.equal(ujraUtan.esemenyek.length, 2);
});

test('lejárt fizetés: a rendelés lemondva, a készlet felszabadul – de csak az aktuális munkamenetre', async () => {
    const termek = await k.alkatreszMentese({ keszlet: 1 });
    const valasz = await k.kliens().post('/rendelesek', kartyas([tetel(termek)]));
    const adat = valasz.adat;
    const rendeles = await RendelesModel.findOne();
    const regiMunkamenet = rendeles.fizetes.munkamenetId;

    // A vevő újra megpróbálja kifizetni: új munkamenet lesz, a régi lejárata már nem mondhatja le a rendelést.
    const ujra = await k.kliens().post(`/rendelesek/${adat.rendelesSzam}/fizetes?kulcs=${adat.kulcs}`);
    assert.equal(ujra.status, 200);
    const regiLejart = await webhook('checkout.session.expired', { id: regiMunkamenet });
    assert.equal(regiLejart, 200);
    let mentett = await RendelesModel.findById(rendeles._id);
    assert.equal(mentett.statusz, 'fizetesre_var');

    // az aktuális munkamenet lejárata már lemondja
    const aktualis = mentett.fizetes.munkamenetId;
    assert.notEqual(aktualis, regiMunkamenet);
    const aktualisLejart = await webhook('checkout.session.expired', { id: aktualis });
    assert.equal(aktualisLejart, 200);
    mentett = await RendelesModel.findById(rendeles._id);
    assert.equal(mentett.statusz, 'lemondva');

    const alkatresz = await AlkatreszModel.findById(termek._id);
    assert.equal(alkatresz.keszlet, 1);
});

test('ha az online fizetés nem indul el: 502, a rendelés lemondva, a készlet visszakerül', async () => {
    const termek = await k.alkatreszMentese({ keszlet: 3 });
    // a Stripe "nem elérhető"
    k.fizetes.fizetesInditasa = async () => {
        throw new Error('Stripe nem elérhető');
    };
    const eredetiHiba = console.error;
    console.error = () => {}; // a várt hibaüzenet ne zavarjon a kimenetben
    try {
        const valasz = await k.kliens().post('/rendelesek', kartyas([tetel(termek, 2)]));
        assert.equal(valasz.status, 502);
    } finally {
        k.fizetes.fizetesInditasa = eredetiInditas;
        console.error = eredetiHiba;
    }
    const rendeles = await RendelesModel.findOne();
    assert.equal(rendeles.statusz, 'lemondva');
    const alkatresz = await AlkatreszModel.findById(termek._id);
    assert.equal(alkatresz.keszlet, 3);
});

test('dashboard webshop-blokk: rendelések és bevétel; értékesítőnél forintösszeg nélkül', async () => {
    const termek = await k.alkatreszMentese({ ar: 50000, keszlet: 3, nev: 'Sport levegőszűrő' });
    const vendeg = k.kliens();
    await vendeg.post('/rendelesek', k.rendelesTorzs([tetel(termek, 2)])); // 100 000 + ingyenes szállítás + 590 utánvét
    await vendeg.post('/rendelesek', k.rendelesTorzs([tetel(termek, 1)])); // 50 000 + 2490 + 590 → 1 db marad

    const admin = await k.bejelentkezve('admin');
    const adminValasz = await admin.get('/admin/dashboard?idoszak=30');
    const webshop = adminValasz.adat.webshop;
    assert.equal(webshop.rendelesek, 2);
    assert.equal(webshop.bevetel, 100590 + 53080);
    assert.equal(webshop.atlagKosar, Math.round((100590 + 53080) / 2));
    assert.equal(webshop.teendo, 2);
    assert.equal(webshop.alacsonyKeszlet, 0, 'a megmaradt 0 db „elfogyott”, nem „alacsony”');
    assert.equal(webshop.elfogyott, 1);
    assert.equal(webshop.top.length, 1);
    assert.equal(webshop.top[0].nev, 'Sport levegőszűrő');
    assert.equal(webshop.top[0].db, 3);
    assert.equal(webshop.top[0].bevetel, 150000);

    // az értékesítő nem látja a forintösszegeket
    const ertekesito = await k.bejelentkezve('ertekesito');
    const ertekesitoValasz = await ertekesito.get('/admin/dashboard?idoszak=30');
    const ertekesitoWebshop = ertekesitoValasz.adat.webshop;
    assert.equal(ertekesitoWebshop.rendelesek, 2);
    assert.equal(ertekesitoWebshop.bevetel, undefined);
    assert.equal(ertekesitoWebshop.atlagKosar, undefined);
    assert.deepEqual(ertekesitoWebshop.top, [{ id: String(termek._id), nev: 'Sport levegőszűrő', cikkszam: termek.cikkszam, db: 3 }]);
});
