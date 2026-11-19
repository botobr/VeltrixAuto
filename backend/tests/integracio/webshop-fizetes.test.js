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
const tetel = (termek, mennyiseg = 1) => ({ id: String(termek._id), mennyiseg });
const kartyas = (tetelek) => k.rendelesTorzs(tetelek, { fizetesiMod: 'kartya' });

/** Stripe-formájú, a titokkal aláírt webhook-hívás (ahogy a Stripe küldené). */
const webhook = async (tipus, munkamenet, { alairas } = {}) => {
    const torzs = JSON.stringify({ id: 'evt_teszt', type: tipus, data: { object: munkamenet } });
    const fejlec = alairas ?? Stripe.webhooks.generateTestHeaderString({ payload: torzs, secret: WEBHOOK_TITOK });
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
    assert.equal(await (await AlkatreszModel.findById(termek._id)).keszlet, 1, 'a készlet a fizetésig le van foglalva');

    const munkamenet = { id: rendeles.fizetes.munkamenetId, payment_status: 'paid', metadata: { rendelesId: String(rendeles._id) } };
    assert.equal(await webhook('checkout.session.completed', munkamenet, { alairas: 't=1,v1=hamis' }), 400);
    assert.equal((await RendelesModel.findById(rendeles._id)).fizetes.statusz, 'fuggo');

    assert.equal(await webhook('checkout.session.completed', munkamenet), 200);
    const fizetett = await RendelesModel.findById(rendeles._id);
    assert.equal(fizetett.fizetes.statusz, 'fizetve');
    assert.equal(fizetett.statusz, 'uj');

    // Ismételt kézbesítés (a Stripe újraküldhet) nem okoz gondot.
    assert.equal(await webhook('checkout.session.completed', munkamenet), 200);
    assert.equal((await RendelesModel.findById(rendeles._id)).esemenyek.length, 2);
});

test('lejárt fizetés: a rendelés lemondva, a készlet felszabadul – de csak az aktuális munkamenetre', async () => {
    const termek = await k.alkatreszMentese({ keszlet: 1 });
    const { adat } = await k.kliens().post('/rendelesek', kartyas([tetel(termek)]));
    const rendeles = await RendelesModel.findOne();
    const regiMunkamenet = rendeles.fizetes.munkamenetId;

    // A vevő újrapróbálja a fizetést: új munkamenet; a régi lejárta már nem mondhatja le a rendelést.
    const ujra = await k.kliens().post(`/rendelesek/${adat.rendelesSzam}/fizetes?kulcs=${adat.kulcs}`);
    assert.equal(ujra.status, 200);
    assert.equal(await webhook('checkout.session.expired', { id: regiMunkamenet }), 200);
    assert.equal((await RendelesModel.findById(rendeles._id)).statusz, 'fizetesre_var');

    const aktualis = (await RendelesModel.findById(rendeles._id)).fizetes.munkamenetId;
    assert.notEqual(aktualis, regiMunkamenet);
    assert.equal(await webhook('checkout.session.expired', { id: aktualis }), 200);
    assert.equal((await RendelesModel.findById(rendeles._id)).statusz, 'lemondva');
    assert.equal((await AlkatreszModel.findById(termek._id)).keszlet, 1);
});

test('ha az online fizetés nem indul el: 502, a rendelés lemondva, a készlet visszakerül', async () => {
    const termek = await k.alkatreszMentese({ keszlet: 3 });
    k.fizetes.fizetesInditasa = async () => { throw new Error('Stripe nem elérhető'); };
    const eredetiHiba = console.error;
    console.error = () => {};
    try {
        const valasz = await k.kliens().post('/rendelesek', kartyas([tetel(termek, 2)]));
        assert.equal(valasz.status, 502);
    } finally {
        k.fizetes.fizetesInditasa = eredetiInditas;
        console.error = eredetiHiba;
    }
    assert.equal((await RendelesModel.findOne()).statusz, 'lemondva');
    assert.equal((await AlkatreszModel.findById(termek._id)).keszlet, 3);
});

test('dashboard webshop-blokk: rendelések és bevétel; értékesítőnél forintösszeg nélkül', async () => {
    const termek = await k.alkatreszMentese({ ar: 50000, keszlet: 3, nev: 'Sport levegőszűrő' });
    const vendeg = k.kliens();
    await vendeg.post('/rendelesek', k.rendelesTorzs([tetel(termek, 2)])); // 100 000 + ingyenes szállítás + 590 utánvét
    await vendeg.post('/rendelesek', k.rendelesTorzs([tetel(termek, 1)])); // 50 000 + 2490 + 590 → 1 db marad

    const admin = await k.bejelentkezve('admin');
    const { webshop } = (await admin.get('/admin/dashboard?idoszak=30')).adat;
    assert.equal(webshop.rendelesek, 2);
    assert.equal(webshop.bevetel, 100590 + 53080);
    assert.equal(webshop.atlagKosar, Math.round((100590 + 53080) / 2));
    assert.equal(webshop.teendo, 2);
    assert.equal(webshop.alacsonyKeszlet, 0, 'a megmaradt 0 db „elfogyott”, nem „alacsony”');
    assert.equal(webshop.elfogyott, 1);
    assert.deepEqual(webshop.top.map((t) => [t.nev, t.db, t.bevetel]), [['Sport levegőszűrő', 3, 150000]]);

    const ertekesito = await k.bejelentkezve('ertekesito');
    const e = (await ertekesito.get('/admin/dashboard?idoszak=30')).adat.webshop;
    assert.equal(e.rendelesek, 2);
    assert.equal(e.bevetel, undefined);
    assert.equal(e.atlagKosar, undefined);
    assert.deepEqual(e.top, [{ id: String(termek._id), nev: 'Sport levegőszűrő', cikkszam: termek.cikkszam, db: 3 }]);
});
