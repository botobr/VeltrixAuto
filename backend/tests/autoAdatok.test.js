const assert = require('node:assert/strict');
const { test } = require('node:test');
const { autoAdatokEllenorzese, allapotEllenorzese } = require('../utils/autoMezok');
const { autoSlug, idSlugbol, slugify } = require('../utils/slug');
const { parameterekTisztitasa, szuroEpitese, autoValasz } = require('../utils/autoSzuro');

const kep = { url: 'https://res.cloudinary.com/demo/image/upload/v1/veltrix/autok/a.jpg', publicId: 'veltrix/autok/a', tipus: 'kulso' };
const alapAuto = {
    marka: 'BMW',
    modell: '320d',
    szin: 'Fekete',
    kivitel: 'Sedan',
    uzemanyag: 'Dízel',
    szarmazasi_hely: 'Németország',
    evjarat: 2019,
    vetel_ar: 8990000,
    teljesitmeny: 190,
    hengerur_tartalom: 1995,
    kmora_allas: 85000,
    kepek: [kep],
};

test('érvényes autóadatok: nincs hiba, alapértékek beállnak', () => {
    const { adatok, hibak } = autoAdatokEllenorzese(alapAuto);
    assert.deepEqual(hibak, []);
    assert.equal(adatok.statusz, 'elerheto');
    assert.equal(adatok.lathato, true);
    assert.equal(adatok.kiemelt, false);
    assert.deepEqual(adatok.felszereltseg, []);
    assert.equal(adatok.valto, null);
});

test('hiányzó kötelező mező és kép nélküli autó: hiba', () => {
    const { hibak } = autoAdatokEllenorzese({ ...alapAuto, marka: '  ', kepek: [] });
    const osszesHiba = hibak.join(' | ');
    assert.ok(osszesHiba.includes('Márka'));
    assert.ok(osszesHiba.includes('képet'));
});

test('ismeretlen váltó, hibás alvázszám és tört évjárat: hiba', () => {
    const { hibak } = autoAdatokEllenorzese({ ...alapAuto, valto: 'Kézi-gépi', alvazszam: 'ABC', evjarat: 2019.5 });
    assert.equal(hibak.length, 3);
});

test('idegen domainről származó kép nem fogadható el', () => {
    const idegenKep = { url: 'https://gonosz.example/x.jpg', publicId: 'veltrix/autok/x' };
    const { hibak } = autoAdatokEllenorzese({ ...alapAuto, kepek: [idegenKep] });
    assert.ok(hibak.join(' | ').includes('kép'));
});

test('felszereltség: ismétlődések és üres elemek kiszűrve', () => {
    const { adatok } = autoAdatokEllenorzese({ ...alapAuto, felszereltseg: ['Klíma', ' Klíma ', '', 'Navigáció'] });
    assert.deepEqual(adatok.felszereltseg, ['Klíma', 'Navigáció']);
});

test('állapotmódosítás: csak az engedélyezett mezők, érvényes státusz', () => {
    // a márkát itt nem lehet módosítani, kimarad
    const jo = allapotEllenorzese({ statusz: 'foglalt', marka: 'X' });
    assert.deepEqual(jo.adatok, { statusz: 'foglalt' });

    const rosszStatusz = allapotEllenorzese({ statusz: 'eladva' });
    assert.equal(rosszStatusz.hibak.length, 1);

    const ures = allapotEllenorzese({});
    assert.equal(ures.hibak.length, 1);
});

test('slug: ékezetek eltávolítva, azonosító visszanyerhető', () => {
    assert.equal(slugify('Škoda Octávia Kombi 2.0 TDI'), 'skoda-octavia-kombi-2-0-tdi');
    assert.equal(slugify('Őrült gyűjtemény'), 'orult-gyujtemeny');
    const auto = { _id: '65f1c2a4b7e8d90012345678', marka: 'Mercedes-Benz', modell: '300 SL', evjarat: 1956 };
    assert.equal(autoSlug(auto), 'mercedes-benz-300-sl-1956-65f1c2a4b7e8d90012345678');
    assert.equal(idSlugbol(autoSlug(auto)), auto._id);
    assert.equal(idSlugbol('nincs-azonosito'), null);
});

test('szűrő: tartományok, többes érték és nyilvános feltételek', async () => {
    const szuro = await szuroEpitese({ minAr: '1000000', maxAr: '', valto: 'Automata,Manuális', garancias: '1' });
    const feltetelek = szuro.$and;

    // megkeressük a feltételek között az egyes mezőket
    const keres = (mezo) => feltetelek.find((feltetel) => feltetel[mezo] !== undefined);

    assert.ok(keres('lathato'));
    assert.equal(keres('statusz').statusz.$ne, 'elkelt');
    assert.equal(keres('vetel_ar').vetel_ar.$gte, 1000000);
    assert.equal(keres('vetel_ar').vetel_ar.$lte, undefined);
    assert.equal(keres('valto').valto.$in.length, 2);
    assert.equal(keres('garancia_honap').garancia_honap.$gt, 0);
});

test('szűrő: reguláris kifejezés karakterei nem törik el a keresést', async () => {
    const szuro = await szuroEpitese({ q: 'a.b*(' }, { publikus: false });
    const minta = szuro.$and[0].$or[0].marka;
    assert.ok(minta.test('a.b*('));
    assert.ok(!minta.test('axbbb'));
});

test('mentett keresés: ismeretlen kulcsok eldobva', () => {
    const tisztitott = parameterekTisztitasa({ marka: 'BMW', $where: 'x', kmIg: 100000, ures: '' });
    assert.deepEqual(tisztitott, { marka: 'BMW', kmIg: '100000' });
});

test('nyilvános válasz: belső adatok rejtve, régi egyképes rekord képtömbbé alakul', () => {
    const valasz = autoValasz({
        _id: '65f1c2a4b7e8d90012345678', marka: 'BMW', modell: 'M3', evjarat: 2001,
        kep: 'https://res.cloudinary.com/x.jpg', kepPublicId: 'veltrix/autok/x', kepek: [],
        alvazszam: 'WBSBL93435JR12345', megtekintesek: 10, lathato: true,
        statusz: 'elkelt', eladasi_ar: 8500000, eladas_datum: new Date(),
    });
    assert.equal(valasz.kepek.length, 1);
    assert.equal(valasz.kepek[0].publicId, undefined);
    assert.equal(valasz.megtekintesek, undefined);
    assert.equal(valasz.eladasi_ar, undefined);
    assert.equal(valasz.eladas_datum, undefined);
    assert.equal(valasz.alvazszam, 'WBSBL93435J••••••');
    assert.equal(valasz.slug, 'bmw-m3-2001-65f1c2a4b7e8d90012345678');
});
