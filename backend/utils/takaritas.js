// Időzített takarítás: a ki nem fizetett rendelések lemondása, hogy a lefoglalt készlet felszabaduljon.
//
// 1. Előre utalás: ha 8 napon belül nem érkezik meg a pénz, a rendelést lemondjuk (a vevő e-mailt kap).
// 2. Kártyás fizetés: a Stripe fizetési munkamenet 30 perc után lejár, és erről webhookot küld.
//    Ha ez a webhook valamiért nem érkezik meg, a rendelés örökre "fizetésre vár" maradna.
//    Ezért megkérdezzük a Stripe-ot: ha közben kifizették, rögzítjük a fizetést, ha lejárt, lemondjuk.
//
// A server.js indítja el (10 percenként fut). A tesztekben nem fut magától.

const RendelesModel = require('../models/Rendeles');
const fizetes = require('./fizetes');
const { UTALASI_HATARIDO_NAP } = require('./webshop');
const {
    boltErtesites, fizetveJelolese, lemondas, szamlaKeszitese, vevoErtesites,
} = require('./rendelesek');

const NAP_MS = 24 * 60 * 60 * 1000;
const PERC_MS = 60 * 1000;
// a Stripe munkamenet 30 perc után jár le, ehhez adunk még 15 perc ráhagyást
const KARTYA_VARAKOZAS_PERC = 45;

// lejárt átutalásos rendelések lemondása
const lejartUtalasok = async (most) => {
    const hatar = new Date(most.getTime() - UTALASI_HATARIDO_NAP * NAP_MS);
    const rendelesek = await RendelesModel.find({
        statusz: 'fizetesre_var',
        'fizetes.mod': 'atutalas',
        'fizetes.statusz': 'fuggo',
        createdAt: { $lte: hatar },
    }).select('+hozzaferesKulcs');

    let db = 0;
    for (const rendeles of rendelesek) {
        await lemondas(rendeles, 'Automatikusan lemondva: az átutalás ' + UTALASI_HATARIDO_NAP + ' napon belül nem érkezett meg.');
        vevoErtesites(
            rendeles,
            rendeles.hozzaferesKulcs,
            'Rendelésed lemondva',
            'A rendelésedet lemondtuk, mert az előre utalás ' + UTALASI_HATARIDO_NAP + ' napon belül nem érkezett meg. Ha közben elutaltad az összeget, kérjük, írj nekünk, és visszautaljuk.',
        );
        db++;
    }
    return db;
};

// beragadt kártyás rendelések ellenőrzése
const beragadtKartyasFizetesek = async (most) => {
    // az updatedAt akkor is frissül, ha a vevő újraindítja a fizetést
    const hatar = new Date(most.getTime() - KARTYA_VARAKOZAS_PERC * PERC_MS);
    const rendelesek = await RendelesModel.find({
        statusz: 'fizetesre_var',
        'fizetes.mod': 'kartya',
        'fizetes.statusz': 'fuggo',
        updatedAt: { $lte: hatar },
    }).select('+hozzaferesKulcs');

    let lemondva = 0;
    let fizetve = 0;
    for (const rendeles of rendelesek) {
        // ha nincs Stripe beállítva (vagy nincs munkamenet), nem tudjuk megkérdezni, így lejártnak vesszük
        let allapot = 'lejart';
        if (fizetes.kartyaElerheto() && rendeles.fizetes.munkamenetId) {
            try {
                allapot = await fizetes.munkamenetAllapota(rendeles.fizetes.munkamenetId);
            } catch (error) {
                // ha a Stripe most nem elérhető, legközelebb újra próbáljuk
                console.error('Stripe lekérdezés sikertelen (' + rendeles.rendelesSzam + '): ' + error.message);
                continue;
            }
        }

        if (allapot === 'fizetve') {
            // a fizetés megtörtént, csak a webhook veszett el
            fizetveJelolese(rendeles, 'Online fizetés sikeres (utólagos ellenőrzés).');
            await rendeles.save();
            vevoErtesites(rendeles, rendeles.hozzaferesKulcs, 'Sikeres fizetés', 'A fizetésed sikeres volt, köszönjük! Hamarosan megkezdjük az összekészítést.');
            boltErtesites(rendeles);
            await szamlaKeszitese(rendeles);
            fizetve++;
        } else if (allapot === 'lejart') {
            await lemondas(rendeles, 'Az online fizetés nem történt meg, a lefoglalt készlet felszabadult.');
            lemondva++;
        }
        // ha még 'nyitott', várunk
    }
    return { lemondva, fizetve };
};

// egy takarítás lefuttatása, visszaadja, mi történt
const lejartFoglalasokTakaritasa = async (most = new Date()) => {
    const utalasLemondva = await lejartUtalasok(most);
    const kartya = await beragadtKartyasFizetesek(most);
    return {
        utalasLemondva: utalasLemondva,
        kartyaLemondva: kartya.lemondva,
        kartyaFizetve: kartya.fizetve,
    };
};

// az időzítő indítása (a server.js hívja)
const takaritasInditasa = (percenkent = 10) => {
    const futtatas = async () => {
        try {
            const eredmeny = await lejartFoglalasokTakaritasa();
            const osszes = eredmeny.utalasLemondva + eredmeny.kartyaLemondva + eredmeny.kartyaFizetve;
            if (osszes > 0) {
                console.log('Rendelés takarítás: ' + eredmeny.utalasLemondva + ' átutalásos és '
                    + eredmeny.kartyaLemondva + ' kártyás rendelés lemondva, ' + eredmeny.kartyaFizetve + ' fizetés utólag rögzítve.');
            }
        } catch (error) {
            console.error('Rendelés takarítás sikertelen: ' + error.message);
        }
    };

    futtatas();
    return setInterval(futtatas, percenkent * PERC_MS);
};

module.exports = { lejartFoglalasokTakaritasa, takaritasInditasa };
