const Stripe = require('stripe');
const { oldalUrl } = require('./email');

/*
 * Online kártyás fizetés – Stripe Checkout (a Stripe saját fizetőoldala, így
 * kártyaadat soha nem jut el a mi szerverünkre). Ez az egyetlen fájl, amely a
 * szolgáltatót ismeri: másik szolgáltatóra (Barion, SimplePay) váltáskor ezt
 * a három függvényt kell újraírni.
 *
 * Beállítás (.env): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
 * Ha nincs beállítva, a kártyás fizetés egyszerűen nem választható.
 */

let kliens;
const stripe = () => {
    if (!kliens) kliens = new Stripe(process.env.STRIPE_SECRET_KEY);
    return kliens;
};

const kartyaElerheto = () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);

// A forint a Stripe-nál „két tizedes” pénznem: az összeget 100-zal szorozva kell megadni.
const fillerben = (forint) => Math.round(forint) * 100;

/** Fizetési munkamenet indítása; a vevőt a visszakapott URL-re kell irányítani. */
const fizetesInditasa = async (rendeles, hozzaferesKulcs) => {
    const vissza = `${oldalUrl()}/rendeles/${encodeURIComponent(rendeles.rendelesSzam)}?kulcs=${hozzaferesKulcs}`;
    const tetel = (nev, egysegar, mennyiseg = 1) => ({
        quantity: mennyiseg,
        price_data: { currency: 'huf', unit_amount: fillerben(egysegar), product_data: { name: nev } },
    });
    const munkamenet = await stripe().checkout.sessions.create({
        mode: 'payment',
        customer_email: rendeles.vevo.email,
        client_reference_id: String(rendeles._id),
        metadata: { rendelesId: String(rendeles._id), rendelesSzam: rendeles.rendelesSzam },
        line_items: [
            ...rendeles.tetelek.map((t) => tetel(`${t.nev} (${t.cikkszam})`, t.egysegar, t.mennyiseg)),
            ...(rendeles.osszegek.szallitas > 0 ? [tetel('Szállítási díj', rendeles.osszegek.szallitas)] : []),
            ...(rendeles.osszegek.kezelesiDij > 0 ? [tetel('Kezelési díj', rendeles.osszegek.kezelesiDij)] : []),
        ],
        // A lefoglalt készlet 30 perc után felszabadul, ha a fizetés nem történik meg.
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        success_url: `${vissza}&fizetes=siker`,
        cancel_url: `${vissza}&fizetes=megszakitva`,
        locale: 'hu',
    });
    return { url: munkamenet.url, munkamenetId: munkamenet.id };
};

/**
 * A szolgáltató visszajelzésének ellenőrzése (aláírás!) és egységes formára hozása.
 * Visszaad: { tipus: 'fizetve' | 'lejart' | null, munkamenetId, rendelesId }.
 */
const webhookFeldolgozasa = (nyersTorzs, alairas) => {
    const esemeny = stripe().webhooks.constructEvent(nyersTorzs, alairas, process.env.STRIPE_WEBHOOK_SECRET);
    const munkamenet = esemeny.data?.object || {};
    const alap = { munkamenetId: munkamenet.id, rendelesId: munkamenet.metadata?.rendelesId || munkamenet.client_reference_id };
    if ((esemeny.type === 'checkout.session.completed' && munkamenet.payment_status === 'paid')
        || esemeny.type === 'checkout.session.async_payment_succeeded') {
        return { ...alap, tipus: 'fizetve' };
    }
    if (esemeny.type === 'checkout.session.expired' || esemeny.type === 'checkout.session.async_payment_failed') {
        return { ...alap, tipus: 'lejart' };
    }
    return { ...alap, tipus: null };
};

module.exports = { kartyaElerheto, fizetesInditasa, webhookFeldolgozasa };
