// Minta tuning alkatrészek (kb. 275 db) feltöltése az adatbázisba, generált képekkel (Cloudinary).
//
//   npm run alkatreszek                    – feltöltés (a meglévőket cikkszám alapján frissíti)
//   npm run alkatreszek -- --szaraz        – csak ellenőrzés, nem ír semmit
//   npm run alkatreszek -- --kepek-ujra    – a képeket akkor is újra feltölti, ha már megvannak
//   npm run alkatreszek -- --torles        – ezeket a minta termékeket és a képeiket törli
//
// Ha egy termék már megvan, csak a leírás jellegű adatai frissülnek, az ár, készlet,
// láthatóság stb. marad úgy, ahogy az adminban beállították.

const dotenv = require('dotenv');
const { Readable } = require('node:stream');

dotenv.config({ quiet: true });

const mongoose = require('mongoose');
const { v2: cloudinary } = require('cloudinary');
require('../utils/cloudinary'); // ez állítja be a Cloudinary-t
const adatbazisKapcsolodas = require('../utils/adatbazis');
const AlkatreszModel = require('../models/Alkatresz');
const { kepekTorlese } = require('../utils/cloudinary');
const { slugify } = require('../utils/slug');
const { alkatreszEllenorzese } = require('../utils/webshop');
const { katalogus } = require('./mintaAlkatreszek/katalogus');
const { termekKep } = require('./mintaAlkatreszek/kepek');

const MAPPA = 'veltrix/autok';
// ezeket a mezőket frissítjük a már meglévő termékeknél
const KATALOGUS_MEZOK = ['nev', 'gyarto', 'kategoria', 'rovidLeiras', 'leiras', 'parameterek', 'kompatibilitas', 'univerzalis'];
// Kereskedői termékfotó a részletező galériába; a listakártya generált borítója ettől változatlan marad.
// A forrás termékoldala és képe: https://www.sportseats4u.co.uk/product/sparco-sprint-fia-motorsport-bucket-seat-2025/
const VALOS_TERMEK_FOTOK = {
    'SPA-8001': {
        url: 'https://www.sportseats4u.co.uk/wp-content/uploads/sites/2/2024/11/Sparco-Sprint-FIA-Motorsport-Bucket-Seat-BRR0003B0-NR-K0100N-GSM-Performance-7-1.jpg',
        forras: 'https://www.sportseats4u.co.uk/product/sparco-sprint-fia-motorsport-bucket-seat-2025/',
        leiras: 'Sparco Sprint termékfotó · Forrás: GSM Sport Seats',
    },
};

// parancssori kapcsolók
const szaraz = process.argv.includes('--szaraz');
const torles = process.argv.includes('--torles');
const kepekUjra = process.argv.includes('--kepek-ujra');

const kepNev = (cikkszam) => `minta-alkatresz-${slugify(cikkszam)}`;
const kepPublicId = (cikkszam) => MAPPA + '/' + kepNev(cikkszam);
const termekFotokPublicIdje = (cikkszam) => `${MAPPA}/termekfoto-${slugify(cikkszam)}`;

/** Legfeljebb `db` párhuzamos feladat; a hibákat összegyűjti, nem áll le miattuk. */
const parhuzamosan = async (lista, db, feladat) => {
    const hibak = [];
    let kovetkezo = 0;
    const dolgozo = async () => {
        while (kovetkezo < lista.length) {
            const elem = lista[kovetkezo];
            kovetkezo += 1;
            try {
                await feladat(elem);
            } catch (error) {
                hibak.push(`${elem.cikkszam}: ${error.message || error}`);
            }
        }
    };
    await Promise.all(Array.from({ length: db }, dolgozo));
    return hibak;
};

// a termék képe (SVG-ből generálva) feltöltése JPG-ként
const kepFeltoltes = async (termek) => {
    const svg = termekKep(termek.kep);
    const base64 = Buffer.from(svg).toString('base64');
    const eredmeny = await cloudinary.uploader.upload('data:image/svg+xml;base64,' + base64, {
        folder: MAPPA,
        public_id: kepNev(termek.cikkszam),
        overwrite: true,
        format: 'jpg',
        resource_type: 'image',
    });
    return { url: eredmeny.secure_url, publicId: eredmeny.public_id, tipus: 'kulso', leiras: '' };
};


// van-e már a terméknek minta képe
const vanMintaKepe = (meglevo, cikkszam) => {
    if (!meglevo) {
        return false;
    }
    for (const kep of meglevo.kepek) {
        if (kep.publicId === kepPublicId(cikkszam)) {
            return true;
        }
    }
    return false;
};

// a minta termékek törlése
// a minta termékek törlése
const torlesFuttatasa = async (termekek) => {
    const cikkszamok = termekek.map((termek) => termek.cikkszam);
    const meglevok = await AlkatreszModel.find({
        cikkszam: { $in: cikkszamok }
    }).select('cikkszam kepek');

    console.log(meglevok.length + ' minta-termék található az adatbázisban.');

    if (szaraz) return;

    await AlkatreszModel.deleteMany({
        _id: { $in: meglevok.map((termek) => termek._id) }
    });

    const kepek = meglevok.flatMap((termek) =>
        termek.kepek
            .map((kep) => kep.publicId)
            .filter((id) => id.startsWith(`${MAPPA}/minta-alkatresz-`))
    );

    await kepekTorlese(kepek);

    console.log(`Törölve: ${meglevok.length} termék, ${kepek.length} kép.`);
};

// valódi kereskedői termékfotó feltöltése
const termekFotoFeltoltes = async (termek) => {
    const foto = VALOS_TERMEK_FOTOK[termek.cikkszam];

    const valasz = await fetch(foto.url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
            Referer: foto.forras,
        },
    });

    if (!valasz.ok) {
        throw new Error(`A termékfotó letöltése sikertelen (${valasz.status}).`);
    }

    const tartalomTipus = valasz.headers.get('content-type') || '';

    if (!tartalomTipus.startsWith('image/')) {
        throw new Error('A termékfotó forrása nem képfájl.');
    }

    const buffer = Buffer.from(await valasz.arrayBuffer());

    if (buffer.length > 12 * 1024 * 1024) {
        throw new Error('A termékfotó túl nagy (max. 12 MB).');
    }

    const eredmeny = await new Promise((resolve, reject) => {
        const feltolto = cloudinary.uploader.upload_stream({
            folder: MAPPA,
            public_id: `termekfoto-${slugify(termek.cikkszam)}`,
            overwrite: true,
            resource_type: 'image',
        }, (error, feltoltes) =>
            error ? reject(error) : resolve(feltoltes)
        );

        Readable.from(buffer).pipe(feltolto);
    });

    return {
        url: eredmeny.secure_url,
        publicId: eredmeny.public_id,
        tipus: 'termek',
        leiras: foto.leiras
    };
};

// feltöltés / frissítés
const feltoltes = async (termekek) => {
    const cikkszamok = termekek.map((termek) => termek.cikkszam);
    const meglevoLista = await AlkatreszModel.find({ cikkszam: { $in: cikkszamok } });
    const meglevok = {};
    for (const termek of meglevoLista) {
        meglevok[termek.cikkszam] = termek;
    }

    // melyik termékhez kell képet feltölteni
    const kepKell = [];
    for (const termek of termekek) {
        if (kepekUjra || !vanMintaKepe(meglevok[termek.cikkszam], termek.cikkszam)) {
            kepKell.push(termek);
        }
    }
    console.log(termekek.length + ' termék a katalógusban · ' + meglevoLista.length + ' már megvan · ' + kepKell.length + ' képet kell feltölteni.');

    // ellenőrzés mentés előtt, ugyanúgy, mint az admin űrlapon
    const elotag = 'https://res.cloudinary.com/' + process.env.CLOUDINARY_API_CLOUD_NAME + '/image/upload/';
    const validacioHibak = [];
    for (const termek of termekek) {
        const probaKep = { url: elotag + 'v1/' + kepPublicId(termek.cikkszam) + '.jpg', publicId: kepPublicId(termek.cikkszam) };
        const { hibak } = alkatreszEllenorzese({ ...termek, kepek: [probaKep] });
        for (const hiba of hibak) {
            validacioHibak.push(termek.cikkszam + ': ' + hiba);
        }
    }
    if (validacioHibak.length > 0) {
        throw new Error('Érvénytelen katalógusadat:\n' + validacioHibak.slice(0, 10).join('\n'));
    }
    if (szaraz) {
        console.log('Szárazfuttatás: minden termék érvényes, nem írtunk semmit.');
        return;
    }

    const hibak = [];


    // 1. képek feltöltése
    const ujKepek = {};
    let kesz = 0;
    for (const termek of kepKell) {
        try {
            ujKepek[termek.cikkszam] = await kepFeltoltes(termek);
        } catch (error) {
            hibak.push('kép – ' + termek.cikkszam + ': ' + error.message);
        }
        kesz++;
        if (kesz % 25 === 0 || kesz === kepKell.length) {
            console.log('  képek: ' + kesz + '/' + kepKell.length);
        }
    }

    // 2. termékek mentése
    let letrehozva = 0;
    let frissitve = 0;
    for (const termek of termekek) {
        try {
            const ujKep = ujKepek[termek.cikkszam];
            const meglevo = meglevok[termek.cikkszam];

            if (meglevo) {
                for (const mezo of KATALOGUS_MEZOK) {
                    meglevo.set(mezo, termek[mezo]);
                }
                // az új képet az elejére tesszük
                if (ujKep && !vanMintaKepe(meglevo, termek.cikkszam)) {
                    meglevo.kepek = [ujKep, ...meglevo.kepek];
                }
                await meglevo.save();
                frissitve++;
            } else {
                if (!ujKep) {
                    throw new Error('nincs kép (a feltöltés nem sikerült)');
                }
                const adatok = { ...termek, kepek: [ujKep] };
                delete adatok.kep; // ez csak a kép generálásához kellett
                await AlkatreszModel.create(adatok);
                letrehozva++;
            }
        } catch (error) {
            hibak.push('mentés – ' + termek.cikkszam + ': ' + error.message);
        }
    }

    console.log('Kész: ' + letrehozva + ' új, ' + frissitve + ' frissített termék.');
    if (hibak.length > 0) {
        console.error(hibak.length + ' hiba (újrafuttatással pótolható):\n' + hibak.slice(0, 20).join('\n'));
        process.exitCode = 1;
    }
};

const futtatas = async () => {
    if (!process.env.MONGO_DB) {
        throw new Error('A MONGO_DB nincs beállítva a .env fájlban.');
    }
    if (!torles && !szaraz && !process.env.CLOUDINARY_API_CLOUD_NAME) {
        throw new Error('A Cloudinary nincs beállítva a .env fájlban.');
    }

    const termekek = katalogus();
    await adatbazisKapcsolodas();
    if (torles) {
        await torlesFuttatasa(termekek);
    } else {
        await feltoltes(termekek);
    }
};

futtatas()
    .catch((error) => {
        console.error('Hiba: ' + error.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());