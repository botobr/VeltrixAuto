const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_API_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImage = (imageData) => new Promise((resolve, reject) => {
    if (typeof imageData !== 'string' || !/^data:image\/(jpeg|png|webp|avif);base64,/.test(imageData)) {
        reject(new Error('Érvénytelen képformátum (JPG, PNG, WebP vagy AVIF lehet).'));
        return;
    }

    cloudinary.uploader.upload_stream(
        {
            folder: 'veltrix/autok',
            resource_type: 'image',
            // A túl nagy képeket a Cloudinary méretezi le, hogy a galéria gyors maradjon.
            transformation: [{ width: 2400, height: 2400, crop: 'limit' }],
        },
        (error, result) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(result);
        },
    ).end(Buffer.from(imageData.split(',').pop(), 'base64'));
});

const deleteImage = (publicId) => new Promise((resolve, reject) => {
    if (!publicId) {
        resolve();
        return;
    }

    cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
            reject(error);
            return;
        }
        resolve(result);
    });
});

/** Több képet töröl; a hibát naplózza, de nem dobja tovább. */
const deleteImagesQuietly = async (publicIds = []) => {
    await Promise.all([...new Set(publicIds.filter(Boolean))].map(async (publicId) => {
        try {
            await deleteImage(publicId);
        } catch (error) {
            console.error(`Kép törlése sikertelen (${publicId}): ${error.message}`);
        }
    }));
};

module.exports = { uploadImage, deleteImage, deleteImagesQuietly };
