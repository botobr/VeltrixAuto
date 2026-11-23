const Stripe = require('stripe');
const { oldalUrl } = require('./email');
const { SZALLITASI_MODOK } = require('./webshop');

// Online kártyás fizetés Stripe Checkouttal.
// A vevő a Stripe saját oldalán fizet, így a kártyaadatok nem jönnek el a mi szerverünkre.
// A .env-ben kell: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
// Ha ezek nincsenek beállítva, a kártyás fizetés nem választható.

let kliens = null;

const stripe = () => {
    if (kliens === null) {
        kliens = new Stripe(process.env.STRIPE_SECRET_KEY);
    }
    return kliens;
};

const kartyaElerheto = () => {
    if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) {
        return true;
    }
    return false;
};

// A Stripe-nál a forintot 100-zal szorozva kell megadni (fillérben).
const fillerben = (forint) => Math.round(forint) * 100;

// Termékkép a Stripe fizetőoldalra. Csak https kép jó, mert a Stripe tölti le.
// A Cloudinary képből kis négyzetes képet kérünk.
const stripeKep = (url) => {
    if (typeof url !== 'string' || !url.startsWith('https://')) {
        return null;
    }
    if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
        return url.replace('/upload/', '/upload/c_fill,g_auto,w_200,h_200,f_jpg,q_auto/');
    }
    return url;
};

// egy sor a Stripe fizetőoldalon
const stripeTetel = (nev, egysegar, mennyiseg = 1, kep = null) => {
    const termek = { name: nev };
    const kepUrl = stripeKep(kep);
    if (kepUrl) {
        termek.images = [kepUrl];
    }

    return {
        quantity: mennyiseg,
        price_data: {
            currency: 'huf',
            unit_amount: fillerben(egysegar),
            product_data: termek,
        },
    };
};

// Elindítja a fizetést, a vevőt a visszakapott url-re kell átirányítani.
const fizetesInditasa = async (rendeles, hozzaferesKulcs) => {
    const vissza = oldalUrl() + '/rendeles/' + encodeURIComponent(rendeles.rendelesSzam) + '?kulcs=' + hozzaferesKulcs;

    const sorok = [];
    for (const tetel of rendeles.tetelek) {
        sorok.push(stripeTetel(tetel.nev + ' (' + tetel.cikkszam + ')', tetel.egysegar, tetel.mennyiseg, tetel.kep));
    }

    // A szállítás mindig külön sor (ingyenesnél 0 Ft), mert így a Stripe
    // a termékeket listában, kis képpel mutatja.
    let szallitasNev = 'Szállítás';
    if (rendeles.szallitas && SZALLITASI_MODOK[rendeles.szallitas.mod]) {
        szallitasNev = SZALLITASI_MODOK[rendeles.szallitas.mod].nev;
    }
    if (rendeles.osszegek.szallitas > 0) {
        sorok.push(stripeTetel('Szállítási díj – ' + szallitasNev, rendeles.osszegek.szallitas));
    } else {
        sorok.push(stripeTetel(szallitasNev + ' – ingyenes', 0));
    }

    if (rendeles.osszegek.kezelesiDij > 0) {
        sorok.push(stripeTetel('Kezelési díj', rendeles.osszegek.kezelesiDij));
    }

    const munkamenet = await stripe().checkout.sessions.create({
        mode: 'payment',
        customer_email: rendeles.vevo.email,
        client_reference_id: String(rendeles._id),
        metadata: { rendelesId: String(rendeles._id), rendelesSzam: rendeles.rendelesSzam },
        line_items: sorok,
        // 30 perc után lejár, és a lefoglalt készlet visszakerül
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        success_url: vissza + '&fizetes=siker',
        cancel_url: vissza + '&fizetes=megszakitva',
        locale: 'hu',
    });

    return { url: munkamenet.url, munkamenetId: munkamenet.id };
};

// A Stripe értesítésének (webhook) ellenőrzése az aláírással.
// Visszaadja: { tipus: 'fizetve' | 'lejart' | null, munkamenetId, rendelesId }
const webhookFeldolgozasa = (nyersTorzs, alairas) => {
    // ha az aláírás rossz, ez hibát dob
    const esemeny = stripe().webhooks.constructEvent(nyersTorzs, alairas, process.env.STRIPE_WEBHOOK_SECRET);

    let munkamenet = {};
    if (esemeny.data && esemeny.data.object) {
        munkamenet = esemeny.data.object;
    }

    let rendelesId = munkamenet.client_reference_id;
    if (munkamenet.metadata && munkamenet.metadata.rendelesId) {
        rendelesId = munkamenet.metadata.rendelesId;
    }

    let tipus = null;
    if (esemeny.type === 'checkout.session.completed' && munkamenet.payment_status === 'paid') {
        tipus = 'fizetve';
    } else if (esemeny.type === 'checkout.session.async_payment_succeeded') {
        tipus = 'fizetve';
    } else if (esemeny.type === 'checkout.session.expired' || esemeny.type === 'checkout.session.async_payment_failed') {
        tipus = 'lejart';
    }

    return { munkamenetId: munkamenet.id, rendelesId: rendelesId, tipus: tipus };
};

// Egy fizetési munkamenet állapota a Stripe-nál: 'fizetve', 'lejart' vagy 'nyitott'.
// Az időzített takarítás használja, ha egy webhook valamiért nem érkezett meg.
const munkamenetAllapota = async (munkamenetId) => {
    const munkamenet = await stripe().checkout.sessions.retrieve(munkamenetId);
    if (munkamenet.payment_status === 'paid') {
        return 'fizetve';
    }
    if (munkamenet.status === 'expired') {
        return 'lejart';
    }
    return 'nyitott';
};

// A kifizetett összeg teljes visszatérítése (lemondáskor).
// Visszaadja: { id, osszeg } (az összeg forintban)
const visszaterites = async (munkamenetId) => {
    if (!munkamenetId) {
        throw new Error('A rendeléshez nem tartozik online fizetés.');
    }
    const munkamenet = await stripe().checkout.sessions.retrieve(munkamenetId);
    if (!munkamenet.payment_intent) {
        throw new Error('A Stripe-nál nem található a fizetés.');
    }

    let paymentIntentId = munkamenet.payment_intent;
    if (typeof paymentIntentId !== 'string') {
        paymentIntentId = paymentIntentId.id;
    }

    const refund = await stripe().refunds.create({ payment_intent: paymentIntentId });
    // a Stripe fillérben adja vissza (100-zal szorozva)
    return { id: refund.id, osszeg: refund.amount / 100 };
};

module.exports = { kartyaElerheto, fizetesInditasa, webhookFeldolgozasa, munkamenetAllapota, visszaterites };
