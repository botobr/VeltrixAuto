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

/*
 * Az űrlap szekciói és mezői: [mező, címke, típus, opciók].
 * Típusok: text, number, select (lista + saját érték), enum (csak lista), date, bool (igen/nem/–), textarea.
 */
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

export const AUTO_MEZOK = AUTO_SZEKCIOK.flatMap((szekcio) => szekcio.mezok);
const HIRDETES_MEZOK = ['statusz', 'lathato', 'kiemelt', 'lejarat', 'telephely', 'eladas_datum', 'eladasi_ar'];

const datumMezo = (ertek) => (ertek ? String(ertek).slice(0, 10) : '');
const boolMezo = (ertek) => (ertek === true ? 'true' : ertek === false ? 'false' : '');

/** API-válaszból űrlapállapot (minden mező string, hogy az inputok kontrolláltak maradjanak). */
export const urlapAdatokbol = (auto = {}) => {
    const adatok = {};
    for (const [mezo, , tipus] of AUTO_MEZOK) {
        const ertek = auto[mezo];
        if (tipus === 'date') adatok[mezo] = datumMezo(ertek);
        else if (tipus === 'bool') adatok[mezo] = boolMezo(ertek);
        else adatok[mezo] = ertek === null || ertek === undefined ? '' : String(ertek);
    }
    adatok.felszereltseg = Array.isArray(auto.felszereltseg) ? auto.felszereltseg : [];
    adatok.kepek = Array.isArray(auto.kepek) ? auto.kepek.filter((kep) => kep.publicId) : [];
    adatok.statusz = auto.statusz || 'elerheto';
    adatok.lathato = auto.lathato !== false;
    adatok.kiemelt = Boolean(auto.kiemelt);
    adatok.lejarat = datumMezo(auto.lejarat);
    adatok.telephely = auto.telephely?._id || auto.telephely || '';
    adatok.eladas_datum = datumMezo(auto.eladas_datum);
    adatok.eladasi_ar = auto.eladasi_ar === null || auto.eladasi_ar === undefined ? '' : String(auto.eladasi_ar);
    return adatok;
};

export const uresUrlap = () => urlapAdatokbol({});

export const egyediMezokAdatokbol = (adatok) => Object.fromEntries(
    AUTO_MEZOK
        .filter(([, , tipus]) => tipus === 'select')
        .map(([mezo]) => [mezo, Boolean(adatok[mezo]) && !autoValasztasiLehetosegek[mezo].includes(adatok[mezo])]),
);

/** Az élő előnézet-kártyához: a szám- és logikai mezők string állapotából valódi értékek. */
export const szamMezokElonezethez = (adatok) => Object.fromEntries(
    AUTO_MEZOK
        .filter(([, , tipus]) => tipus === 'number' || tipus === 'bool')
        .map(([mezo, , tipus]) => {
            const ertek = adatok[mezo];
            if (ertek === '' || ertek === undefined) return [mezo, null];
            return [mezo, tipus === 'bool' ? ertek === 'true' : Number(String(ertek).replace(',', '.'))];
        }),
);

export const kuldhetoAdatok = (adatok) => {
    const payload = {};
    for (const [mezo] of AUTO_MEZOK) payload[mezo] = adatok[mezo];
    for (const mezo of HIRDETES_MEZOK) payload[mezo] = adatok[mezo];
    payload.felszereltseg = adatok.felszereltseg;
    payload.kepek = adatok.kepek.map(({ url, publicId, tipus, leiras }) => ({ url, publicId, tipus, leiras }));
    return payload;
};

// ---------- Formázás ----------

const szamFormatter = new Intl.NumberFormat('hu-HU');
const tizedesFormatter = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 1 });
const honapFormatter = new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'long' });
const datumFormatter = new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' });
const datumIdoFormatter = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short' });

export const formatSzam = (ertek) => szamFormatter.format(ertek);
export const formatTizedes = (ertek) => tizedesFormatter.format(ertek);
export const formatAr = (ertek) => (ertek ? `${szamFormatter.format(ertek)} Ft` : 'Érdeklődj');
export const formatHonap = (ertek) => (ertek ? honapFormatter.format(new Date(ertek)) : null);
export const formatDatum = (ertek) => (ertek ? datumFormatter.format(new Date(ertek)) : null);
export const formatDatumIdo = (ertek) => (ertek ? datumIdoFormatter.format(new Date(ertek)) : null);

export const autoNev = (auto) => `${auto.marka || ''} ${auto.modell || ''}`.trim();
export const autoUrl = (auto) => `/autok/${auto.slug || auto._id}`;

export const igenNem = (ertek) => (ertek === true ? 'Igen' : ertek === false ? 'Nem' : null);

/** A részletes adatlap sorai: [címke, érték] – üres érték esetén a sor kimarad. */
export const muszakiAdatok = (auto) => [
    ['Évjárat', auto.evjarat],
    ['Első forgalomba helyezés', formatHonap(auto.elso_forgalomba_helyezes)],
    ['Kilométeróra állása', auto.kmora_allas != null ? `${formatSzam(auto.kmora_allas)} km` : null],
    ['Kivitel', auto.kivitel],
    ['Üzemanyag', auto.uzemanyag],
    ['Sebességváltó', auto.valto],
    ['Hajtás', auto.hajtas],
    ['Teljesítmény', auto.teljesitmeny != null ? `${formatSzam(auto.teljesitmeny)} LE (${formatSzam(Math.round(auto.teljesitmeny * 0.7355))} kW)` : null],
    ['Hengerűrtartalom', auto.hengerur_tartalom ? `${formatSzam(auto.hengerur_tartalom)} cm³` : null],
    ['Vegyes fogyasztás', auto.fogyasztas != null ? `${formatTizedes(auto.fogyasztas)} ${auto.uzemanyag === 'Elektromos' ? 'kWh' : 'l'}/100 km` : null],
    ['CO₂-kibocsátás', auto.co2 != null ? `${formatSzam(auto.co2)} g/km` : null],
    ['Ajtók / ülések', [auto.ajtok_szama, auto.ulesek_szama].some((x) => x != null) ? `${auto.ajtok_szama ?? '–'} ajtó · ${auto.ulesek_szama ?? '–'} ülés` : null],
    ['Szín', auto.szin],
    ['Származási hely', auto.szarmazasi_hely],
    ['Tulajdonosok száma', auto.tulajdonosok_szama != null ? `${auto.tulajdonosok_szama}` : null],
    ['Műszaki vizsga érvényes', formatHonap(auto.muszaki_vizsga)],
    ['Szervizkönyv', auto.szervizkonyv === true ? 'Vezetett' : auto.szervizkonyv === false ? 'Nincs' : null],
    ['Sérülésmentes', igenNem(auto.serulesmentes)],
    ['Garancia', auto.garancia_honap ? `${auto.garancia_honap} hónap` : auto.garancia_honap === 0 ? 'Nincs' : null],
    ['Alvázszám', auto.alvazszam || null],
    ['Hirdetéskód', auto.azonosito || null],
].filter(([, ertek]) => ertek !== null && ertek !== undefined && ertek !== '');

// ---------- Képek ----------

export const MAX_FORRAS_KEP = 25 * 1024 * 1024;
const MAX_KULDOTT_KEP = 4 * 1024 * 1024;
const MAX_OLDAL = 2000;

const fajlbolDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('A kép beolvasása nem sikerült.'));
    reader.readAsDataURL(file);
});

/** Feltöltés előtt a böngészőben kicsinyíti és tömöríti a képet (JPEG, max. 2000 px). */
export const kepTomoritese = async (file) => {
    if (!file.type.startsWith('image/')) throw new Error(`${file.name}: nem képfájl.`);
    if (file.size > MAX_FORRAS_KEP) throw new Error(`${file.name}: legfeljebb 25 MB lehet.`);

    let bitmap;
    try {
        bitmap = await createImageBitmap(file);
    } catch {
        // Ismeretlen formátum (pl. HEIC egyes böngészőkben): ha elég kicsi, változatlanul küldjük.
        if (file.size <= MAX_KULDOTT_KEP && /^image\/(jpeg|png|webp|avif)$/.test(file.type)) return fajlbolDataUrl(file);
        throw new Error(`${file.name}: ezt a képformátumot a böngésző nem tudja feldolgozni.`);
    }

    const arany = Math.min(1, MAX_OLDAL / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * arany);
    canvas.height = Math.round(bitmap.height * arany);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    for (const minoseg of [0.86, 0.75, 0.62]) {
        const adat = canvas.toDataURL('image/jpeg', minoseg);
        if (adat.length * 0.75 <= MAX_KULDOTT_KEP) return adat;
    }
    throw new Error(`${file.name}: a kép tömörítés után is túl nagy.`);
};

/** Cloudinary-kép kisebb változata a listákhoz (más forrásnál változatlan URL). */
export const kepMeret = (url, szelesseg) => (
    url && url.includes('res.cloudinary.com') && url.includes('/upload/')
        ? url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${szelesseg}/`)
        : url
);
