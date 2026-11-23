// A Billingónak küldött számla adatainak ellenőrzése (hálózat nélkül).
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { partnerAdatok, szamlaAdatok } = require('../utils/szamlazas');

const rendeles = {
    rendelesSzam: 'VX-2026-00042',
    vevo: { nev: 'Nagy Péter', email: 'peter@teszt.hu', telefon: '+36 30 111 2222' },
    szamlazasiCim: { nev: 'Nagy Péter', adoszam: '', iranyitoszam: '1111', varos: 'Budapest', cim: 'Fő utca 1.' },
    tetelek: [
        { nev: 'Sport levegőszűrő', cikkszam: 'KN-1', egysegar: 32900, mennyiseg: 2 },
    ],
    osszegek: { termekek: 65800, szallitas: 2490, kezelesiDij: 590, vegosszeg: 68880 },
    fizetes: { mod: 'utanvet', statusz: 'fizetve' },
};

test('számla adatai: bruttó árak 27% ÁFA-val, szállítás és kezelési díj külön sorban', () => {
    const adatok = szamlaAdatok(rendeles, 55, '123', new Date('2026-11-20T23:30:00Z'));

    assert.equal(adatok.partner_id, 55);
    assert.equal(adatok.block_id, 123);
    assert.equal(adatok.type, 'invoice');
    assert.equal(adatok.payment_method, 'cash_on_delivery');
    assert.equal(adatok.currency, 'HUF');
    assert.equal(adatok.paid, true);
    // budapesti idő szerint már november 21. van
    assert.equal(adatok.fulfillment_date, '2026-11-21');

    assert.equal(adatok.items.length, 3);
    assert.deepEqual(adatok.items[0], {
        name: 'Sport levegőszűrő (KN-1)', unit_price: 32900, unit_price_type: 'gross', quantity: 2, unit: 'db', vat: '27%',
    });
    assert.equal(adatok.items[1].name, 'Szállítási díj');
    assert.equal(adatok.items[2].unit_price, 590);

    // a tételek összege megegyezik a végösszeggel
    let osszeg = 0;
    for (const tetel of adatok.items) {
        osszeg += tetel.unit_price * tetel.quantity;
    }
    assert.equal(osszeg, rendeles.osszegek.vegosszeg);
});

test('ingyenes szállításnál nincs szállítási sor; kártyánál online bankkártya a fizetési mód', () => {
    const kartyas = {
        ...rendeles,
        osszegek: { termekek: 65800, szallitas: 0, kezelesiDij: 0, vegosszeg: 65800 },
        fizetes: { mod: 'kartya', statusz: 'fizetve' },
    };
    const adatok = szamlaAdatok(kartyas, 1, 1);
    assert.equal(adatok.items.length, 1);
    assert.equal(adatok.payment_method, 'online_bankcard');
});

test('partner: magánszemély adószám nélkül, cég adószámmal', () => {
    const maganszemely = partnerAdatok(rendeles);
    assert.equal(maganszemely.tax_type, 'NO_TAX_NUMBER');
    assert.equal(maganszemely.taxcode, undefined);
    assert.deepEqual(maganszemely.address, { country_code: 'HU', post_code: '1111', city: 'Budapest', address: 'Fő utca 1.' });

    const ceges = partnerAdatok({ ...rendeles, szamlazasiCim: { ...rendeles.szamlazasiCim, nev: 'Teszt Kft.', adoszam: '12345678-2-42' } });
    assert.equal(ceges.name, 'Teszt Kft.');
    assert.equal(ceges.taxcode, '12345678-2-42');
    assert.equal(ceges.tax_type, 'HAS_TAX_NUMBER');
});
