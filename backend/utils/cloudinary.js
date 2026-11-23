const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_API_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// csak ilyen képeket fogadunk el (base64 formában jönnek a frontendről)
const KEP_FORMATUM = /^data:image\/(jpeg|png|webp|avif);base64,/;

// kép feltöltése a Cloudinary-ra
const kepFeltoltese = (kepAdat) => {
    return new Promise((resolve, reject) => {
        if (typeof kepAdat !== 'string' || !KEP_FORMATUM.test(kepAdat)) {
            reject(new Error('Érvénytelen képformátum (JPG, PNG, WebP vagy AVIF lehet).'));
            return;
        }

        const beallitasok = {
            folder: 'veltrix/autok',
            resource_type: 'image',
            // a túl nagy képeket a Cloudinary kicsinyíti le
            transformation: [{ width: 2400, height: 2400, crop: 'limit' }],
        };

        const feltolto = cloudinary.uploader.upload_stream(beallitasok, (hiba, eredmeny) => {
            if (hiba) {
                reject(hiba);
            } else {
                resolve(eredmeny);
            }
        });

        // a "data:image/...;base64," utáni rész maga a kép
        const base64Resz = kepAdat.split(',')[1];
        feltolto.end(Buffer.from(base64Resz, 'base64'));
    });
};

// egy kép törlése a Cloudinary-ról
const kepTorlese = (publicId) => {
    return new Promise((resolve, reject) => {
        if (!publicId) {
            resolve();
            return;
        }

        cloudinary.uploader.destroy(publicId, (hiba, eredmeny) => {
            if (hiba) {
                reject(hiba);
            } else {
                resolve(eredmeny);
            }
        });
    });
};

// több kép törlése, ha valamelyik nem sikerül, csak kiírjuk a hibát
const kepekTorlese = async (publicIdk = []) => {
    // üres és ismétlődő azonosítók kiszűrése
    const torlendok = [];
    for (const publicId of publicIdk) {
        if (publicId && !torlendok.includes(publicId)) {
            torlendok.push(publicId);
        }
    }

    for (const publicId of torlendok) {
        try {
            await kepTorlese(publicId);
        } catch (error) {
            console.error('Kép törlése sikertelen (' + publicId + '): ' + error.message);
        }
    }
};

module.exports = { kepFeltoltese, kepTorlese, kepekTorlese };
