import { autoValasztasiLehetosegek } from './autoValasztasiLehetosegek';

export { autoValasztasiLehetosegek };

export const VALTOK = ['Manuális', 'Automata', 'Félautomata', 'Fokozatmentes (CVT)'];
export const HAJTASOK = ['Elsőkerék', 'Hátsókerék', 'Összkerék'];

export const STATUSZOK = {
    elerheto: 'Elérhető',
    foglalt: 'Foglalva',
    elkelt: 'Elkelt',
};

export const KEP_TIPUSOK = {
    kulso: 'Külső',
    belso: 'Belső tér',
    muszerfal: 'Műszerfal',
    motorter: 'Motortér',
    csomagter: 'Csomagtér',
    serules: 'Sérülés',
    termek: 'Termékfotó',
    egyeb: 'Egyéb',
};

export const MEGYEK = [
    'Budapest', 'Bács-Kiskun', 'Baranya', 'Békés', 'Borsod-Abaúj-Zemplén', 'Csongrád-Csanád', 'Fejér',
    'Győr-Moson-Sopron', 'Hajdú-Bihar', 'Heves', 'Jász-Nagykun-Szolnok', 'Komárom-Esztergom', 'Nógrád',
    'Pest', 'Somogy', 'Szabolcs-Szatmár-Bereg', 'Tolna', 'Vas', 'Veszprém', 'Zala',
];

export const FELSZERELTSEG_CSOPORTOK = {
    Kényelem: [
        'Klíma', 'Kétzónás digitális klíma', 'Ülésfűtés', 'Ülésszellőztetés', 'Kormányfűtés', 'Elektromos ülésállítás',
        'Memóriás ülés', 'Bőr belső', 'Kulcsnélküli nyitás/indítás', 'Elektromos csomagtérajtó', 'Tempomat',
        'Adaptív tempomat', 'Napfénytető', 'Panorámatető', 'Állófűtés', 'Elektromos ablakemelő',
    ],
    Biztonság: [
        'ABS', 'ESP', 'Sávtartó asszisztens', 'Holttérfigyelő', 'Vészfékrendszer', 'Táblafelismerés',
        'Tolatókamera', '360°-os kamera', 'Parkolóradar elöl', 'Parkolóradar hátul', 'Parkolóasszisztens',
        'ISOFIX', 'Fáradtságérzékelő', 'Head-up display',
    ],
    'Multimédia és navigáció': [
        'Navigáció', 'Apple CarPlay', 'Android Auto', 'Bluetooth kihangosító', 'Prémium hifi',
        'Digitális műszerfal', 'Vezeték nélküli töltő', 'USB-C csatlakozók',
    ],
    'Külső és futómű': [
        'LED fényszóró', 'Mátrix LED fényszóró', 'Xenon fényszóró', 'Könnyűfém felni', 'Vonóhorog',
        'Sötétített üvegek', 'Tetősín', 'Sportfutómű', 'Légrugózás', 'Téli gumi garnitúra',
    ],
};

// Az autó űrlap részei és mezői. Egy mező: [mező neve, felirat, típus, beállítások]
// Típusok: text, number, select (listából vagy saját érték), enum (csak listából), date, bool (igen/nem), textarea
export const AUTO_SZEKCIOK = [
    {
        cim: 'Alapadatok',
        mezok: [
            ['marka', 'Márka', 'text', { kotelezo: true, placeholder: 'pl. BMW' }],
            ['modell', 'Modell', 'text', { kotelezo: true, placeholder: 'pl. 320d' }],
            ['evjarat', 'Évjárat', 'number', { kotelezo: true, placeholder: 'pl. 2020', min: 1886 }],
            ['vetel_ar', 'Vételár', 'number', { kotelezo: true, placeholder: 'pl. 8990000', egyseg: 'Ft' }],
            ['kmora_allas', 'Kilométeróra állása', 'number', { kotelezo: true, placeholder: 'pl. 85000', egyseg: 'km' }],
            ['kivitel', 'Kivitel (karosszéria)', 'select', { kotelezo: true }],
            ['szin', 'Szín', 'select', { kotelezo: true }],
            ['szarmazasi_hely', 'Származási hely', 'select', { kotelezo: true }],
        ],
    },
    {
        cim: 'Műszaki adatok',
        mezok: [
            ['uzemanyag', 'Üzemanyag', 'select', { kotelezo: true }],
            ['valto', 'Sebességváltó', 'enum', { ertekek: VALTOK }],
            ['hajtas', 'Hajtás', 'enum', { ertekek: HAJTASOK }],
            ['teljesitmeny', 'Teljesítmény', 'number', { kotelezo: true, placeholder: 'pl. 190', egyseg: 'LE' }],
            ['hengerur_tartalom', 'Hengerűrtartalom', 'number', { kotelezo: true, placeholder: 'villanyautónál 0', egyseg: 'cm³' }],
            ['fogyasztas', 'Vegyes fogyasztás', 'number', { placeholder: 'pl. 5,8', egyseg: 'l/100 km', tort: true }],
            ['co2', 'CO₂-kibocsátás', 'number', { placeholder: 'pl. 132', egyseg: 'g/km' }],
            ['ajtok_szama', 'Ajtók száma', 'number', { placeholder: 'pl. 5', min: 1, max: 9 }],
            ['ulesek_szama', 'Ülések száma', 'number', { placeholder: 'pl. 5', min: 1, max: 60 }],
        ],
    },
    {
        cim: 'Előélet és állapot',
        mezok: [
            ['elso_forgalomba_helyezes', 'Első forgalomba helyezés', 'date'],
            ['muszaki_vizsga', 'Műszaki vizsga érvényes', 'date'],
            ['tulajdonosok_szama', 'Tulajdonosok száma', 'number', { placeholder: 'pl. 2', min: 0, max: 50 }],
            ['garancia_honap', 'Garancia', 'number', { placeholder: '0 = nincs', egyseg: 'hónap', min: 0, max: 120 }],
            ['szervizkonyv', 'Vezetett szervizkönyv', 'bool'],
            ['serulesmentes', 'Sérülésmentes', 'bool'],
            ['alvazszam', 'Alvázszám (VIN)', 'text', { placeholder: '17 karakter', maxLength: 17, nagybetu: true, sugo: 'Nyilvánosan csak részben jelenik meg.' }],
            ['azonosito', 'Belső azonosító', 'text', { placeholder: 'pl. VX-0142', maxLength: 30 }],
        ],
    },
    {
        cim: 'Kapcsolattartó és leírás',
        mezok: [
            ['elado_nev', 'Kapcsolattartó neve', 'text', { placeholder: 'ha eltér a telephelytől', maxLength: 120 }],
            ['elado_telefonszam', 'Kapcsolattartó telefonszáma', 'tel', { placeholder: 'pl. +36 30 123 4567', maxLength: 40 }],
            ['leiras', 'Leírás', 'textarea', { placeholder: 'Állapot, felszereltség, előélet, egyedi jellemzők…', maxLength: 5000 }],
        ],
    },
];

// az összes mező egy listában
export const AUTO_MEZOK = [];
for (const szekcio of AUTO_SZEKCIOK) {
    for (const mezo of szekcio.mezok) {
        AUTO_MEZOK.push(mezo);
    }
}

// a hirdetés beállításai (nem az autó adatai, de ezeket is el kell küldeni)
const HIRDETES_MEZOK = ['statusz', 'lathato', 'kiemelt', 'lejarat', 'telephely', 'eladas_datum', 'eladasi_ar'];

// dátum az <input type="date">-hez: 'ÉÉÉÉ-HH-NN'
const datumMezo = (ertek) => {
    if (!ertek) {
        return '';
    }
    return String(ertek).slice(0, 10);
};

// igen/nem mező a <select>-hez
const boolMezo = (ertek) => {
    if (ertek === true) {
        return 'true';
    }
    if (ertek === false) {
        return 'false';
    }
    return '';
};

const szovegge = (ertek) => {
    if (ertek === null || ertek === undefined) {
        return '';
    }
    return String(ertek);
};

// A szervertől kapott autóból űrlap adatok.
// Minden mező szöveg lesz, mert az inputok szöveget kezelnek.
export const urlapAdatokbol = (auto = {}) => {
    const adatok = {};
    for (const mezo of AUTO_MEZOK) {
        const nev = mezo[0];
        const tipus = mezo[2];
        if (tipus === 'date') {
            adatok[nev] = datumMezo(auto[nev]);
        } else if (tipus === 'bool') {
            adatok[nev] = boolMezo(auto[nev]);
        } else {
            adatok[nev] = szovegge(auto[nev]);
        }
    }

    adatok.felszereltseg = [];
    if (Array.isArray(auto.felszereltseg)) {
        adatok.felszereltseg = auto.felszereltseg;
    }

    // csak a feltöltött képek (amiknek van publicId-ja)
    adatok.kepek = [];
    if (Array.isArray(auto.kepek)) {
        adatok.kepek = auto.kepek.filter((kep) => kep.publicId);
    }

    adatok.statusz = auto.statusz || 'elerheto';
    adatok.lathato = auto.lathato !== false;
    adatok.kiemelt = Boolean(auto.kiemelt);
    adatok.lejarat = datumMezo(auto.lejarat);

    // a telephely lehet objektum (populate) vagy csak id
    adatok.telephely = '';
    if (auto.telephely && auto.telephely._id) {
        adatok.telephely = auto.telephely._id;
    } else if (auto.telephely) {
        adatok.telephely = auto.telephely;
    }

    adatok.eladas_datum = datumMezo(auto.eladas_datum);
    adatok.eladasi_ar = szovegge(auto.eladasi_ar);
    return adatok;
};

export const uresUrlap = () => urlapAdatokbol({});

// melyik listás mezőbe írtak saját értéket (ami nincs a listában)
export const egyediMezokAdatokbol = (adatok) => {
    const egyedi = {};
    for (const mezo of AUTO_MEZOK) {
        const nev = mezo[0];
        if (mezo[2] !== 'select') {
            continue;
        }
        egyedi[nev] = Boolean(adatok[nev]) && !autoValasztasiLehetosegek[nev].includes(adatok[nev]);
    }
    return egyedi;
};

// Az előnézet kártyához a szám és igen/nem mezők igazi értékként (nem szövegként).
export const szamMezokElonezethez = (adatok) => {
    const eredmeny = {};
    for (const mezo of AUTO_MEZOK) {
        const nev = mezo[0];
        const tipus = mezo[2];
        if (tipus !== 'number' && tipus !== 'bool') {
            continue;
        }

        const ertek = adatok[nev];
        if (ertek === '' || ertek === undefined) {
            eredmeny[nev] = null;
        } else if (tipus === 'bool') {
            eredmeny[nev] = ertek === 'true';
        } else {
            // tizedesvesszőt is elfogadunk
            eredmeny[nev] = Number(String(ertek).replace(',', '.'));
        }
    }
    return eredmeny;
};

// az adatok, amiket mentéskor elküldünk a szervernek
export const kuldhetoAdatok = (adatok) => {
    const kuldendo = {};
    for (const mezo of AUTO_MEZOK) {
        kuldendo[mezo[0]] = adatok[mezo[0]];
    }
    for (const mezo of HIRDETES_MEZOK) {
        kuldendo[mezo] = adatok[mezo];
    }
    kuldendo.felszereltseg = adatok.felszereltseg;
    kuldendo.kepek = adatok.kepek.map((kep) => ({ url: kep.url, publicId: kep.publicId, tipus: kep.tipus, leiras: kep.leiras }));
    return kuldendo;
};

// ---------- Formázás ----------

const szamFormatter = new Intl.NumberFormat('hu-HU');
const tizedesFormatter = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 1 });
const honapFormatter = new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'long' });
const datumFormatter = new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' });
const datumIdoFormatter = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short' });

export const formatSzam = (ertek) => szamFormatter.format(ertek);
export const formatTizedes = (ertek) => tizedesFormatter.format(ertek);

export const formatAr = (ertek) => {
    if (!ertek) {
        return 'Érdeklődj';
    }
    return szamFormatter.format(ertek) + ' Ft';
};

export const formatHonap = (ertek) => {
    if (!ertek) {
        return null;
    }
    return honapFormatter.format(new Date(ertek));
};

export const formatDatum = (ertek) => {
    if (!ertek) {
        return null;
    }
    return datumFormatter.format(new Date(ertek));
};

export const formatDatumIdo = (ertek) => {
    if (!ertek) {
        return null;
    }
    return datumIdoFormatter.format(new Date(ertek));
};

export const autoNev = (auto) => {
    return ((auto.marka || '') + ' ' + (auto.modell || '')).trim();
};

export const autoUrl = (auto) => {
    return '/autok/' + (auto.slug || auto._id);
};

export const igenNem = (ertek) => {
    if (ertek === true) {
        return 'Igen';
    }
    if (ertek === false) {
        return 'Nem';
    }
    return null;
};

// van-e értéke (nem null és nem undefined)
const vanErteke = (ertek) => ertek !== null && ertek !== undefined;

// Az adatlap táblázatának sorai: [felirat, érték]. Ahol nincs érték, az a sor kimarad.
export const muszakiAdatok = (auto) => {
    const sorok = [];

    sorok.push(['Évjárat', auto.evjarat]);
    sorok.push(['Első forgalomba helyezés', formatHonap(auto.elso_forgalomba_helyezes)]);
    if (vanErteke(auto.kmora_allas)) {
        sorok.push(['Kilométeróra állása', formatSzam(auto.kmora_allas) + ' km']);
    }
    sorok.push(['Kivitel', auto.kivitel]);
    sorok.push(['Üzemanyag', auto.uzemanyag]);
    sorok.push(['Sebességváltó', auto.valto]);
    sorok.push(['Hajtás', auto.hajtas]);
    if (vanErteke(auto.teljesitmeny)) {
        // 1 LE = 0,7355 kW
        const kw = Math.round(auto.teljesitmeny * 0.7355);
        sorok.push(['Teljesítmény', formatSzam(auto.teljesitmeny) + ' LE (' + formatSzam(kw) + ' kW)']);
    }
    if (auto.hengerur_tartalom) {
        sorok.push(['Hengerűrtartalom', formatSzam(auto.hengerur_tartalom) + ' cm³']);
    }
    if (vanErteke(auto.fogyasztas)) {
        const egyseg = auto.uzemanyag === 'Elektromos' ? 'kWh' : 'l';
        sorok.push(['Vegyes fogyasztás', formatTizedes(auto.fogyasztas) + ' ' + egyseg + '/100 km']);
    }
    if (vanErteke(auto.co2)) {
        sorok.push(['CO₂-kibocsátás', formatSzam(auto.co2) + ' g/km']);
    }
    if (vanErteke(auto.ajtok_szama) || vanErteke(auto.ulesek_szama)) {
        const ajtok = vanErteke(auto.ajtok_szama) ? auto.ajtok_szama : '–';
        const ulesek = vanErteke(auto.ulesek_szama) ? auto.ulesek_szama : '–';
        sorok.push(['Ajtók / ülések', ajtok + ' ajtó · ' + ulesek + ' ülés']);
    }
    sorok.push(['Szín', auto.szin]);
    sorok.push(['Származási hely', auto.szarmazasi_hely]);
    if (vanErteke(auto.tulajdonosok_szama)) {
        sorok.push(['Tulajdonosok száma', String(auto.tulajdonosok_szama)]);
    }
    sorok.push(['Műszaki vizsga érvényes', formatHonap(auto.muszaki_vizsga)]);
    if (auto.szervizkonyv === true) {
        sorok.push(['Szervizkönyv', 'Vezetett']);
    } else if (auto.szervizkonyv === false) {
        sorok.push(['Szervizkönyv', 'Nincs']);
    }
    sorok.push(['Sérülésmentes', igenNem(auto.serulesmentes)]);
    if (auto.garancia_honap) {
        sorok.push(['Garancia', auto.garancia_honap + ' hónap']);
    } else if (auto.garancia_honap === 0) {
        sorok.push(['Garancia', 'Nincs']);
    }
    sorok.push(['Alvázszám', auto.alvazszam || null]);
    sorok.push(['Hirdetéskód', auto.azonosito || null]);

    // az üres sorokat kihagyjuk
    return sorok.filter((sor) => sor[1] !== null && sor[1] !== undefined && sor[1] !== '');
};

// ---------- Képek ----------

export const MAX_FORRAS_KEP = 25 * 1024 * 1024;
const MAX_KULDOTT_KEP = 4 * 1024 * 1024;
const MAX_OLDAL = 2000;

// a fájl beolvasása base64 szövegként
const fajlbolDataUrl = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('A kép beolvasása nem sikerült.'));
        reader.readAsDataURL(file);
    });
};

// Feltöltés előtt a böngészőben kicsinyítjük és tömörítjük a képet (JPEG, max 2000 px),
// így gyorsabb a feltöltés.
export const kepTomoritese = async (file) => {
    if (!file.type.startsWith('image/')) {
        throw new Error(file.name + ': nem képfájl.');
    }
    if (file.size > MAX_FORRAS_KEP) {
        throw new Error(file.name + ': legfeljebb 25 MB lehet.');
    }

    let bitmap;
    try {
        bitmap = await createImageBitmap(file);
    } catch {
        // ha a böngésző nem tudja megnyitni (pl. HEIC), de elég kicsi, akkor úgy küldjük el, ahogy van
        if (file.size <= MAX_KULDOTT_KEP && /^image\/(jpeg|png|webp|avif)$/.test(file.type)) {
            return fajlbolDataUrl(file);
        }
        throw new Error(file.name + ': ezt a képformátumot a böngésző nem tudja feldolgozni.');
    }

    const arany = Math.min(1, MAX_OLDAL / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * arany);
    canvas.height = Math.round(bitmap.height * arany);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    if (bitmap.close) {
        bitmap.close();
    }

    // egyre rosszabb minőséggel próbáljuk, amíg elég kicsi nem lesz
    // (a base64 kb. 4/3-szor nagyobb, mint a fájl, ezért szorzunk 0,75-tel)
    const minosegek = [0.86, 0.75, 0.62];
    for (const minoseg of minosegek) {
        const adat = canvas.toDataURL('image/jpeg', minoseg);
        if (adat.length * 0.75 <= MAX_KULDOTT_KEP) {
            return adat;
        }
    }
    throw new Error(file.name + ': a kép tömörítés után is túl nagy.');
};

// Cloudinary képnél kisebb méretet kérünk (pl. a listákhoz), más képnél marad az eredeti
export const kepMeret = (url, szelesseg) => {
    if (url && url.includes('res.cloudinary.com') && url.includes('/upload/')) {
        return url.replace('/upload/', '/upload/f_auto,q_auto,c_limit,w_' + szelesseg + '/');
    }
    return url;
};
