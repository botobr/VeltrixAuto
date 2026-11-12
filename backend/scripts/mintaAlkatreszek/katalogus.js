/*
 * Minta tuning-alkatrész katalógus (kb. 250 termék) – determinisztikus generátor:
 * minden futtatás ugyanazokat a termékeket és cikkszámokat adja, így a feltöltés
 * újrafuttatható (cikkszám szerint frissít), és pontosan visszatörölhető.
 *
 * FIGYELEM: mintaadat. A gyártók valósak, de a cikkszámok, árak és készletek
 * kitaláltak – éles értékesítés előtt cseréljétek valós adatokra.
 */

// ---------- Platformok (mely autókra illik) ----------
// A modell a platform rövid neve; az autó részletesebb modellneve („E46 318CI”) is illeszkedik rá.
const P = {
    bmwE36: { marka: 'BMW', modell: 'E36', tol: 1990, ig: 2000, nev: 'BMW 3-as (E36)', turbo: false },
    bmwE46: { marka: 'BMW', modell: 'E46', tol: 1998, ig: 2006, nev: 'BMW 3-as (E46)', turbo: false },
    bmwE90: { marka: 'BMW', modell: 'E90', tol: 2005, ig: 2012, nev: 'BMW 3-as (E90)', turbo: false },
    bmwF30: { marka: 'BMW', modell: 'F30', tol: 2012, ig: 2019, nev: 'BMW 3-as (F30)', turbo: true },
    bmwG20: { marka: 'BMW', modell: 'G20', tol: 2019, ig: null, nev: 'BMW 3-as (G20)', turbo: true },
    bmwE60: { marka: 'BMW', modell: 'E60', tol: 2003, ig: 2010, nev: 'BMW 5-ös (E60)', turbo: true },
    bmwF20: { marka: 'BMW', modell: 'F20', tol: 2011, ig: 2019, nev: 'BMW 1-es (F20)', turbo: true },
    golf4: { marka: 'Volkswagen', modell: 'Golf', tol: 1997, ig: 2004, nev: 'VW Golf IV', turbo: true },
    golf5: { marka: 'Volkswagen', modell: 'Golf', tol: 2003, ig: 2009, nev: 'VW Golf V GTI', turbo: true },
    golf7: { marka: 'Volkswagen', modell: 'Golf', tol: 2012, ig: 2020, nev: 'VW Golf VII GTI/R', turbo: true },
    golf8: { marka: 'Volkswagen', modell: 'Golf', tol: 2020, ig: null, nev: 'VW Golf VIII GTI/R', turbo: true },
    polo: { marka: 'Volkswagen', modell: 'Polo', tol: 2017, ig: null, nev: 'VW Polo GTI (AW)', turbo: true },
    audiS3: { marka: 'Audi', modell: 'S3', tol: 1999, ig: 2003, nev: 'Audi S3 (8L)', turbo: true },
    audiA3: { marka: 'Audi', modell: 'A3', tol: 2012, ig: 2020, nev: 'Audi A3 / S3 (8V)', turbo: true },
    audiA4: { marka: 'Audi', modell: 'A4', tol: 2015, ig: null, nev: 'Audi A4 (B9)', turbo: true },
    audiTT: { marka: 'Audi', modell: 'TT', tol: 1998, ig: 2006, nev: 'Audi TT (8N)', turbo: true },
    leon: { marka: 'Seat', modell: 'Leon', tol: 2012, ig: 2020, nev: 'Seat Leon Cupra (5F)', turbo: true },
    octavia: { marka: 'Skoda', modell: 'Octavia', tol: 2013, ig: 2020, nev: 'Skoda Octavia RS (5E)', turbo: true },
    focus: { marka: 'Ford', modell: 'Focus', tol: 2011, ig: 2018, nev: 'Ford Focus ST/RS (Mk3)', turbo: true },
    fiesta: { marka: 'Ford', modell: 'Fiesta', tol: 2013, ig: 2017, nev: 'Ford Fiesta ST (Mk7)', turbo: true },
    mustang: { marka: 'Ford', modell: 'Mustang', tol: 2015, ig: null, nev: 'Ford Mustang (S550)', turbo: false },
    astraH: { marka: 'Opel', modell: 'Astra H', tol: 2004, ig: 2010, nev: 'Opel Astra H (OPC)', turbo: true },
    corsaD: { marka: 'Opel', modell: 'Corsa', tol: 2006, ig: 2014, nev: 'Opel Corsa D (OPC)', turbo: true },
    civicEK: { marka: 'Honda', modell: 'Civic', tol: 1995, ig: 2001, nev: 'Honda Civic (EK)', turbo: false },
    civicFK8: { marka: 'Honda', modell: 'Civic', tol: 2017, ig: 2021, nev: 'Honda Civic Type R (FK8)', turbo: true },
    nsx: { marka: 'Honda', modell: 'NSX', tol: 1990, ig: 2005, nev: 'Honda NSX (NA1/NA2)', turbo: false },
    megane3: { marka: 'Renault', modell: 'Megane', tol: 2008, ig: 2016, nev: 'Renault Megane III RS', turbo: true },
    mx5NB: { marka: 'Mazda', modell: 'MX-5', tol: 1998, ig: 2005, nev: 'Mazda MX-5 (NB)', turbo: false },
    mx5ND: { marka: 'Mazda', modell: 'MX-5', tol: 2015, ig: null, nev: 'Mazda MX-5 (ND)', turbo: false },
    rx7: { marka: 'Mazda', modell: 'RX-7', tol: 1992, ig: 2002, nev: 'Mazda RX-7 (FD)', turbo: true },
    swift: { marka: 'Suzuki', modell: 'Swift', tol: 2017, ig: null, nev: 'Suzuki Swift Sport', turbo: true },
    yarisGR: { marka: 'Toyota', modell: 'Yaris', tol: 2020, ig: null, nev: 'Toyota GR Yaris', turbo: true },
    gt86: { marka: 'Toyota', modell: 'GT86', tol: 2012, ig: 2021, nev: 'Toyota GT86', turbo: false },
    impreza: { marka: 'Subaru', modell: 'Impreza', tol: 1993, ig: 2000, nev: 'Subaru Impreza WRX/STI (GC8)', turbo: true },
    wrx: { marka: 'Subaru', modell: 'WRX', tol: 2014, ig: 2021, nev: 'Subaru WRX STI (VA)', turbo: true },
    evo: { marka: 'Mitsubishi', modell: 'Lancer Evolution', tol: 1996, ig: 2007, nev: 'Mitsubishi Lancer Evo IV–IX', turbo: true },
    nissan350z: { marka: 'Nissan', modell: '350Z', tol: 2002, ig: 2009, nev: 'Nissan 350Z', turbo: false },
    gtr: { marka: 'Nissan', modell: 'GT-R', tol: 2007, ig: null, nev: 'Nissan GT-R (R35)', turbo: true },
    i30n: { marka: 'Hyundai', modell: 'i30', tol: 2017, ig: null, nev: 'Hyundai i30 N', turbo: true },
    p991: { marka: 'Porsche', modell: '911', tol: 2011, ig: 2019, nev: 'Porsche 911 (991)', turbo: true },
    p992: { marka: 'Porsche', modell: '911', tol: 2019, ig: null, nev: 'Porsche 911 (992)', turbo: true },
};

const MIND = Object.keys(P);
// A kereskedésben jelenleg is kapható autók platformjai – ezekhez sablononként előre kerül illő termék.
const KESZLETEN = ['bmwE46', 'bmwE60', 'audiS3', 'astraH', 'civicEK', 'megane3', 'mx5NB', 'swift', 'yarisGR', 'impreza', 'evo', 'rx7', 'nsx', 'p991', 'p992'];
const PLATFORM_PER_SABLON = 5;

const forgatas = (lista, eltolas) => (lista.length ? [...lista.slice(eltolas % lista.length), ...lista.slice(0, eltolas % lista.length)] : []);

/** Sablononként legfeljebb 5 platform: 2 a készleten lévő autókéból, a többi – mindkettő sablononként forgatva, hogy minden típusra jusson. */
const platformValasztas = (lista, sablonIndex) => {
    const elso = forgatas(lista.filter((k) => KESZLETEN.includes(k)), sablonIndex).slice(0, 2);
    const tobbi = lista.filter((k) => !elso.includes(k));
    return [...elso, ...forgatas(tobbi, sablonIndex * 3)].slice(0, PLATFORM_PER_SABLON);
};
const TURBO = MIND.filter((k) => P[k].turbo);
const MODERN = MIND.filter((k) => P[k].tol >= 2008);
const NEPSZERU = ['bmwE46', 'bmwF30', 'golf7', 'audiA3', 'leon', 'focus', 'civicFK8', 'megane3', 'mx5ND', 'yarisGR', 'i30n', 'astraH', 'swift', 'gt86', 'wrx', 'evo', 'bmwE60', 'audiS3', 'civicEK', 'mx5NB'];

// ---------- Gyártók: kód (cikkszám-előtag) és márkaszín (a képhez) ----------
const GY = {
    KW: ['KW', '#f2c200'], Bilstein: ['BIL', '#1e5fbf'], 'H&R': ['HR', '#c8102e'], Eibach: ['EIB', '#e4002b'], ST: ['ST', '#4b4f55'],
    Whiteline: ['WL', '#ef6c00'], Powerflex: ['PFF', '#7a1fa2'], 'Ultra Racing': ['UR', '#e4002b'],
    'K&N': ['KN', '#d71920'], 'Green Filter': ['GF', '#2e9e44'], BMC: ['BMC', '#e30613'], Pipercross: ['PX', '#2b2b2b'], Simota: ['SIM', '#1478c8'],
    Remus: ['RM', '#c00000'], Milltek: ['MSS', '#2b2b2b'], 'Akrapovič': ['AKR', '#6b7b8c'], Scorpion: ['SCO', '#b30000'], Eisenmann: ['EIS', '#555b62'],
    RaceChip: ['RC', '#e10600'], Wagner: ['WG', '#1f4e9e'], Forge: ['FMK', '#0057a8'], Mishimoto: ['MMR', '#ff6a13'], NGK: ['NGK', '#d71920'], Turbosmart: ['TS', '#1b75bb'],
    EBC: ['EBC', '#ffcc00'], Brembo: ['BRE', '#d50000'], Ferodo: ['FDS', '#e2001a'], Goodridge: ['GDR', '#6d6e71'], Motul: ['MOT', '#d7141a'],
    'OZ Racing': ['OZ', '#9da3aa'], BBS: ['BBS', '#c9a227'], 'Japan Racing': ['JR', '#2b2b2b'], Michelin: ['MIC', '#27509b'], 'Liqui Moly': ['LM', '#003a7d'],
    Maxton: ['MAX', '#1b1b1b'], Seibon: ['SEI', '#2f2f2f'], Sparco: ['SPA', '#00539b'], Recaro: ['REC', '#d0021b'], OMP: ['OMP', '#0033a0'],
    Philips: ['PHI', '#0b5ed7'], Osram: ['OSR', '#ff6600'], 'Veltrix Garage': ['VG', '#c99a35'],
};

// ---------- Termék-sablonok ----------
// platform: illeszkedő platformok listája; variansok: univerzális termék változatai.
const SABLONOK = [
    // FUTÓMŰ
    { kat: 'futomu', gyarto: 'KW', nev: 'V1 menetes futómű', rajz: 'futomu', ar: 349000, platform: NEPSZERU.slice(0, 14), cikk: 10210,
        rovid: 'Állítható magasságú menetes futómű előre beállított csillapítással – az ideális belépő a menetes futóművek világába.',
        param: [['Állíthatóság', 'Magasság'], ['Ültetés', '25–50 mm'], ['Ház anyaga', 'Rozsdamentes acél'], ['Garancia', '2 év']] },
    { kat: 'futomu', gyarto: 'KW', nev: 'V3 állítható menetes futómű', rajz: 'futomu', ar: 649000, platform: NEPSZERU.slice(0, 12), cikk: 35220, kiemelt: 2,
        rovid: 'Magasság, kompresszió és visszarugózás külön állítható – utcára és trackdayre, TÜV-papírokkal.',
        param: [['Állíthatóság', 'Magasság, kompresszió (6 fok), visszarugózás (16 fok)'], ['Ültetés', '20–50 mm'], ['Ház anyaga', 'Rozsdamentes acél'], ['Garancia', '2 év']] },
    { kat: 'futomu', gyarto: 'Bilstein', nev: 'B14 PSS menetes futómű', rajz: 'futomu', ar: 419000, platform: ['bmwE46', 'bmwE90', 'bmwF30', 'golf5', 'golf7', 'audiA3', 'leon', 'octavia', 'focus', 'p991'], cikk: 47120,
        rovid: 'A Bilstein legnépszerűbb menetes futóműve: gyári komfort közeli csillapítás, állítható ültetéssel.',
        param: [['Állíthatóság', 'Magasság'], ['Lengéscsillapító', 'Monotube, gáztöltésű'], ['Ültetés', '30–50 mm']] },
    { kat: 'futomu', gyarto: 'ST', nev: 'ST X menetes futómű', rajz: 'futomu', ar: 289000, platform: ['bmwE36', 'bmwE46', 'golf4', 'golf5', 'civicEK', 'mx5NB', 'corsaD', 'fiesta', 'astraH', 'nissan350z'], cikk: 13220,
        rovid: 'Kedvező árú, visszarugózásban is állítható menetes futómű a KW gyárából.',
        param: [['Állíthatóság', 'Magasság, visszarugózás (16 fok)'], ['Ültetés', '30–60 mm']] },
    { kat: 'futomu', gyarto: 'H&R', nev: 'ültetőrugó-szett 35/30 mm', rajz: 'rugok', ar: 69900, platform: NEPSZERU, cikk: 28870,
        rovid: 'Progresszív ültetőrugó-szett: alacsonyabb súlypont, gyári lengéscsillapítókkal is használható.',
        param: [['Ültetés (első/hátsó)', '35 / 30 mm'], ['Karakterisztika', 'Progresszív'], ['Darabszám', '4 db']] },
    { kat: 'futomu', gyarto: 'Eibach', nev: 'Pro-Kit ültetőrugó-szett', rajz: 'rugok', ar: 64900, platform: NEPSZERU.slice(2, 18), cikk: 10650,
        rovid: 'Az Eibach klasszikusa: 25–30 mm ültetés, komfortos, progresszív rugózás, TÜV-papírokkal.',
        param: [['Ültetés', '25–30 mm'], ['Anyag', 'Krómszilícium rugóacél'], ['Darabszám', '4 db']] },
    { kat: 'futomu', gyarto: 'Whiteline', nev: 'állítható stabilizátor-szett (első + hátsó)', rajz: 'stabilizator', ar: 139000, platform: ['wrx', 'impreza', 'evo', 'focus', 'golf7', 'civicFK8', 'gt86', 'mx5ND', 'bmwE46'], cikk: 72190,
        rovid: 'Vastagabb, 3 fokozatban állítható stabilizátorok: kevesebb bedőlés, semlegesebb kanyarviselkedés.',
        param: [['Állíthatóság', '3 fokozat'], ['Szilentek', 'Poliuretán, mellékelve']] },
    { kat: 'futomu', gyarto: 'Powerflex', nev: 'poliuretán szilentblokk-szett', rajz: 'szilent', ar: 54900, platform: ['bmwE36', 'bmwE46', 'bmwE90', 'golf4', 'golf5', 'civicEK', 'mx5NB', 'audiTT', 'audiS3'], cikk: 5100,
        rovid: 'Gumi helyett poliuretán: pontosabb kormányzás, tartósabb futómű, élettartam-garanciával.',
        param: [['Anyag', 'Poliuretán, 80 Shore A'], ['Garancia', 'Élettartam']] },
    { kat: 'futomu', gyarto: 'Ultra Racing', nev: 'első toronymerevítő', rajz: 'merevito', ar: 39900, platform: ['civicEK', 'mx5NB', 'mx5ND', 'gt86', 'swift', 'yarisGR', 'fiesta', 'corsaD', 'bmwE46'], cikk: 2001,
        rovid: 'Alumínium toronymerevítő: merevebb első vég, pontosabb kormányzás – csavarozással szerelhető.',
        param: [['Anyag', 'Alumínium / acél'], ['Szerelés', 'Csavarozva, fúrás nélkül']] },

    // SZÍVÓRENDSZER
    { kat: 'szivorendszer', gyarto: 'K&N', nev: 'sport levegőszűrő betét (gyári helyre)', rajz: 'panelSzuro', ar: 32900, platform: MIND.filter((k) => !['nsx', 'rx7'].includes(k)).slice(0, 22), cikk: 33290,
        rovid: 'Gyári helyre illő, mosható és újraolajozható sport szűrőbetét – akár 1 millió km-ig.',
        param: [['Anyag', 'Olajozott pamut'], ['Tisztítási intervallum', '80 000 km'], ['Garancia', '10 év / 1 000 000 km']] },
    { kat: 'szivorendszer', gyarto: 'Green Filter', nev: 'sport szűrőbetét', rajz: 'panelSzuro', ar: 24900, platform: ['golf5', 'golf7', 'leon', 'octavia', 'audiA3', 'polo', 'focus', 'fiesta', 'megane3'], cikk: 2180,
        rovid: 'Mosható, többrétegű sport szűrőbetét – jobb áramlás, tartós szűrés.',
        param: [['Anyag', 'Többrétegű pamut'], ['Mosható', 'Igen']] },
    { kat: 'szivorendszer', gyarto: 'BMC', nev: 'CDA karbon szívókit', rajz: 'szivokit', ar: 149000, platform: ['golf7', 'audiA3', 'leon', 'bmwF30', 'bmwF20', 'focus', 'civicFK8', 'i30n'], cikk: 1180,
        rovid: 'Zárt karbon szűrőház hideglevegő-beömlővel – látványos szívóhang, stabil szívott levegő hőmérséklet.',
        param: [['Ház anyaga', 'Karbon'], ['Szűrő', 'BMC pamut, mosható']] },
    { kat: 'szivorendszer', gyarto: 'K&N', nev: '57i nyitott szívókit', rajz: 'szivokit', ar: 119000, platform: ['bmwE46', 'bmwE36', 'golf4', 'audiS3', 'civicEK', 'astraH', 'corsaD', 'mx5NB', 'impreza', 'evo'], cikk: 57140,
        rovid: 'Komplett nyitott szívókit hővédővel és szilikon csővel, gyári bekötési pontokra.',
        param: [['Csőanyag', 'Polietilén'], ['Szűrő', 'K&N kúpos, mosható']] },
    { kat: 'szivorendszer', gyarto: 'Simota', nev: 'nyitott kúpos levegőszűrő', rajz: 'kuposSzuro', ar: 14900, univerzalis: true, cikk: 9010,
        variansok: [['60 mm', 0], ['70 mm', 1000], ['76 mm', 2000], ['89 mm', 3500]], rovid: 'Univerzális nyitott kúpos szűrő gumi csatlakozóval – hővédő doboz ajánlott.',
        param: [['Magasság', '150 mm'], ['Mosható', 'Igen']] },
    { kat: 'szivorendszer', gyarto: 'K&N', nev: 'RU nyitott kúpos szűrő', rajz: 'kuposSzuro', ar: 27900, univerzalis: true, cikk: 9200,
        variansok: [['62 mm', 0], ['70 mm', 1000], ['76 mm', 2000], ['89 mm', 4000], ['102 mm', 6000]], rovid: 'A K&N klasszikus kúpos szűrője krómozott fedéllel, mosható pamut betéttel.',
        param: [['Fedél', 'Krómozott'], ['Garancia', '10 év']] },
    { kat: 'szivorendszer', gyarto: 'Pipercross', nev: 'Viper nyitott szűrő', rajz: 'kuposSzuro', ar: 22900, univerzalis: true, cikk: 9400,
        variansok: [['65 mm', 0], ['76 mm', 1500], ['89 mm', 3000]], rovid: 'Szivacsbetétes sportszűrő – nem kell olajozni, versenyautókban is bevált.',
        param: [['Szűrőanyag', 'Többrétegű szivacs']] },
    { kat: 'szivorendszer', gyarto: 'Simota', nev: 'hővédő doboz kúpos szűrőhöz', rajz: 'hovedo', ar: 22900, univerzalis: true, cikk: 9700,
        rovid: 'Alumínium hővédő a motortér meleg levegője ellen – kúpos szűrőkhöz, 60–89 mm.', param: [['Anyag', 'Alumínium']] },

    // KIPUFOGÓ
    { kat: 'kipufogo', gyarto: 'Remus', nev: 'sport hátsó dob', rajz: 'kipufogo', ar: 274000, platform: ['golf7', 'golf8', 'audiA3', 'leon', 'bmwF30', 'bmwF20', 'focus', 'i30n', 'polo', 'mx5ND'], cikk: 95601,
        rovid: 'Rozsdamentes, EG-engedélyes sportdob karbon végcsövekkel – mélyebb, de forgalomba helyezhető hang.',
        param: [['Anyag', 'Rozsdamentes acél'], ['Végcső', '2×2, karbon'], ['Engedély', 'EG-típusbizonyítvány']] },
    { kat: 'kipufogo', gyarto: 'Milltek', nev: 'cat-back kipufogórendszer', rajz: 'kipufogo', ar: 689000, platform: ['golf7', 'golf8', 'audiA3', 'leon', 'focus', 'civicFK8', 'yarisGR', 'gtr', 'mustang', 'p991'], cikk: 10840, kiemelt: 1,
        rovid: 'Katalizátor utáni teljes rendszer rezonátorral vagy anélkül – brit kézműves minőség.',
        param: [['Átmérő', '76 mm'], ['Anyag', 'T304 rozsdamentes acél'], ['Hangszelep', 'Gyári szelepvezérléssel']] },
    { kat: 'kipufogo', gyarto: 'Akrapovič', nev: 'Slip-On Line titán kipufogó', rajz: 'titanKipufogo', ar: 1290000, platform: ['bmwG20', 'bmwF30', 'p991', 'p992', 'golf8', 'gtr', 'mustang'], cikk: 30120, kiemelt: 2,
        rovid: 'Titánötvözet kipufogó karbon végcsövekkel: kevesebb tömeg, jellegzetes Akrapovič hang.',
        param: [['Anyag', 'Titán'], ['Tömegcsökkenés', 'kb. 7 kg'], ['Végcső', 'Karbon']] },
    { kat: 'kipufogo', gyarto: 'Scorpion', nev: 'downpipe (versenycélra)', rajz: 'downpipe', ar: 189000, platform: TURBO.filter((k) => P[k].tol >= 2010).slice(0, 12), cikk: 63090,
        rovid: 'Nagyobb átmérőjű turbó utáni cső sportkatalizátorral. Közúti forgalomban csak engedéllyel használható.',
        param: [['Átmérő', '76 mm'], ['Katalizátor', '200 cell sport'], ['Megjegyzés', 'Versenycélú alkatrész']] },
    { kat: 'kipufogo', gyarto: 'Eisenmann', nev: 'Race sportdob', rajz: 'kipufogo', ar: 329000, platform: ['bmwE46', 'bmwE90', 'bmwE60', 'bmwE36', 'p991', 'mustang'], cikk: 50460,
        rovid: 'Német precizitás: a hangos „Race” változat a BMW rajongók kedvence.', param: [['Hangkarakter', 'Race (hangos)'], ['Anyag', 'Rozsdamentes acél']] },
    { kat: 'kipufogo', gyarto: 'Simota', nev: 'univerzális sport végcső', rajz: 'vegcso', ar: 18900, univerzalis: true, cikk: 7500,
        variansok: [['76 mm', 0], ['89 mm', 3000], ['100 mm', 6000], ['114 mm, dupla falú', 11000]], rovid: 'Felhegeszthető vagy bilinccsel szerelhető rozsdamentes végcső.',
        param: [['Anyag', 'Rozsdamentes acél'], ['Szerelés', 'Bilincs / hegesztés']] },

    // MOTOR ÉS TELJESÍTMÉNY
    { kat: 'motor', gyarto: 'RaceChip', nev: 'GTS Black chiptuning box', rajz: 'chipbox', ar: 169000, platform: TURBO.slice(0, 18), cikk: 40100, kiemelt: 1,
        rovid: 'Csatlakoztatható teljesítménynövelő modul applikációs vezérléssel – motorgaranciával.',
        param: [['Teljesítménynövelés', 'akár +30%'], ['Vezérlés', 'Okostelefonos app'], ['Garancia', '2 év motorvédelem']] },
    { kat: 'motor', gyarto: 'Wagner', nev: 'Competition intercooler', rajz: 'intercooler', ar: 289000, platform: ['golf7', 'audiA3', 'leon', 'octavia', 'bmwF30', 'bmwF20', 'focus', 'i30n', 'yarisGR', 'evo', 'impreza'], cikk: 20000,
        rovid: 'Nagyobb hőcserélő mag: alacsonyabb szívott levegő-hőmérséklet, stabil teljesítmény hosszú terhelésnél is.',
        param: [['Mag', 'Bar & plate'], ['Hőmérséklet-csökkenés', 'akár 30 °C']] },
    { kat: 'motor', gyarto: 'Forge', nev: 'szilikon töltőlevegő-cső szett', rajz: 'tomlo', ar: 89900, platform: ['golf7', 'audiA3', 'leon', 'golf5', 'audiS3', 'golf4', 'focus', 'fiesta', 'polo'], cikk: 3500,
        rovid: 'Többrétegű, megerősített szilikon csövek a gyári gumi helyett – nem dagad, nem reped.', param: [['Anyag', '4 rétegű szilikon'], ['Szín', 'Kék / fekete / piros']] },
    { kat: 'motor', gyarto: 'Forge', nev: 'blow-off szelep', rajz: 'szelep', ar: 119000, platform: ['golf7', 'audiA3', 'leon', 'golf5', 'audiS3', 'focus', 'impreza', 'evo'], cikk: 3800,
        rovid: 'Állítható rugóerejű, alumínium dump szelep jellegzetes „pssst” hanggal.', param: [['Anyag', 'Eloxált alumínium'], ['Állítható', 'Igen, rugócserével']] },
    { kat: 'motor', gyarto: 'Turbosmart', nev: 'Kompact blow-off szelep', rajz: 'szelep', ar: 99900, platform: ['wrx', 'yarisGR', 'i30n', 'civicFK8', 'fiesta', 'swift'], cikk: 2050,
        rovid: 'Gyári helyre illő, közvetlen cserélhető lefúvató szelep, levegőre vagy visszakeringetésre.', param: [['Anyag', 'Alumínium']] },
    { kat: 'motor', gyarto: 'NGK', nev: 'iridium gyújtógyertya-készlet', rajz: 'gyertya', ar: 24900, platform: MIND.filter((k) => !['rx7'].includes(k)).slice(0, 20), cikk: 6600,
        rovid: 'Hidegebb hőértékű iridium gyertyák tuningolt, feltöltött motorokhoz.', param: [['Elektróda', 'Iridium'], ['Darabszám', 'Hengerszám szerint']] },
    { kat: 'motor', gyarto: 'Mishimoto', nev: 'alumínium vízhűtő', rajz: 'huto', ar: 189000, platform: ['bmwE46', 'bmwE36', 'civicEK', 'mx5NB', 'evo', 'impreza', 'wrx', 'nissan350z', 'rx7', 'gt86', 'focus'], cikk: 4110,
        rovid: 'Teljesen alumínium, nagyobb kapacitású hűtő – trackdayre és melegebb nyarakra.', param: [['Anyag', 'Alumínium, TIG-hegesztett'], ['Sorok', '2']] },
    { kat: 'motor', gyarto: 'Mishimoto', nev: 'olajgőz-leválasztó (catch can)', rajz: 'tartaly', ar: 34900, univerzalis: true, cikk: 4500,
        variansok: [['kompakt', 0], ['nagy, nívópálcával', 14000]], rovid: 'Megakadályozza, hogy az olajgőz a szívócsőbe és az intercoolerbe jusson.', param: [['Csatlakozás', '3/8"']] },
    { kat: 'motor', gyarto: 'Turbosmart', nev: 'boost-óra 52 mm', rajz: 'ora', ar: 29900, univerzalis: true, cikk: 2200,
        rovid: 'Mechanikus töltőnyomás-óra 52 mm-es házban, háttérvilágítással.', param: [['Méréstartomány', '-1 – 2 bar'], ['Átmérő', '52 mm']] },

    // FÉK
    { kat: 'fek', gyarto: 'EBC', nev: 'Yellowstuff első fékbetét', rajz: 'fekbetet', ar: 46900, platform: MIND.slice(0, 26), cikk: 41986,
        rovid: 'Magas hőtűrésű sportbetét utcára és trackdayre – hidegen is jól fog.', param: [['Hőtartomány', '0–900 °C'], ['Tengely', 'Első']] },
    { kat: 'fek', gyarto: 'EBC', nev: 'USR hornyolt féktárcsa pár', rajz: 'fektarcsa', ar: 98900, platform: NEPSZERU, cikk: 7860,
        rovid: 'Hornyolt, korrózióvédett féktárcsák: jobb hőelvezetés, stabil fékérzet.', param: [['Kivitel', 'Hornyolt, Geomet bevonat'], ['Darabszám', '2 db (tengely)']] },
    { kat: 'fek', gyarto: 'Ferodo', nev: 'DS2500 fékbetét', rajz: 'fekbetet', ar: 58900, platform: ['bmwE46', 'bmwE36', 'golf5', 'golf7', 'civicEK', 'mx5NB', 'mx5ND', 'gt86', 'megane3', 'focus', 'evo'], cikk: 1500,
        rovid: 'A pályanapok kedvence: utcán is használható versenybetét.', param: [['Hőtartomány', '0–650 °C'], ['Felhasználás', 'Utca / trackday']] },
    { kat: 'fek', gyarto: 'Goodridge', nev: 'acélhálós fékcső-szett', rajz: 'fekcso', ar: 49900, platform: ['bmwE36', 'bmwE46', 'golf4', 'golf5', 'civicEK', 'mx5NB', 'mx5ND', 'gt86', 'evo', 'impreza', 'yarisGR', 'swift'], cikk: 1200,
        rovid: 'Nem tágul nyomás alatt: keményebb, pontosabb fékpedál. TÜV-engedéllyel.', param: [['Anyag', 'PTFE belső, acélháló borítás'], ['Darabszám', '4 db']] },
    { kat: 'fek', gyarto: 'Brembo', nev: 'GT 4 dugattyús big brake kit', rajz: 'fekkit', ar: 1190000, platform: ['golf7', 'audiA3', 'bmwF30', 'bmwE46', 'mustang', 'civicFK8', 'wrx', 'gtr'], cikk: 1700,
        rovid: 'Teljes első fékrendszer nagyobb tárcsával és monoblokk nyergekkel – drámai fékhatás-javulás.', param: [['Nyereg', '4 dugattyús, alumínium'], ['Tárcsa', '355 mm, hornyolt']] },
    { kat: 'fek', gyarto: 'Motul', nev: 'RBF 660 versenyfékfolyadék 0,5 l', rajz: 'folyadek', ar: 8900, univerzalis: true, cikk: 1015,
        rovid: '325 °C száraz forráspont – a legtöbb versenycsapat választása.', param: [['Száraz forráspont', '325 °C'], ['Kiszerelés', '0,5 l']] },

    // FELNI ÉS GUMI
    { kat: 'felni', gyarto: 'OZ Racing', nev: 'Ultraleggera 18" felniszett', rajz: 'felni', ar: 529000, platform: ['golf7', 'golf8', 'audiA3', 'leon', 'octavia', 'bmwF30', 'bmwE46', 'focus', 'civicFK8', 'i30n', 'megane3'], cikk: 1801, kullok: 10,
        rovid: 'Könnyű öntött felni olasz versenyhagyományokkal – 4 db, kerékcsavarok nélkül.', param: [['Méret', '8×18" ET45'], ['Tömeg', '8,1 kg / db'], ['Darabszám', '4 db']] },
    { kat: 'felni', gyarto: 'BBS', nev: 'CH-R 19" felniszett', rajz: 'felni', ar: 1090000, platform: ['bmwF30', 'bmwG20', 'audiA4', 'golf8', 'p991', 'mustang'], cikk: 1900, kullok: 5, felniSzin: '#c9a227',
        rovid: 'Prémium BBS felni nikkel-fekete kivitelben – 4 db.', param: [['Méret', '8,5×19"'], ['Darabszám', '4 db']] },
    { kat: 'felni', gyarto: 'Japan Racing', nev: 'JR11 17" felniszett', rajz: 'felni', ar: 289000, platform: ['civicEK', 'mx5NB', 'mx5ND', 'gt86', 'evo', 'impreza', 'swift', 'yarisGR', 'golf4', 'bmwE36'], cikk: 1700, kullok: 6, felniSzin: '#2b2d31',
        rovid: 'JDM ikon: matt fekete JR11, kedvező áron – 4 db.', param: [['Méret', '8×17" ET35'], ['Darabszám', '4 db']] },
    { kat: 'felni', gyarto: 'Michelin', nev: 'Pilot Sport 4S gumiabroncs', rajz: 'gumi', ar: 89900, univerzalis: true, cikk: 4400,
        variansok: [['225/40 R18', 0], ['245/35 R19', 22000], ['255/35 R18', 14000], ['265/30 R20', 38000]], rovid: 'A sportabroncsok referenciája – száraz és vizes úton is.', param: [['Évszak', 'Nyári'], ['Darabszám', '1 db']] },
    { kat: 'felni', gyarto: 'H&R', nev: 'nyomtávszélesítő 2×15 mm', rajz: 'tavtarto', ar: 39900, platform: NEPSZERU.slice(0, 16), cikk: 30455,
        rovid: 'Szélesebb nyomtáv, teltebb kerékív – hosszabb csavarokkal, TÜV-papírokkal.', param: [['Vastagság', '15 mm / oldal'], ['Darabszám', '2 db']] },
    { kat: 'felni', gyarto: 'Veltrix Garage', nev: 'versenykerékanya-szett (alu)', rajz: 'csavar', ar: 24900, univerzalis: true, cikk: 120,
        variansok: [['M12×1,5', 0], ['M12×1,25', 0], ['M14×1,5', 2000]], rovid: 'Könnyű eloxált alumínium kerékanyák zárókulccsal – 20 db.', param: [['Anyag', '7075 alumínium'], ['Darabszám', '20 db']] },

    // KAROSSZÉRIA ÉS AERO
    { kat: 'karosszeria', gyarto: 'Maxton', nev: 'első lökhárító splitter', rajz: 'splitter', ar: 79900, platform: MODERN.slice(0, 18), cikk: 1100,
        rovid: 'ABS műanyag első toldat fényes fekete kivitelben, gyári rögzítési pontokkal.', param: [['Anyag', 'ABS'], ['Felület', 'Fényes fekete']] },
    { kat: 'karosszeria', gyarto: 'Maxton', nev: 'hátsó diffúzor toldat', rajz: 'diffuzor', ar: 89900, platform: MODERN.slice(0, 14), cikk: 1300,
        rovid: 'Versenyautós megjelenés a hátsó lökhárító alatt – kipufogó-kivágással.', param: [['Anyag', 'ABS'], ['Felület', 'Fényes fekete']] },
    { kat: 'karosszeria', gyarto: 'Maxton', nev: 'oldalküszöb toldat pár', rajz: 'kuszob', ar: 69900, platform: MODERN.slice(2, 14), cikk: 1500,
        rovid: 'Alacsonyabbnak tűnő oldalvonal – ragasztással és csavarozással szerelhető.', param: [['Darabszám', '2 db']] },
    { kat: 'karosszeria', gyarto: 'Seibon', nev: 'karbon tükörborítás', rajz: 'tukor', ar: 59900, platform: ['bmwF30', 'bmwF20', 'bmwG20', 'golf7', 'audiA3', 'leon', 'civicFK8', 'wrx', 'gtr'], cikk: 2100,
        rovid: 'Valódi karbon tükörborítás UV-álló lakkal – a gyári burkolat helyére.', param: [['Anyag', 'Karbon, 2×2 twill'], ['Darabszám', '2 db']] },
    { kat: 'karosszeria', gyarto: 'Veltrix Garage', nev: 'GT hátsó szárny (univerzális)', rajz: 'szarny', ar: 129000, univerzalis: true, cikk: 300,
        variansok: [['135 cm, ABS', 0], ['145 cm, karbon', 120000]], rovid: 'Állítható dőlésszögű hátsó szárny alumínium talpakkal.', param: [['Állítható', 'Dőlésszög']] },
    { kat: 'karosszeria', gyarto: 'Veltrix Garage', nev: 'alumínium vonószem', rajz: 'vonoszem', ar: 12900, univerzalis: true, cikk: 400,
        variansok: [['piros', 0], ['kék', 0], ['arany', 0]], rovid: 'Eloxált alumínium vonószem több menetmérethez adapterrel.', param: [['Anyag', 'Alumínium']] },

    // BELTÉR
    { kat: 'belter', gyarto: 'Sparco', nev: 'Sprint kagylóülés (FIA)', rajz: 'ules', ar: 279000, univerzalis: true, cikk: 8001, kiemelt: 1,
        rovid: 'FIA-homologizált üvegszálas kagylóülés – oldalsó konzol külön rendelhető.', param: [['Homologizáció', 'FIA 8855-1999'], ['Anyag', 'Üvegszál']] },
    { kat: 'belter', gyarto: 'Recaro', nev: 'Pole Position kagylóülés', rajz: 'ules', ar: 649000, univerzalis: true, cikk: 7000,
        rovid: 'A Recaro ikonikus versenyülése, utcai autóba is TÜV-papírokkal.', param: [['Homologizáció', 'FIA, ABE'], ['Anyag', 'Szálerősítésű műanyag']] },
    { kat: 'belter', gyarto: 'OMP', nev: '4 pontos biztonsági öv', rajz: 'ov', ar: 49900, univerzalis: true, cikk: 7700,
        variansok: [['piros', 0], ['kék', 0], ['fekete', 0]], rovid: '3" vállöv, 2" medenceöv – pályanapokra, kagylóüléshez.', param: [['Szélesség', '3" / 2"']] },
    { kat: 'belter', gyarto: 'Sparco', nev: 'R383 sportkormány 330 mm', rajz: 'kormany', ar: 89900, univerzalis: true, cikk: 1500,
        rovid: 'Mélyített velúr sportkormány – kormányaggyal szerelhető.', param: [['Átmérő', '330 mm'], ['Borítás', 'Velúr']] },
    { kat: 'belter', gyarto: 'OMP', nev: 'kormányagy', rajz: 'agy', ar: 39900, platform: ['bmwE36', 'bmwE46', 'golf4', 'civicEK', 'mx5NB', 'evo', 'impreza', 'nissan350z', 'gt86'], cikk: 1900,
        rovid: 'Gyári kormány helyére, sportkormány (6×70 mm) rögzítéséhez.', param: [['Rögzítés', '6×70 mm']] },
    { kat: 'belter', gyarto: 'Veltrix Garage', nev: 'rövidváltó', rajz: 'valto', ar: 59900, platform: ['bmwE36', 'bmwE46', 'golf4', 'golf5', 'civicEK', 'mx5NB', 'gt86', 'focus', 'fiesta', 'swift'], cikk: 500,
        rovid: 'Akár 40%-kal rövidebb váltóút, gyorsabb és pontosabb sebességváltás.', param: [['Úthossz-csökkenés', '30–40%']] },
    { kat: 'belter', gyarto: 'Veltrix Garage', nev: 'alumínium pedálszett', rajz: 'pedal', ar: 19900, univerzalis: true, cikk: 600,
        variansok: [['manuális váltóhoz', 0], ['automata váltóhoz', -3000]], rovid: 'Csúszásmentes alumínium pedálborítás, fúrás nélküli rögzítéssel.', param: [['Anyag', 'Alumínium, gumibetétes']] },

    // VILÁGÍTÁS
    { kat: 'vilagitas', gyarto: 'Philips', nev: 'Ultinon Pro6000 LED izzó', rajz: 'izzo', ar: 39900, univerzalis: true, cikk: 6000,
        variansok: [['H7', 0], ['H4', 0], ['H1', -2000], ['H11', -1000]], rovid: 'Akár 230%-kal világosabb, 5800 K hideg fehér fény – közúti engedéllyel (típusfüggő).', param: [['Színhőmérséklet', '5800 K'], ['Darabszám', '2 db']] },
    { kat: 'vilagitas', gyarto: 'Osram', nev: 'Night Breaker 200 izzó', rajz: 'izzo', ar: 14900, univerzalis: true, cikk: 6400,
        variansok: [['H7', 0], ['H4', 0], ['H1', -1000]], rovid: 'Halogén izzó akár 200%-kal több fénnyel – közvetlen csere.', param: [['Darabszám', '2 db']] },
    { kat: 'vilagitas', gyarto: 'Veltrix Garage', nev: 'dinamikus LED tükörindex', rajz: 'index', ar: 29900, platform: ['golf7', 'audiA3', 'leon', 'octavia', 'bmwF30', 'bmwF20', 'polo'], cikk: 700,
        rovid: 'Futófényes LED index a tükörbe, gyári csatlakozóval.', param: [['Darabszám', '2 db']] },
    { kat: 'vilagitas', gyarto: 'Veltrix Garage', nev: 'LED rendszámtábla-világítás', rajz: 'rendszam', ar: 9900, platform: ['golf5', 'golf7', 'audiA3', 'leon', 'octavia', 'bmwE46', 'bmwE90', 'bmwF30', 'bmwE60', 'polo', 'focus'], cikk: 800,
        rovid: 'Hibakód nélküli LED rendszámtábla-világítás, közvetlen csere.', param: [['Darabszám', '2 db']] },
    { kat: 'vilagitas', gyarto: 'Veltrix Garage', nev: 'sötétített LED hátsó lámpa', rajz: 'lampa', ar: 149000, platform: ['bmwE46', 'bmwE90', 'golf7', 'golf5', 'focus', 'civicEK'], cikk: 900,
        rovid: 'Füstszínű LED hátsó lámpa pár dinamikus indexszel – E-jeles.', param: [['Darabszám', '2 db (pár)']] },

    // EGYÉB
    { kat: 'egyeb', gyarto: 'Motul', nev: '300V motorolaj', rajz: 'olaj', ar: 32900, univerzalis: true, cikk: 3000,
        variansok: [['5W-40, 2 l', 0], ['5W-40, 5 l', 39000], ['10W-40, 2 l', 0], ['15W-50, 2 l', 2000]], rovid: '100% szintetikus versenyolaj észter technológiával.', param: [['Típus', '100% szintetikus, észter']] },
    { kat: 'egyeb', gyarto: 'Liqui Moly', nev: 'Race Tech GT1 motorolaj', rajz: 'olaj', ar: 24900, univerzalis: true, cikk: 3100,
        variansok: [['10W-60, 1 l', -12000], ['10W-60, 5 l', 0]], rovid: 'Magas igénybevételre fejlesztett szintetikus motorolaj.', param: [['Viszkozitás', '10W-60']] },
    { kat: 'egyeb', gyarto: 'Veltrix Garage', nev: 'vontatóheveder 5 t', rajz: 'heveder', ar: 14900, univerzalis: true, cikk: 1000,
        variansok: [['3 m', 0], ['5 m', 3000]], rovid: 'Pályanapra kötelező felszerelés: textil vontatóheveder 5 t teherbírással.', param: [['Teherbírás', '5 t']] },
    { kat: 'egyeb', gyarto: 'Veltrix Garage', nev: 'alacsony építésű alu emelő 1,5 t', rajz: 'emelo', ar: 79900, univerzalis: true, cikk: 1100,
        rovid: 'Mindössze 85 mm-es emelési magasság – ültetett autókhoz, könnyű alumínium vázzal.', param: [['Teherbírás', '1,5 t'], ['Legalacsonyabb pont', '85 mm']] },
    { kat: 'egyeb', gyarto: 'Veltrix Garage', nev: 'Veltrix matricaszett', rajz: 'matrica', ar: 3900, univerzalis: true, cikk: 1200,
        variansok: [['fehér', 0], ['fekete', 0], ['arany', 500]], rovid: 'Időjárásálló vinyl matricák a Veltrix logóval – 3 méretben.', param: [['Anyag', 'Öntött vinyl']] },
];

// ---------- Determinisztikus véletlen ----------
const mulberry32 = (mag) => () => {
    let t = (mag += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const kerekitArat = (ar) => (ar >= 10000 ? Math.round(ar / 1000) * 1000 - 100 : Math.round(ar / 100) * 100 - 100);

const leirasSzoveg = (s, cel) => [
    s.rovid,
    cel ? `Ez a változat a következő típushoz készült: ${cel}. Vásárlás előtt egyeztessük az alvázszám alapján a pontos illeszkedést – írj nekünk, vagy hívj!` : 'Univerzális termék: a legtöbb autóhoz használható; kérdés esetén szívesen segítünk a választásban.',
    'Beszerelést telephelyünkön is vállalunk, időpontegyeztetés után.',
].join('\n\n');

/** A teljes katalógus (képadatokkal együtt; a kép URL-jét a feltöltő tölti ki). */
const katalogus = () => {
    const rnd = mulberry32(20261112);
    const termekek = [];
    const cikkszamok = new Set();

    const felvesz = (s, { cel, nevVege, arElteres = 0, sorszam }) => {
        const [kod, szin] = GY[s.gyarto];
        const cikkszam = `${kod}-${s.cikk + sorszam * 7}`;
        if (cikkszamok.has(cikkszam)) throw new Error(`Ismétlődő cikkszám: ${cikkszam}`);
        cikkszamok.add(cikkszam);

        const ar = kerekitArat((s.ar + arElteres) * (0.94 + rnd() * 0.14));
        const akcios = rnd() < 0.22;
        const keszletVeletlen = rnd();
        const keszlet = keszletVeletlen < 0.07 ? 0 : keszletVeletlen < 0.2 ? 1 + Math.floor(rnd() * 2) : 3 + Math.floor(rnd() * 22);
        termekek.push({
            nev: `${s.gyarto} ${s.nev}${nevVege ? ` – ${nevVege}` : ''}`,
            cikkszam,
            gyarto: s.gyarto,
            kategoria: s.kat,
            rovidLeiras: s.rovid,
            leiras: leirasSzoveg(s, cel?.nev),
            ar,
            akciosAr: akcios ? kerekitArat(ar * (0.82 + rnd() * 0.1)) : null,
            keszlet,
            parameterek: [...s.param.map(([nev, ertek]) => ({ nev, ertek })), ...(cel ? [{ nev: 'Típus', ertek: cel.nev }] : [])],
            univerzalis: Boolean(s.univerzalis),
            kompatibilitas: cel ? [{ marka: cel.marka, modell: cel.modell, evjaratTol: cel.tol, evjaratIg: cel.ig }] : [],
            lathato: true,
            kiemelt: false,
            kep: { rajz: s.rajz, szin, gyarto: s.gyarto, cimke: cel ? cel.nev : (nevVege || ''), kullok: s.kullok, felniSzin: s.felniSzin },
        });
        return termekek.at(-1);
    };

    SABLONOK.forEach((s, sablonIndex) => {
        const sajat = [];
        if (s.univerzalis) {
            (s.variansok || [[null, 0]]).forEach(([nev, elteres], i) => sajat.push(felvesz(s, { nevVege: nev, arElteres: elteres, sorszam: i })));
        } else {
            platformValasztas(s.platform, sablonIndex).forEach((kulcs) => sajat.push(felvesz(s, { cel: P[kulcs], nevVege: P[kulcs].nev, sorszam: s.platform.indexOf(kulcs) })));
        }
        // Kiemelés: a sablonból az első N termék.
        for (const t of sajat.slice(0, s.kiemelt || 0)) t.kiemelt = true;
    });
    return termekek;
};

module.exports = { katalogus, PLATFORMOK: P };
