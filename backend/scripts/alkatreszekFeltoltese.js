/**
 * Minta tuning alkatrészek (kb. 275 termék) feltöltése a .env-ben beállított
 * adatbázisba, generált termékképekkel (Cloudinary).
 *
 *   npm run alkatreszek                    – feltöltés; a meglévőket (cikkszám szerint) frissíti
 *   npm run alkatreszek -- --szaraz        – csak ellenőrzés: semmit nem ír, nem tölt fel
 *   npm run alkatreszek -- --kepek-ujra    – a képeket akkor is újra feltölti, ha már megvannak
 *   npm run alkatreszek -- --torles        – pontosan ezeket a termékeket és képeiket törli
 *
 * Újrafuttatáskor a már meglévő termékeknél csak a katalógusadatok (név, leírás,
 * paraméterek, kompatibilitás) frissülnek; az ár, akciós ár, készlet, láthatóság,
 * kiemelés és statisztika marad, ahogy az adminban beállították.
 */
const dotenv = require('dotenv');

dotenv.config({ quiet: true });

const mongoose = require('mongoose');
const { v2: cloudinary } = require('cloudinary');
require('../utils/cloudinary');
const dbConnection = require('../utils/dbConnect');
const AlkatreszModel = require('../models/Alkatresz');
const { deleteImagesQuietly } = require('../utils/cloudinary');
const { slugify } = require('../utils/slug');
const { alkatreszEllenorzese } = require('../utils/webshop');
const { katalogus } = require('./mintaAlkatreszek/katalogus');
const { termekKep } = require('./mintaAlkatreszek/kepek');

const MAPPA = 'veltrix/autok';
const PARHUZAMOS = 6;
const KATALOGUS_MEZOK = ['nev', 'gyarto', 'kategoria', 'rovidLeiras', 'leiras', 'parameterek', 'kompatibilitas', 'univerzalis'];

const kapcsolo = (nev) => process.argv.includes(nev);
const szaraz = kapcsolo('--szaraz');
const torles = kapcsolo('--torles');
const kepekUjra = kapcsolo('--kepek-ujra');

const kepNev = (cikkszam) => `minta-alkatresz-${slugify(cikkszam)}`;
const publicIdje = (cikkszam) => `${MAPPA}/${kepNev(cikkszam)}`;

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

const kepFeltoltes = async (termek) => {
    const svg = termekKep(termek.kep);
    const eredmeny = await cloudinary.uploader.upload(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`, {
        folder: MAPPA,
        public_id: kepNev(termek.cikkszam),
        overwrite: true,
        format: 'jpg',
        resource_type: 'image',
    });
    return { url: eredmeny.secure_url, publicId: eredmeny.public_id, tipus: 'kulso', leiras: '' };
};

const torlesFuttatasa = async (termekek) => {
    const cikkszamok = termekek.map((t) => t.cikkszam);
    const meglevok = await AlkatreszModel.find({ cikkszam: { $in: cikkszamok } }).select('cikkszam kepek');
    console.log(`${meglevok.length} minta-termék található az adatbázisban.`);
    if (szaraz) return;
    await AlkatreszModel.deleteMany({ _id: { $in: meglevok.map((t) => t._id) } });
    // Csak a minta-képeket töröljük (amit az adminban cseréltek, azt nem).
    const kepek = meglevok.flatMap((t) => t.kepek.map((k) => k.publicId)).filter((id) => id.startsWith(`${MAPPA}/minta-alkatresz-`));
    await deleteImagesQuietly(kepek);
    console.log(`Törölve: ${meglevok.length} termék, ${kepek.length} kép.`);
};

const feltoltes = async (termekek) => {
    const meglevok = new Map((await AlkatreszModel.find({ cikkszam: { $in: termekek.map((t) => t.cikkszam) } })).map((t) => [t.cikkszam, t]));
    const kepKell = termekek.filter((t) => kepekUjra || !meglevok.get(t.cikkszam)?.kepek.some((k) => k.publicId === publicIdje(t.cikkszam)));
    console.log(`${termekek.length} termék a katalógusban · ${meglevok.size} már megvan · ${kepKell.length} képet kell feltölteni.`);

    // Ellenőrzés mentés előtt – ugyanazzal a validációval, mint az admin űrlap.
    const elotag = `https://res.cloudinary.com/${process.env.CLOUDINARY_API_CLOUD_NAME}/image/upload/`;
    const validacio = termekek.flatMap((t) => {
        const { hibak } = alkatreszEllenorzese({ ...t, kepek: [{ url: `${elotag}v1/${publicIdje(t.cikkszam)}.jpg`, publicId: publicIdje(t.cikkszam) }] });
        return hibak.map((h) => `${t.cikkszam}: ${h}`);
    });
    if (validacio.length) throw new Error(`Érvénytelen katalógusadat:\n${validacio.slice(0, 10).join('\n')}`);
    if (szaraz) {
        console.log('Szárazfuttatás: minden termék érvényes, nem írtunk semmit.');
        return;
    }

    const kepek = new Map();
    let kesz = 0;
    const kepHibak = await parhuzamosan(kepKell, PARHUZAMOS, async (t) => {
        kepek.set(t.cikkszam, await kepFeltoltes(t));
        kesz += 1;
        if (kesz % 25 === 0 || kesz === kepKell.length) console.log(`  képek: ${kesz}/${kepKell.length}`);
    });

    let letrehozva = 0;
    let frissitve = 0;
    const mentesHibak = await parhuzamosan(termekek, PARHUZAMOS, async (t) => {
        const ujKep = kepek.get(t.cikkszam);
        const meglevo = meglevok.get(t.cikkszam);
        if (meglevo) {
            for (const mezo of KATALOGUS_MEZOK) meglevo.set(mezo, t[mezo]);
            if (ujKep && !meglevo.kepek.some((k) => k.publicId === ujKep.publicId)) meglevo.kepek = [ujKep, ...meglevo.kepek];
            await meglevo.save();
            frissitve += 1;
            return;
        }
        if (!ujKep) throw new Error('nincs kép (a feltöltés nem sikerült)');
        const { kep: _kep, ...adatok } = t;
        await AlkatreszModel.create({ ...adatok, kepek: [ujKep] });
        letrehozva += 1;
    });

    console.log(`Kész: ${letrehozva} új, ${frissitve} frissített termék.`);
    const hibak = [...kepHibak.map((h) => `kép – ${h}`), ...mentesHibak.map((h) => `mentés – ${h}`)];
    if (hibak.length) {
        console.error(`${hibak.length} hiba (újrafuttatással pótolható):\n${hibak.slice(0, 20).join('\n')}`);
        process.exitCode = 1;
    }
};

const futtatas = async () => {
    if (!process.env.MONGO_DB) throw new Error('A MONGO_DB nincs beállítva a .env fájlban.');
    if (!torles && !szaraz && !process.env.CLOUDINARY_API_CLOUD_NAME) throw new Error('A Cloudinary nincs beállítva a .env fájlban.');
    const termekek = katalogus();
    await dbConnection();
    if (torles) await torlesFuttatasa(termekek);
    else await feltoltes(termekek);
};

futtatas()
    .catch((error) => {
        console.error(`Hiba: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
